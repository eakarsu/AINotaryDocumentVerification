// === Custom View component: VerificationRulesEditor ===
// CRUD editor for verification_rules (doc types + requirements).
import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const empty = { doc_type: '', requirement: '', description: '', is_required: true, state: '' };

export default function VerificationRulesEditor() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/custom-views/verification-rules');
      setRules(res.data.data || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const reset = () => { setForm(empty); setEditId(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.doc_type || !form.requirement) {
      setError('doc_type and requirement are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        doc_type: form.doc_type,
        requirement: form.requirement,
        description: form.description || null,
        is_required: !!form.is_required,
        state: form.state || null,
      };
      if (editId) {
        await api.put(`/custom-views/verification-rules/${editId}`, payload);
      } else {
        await api.post('/custom-views/verification-rules', payload);
      }
      reset();
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r) => {
    setEditId(r.id);
    setForm({
      doc_type: r.doc_type || '',
      requirement: r.requirement || '',
      description: r.description || '',
      is_required: !!r.is_required,
      state: r.state || '',
    });
  };

  const remove = async (id) => {
    if (!window.confirm(`Delete rule ${id}?`)) return;
    try {
      await api.delete(`/custom-views/verification-rules/${id}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const inputStyle = { width: '100%', padding: 6, background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 4, fontSize: 13 };

  return (
    <div style={{ background: '#111827', padding: 16, borderRadius: 8, color: '#e5e7eb' }}>
      <h3 style={{ margin: 0, marginBottom: 12, fontSize: 16, fontWeight: 700 }}>Verification Rules Editor</h3>
      {error && <div style={{ background: '#7f1d1d', color: '#fecaca', padding: 8, borderRadius: 4, marginBottom: 10 }}>{error}</div>}

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 80px auto', gap: 8, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 11, color: '#9ca3af' }}>Doc type *</label>
          <input style={inputStyle} value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))} placeholder="e.g. will" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#9ca3af' }}>Requirement *</label>
          <input style={inputStyle} value={form.requirement} onChange={e => setForm(f => ({ ...f, requirement: e.target.value }))} placeholder="e.g. Two witnesses" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#9ca3af' }}>Description</label>
          <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="optional" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#9ca3af' }}>State</label>
          <input style={inputStyle} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="CA" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#9ca3af' }}>Required</label>
          <input type="checkbox" checked={!!form.is_required} onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="submit" disabled={saving} style={{ padding: '7px 12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
            {editId ? 'Update' : 'Add'}
          </button>
          {editId && (
            <button type="button" onClick={reset} style={{ padding: '7px 10px', background: '#374151', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? <p style={{ color: '#9ca3af' }}>Loading…</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0b1220', color: '#9ca3af', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>ID</th>
                <th style={{ padding: 8 }}>Doc type</th>
                <th style={{ padding: 8 }}>Requirement</th>
                <th style={{ padding: 8 }}>Description</th>
                <th style={{ padding: 8 }}>State</th>
                <th style={{ padding: 8 }}>Required</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 8, color: '#6b7280', textAlign: 'center' }}>No rules yet.</td></tr>
              )}
              {rules.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={{ padding: 8 }}>{r.id}</td>
                  <td style={{ padding: 8 }}>{r.doc_type}</td>
                  <td style={{ padding: 8 }}>{r.requirement}</td>
                  <td style={{ padding: 8, color: '#9ca3af' }}>{r.description || ''}</td>
                  <td style={{ padding: 8 }}>{r.state || ''}</td>
                  <td style={{ padding: 8 }}>{r.is_required ? 'yes' : 'no'}</td>
                  <td style={{ padding: 8, display: 'flex', gap: 4 }}>
                    <button onClick={() => startEdit(r)} style={{ padding: '4px 10px', background: '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: 4, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => remove(r.id)} style={{ padding: '4px 10px', background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
