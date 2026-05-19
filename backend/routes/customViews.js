// === Custom Views (4 endpoints) ===
// Domain: notary document verification
//
// Endpoints (all under /api/custom-views, mounted BEFORE 404 handler):
//   VIZ:
//     GET  /verification-volume     -> time-series of notarizations per day for chart
//     GET  /doc-type-state-heatmap  -> matrix of {doc_type x state} counts for heatmap
//   NON-VIZ:
//     GET  /notarization-certificate/:id  -> PDF (application/pdf) certificate
//     CRUD /verification-rules            -> manage doc types / requirements
//          GET    /verification-rules
//          POST   /verification-rules
//          PUT    /verification-rules/:id
//          DELETE /verification-rules/:id

const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ---------------------------------------------------------------------------
// Bootstrap: ensure verification_rules table exists (additive only)
// ---------------------------------------------------------------------------
async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_rules (
        id SERIAL PRIMARY KEY,
        doc_type VARCHAR(100) NOT NULL,
        requirement VARCHAR(255) NOT NULL,
        description TEXT,
        is_required BOOLEAN DEFAULT true,
        state VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // seed a few rules if empty
    const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM verification_rules');
    if (rows[0].c === 0) {
      await pool.query(`
        INSERT INTO verification_rules (doc_type, requirement, description, is_required, state) VALUES
          ('affidavit','Sworn oath taken','Notary must administer oath before signing.',true,NULL),
          ('will','Two witnesses present','Last will requires two independent witnesses.',true,NULL),
          ('deed','Government photo ID','Signer must present unexpired government-issued photo ID.',true,NULL),
          ('power_of_attorney','Capacity confirmation','Notary confirms signer mental capacity.',true,NULL),
          ('acknowledgment','Personal appearance','Signer must personally appear before notary.',true,NULL)
      `);
    }
  } catch (e) {
    console.warn('[customViews] ensureSchema warning:', e.message);
  }
}
ensureSchema();

// ===========================================================================
// VIZ 1: verification volume time series
// GET /api/custom-views/verification-volume?days=30
// ===========================================================================
router.get('/verification-volume', async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
    // Notarizations grouped by scheduled_date day, plus completion count.
    const q = `
      SELECT
        TO_CHAR(DATE_TRUNC('day', COALESCE(scheduled_date, created_at)), 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
        COUNT(*) FILTER (WHERE status NOT IN ('completed','scheduled'))::int AS other
      FROM notarizations
      WHERE COALESCE(scheduled_date, created_at) >= NOW() - ($1::int || ' days')::interval
      GROUP BY day
      ORDER BY day ASC
    `;
    const result = await pool.query(q, [days]);
    const series = result.rows.map(r => ({
      day: r.day,
      total: r.total,
      completed: r.completed,
      scheduled: r.scheduled,
      other: r.other,
    }));
    const summary = series.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.completed += r.completed;
        acc.scheduled += r.scheduled;
        return acc;
      },
      { total: 0, completed: 0, scheduled: 0 }
    );
    res.json({ days, series, summary });
  } catch (err) {
    console.error('verification-volume error', err);
    res.status(500).json({ error: 'Failed to load verification volume', details: err.message });
  }
});

// ===========================================================================
// VIZ 2: document-type x state heatmap
// GET /api/custom-views/doc-type-state-heatmap
// ===========================================================================
router.get('/doc-type-state-heatmap', async (req, res) => {
  try {
    const q = `
      SELECT
        COALESCE(d.type, 'unknown')   AS doc_type,
        COALESCE(c.state, 'UNKNOWN')  AS state,
        COUNT(*)::int                 AS cnt
      FROM documents d
      LEFT JOIN clients c ON c.id = d.client_id
      GROUP BY doc_type, state
      ORDER BY doc_type, state
    `;
    const result = await pool.query(q);
    const docTypesSet = new Set();
    const statesSet = new Set();
    const map = {};
    for (const row of result.rows) {
      docTypesSet.add(row.doc_type);
      statesSet.add(row.state);
      map[`${row.doc_type}|${row.state}`] = row.cnt;
    }
    const doc_types = Array.from(docTypesSet).sort();
    const states = Array.from(statesSet).sort();
    const matrix = doc_types.map(dt =>
      states.map(st => map[`${dt}|${st}`] || 0)
    );
    let max = 0;
    matrix.forEach(row => row.forEach(v => { if (v > max) max = v; }));
    res.json({ doc_types, states, matrix, max });
  } catch (err) {
    console.error('doc-type-state-heatmap error', err);
    res.status(500).json({ error: 'Failed to load heatmap', details: err.message });
  }
});

