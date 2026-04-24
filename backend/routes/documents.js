const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/documents
router.get('/', async (req, res) => {
  try {
    const { status, type, uploaded_by, client_id } = req.query;
    let query = 'SELECT d.*, u.name as uploader_name, c.name as client_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id LEFT JOIN clients c ON d.client_id = c.id WHERE 1=1';
    const params = [];

    if (status) { params.push(status); query += ` AND d.status = $${params.length}`; }
    if (type) { params.push(type); query += ` AND d.type = $${params.length}`; }
    if (uploaded_by) { params.push(uploaded_by); query += ` AND d.uploaded_by = $${params.length}`; }
    if (client_id) { params.push(client_id); query += ` AND d.client_id = $${params.length}`; }

    query += ' ORDER BY d.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/documents/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT d.*, u.name as uploader_name, c.name as client_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id LEFT JOIN clients c ON d.client_id = c.id WHERE d.id = $1',
      [req.params.id]
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
    const { title, type, status, file_name, file_size, uploaded_by, client_id, ai_analysis } = req.body;
    const result = await pool.query(
      'INSERT INTO documents (title, type, status, file_name, file_size, uploaded_by, client_id, ai_analysis) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [title, type, status || 'pending', file_name, file_size, uploaded_by || req.user.id, client_id, ai_analysis]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating document:', err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// PUT /api/documents/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, type, status, file_name, file_size, client_id, ai_analysis } = req.body;
    const result = await pool.query(
      'UPDATE documents SET title = COALESCE($1, title), type = COALESCE($2, type), status = COALESCE($3, status), file_name = COALESCE($4, file_name), file_size = COALESCE($5, file_size), client_id = COALESCE($6, client_id), ai_analysis = COALESCE($7, ai_analysis), updated_at = NOW() WHERE id = $8 RETURNING *',
      [title, type, status, file_name, file_size, client_id, ai_analysis, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating document:', err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: 'Document deleted', document: result.rows[0] });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;
