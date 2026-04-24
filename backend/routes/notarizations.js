const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/notarizations
router.get('/', async (req, res) => {
  try {
    const { status, type, notary_id, client_id } = req.query;
    let query = 'SELECT n.*, d.title as document_title, c.name as client_name, u.name as notary_name FROM notarizations n LEFT JOIN documents d ON n.document_id = d.id LEFT JOIN clients c ON n.client_id = c.id LEFT JOIN users u ON n.notary_id = u.id WHERE 1=1';
    const params = [];

    if (status) { params.push(status); query += ` AND n.status = $${params.length}`; }
    if (type) { params.push(type); query += ` AND n.type = $${params.length}`; }
    if (notary_id) { params.push(notary_id); query += ` AND n.notary_id = $${params.length}`; }
    if (client_id) { params.push(client_id); query += ` AND n.client_id = $${params.length}`; }

    query += ' ORDER BY n.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notarizations:', err);
    res.status(500).json({ error: 'Failed to fetch notarizations' });
  }
});

// GET /api/notarizations/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT n.*, d.title as document_title, c.name as client_name, u.name as notary_name FROM notarizations n LEFT JOIN documents d ON n.document_id = d.id LEFT JOIN clients c ON n.client_id = c.id LEFT JOIN users u ON n.notary_id = u.id WHERE n.id = $1',
      [req.params.id]
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
    const { document_id, client_id, notary_id, status, type, scheduled_date, completed_date, fee, location, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO notarizations (document_id, client_id, notary_id, status, type, scheduled_date, completed_date, fee, location, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [document_id, client_id, notary_id || req.user.id, status || 'scheduled', type, scheduled_date, completed_date, fee, location, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating notarization:', err);
    res.status(500).json({ error: 'Failed to create notarization' });
  }
});

// PUT /api/notarizations/:id
router.put('/:id', async (req, res) => {
  try {
    const { document_id, client_id, notary_id, status, type, scheduled_date, completed_date, fee, location, notes } = req.body;
    const result = await pool.query(
      'UPDATE notarizations SET document_id = COALESCE($1, document_id), client_id = COALESCE($2, client_id), notary_id = COALESCE($3, notary_id), status = COALESCE($4, status), type = COALESCE($5, type), scheduled_date = COALESCE($6, scheduled_date), completed_date = COALESCE($7, completed_date), fee = COALESCE($8, fee), location = COALESCE($9, location), notes = COALESCE($10, notes) WHERE id = $11 RETURNING *',
      [document_id, client_id, notary_id, status, type, scheduled_date, completed_date, fee, location, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notarization not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating notarization:', err);
    res.status(500).json({ error: 'Failed to update notarization' });
  }
});

// DELETE /api/notarizations/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM notarizations WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notarization not found' });
    res.json({ message: 'Notarization deleted', notarization: result.rows[0] });
  } catch (err) {
    console.error('Error deleting notarization:', err);
    res.status(500).json({ error: 'Failed to delete notarization' });
  }
});

module.exports = router;
