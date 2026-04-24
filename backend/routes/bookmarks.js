const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { entity_type, entity_id, label } = req.body;
    const result = await pool.query(
      'INSERT INTO bookmarks (user_id, entity_type, entity_id, label) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, entity_type, entity_id, label]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already bookmarked' });
    res.status(500).json({ error: 'Failed to create bookmark' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM bookmarks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Bookmark removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

module.exports = router;
