const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/payments
router.get('/', async (req, res) => {
  try {
    const { status, method, client_id } = req.query;
    let query = 'SELECT p.*, c.name as client_name, n.type as notarization_type FROM payments p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN notarizations n ON p.notarization_id = n.id WHERE 1=1';
    const params = [];

    if (status) { params.push(status); query += ` AND p.status = $${params.length}`; }
    if (method) { params.push(method); query += ` AND p.method = $${params.length}`; }
    if (client_id) { params.push(client_id); query += ` AND p.client_id = $${params.length}`; }

    query += ' ORDER BY p.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET /api/payments/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.*, c.name as client_name, n.type as notarization_type FROM payments p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN notarizations n ON p.notarization_id = n.id WHERE p.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching payment:', err);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// POST /api/payments
router.post('/', async (req, res) => {
  try {
    const { notarization_id, client_id, amount, status, method, transaction_id, description } = req.body;
    const result = await pool.query(
      'INSERT INTO payments (notarization_id, client_id, amount, status, method, transaction_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [notarization_id, client_id, amount, status || 'pending', method, transaction_id, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// PUT /api/payments/:id
router.put('/:id', async (req, res) => {
  try {
    const { notarization_id, client_id, amount, status, method, transaction_id, description } = req.body;
    const result = await pool.query(
      'UPDATE payments SET notarization_id = COALESCE($1, notarization_id), client_id = COALESCE($2, client_id), amount = COALESCE($3, amount), status = COALESCE($4, status), method = COALESCE($5, method), transaction_id = COALESCE($6, transaction_id), description = COALESCE($7, description) WHERE id = $8 RETURNING *',
      [notarization_id, client_id, amount, status, method, transaction_id, description, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating payment:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM payments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted', payment: result.rows[0] });
  } catch (err) {
    console.error('Error deleting payment:', err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

module.exports = router;
