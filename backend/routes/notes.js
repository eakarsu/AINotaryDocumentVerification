const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;
    let query = 'SELECT n.*, u.name as author_name FROM notes n LEFT JOIN users u ON n.user_id = u.id';
    const params = [];

    if (entity_type && entity_id) {
      query += ' WHERE n.entity_type = $1 AND n.entity_id = $2';
      params.push(entity_type, entity_id);
    }

    query += ' ORDER BY n.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { entity_type, entity_id, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const result = await pool.query(
      'INSERT INTO notes (entity_type, entity_id, user_id, content) VALUES ($1,$2,$3,$4) RETURNING *',
      [entity_type, entity_id, req.user.id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
