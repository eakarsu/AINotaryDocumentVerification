const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/templates
router.get('/', async (req, res) => {
  try {
    const { category, state, is_active } = req.query;
    let query = 'SELECT * FROM templates WHERE 1=1';
    const params = [];

    if (category) { params.push(category); query += ` AND category = $${params.length}`; }
    if (state) { params.push(state); query += ` AND state = $${params.length}`; }
    if (is_active !== undefined) { params.push(is_active === 'true'); query += ` AND is_active = $${params.length}`; }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/templates/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching template:', err);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST /api/templates
router.post('/', async (req, res) => {
  try {
    const { name, category, description, content, state, is_active } = req.body;
    const result = await pool.query(
      'INSERT INTO templates (name, category, description, content, state, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, category, description, content, state, is_active !== undefined ? is_active : true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/templates/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, category, description, content, state, is_active, usage_count } = req.body;
    const result = await pool.query(
      'UPDATE templates SET name = COALESCE($1, name), category = COALESCE($2, category), description = COALESCE($3, description), content = COALESCE($4, content), state = COALESCE($5, state), is_active = COALESCE($6, is_active), usage_count = COALESCE($7, usage_count) WHERE id = $8 RETURNING *',
      [name, category, description, content, state, is_active, usage_count, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM templates WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ message: 'Template deleted', template: result.rows[0] });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
