const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/clients
router.get('/', async (req, res) => {
  try {
    const { verified, state, city } = req.query;
    let query = 'SELECT * FROM clients WHERE 1=1';
    const params = [];

    if (verified !== undefined) { params.push(verified === 'true'); query += ` AND verified = $${params.length}`; }
    if (state) { params.push(state); query += ` AND state = $${params.length}`; }
    if (city) { params.push(city); query += ` AND city = $${params.length}`; }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching client:', err);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// POST /api/clients
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, city, state, zip, id_type, id_number, verified, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO clients (name, email, phone, address, city, state, zip, id_type, id_number, verified, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [name, email, phone, address, city, state, zip, id_type, id_number, verified || false, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, address, city, state, zip, id_type, id_number, verified, notes } = req.body;
    const result = await pool.query(
      'UPDATE clients SET name = COALESCE($1, name), email = COALESCE($2, email), phone = COALESCE($3, phone), address = COALESCE($4, address), city = COALESCE($5, city), state = COALESCE($6, state), zip = COALESCE($7, zip), id_type = COALESCE($8, id_type), id_number = COALESCE($9, id_number), verified = COALESCE($10, verified), notes = COALESCE($11, notes) WHERE id = $12 RETURNING *',
      [name, email, phone, address, city, state, zip, id_type, id_number, verified, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: 'Client deleted', client: result.rows[0] });
  } catch (err) {
    console.error('Error deleting client:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

module.exports = router;
