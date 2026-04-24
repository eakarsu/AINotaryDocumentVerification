const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET / - dashboard summary stats
router.get('/', auth, async (req, res) => {
  try {
    const [docs, notars, clients, payments, signatures, frauds, verifications] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, status FROM documents GROUP BY status'),
      pool.query('SELECT COUNT(*) as total, status FROM notarizations GROUP BY status'),
      pool.query('SELECT COUNT(*) as total, verified FROM clients GROUP BY verified'),
      pool.query('SELECT COUNT(*) as total, SUM(amount) as revenue, status FROM payments GROUP BY status'),
      pool.query('SELECT COUNT(*) as total, status FROM digital_signatures GROUP BY status'),
      pool.query('SELECT COUNT(*) as total, risk_level FROM fraud_detections GROUP BY risk_level'),
      pool.query('SELECT COUNT(*) as total, status FROM identity_verifications GROUP BY status'),
    ]);

    res.json({
      documents: docs.rows,
      notarizations: notars.rows,
      clients: clients.rows,
      payments: payments.rows,
      signatures: signatures.rows,
      fraud_detections: frauds.rows,
      identity_verifications: verifications.rows,
    });
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

// GET /revenue - monthly revenue data
router.get('/revenue', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as revenue
      FROM payments
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Revenue report error:', err);
    res.status(500).json({ error: 'Failed to generate revenue report' });
  }
});

// GET /activity - recent activity across all tables
router.get('/activity', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM (
        SELECT 'document' as type, title as description, status, created_at FROM documents
        UNION ALL
        SELECT 'notarization' as type, CONCAT('Notarization #', id) as description, status, created_at FROM notarizations
        UNION ALL
        SELECT 'payment' as type, CONCAT('Payment $', amount) as description, status, created_at FROM payments
        UNION ALL
        SELECT 'signature' as type, CONCAT('Signature by ', signer_name) as description, status, created_at FROM digital_signatures
        UNION ALL
        SELECT 'client' as type, CONCAT('Client: ', name) as description, CASE WHEN verified THEN 'verified' ELSE 'unverified' END as status, created_at FROM clients
      ) combined
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Activity report error:', err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

module.exports = router;