// ===========================================================================
// NON-VIZ 1: notarization certificate PDF
// GET /api/custom-views/notarization-certificate/:id
// ===========================================================================
function pdfEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildMinimalPdf(lines) {
  // Build a minimal single-page PDF with Helvetica text. No external deps.
  const header = '%PDF-1.4\n';
  const objects = [];

  // 1: Catalog
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  // 2: Pages
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  // 3: Page
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>');
  // 4: Content stream
  let text = 'BT\n/F1 18 Tf\n72 740 Td\n14 TL\n';
  lines.forEach((line, idx) => {
    text += `(${pdfEscape(line)}) Tj\n`;
    if (idx === 0) {
      text += '/F1 11 Tf\n';
    }
    text += 'T*\n';
  });
  text += 'ET';
  const stream = `<< /Length ${text.length} >>\nstream\n${text}\nendstream`;
  objects.push(stream);
  // 5: Font
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let body = '';
  const offsets = [];
  let cursor = header.length;
  objects.forEach((obj, i) => {
    offsets.push(cursor);
    const objStr = `${i + 1} 0 obj\n${obj}\nendobj\n`;
    body += objStr;
    cursor += objStr.length;
  });
  const xrefOffset = header.length + body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(off => {
    xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(header + body + xref + trailer, 'latin1');
}

router.get('/notarization-certificate/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const q = `
      SELECT
        n.id, n.status, n.type, n.scheduled_date, n.completed_date, n.fee, n.location, n.notes,
        d.title  AS document_title, d.type AS document_type,
        c.name   AS client_name, c.state AS client_state, c.id_type AS client_id_type,
        u.name   AS notary_name
      FROM notarizations n
      LEFT JOIN documents d ON d.id = n.document_id
      LEFT JOIN clients   c ON c.id = n.client_id
      LEFT JOIN users     u ON u.id = n.notary_id
      WHERE n.id = $1
    `;
    const result = await pool.query(q, [id]);
    if (result.rows.length === 0) {
      // Fall back to any notarization so the endpoint stays useful on empty DBs
      const fallback = await pool.query(`
        SELECT n.id, n.status, n.type, n.scheduled_date, n.completed_date, n.fee, n.location, n.notes,
               d.title AS document_title, d.type AS document_type,
               c.name AS client_name, c.state AS client_state, c.id_type AS client_id_type,
               u.name AS notary_name
        FROM notarizations n
        LEFT JOIN documents d ON d.id = n.document_id
        LEFT JOIN clients   c ON c.id = n.client_id
        LEFT JOIN users     u ON u.id = n.notary_id
        ORDER BY n.id DESC LIMIT 1
      `);
      if (fallback.rows.length === 0) {
        return res.status(404).json({ error: 'No notarization records available' });
      }
      result.rows[0] = fallback.rows[0];
    }
    const n = result.rows[0];
    const lines = [
      'NOTARIZATION CERTIFICATE',
      `Certificate ID: ${n.id}`,
      `Notarization Type: ${n.type || 'n/a'}`,
      `Document: ${n.document_title || 'n/a'} (${n.document_type || 'n/a'})`,
      `Client: ${n.client_name || 'n/a'}`,
      `Client State: ${n.client_state || 'n/a'}`,
      `Client ID Type: ${n.client_id_type || 'n/a'}`,
      `Notary: ${n.notary_name || 'n/a'}`,
      `Status: ${n.status || 'n/a'}`,
      `Scheduled: ${n.scheduled_date ? new Date(n.scheduled_date).toISOString() : 'n/a'}`,
      `Completed: ${n.completed_date ? new Date(n.completed_date).toISOString() : 'n/a'}`,
      `Fee: ${n.fee != null ? '$' + n.fee : 'n/a'}`,
      `Location: ${n.location || 'n/a'}`,
      '',
      'I certify that the foregoing is a true and accurate record of the',
      'notarial act performed under my official seal on the date noted above.',
      '',
      `Issued by AI Notary Platform on ${new Date().toISOString()}`,
    ];
    const pdf = buildMinimalPdf(lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="notarization-${n.id}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('notarization-certificate error', err);
    res.status(500).json({ error: 'Failed to generate certificate', details: err.message });
  }
});

// ===========================================================================
// NON-VIZ 2: verification rules CRUD
// GET    /api/custom-views/verification-rules
// POST   /api/custom-views/verification-rules
// PUT    /api/custom-views/verification-rules/:id
// DELETE /api/custom-views/verification-rules/:id
// ===========================================================================
router.get('/verification-rules', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM verification_rules ORDER BY doc_type ASC, id ASC'
    );
    res.json({ data: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('verification-rules GET error', err);
    res.status(500).json({ error: 'Failed to load rules', details: err.message });
  }
});

router.post('/verification-rules', async (req, res) => {
  try {
    const { doc_type, requirement, description, is_required = true, state = null } = req.body || {};
    if (!doc_type || !requirement) {
      return res.status(400).json({ error: 'doc_type and requirement are required' });
    }
    const result = await pool.query(
      `INSERT INTO verification_rules (doc_type, requirement, description, is_required, state)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [doc_type, requirement, description || null, !!is_required, state]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('verification-rules POST error', err);
    res.status(500).json({ error: 'Failed to create rule', details: err.message });
  }
});

router.put('/verification-rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const { doc_type, requirement, description, is_required, state } = req.body || {};
    const result = await pool.query(
      `UPDATE verification_rules SET
         doc_type     = COALESCE($1, doc_type),
         requirement  = COALESCE($2, requirement),
         description  = COALESCE($3, description),
         is_required  = COALESCE($4, is_required),
         state        = COALESCE($5, state),
         updated_at   = NOW()
       WHERE id = $6 RETURNING *`,
      [doc_type, requirement, description, is_required, state, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('verification-rules PUT error', err);
    res.status(500).json({ error: 'Failed to update rule', details: err.message });
  }
});

router.delete('/verification-rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const result = await pool.query(
      'DELETE FROM verification_rules WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json({ message: 'Rule deleted', rule: result.rows[0] });
  } catch (err) {
    console.error('verification-rules DELETE error', err);
    res.status(500).json({ error: 'Failed to delete rule', details: err.message });
  }
});

module.exports = router;
