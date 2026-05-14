const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

router.use(auth);

// Multer setup for text file uploads
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Helper: write to audit_trail
async function logAudit(pool, userId, action, entityType, entityId, details) {
  try {
    await pool.query(
      `INSERT INTO audit_trail (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)
       `,
      [userId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch {}
}

// GET /api/documents - scoped to logged-in user, with pagination
router.get('/', async (req, res) => {
  try {
    const { status, type, client_id } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    let query = `SELECT d.*, u.name as uploader_name, c.name as client_name
                 FROM documents d
                 LEFT JOIN users u ON d.uploaded_by = u.id
                 LEFT JOIN clients c ON d.client_id = c.id
                 WHERE d.uploaded_by = $1`;
    const params = [req.user.id];

    if (status) { params.push(status); query += ` AND d.status = $${params.length}`; }
    if (type) { params.push(type); query += ` AND d.type = $${params.length}`; }
    if (client_id) { params.push(client_id); query += ` AND d.client_id = $${params.length}`; }

    // Count total
    const countQuery = query.replace(/SELECT d\.\*.+?FROM/, 'SELECT COUNT(*) FROM').replace(/LEFT JOIN.+?(?=WHERE)/s, '');
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM documents d WHERE d.uploaded_by = $1${status ? ` AND d.status = $2` : ''}`,
      status ? [req.user.id, status] : [req.user.id]
    );
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY d.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/documents/:id - scoped to logged-in user
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, u.name as uploader_name, c.name as client_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       LEFT JOIN clients c ON d.client_id = c.id
       WHERE d.id = $1 AND d.uploaded_by = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching document:', err);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// POST /api/documents
router.post('/', async (req, res) => {
  try {
    const { title, type, status, file_name, file_size, client_id, ai_analysis, content, description } = req.body;
    const result = await pool.query(
      `INSERT INTO documents (title, type, status, file_name, file_size, uploaded_by, client_id, ai_analysis, content, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, type, status || 'pending', file_name, file_size, req.user.id, client_id, ai_analysis, content, description]
    );
    const doc = result.rows[0];
    await logAudit(pool, req.user.id, 'create', 'document', doc.id, { title, type });
    res.status(201).json(doc);
  } catch (err) {
    console.error('Error creating document:', err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// PUT /api/documents/:id - scoped to logged-in user
router.put('/:id', async (req, res) => {
  try {
    const { title, type, status, file_name, file_size, client_id, ai_analysis, content, description } = req.body;
    const result = await pool.query(
      `UPDATE documents
       SET title = COALESCE($1, title),
           type = COALESCE($2, type),
           status = COALESCE($3, status),
           file_name = COALESCE($4, file_name),
           file_size = COALESCE($5, file_size),
           client_id = COALESCE($6, client_id),
           ai_analysis = COALESCE($7, ai_analysis),
           content = COALESCE($8, content),
           description = COALESCE($9, description),
           updated_at = NOW()
       WHERE id = $10 AND uploaded_by = $11
       RETURNING *`,
      [title, type, status, file_name, file_size, client_id, ai_analysis, content, description, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    await logAudit(pool, req.user.id, 'update', 'document', req.params.id, { title, status });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating document:', err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/documents/:id - scoped to logged-in user
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM documents WHERE id = $1 AND uploaded_by = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    await logAudit(pool, req.user.id, 'delete', 'document', req.params.id, { title: result.rows[0].title });
    res.json({ message: 'Document deleted', document: result.rows[0] });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// POST /api/documents/upload-text
// Accepts multipart upload with a text file OR raw text in body.content
// Creates a document row and immediately runs AI analysis on it.
router.post('/upload-text', upload.single('file'), async (req, res) => {
  try {
    let textContent = '';

    if (req.file) {
      // Read uploaded file
      textContent = fs.readFileSync(req.file.path, 'utf8');
      // Clean up temp file
      try { fs.unlinkSync(req.file.path); } catch {}
    } else if (req.body.content) {
      textContent = req.body.content;
    } else {
      return res.status(400).json({ error: 'Either upload a file or provide content in the body' });
    }

    const title = req.body.title || (req.file ? req.file.originalname : 'Uploaded Document');
    const type = req.body.type || 'Other';

    // Create document row
    const docResult = await pool.query(
      `INSERT INTO documents (title, type, status, file_name, uploaded_by, content, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, type, 'pending', req.file ? req.file.originalname : null, req.user.id, textContent, req.body.description || null]
    );
    const doc = docResult.rows[0];
    await logAudit(pool, req.user.id, 'upload_text', 'document', doc.id, { title });

    // Immediately run AI analysis
    let analysis = null;
    try {
      const aiRes = await fetch(`http://localhost:${process.env.BACKEND_PORT || 3001}/api/ai/analyze-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization,
        },
        body: JSON.stringify({
          document_id: doc.id,
          content: textContent,
          analysis_type: 'comprehensive',
        }),
      });
      if (aiRes.ok) {
        analysis = await aiRes.json();
      }
    } catch (aiErr) {
      console.warn('AI analysis failed for uploaded doc:', aiErr.message);
    }

    res.status(201).json({ document: doc, analysis });
  } catch (err) {
    console.error('Error uploading text document:', err);
    res.status(500).json({ error: 'Failed to upload document', details: err.message });
  }
});

module.exports = router;
