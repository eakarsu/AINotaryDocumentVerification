const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/seals
router.get('/', async (req, res) => {
  try {
    const { status, state, notary_id } = req.query;
    let query = 'SELECT s.*, u.name as notary_name FROM seals s LEFT JOIN users u ON s.notary_id = u.id WHERE 1=1';
    const params = [];

    if (status) { params.push(status); query += ` AND s.status = $${params.length}`; }
    if (state) { params.push(state); query += ` AND s.state = $${params.length}`; }
    if (notary_id) { params.push(notary_id); query += ` AND s.notary_id = $${params.length}`; }

    query += ' ORDER BY s.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching seals:', err);
    res.status(500).json({ error: 'Failed to fetch seals' });
  }
});

// GET /api/seals/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.*, u.name as notary_name FROM seals s LEFT JOIN users u ON s.notary_id = u.id WHERE s.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Seal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching seal:', err);
    res.status(500).json({ error: 'Failed to fetch seal' });
  }
});

// POST /api/seals
router.post('/', async (req, res) => {
  try {
    const { notary_id, seal_number, state, county, commission_number, commission_expiry, status, seal_type } = req.body;
    const result = await pool.query(
      'INSERT INTO seals (notary_id, seal_number, state, county, commission_number, commission_expiry, status, seal_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [notary_id || req.user.id, seal_number, state, county, commission_number, commission_expiry, status || 'active', seal_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating seal:', err);
    res.status(500).json({ error: 'Failed to create seal' });
  }
});

// PUT /api/seals/:id
router.put('/:id', async (req, res) => {
  try {
    const { notary_id, seal_number, state, county, commission_number, commission_expiry, status, seal_type } = req.body;
    const result = await pool.query(
      'UPDATE seals SET notary_id = COALESCE($1, notary_id), seal_number = COALESCE($2, seal_number), state = COALESCE($3, state), county = COALESCE($4, county), commission_number = COALESCE($5, commission_number), commission_expiry = COALESCE($6, commission_expiry), status = COALESCE($7, status), seal_type = COALESCE($8, seal_type) WHERE id = $9 RETURNING *',
      [notary_id, seal_number, state, county, commission_number, commission_expiry, status, seal_type, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Seal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating seal:', err);
    res.status(500).json({ error: 'Failed to update seal' });
  }
});

// DELETE /api/seals/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM seals WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Seal not found' });
    res.json({ message: 'Seal deleted', seal: result.rows[0] });
  } catch (err) {
    console.error('Error deleting seal:', err);
    res.status(500).json({ error: 'Failed to delete seal' });
  }
});

module.exports = router;
