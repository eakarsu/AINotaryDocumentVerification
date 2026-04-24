const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/notary-journal
router.get('/', async (req, res) => {
  try {
    const { notary_id, notary_act, document_type } = req.query;
    let query = 'SELECT nj.*, u.name as notary_name FROM notary_journal nj LEFT JOIN users u ON nj.notary_id = u.id WHERE 1=1';
    const params = [];

    if (notary_id) { params.push(notary_id); query += ` AND nj.notary_id = $${params.length}`; }
    if (notary_act) { params.push(notary_act); query += ` AND nj.notary_act = $${params.length}`; }
    if (document_type) { params.push(document_type); query += ` AND nj.document_type = $${params.length}`; }

    query += ' ORDER BY nj.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notary journal:', err);
    res.status(500).json({ error: 'Failed to fetch notary journal' });
  }
});

// GET /api/notary-journal/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT nj.*, u.name as notary_name FROM notary_journal nj LEFT JOIN users u ON nj.notary_id = u.id WHERE nj.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Journal entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching journal entry:', err);
    res.status(500).json({ error: 'Failed to fetch journal entry' });
  }
});

// POST /api/notary-journal
router.post('/', async (req, res) => {
  try {
    const { notary_id, document_type, signer_name, signer_address, id_type, id_number, notary_act, fee, date_performed, witness_name, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO notary_journal (notary_id, document_type, signer_name, signer_address, id_type, id_number, notary_act, fee, date_performed, witness_name, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [notary_id || req.user.id, document_type, signer_name, signer_address, id_type, id_number, notary_act, fee, date_performed, witness_name, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating journal entry:', err);
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

// PUT /api/notary-journal/:id
router.put('/:id', async (req, res) => {
  try {
    const { notary_id, document_type, signer_name, signer_address, id_type, id_number, notary_act, fee, date_performed, witness_name, notes } = req.body;
    const result = await pool.query(
      'UPDATE notary_journal SET notary_id = COALESCE($1, notary_id), document_type = COALESCE($2, document_type), signer_name = COALESCE($3, signer_name), signer_address = COALESCE($4, signer_address), id_type = COALESCE($5, id_type), id_number = COALESCE($6, id_number), notary_act = COALESCE($7, notary_act), fee = COALESCE($8, fee), date_performed = COALESCE($9, date_performed), witness_name = COALESCE($10, witness_name), notes = COALESCE($11, notes) WHERE id = $12 RETURNING *',
      [notary_id, document_type, signer_name, signer_address, id_type, id_number, notary_act, fee, date_performed, witness_name, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Journal entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating journal entry:', err);
    res.status(500).json({ error: 'Failed to update journal entry' });
  }
});

// DELETE /api/notary-journal/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM notary_journal WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Journal entry not found' });
    res.json({ message: 'Journal entry deleted', entry: result.rows[0] });
  } catch (err) {
    console.error('Error deleting journal entry:', err);
    res.status(500).json({ error: 'Failed to delete journal entry' });
  }
});

module.exports = router;
