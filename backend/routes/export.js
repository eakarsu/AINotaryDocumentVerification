const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

const EXPORTABLE = {
  documents: 'SELECT id, title, type, status, file_name, file_size, created_at, updated_at FROM documents ORDER BY created_at DESC',
  clients: 'SELECT id, name, email, phone, address, city, state, zip, id_type, id_number, verified, created_at FROM clients ORDER BY created_at DESC',
  notarizations: 'SELECT id, document_id, client_id, notary_id, status, type, scheduled_date, completed_date, fee, location, created_at FROM notarizations ORDER BY created_at DESC',
  payments: 'SELECT id, notarization_id, client_id, amount, status, method, transaction_id, description, created_at FROM payments ORDER BY created_at DESC',
  signatures: 'SELECT id, document_id, signer_name, signer_email, status, signature_type, ip_address, signed_at, created_at FROM digital_signatures ORDER BY created_at DESC',
  templates: 'SELECT id, name, category, description, state, is_active, usage_count, created_at FROM templates ORDER BY created_at DESC',
  witnesses: 'SELECT id, name, email, phone, address, id_type, id_number, relationship, notes, created_at FROM witnesses ORDER BY created_at DESC',
  'audit-trail': 'SELECT id, action, entity_type, entity_id, user_id, details, ip_address, created_at FROM audit_trail ORDER BY created_at DESC',
  'notary-journal': 'SELECT id, notary_id, document_type, signer_name, signer_address, id_type, id_number, notary_act, fee, date_performed, witness_name, notes, created_at FROM notary_journal ORDER BY created_at DESC',
  seals: 'SELECT id, notary_id, seal_number, state, county, commission_number, commission_expiry, status, seal_type, created_at FROM seals ORDER BY created_at DESC',
};

router.get('/:entity', auth, async (req, res) => {
  try {
    const { entity } = req.params;
    const query = EXPORTABLE[entity];
    if (!query) return res.status(400).json({ error: 'Invalid export entity' });

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return res.status(200).send('No data to export');
    }

    const headers = Object.keys(result.rows[0]);
    const csvRows = [headers.join(',')];

    for (const row of result.rows) {
      const values = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      });
      csvRows.push(values.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${entity}-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvRows.join('\n'));
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
