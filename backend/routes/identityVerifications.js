const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/identity-verifications
router.get('/', async (req, res) => {
  try {
    const { status, verification_type, client_id } = req.query;
    let query = 'SELECT iv.*, c.name as client_name FROM identity_verifications iv LEFT JOIN clients c ON iv.client_id = c.id WHERE 1=1';
    const params = [];

    if (status) { params.push(status); query += ` AND iv.status = $${params.length}`; }
    if (verification_type) { params.push(verification_type); query += ` AND iv.verification_type = $${params.length}`; }
    if (client_id) { params.push(client_id); query += ` AND iv.client_id = $${params.length}`; }

    query += ' ORDER BY iv.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching identity verifications:', err);
    res.status(500).json({ error: 'Failed to fetch identity verifications' });
  }
});

// GET /api/identity-verifications/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT iv.*, c.name as client_name FROM identity_verifications iv LEFT JOIN clients c ON iv.client_id = c.id WHERE iv.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Identity verification not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching identity verification:', err);
    res.status(500).json({ error: 'Failed to fetch identity verification' });
  }
});

// POST /api/identity-verifications
router.post('/', async (req, res) => {
  try {
    const { client_id, verification_type, status, confidence_score, ai_result, document_number, expiry_date } = req.body;
    const result = await pool.query(
      'INSERT INTO identity_verifications (client_id, verification_type, status, confidence_score, ai_result, document_number, expiry_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [client_id, verification_type, status || 'pending', confidence_score, ai_result, document_number, expiry_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating identity verification:', err);
    res.status(500).json({ error: 'Failed to create identity verification' });
  }
});

// PUT /api/identity-verifications/:id
router.put('/:id', async (req, res) => {
  try {
    const { client_id, verification_type, status, confidence_score, ai_result, document_number, expiry_date } = req.body;
    const result = await pool.query(
      'UPDATE identity_verifications SET client_id = COALESCE($1, client_id), verification_type = COALESCE($2, verification_type), status = COALESCE($3, status), confidence_score = COALESCE($4, confidence_score), ai_result = COALESCE($5, ai_result), document_number = COALESCE($6, document_number), expiry_date = COALESCE($7, expiry_date) WHERE id = $8 RETURNING *',
      [client_id, verification_type, status, confidence_score, ai_result, document_number, expiry_date, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Identity verification not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating identity verification:', err);
    res.status(500).json({ error: 'Failed to update identity verification' });
  }
});

// DELETE /api/identity-verifications/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM identity_verifications WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Identity verification not found' });
    res.json({ message: 'Identity verification deleted', verification: result.rows[0] });
  } catch (err) {
    console.error('Error deleting identity verification:', err);
    res.status(500).json({ error: 'Failed to delete identity verification' });
  }
});

module.exports = router;
