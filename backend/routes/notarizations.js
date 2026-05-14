const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// Helper: write to audit_trail
async function logAudit(userId, action, entityType, entityId, details) {
  try {
    await pool.query(
      `INSERT INTO audit_trail (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch {}
}

// GET /api/notarizations - scoped to notary_id = logged-in user, with pagination
router.get('/', async (req, res) => {
  try {
    const { status, type, client_id } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    let query = `SELECT n.*, d.title as document_title, c.name as client_name, u.name as notary_name
                 FROM notarizations n
                 LEFT JOIN documents d ON n.document_id = d.id
                 LEFT JOIN clients c ON n.client_id = c.id
                 LEFT JOIN users u ON n.notary_id = u.id
                 WHERE n.notary_id = $1`;
    const params = [req.user.id];

    if (status) { params.push(status); query += ` AND n.status = $${params.length}`; }
    if (type) { params.push(type); query += ` AND n.type = $${params.length}`; }
    if (client_id) { params.push(client_id); query += ` AND n.client_id = $${params.length}`; }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM notarizations WHERE notary_id = $1`,
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY n.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Error fetching notarizations:', err);
    res.status(500).json({ error: 'Failed to fetch notarizations' });
  }
});

// GET /api/notarizations/:id - scoped to logged-in user
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, d.title as document_title, c.name as client_name, u.name as notary_name
       FROM notarizations n
       LEFT JOIN documents d ON n.document_id = d.id
       LEFT JOIN clients c ON n.client_id = c.id
       LEFT JOIN users u ON n.notary_id = u.id
       WHERE n.id = $1 AND n.notary_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notarization not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching notarization:', err);
    res.status(500).json({ error: 'Failed to fetch notarization' });
  }
});

// POST /api/notarizations
router.post('/', async (req, res) => {
  try {
    const { document_id, client_id, status, type, scheduled_date, completed_date, fee, location, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO notarizations (document_id, client_id, notary_id, status, type, scheduled_date, completed_date, fee, location, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [document_id, client_id, req.user.id, status || 'scheduled', type, scheduled_date, completed_date, fee, location, notes]
    );
    const row = result.rows[0];
    await logAudit(req.user.id, 'create', 'notarization', row.id, { document_id, client_id, type });
    res.status(201).json(row);
  } catch (err) {
    console.error('Error creating notarization:', err);
    res.status(500).json({ error: 'Failed to create notarization' });
  }
});

// PUT /api/notarizations/:id - scoped to logged-in user
router.put('/:id', async (req, res) => {
  try {
    const { document_id, client_id, status, type, scheduled_date, completed_date, fee, location, notes } = req.body;
    const result = await pool.query(
      `UPDATE notarizations
       SET document_id = COALESCE($1, document_id),
           client_id = COALESCE($2, client_id),
           status = COALESCE($3, status),
           type = COALESCE($4, type),
           scheduled_date = COALESCE($5, scheduled_date),
           completed_date = COALESCE($6, completed_date),
           fee = COALESCE($7, fee),
           location = COALESCE($8, location),
           notes = COALESCE($9, notes)
       WHERE id = $10 AND notary_id = $11
       RETURNING *`,
      [document_id, client_id, status, type, scheduled_date, completed_date, fee, location, notes, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notarization not found' });
    await logAudit(req.user.id, 'update', 'notarization', req.params.id, { status });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating notarization:', err);
    res.status(500).json({ error: 'Failed to update notarization' });
  }
});

// DELETE /api/notarizations/:id - scoped to logged-in user
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM notarizations WHERE id = $1 AND notary_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notarization not found' });
    await logAudit(req.user.id, 'delete', 'notarization', req.params.id, {});
    res.json({ message: 'Notarization deleted', notarization: result.rows[0] });
  } catch (err) {
    console.error('Error deleting notarization:', err);
    res.status(500).json({ error: 'Failed to delete notarization' });
  }
});

module.exports = router;
