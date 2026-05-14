const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// Ensure the table exists
async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jurisdiction_rules (
        id SERIAL PRIMARY KEY,
        state VARCHAR(50),
        rule_type VARCHAR(100),
        rule_text TEXT,
        effective_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch {}
}
ensureTable();

// GET /api/jurisdiction-rules?page=1&limit=20&state=CA
router.get('/', async (req, res) => {
  try {
    const { state } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];

    if (state) {
      params.push(state);
      where += ` AND LOWER(state) = LOWER($${params.length})`;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM jurisdiction_rules ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM jurisdiction_rules ${where} ORDER BY state, effective_date DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jurisdiction rules', details: err.message });
  }
});

// GET /api/jurisdiction-rules/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jurisdiction_rules WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rule', details: err.message });
  }
});

// POST /api/jurisdiction-rules
router.post('/', async (req, res) => {
  try {
    const { state, rule_type, rule_text, effective_date } = req.body;
    if (!state || !rule_type || !rule_text) {
      return res.status(400).json({ error: 'state, rule_type, and rule_text are required' });
    }
    const result = await pool.query(
      `INSERT INTO jurisdiction_rules (state, rule_type, rule_text, effective_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [state, rule_type, rule_text, effective_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create rule', details: err.message });
  }
});

// PUT /api/jurisdiction-rules/:id
router.put('/:id', async (req, res) => {
  try {
    const { state, rule_type, rule_text, effective_date } = req.body;
    const result = await pool.query(
      `UPDATE jurisdiction_rules
       SET state = COALESCE($1, state),
           rule_type = COALESCE($2, rule_type),
           rule_text = COALESCE($3, rule_text),
           effective_date = COALESCE($4, effective_date)
       WHERE id = $5 RETURNING *`,
      [state, rule_type, rule_text, effective_date, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rule', details: err.message });
  }
});

// DELETE /api/jurisdiction-rules/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM jurisdiction_rules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rule', details: err.message });
  }
});

module.exports = router;
