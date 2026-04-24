const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ results: [] });

    const searchTerm = `%${q.trim()}%`;

    const [docs, clients, notarizations, signatures, templates] = await Promise.all([
      pool.query('SELECT id, title as name, type, status, \'document\' as entity FROM documents WHERE title ILIKE $1 OR type ILIKE $1 LIMIT 10', [searchTerm]),
      pool.query('SELECT id, name, email, \'client\' as entity FROM clients WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 10', [searchTerm]),
      pool.query('SELECT id, CONCAT(\'Notarization #\', id) as name, status, type, \'notarization\' as entity FROM notarizations WHERE type ILIKE $1 OR location ILIKE $1 OR notes ILIKE $1 LIMIT 10', [searchTerm]),
      pool.query('SELECT id, signer_name as name, signer_email as email, status, \'signature\' as entity FROM digital_signatures WHERE signer_name ILIKE $1 OR signer_email ILIKE $1 LIMIT 10', [searchTerm]),
      pool.query('SELECT id, name, category, \'template\' as entity FROM templates WHERE name ILIKE $1 OR category ILIKE $1 LIMIT 10', [searchTerm]),
    ]);

    res.json({
      results: [
        ...docs.rows,
        ...clients.rows,
        ...notarizations.rows,
        ...signatures.rows,
        ...templates.rows,
      ]
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
