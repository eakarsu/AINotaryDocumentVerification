const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/ai-analyses
router.get('/', async (req, res) => {
  try {
    const { analysis_type, document_id } = req.query;
    let query = 'SELECT aa.*, d.title as document_title FROM ai_analyses aa LEFT JOIN documents d ON aa.document_id = d.id WHERE 1=1';
    const params = [];

    if (analysis_type) { params.push(analysis_type); query += ` AND aa.analysis_type = $${params.length}`; }
    if (document_id) { params.push(document_id); query += ` AND aa.document_id = $${params.length}`; }

    query += ' ORDER BY aa.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching AI analyses:', err);
    res.status(500).json({ error: 'Failed to fetch AI analyses' });
  }
});

// GET /api/ai-analyses/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT aa.*, d.title as document_title FROM ai_analyses aa LEFT JOIN documents d ON aa.document_id = d.id WHERE aa.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'AI analysis not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching AI analysis:', err);
    res.status(500).json({ error: 'Failed to fetch AI analysis' });
  }
});

// POST /api/ai-analyses
router.post('/', async (req, res) => {
  try {
    const { document_id, analysis_type, result: analysisResult, confidence, model_used, tokens_used, processing_time } = req.body;
    const result = await pool.query(
      'INSERT INTO ai_analyses (document_id, analysis_type, result, confidence, model_used, tokens_used, processing_time) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [document_id, analysis_type, analysisResult, confidence, model_used, tokens_used, processing_time]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating AI analysis:', err);
    res.status(500).json({ error: 'Failed to create AI analysis' });
  }
});

// PUT /api/ai-analyses/:id
router.put('/:id', async (req, res) => {
  try {
    const { document_id, analysis_type, result: analysisResult, confidence, model_used, tokens_used, processing_time } = req.body;
    const result = await pool.query(
      'UPDATE ai_analyses SET document_id = COALESCE($1, document_id), analysis_type = COALESCE($2, analysis_type), result = COALESCE($3, result), confidence = COALESCE($4, confidence), model_used = COALESCE($5, model_used), tokens_used = COALESCE($6, tokens_used), processing_time = COALESCE($7, processing_time) WHERE id = $8 RETURNING *',
      [document_id, analysis_type, analysisResult, confidence, model_used, tokens_used, processing_time, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'AI analysis not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating AI analysis:', err);
    res.status(500).json({ error: 'Failed to update AI analysis' });
  }
});

// DELETE /api/ai-analyses/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ai_analyses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'AI analysis not found' });
    res.json({ message: 'AI analysis deleted', analysis: result.rows[0] });
  } catch (err) {
    console.error('Error deleting AI analysis:', err);
    res.status(500).json({ error: 'Failed to delete AI analysis' });
  }
});

module.exports = router;
