const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/fraud-detections
router.get('/', async (req, res) => {
  try {
    const { status, risk_level, document_id } = req.query;
    let query = 'SELECT fd.*, d.title as document_title, u.name as reviewer_name FROM fraud_detections fd LEFT JOIN documents d ON fd.document_id = d.id LEFT JOIN users u ON fd.reviewed_by = u.id WHERE 1=1';
    const params = [];

    if (status) { params.push(status); query += ` AND fd.status = $${params.length}`; }
    if (risk_level) { params.push(risk_level); query += ` AND fd.risk_level = $${params.length}`; }
    if (document_id) { params.push(document_id); query += ` AND fd.document_id = $${params.length}`; }

    query += ' ORDER BY fd.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching fraud detections:', err);
    res.status(500).json({ error: 'Failed to fetch fraud detections' });
  }
});

// GET /api/fraud-detections/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT fd.*, d.title as document_title, u.name as reviewer_name FROM fraud_detections fd LEFT JOIN documents d ON fd.document_id = d.id LEFT JOIN users u ON fd.reviewed_by = u.id WHERE fd.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Fraud detection not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching fraud detection:', err);
    res.status(500).json({ error: 'Failed to fetch fraud detection' });
  }
});

// POST /api/fraud-detections
router.post('/', async (req, res) => {
  try {
    const { document_id, risk_level, risk_score, ai_analysis, flags, status, reviewed_by } = req.body;
    const result = await pool.query(
      'INSERT INTO fraud_detections (document_id, risk_level, risk_score, ai_analysis, flags, status, reviewed_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [document_id, risk_level, risk_score, ai_analysis, flags, status || 'clean', reviewed_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating fraud detection:', err);
    res.status(500).json({ error: 'Failed to create fraud detection' });
  }
});

// PUT /api/fraud-detections/:id
router.put('/:id', async (req, res) => {
  try {
    const { document_id, risk_level, risk_score, ai_analysis, flags, status, reviewed_by } = req.body;
    const result = await pool.query(
      'UPDATE fraud_detections SET document_id = COALESCE($1, document_id), risk_level = COALESCE($2, risk_level), risk_score = COALESCE($3, risk_score), ai_analysis = COALESCE($4, ai_analysis), flags = COALESCE($5, flags), status = COALESCE($6, status), reviewed_by = COALESCE($7, reviewed_by) WHERE id = $8 RETURNING *',
      [document_id, risk_level, risk_score, ai_analysis, flags, status, reviewed_by, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Fraud detection not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating fraud detection:', err);
    res.status(500).json({ error: 'Failed to update fraud detection' });
  }
});

// DELETE /api/fraud-detections/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM fraud_detections WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Fraud detection not found' });
    res.json({ message: 'Fraud detection deleted', detection: result.rows[0] });
  } catch (err) {
    console.error('Error deleting fraud detection:', err);
    res.status(500).json({ error: 'Failed to delete fraud detection' });
  }
});

module.exports = router;
