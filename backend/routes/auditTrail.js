const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/audit-trail - scoped to logged-in user, with pagination
router.get('/', async (req, res) => {
  try {
    const { action, entity_type } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    let query = 'SELECT at.*, u.name as user_name FROM audit_trail at LEFT JOIN users u ON at.user_id = u.id WHERE at.user_id = $1';
    const params = [req.user.id];

    if (action) { params.push(action); query += ` AND at.action = $${params.length}`; }
    if (entity_type) { params.push(entity_type); query += ` AND at.entity_type = $${params.length}`; }

    const countResult = await pool.query('SELECT COUNT(*) FROM audit_trail WHERE user_id = $1', [req.user.id]);
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY at.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Error fetching audit trail:', err);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

// GET /api/audit-trail/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT at.*, u.name as user_name FROM audit_trail at LEFT JOIN users u ON at.user_id = u.id WHERE at.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Audit record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching audit record:', err);
    res.status(500).json({ error: 'Failed to fetch audit record' });
  }
});

// POST /api/audit-trail
router.post('/', async (req, res) => {
  try {
    const { action, entity_type, entity_id, user_id, details, ip_address } = req.body;
    const result = await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [action, entity_type, entity_id, user_id || req.user.id, details, ip_address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating audit record:', err);
    res.status(500).json({ error: 'Failed to create audit record' });
  }
});

// PUT /api/audit-trail/:id
router.put('/:id', async (req, res) => {
  try {
    const { action, entity_type, entity_id, user_id, details, ip_address } = req.body;
    const result = await pool.query(
      'UPDATE audit_trail SET action = COALESCE($1, action), entity_type = COALESCE($2, entity_type), entity_id = COALESCE($3, entity_id), user_id = COALESCE($4, user_id), details = COALESCE($5, details), ip_address = COALESCE($6, ip_address) WHERE id = $7 RETURNING *',
      [action, entity_type, entity_id, user_id, details, ip_address, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Audit record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating audit record:', err);
    res.status(500).json({ error: 'Failed to update audit record' });
  }
});

// DELETE /api/audit-trail/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM audit_trail WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Audit record not found' });
    res.json({ message: 'Audit record deleted', record: result.rows[0] });
  } catch (err) {
    console.error('Error deleting audit record:', err);
    res.status(500).json({ error: 'Failed to delete audit record' });
  }
});

module.exports = router;
