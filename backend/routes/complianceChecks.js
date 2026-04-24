const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/compliance-checks
router.get('/', async (req, res) => {
  try {
    const { status, check_type, document_id } = req.query;
    let query = 'SELECT cc.*, d.title as document_title FROM compliance_checks cc LEFT JOIN documents d ON cc.document_id = d.id WHERE 1=1';
    const params = [];

    if (status) { params.push(status); query += ` AND cc.status = $${params.length}`; }
    if (check_type) { params.push(check_type); query += ` AND cc.check_type = $${params.length}`; }
    if (document_id) { params.push(document_id); query += ` AND cc.document_id = $${params.length}`; }

    query += ' ORDER BY cc.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching compliance checks:', err);
    res.status(500).json({ error: 'Failed to fetch compliance checks' });
  }
});

// GET /api/compliance-checks/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT cc.*, d.title as document_title FROM compliance_checks cc LEFT JOIN documents d ON cc.document_id = d.id WHERE cc.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance check not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching compliance check:', err);
    res.status(500).json({ error: 'Failed to fetch compliance check' });
  }
});

// POST /api/compliance-checks
router.post('/', async (req, res) => {
  try {
    const { document_id, check_type, status, issues, recommendations, checked_by } = req.body;
    const result = await pool.query(
      'INSERT INTO compliance_checks (document_id, check_type, status, issues, recommendations, checked_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [document_id, check_type, status || 'pending', issues, recommendations, checked_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating compliance check:', err);
    res.status(500).json({ error: 'Failed to create compliance check' });
  }
});

// PUT /api/compliance-checks/:id
router.put('/:id', async (req, res) => {
  try {
    const { document_id, check_type, status, issues, recommendations, checked_by } = req.body;
    const result = await pool.query(
      'UPDATE compliance_checks SET document_id = COALESCE($1, document_id), check_type = COALESCE($2, check_type), status = COALESCE($3, status), issues = COALESCE($4, issues), recommendations = COALESCE($5, recommendations), checked_by = COALESCE($6, checked_by) WHERE id = $7 RETURNING *',
      [document_id, check_type, status, issues, recommendations, checked_by, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance check not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating compliance check:', err);
    res.status(500).json({ error: 'Failed to update compliance check' });
  }
});

// DELETE /api/compliance-checks/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM compliance_checks WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance check not found' });
    res.json({ message: 'Compliance check deleted', check: result.rows[0] });
  } catch (err) {
    console.error('Error deleting compliance check:', err);
    res.status(500).json({ error: 'Failed to delete compliance check' });
  }
});

module.exports = router;
