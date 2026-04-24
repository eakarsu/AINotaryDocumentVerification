const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM witnesses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Witnesses error:', err);
    res.status(500).json({ error: 'Failed to fetch witnesses' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM witnesses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Witness not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch witness' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, address, id_type, id_number, notarization_id, relationship, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO witnesses (name, email, phone, address, id_type, id_number, notarization_id, relationship, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [name, email, phone, address, id_type, id_number, notarization_id, relationship, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create witness error:', err);
    res.status(500).json({ error: 'Failed to create witness' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, phone, address, id_type, id_number, notarization_id, relationship, notes } = req.body;
    const result = await pool.query(
      'UPDATE witnesses SET name=$1, email=$2, phone=$3, address=$4, id_type=$5, id_number=$6, notarization_id=$7, relationship=$8, notes=$9 WHERE id=$10 RETURNING *',
      [name, email, phone, address, id_type, id_number, notarization_id, relationship, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update witness' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM witnesses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Witness deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete witness' });
  }
});

module.exports = router;
