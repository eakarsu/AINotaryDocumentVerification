const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/signatures
router.get('/', async (req, res) => {
  try {
    const { status, signature_type, document_id } = req.query;
    let query = 'SELECT ds.*, d.title as document_title FROM digital_signatures ds LEFT JOIN documents d ON ds.document_id = d.id WHERE 1=1';
    const params = [];

    if (status) { params.push(status); query += ` AND ds.status = $${params.length}`; }
    if (signature_type) { params.push(signature_type); query += ` AND ds.signature_type = $${params.length}`; }
    if (document_id) { params.push(document_id); query += ` AND ds.document_id = $${params.length}`; }

    query += ' ORDER BY ds.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching signatures:', err);
    res.status(500).json({ error: 'Failed to fetch signatures' });
  }
});

// GET /api/signatures/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT ds.*, d.title as document_title FROM digital_signatures ds LEFT JOIN documents d ON ds.document_id = d.id WHERE ds.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Signature not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching signature:', err);
    res.status(500).json({ error: 'Failed to fetch signature' });
  }
});

// POST /api/signatures
router.post('/', async (req, res) => {
  try {
    const { document_id, signer_name, signer_email, status, signature_type, ip_address, signed_at } = req.body;
    const result = await pool.query(
      'INSERT INTO digital_signatures (document_id, signer_name, signer_email, status, signature_type, ip_address, signed_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [document_id, signer_name, signer_email, status || 'pending', signature_type, ip_address, signed_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating signature:', err);
    res.status(500).json({ error: 'Failed to create signature' });
  }
});

// PUT /api/signatures/:id
router.put('/:id', async (req, res) => {
  try {
    const { document_id, signer_name, signer_email, status, signature_type, ip_address, signed_at } = req.body;
    const result = await pool.query(
      'UPDATE digital_signatures SET document_id = COALESCE($1, document_id), signer_name = COALESCE($2, signer_name), signer_email = COALESCE($3, signer_email), status = COALESCE($4, status), signature_type = COALESCE($5, signature_type), ip_address = COALESCE($6, ip_address), signed_at = COALESCE($7, signed_at) WHERE id = $8 RETURNING *',
      [document_id, signer_name, signer_email, status, signature_type, ip_address, signed_at, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Signature not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating signature:', err);
    res.status(500).json({ error: 'Failed to update signature' });
  }
});

// DELETE /api/signatures/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM digital_signatures WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Signature not found' });
    res.json({ message: 'Signature deleted', signature: result.rows[0] });
  } catch (err) {
    console.error('Error deleting signature:', err);
    res.status(500).json({ error: 'Failed to delete signature' });
  }
});

module.exports = router;
