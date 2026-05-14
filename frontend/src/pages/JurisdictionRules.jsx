import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
]

export default function JurisdictionRules() {
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [stateFilter, setStateFilter] = useState('')
  const [form, setForm] = useState({ state: '', rule_type: '', rule_text: '', effective_date: '' })

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: pagination.limit })
      if (stateFilter) params.set('state', stateFilter)
      const res = await api.get(`/jurisdiction-rules?${params}`)
      setData(res.data.data || [])
      if (res.data.pagination) setPagination(res.data.pagination)
    } catch {
      setData([])
    }
    setLoading(false)
  }, [pagination.limit, stateFilter])

  useEffect(() => { fetchData(1) }, [fetchData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editItem) {
        await api.put(`/jurisdiction-rules/${editItem.id}`, form)
      } else {
        await api.post('/jurisdiction-rules', form)
      }
      setShowForm(false)
      setEditItem(null)
      setForm({ state: '', rule_type: '', rule_text: '', effective_date: '' })
      fetchData(1)
    } catch (err) {
      alert('Error saving rule: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({
      state: item.state || '',
      rule_type: item.rule_type || '',
      rule_text: item.rule_text || '',
      effective_date: item.effective_date ? item.effective_date.split('T')[0] : '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rule?')) return
    try {
      await api.delete(`/jurisdiction-rules/${id}`)
      fetchData(pagination.page)
    } catch (err) {
      alert('Error deleting: ' + (err.response?.data?.error || err.message))
    }
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>&#x2696;&#xFE0F; Jurisdiction Rules</h1>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setForm({ state: '', rule_type: '', rule_text: '', effective_date: '' }); setShowForm(true) }}>
          + Add Rule
        </button>
      </div>

      <div className="filters-bar" style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
          <option value="">All States</option>
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : data.length === 0 ? (
        <div className="empty-state">No jurisdiction rules found. Add your first rule!</div>
      ) : (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>State</th>
                  <th>Rule Type</th>
                  <th>Rule Text</th>
                  <th>Effective Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td><span className="status-badge">{row.state}</span></td>
                    <td>{row.rule_type}</td>
                    <td className="truncate" style={{ maxWidth: 300 }}>{row.rule_text}</td>
                    <td>{row.effective_date ? new Date(row.effective_date).toLocaleDateString() : '-'}</td>
                    <td className="actions-cell">
                      <button className="btn btn-sm btn-edit" onClick={() => handleEdit(row)}>Edit</button>
                      <button className="btn btn-sm btn-delete" onClick={() => handleDelete(row.id)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm" disabled={pagination.page <= 1} onClick={() => fetchData(pagination.page - 1)}>&laquo; Prev</button>
              <span className="pagination-info">Page {pagination.page} of {pagination.totalPages}</span>
              <button className="btn btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchData(pagination.page + 1)}>Next &raquo;</button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Rule' : 'New Jurisdiction Rule'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&#x2715;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>State *</label>
                <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} required>
                  <option value="">Select state...</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Rule Type *</label>
                <input
                  type="text"
                  value={form.rule_type}
                  onChange={e => setForm(f => ({ ...f, rule_type: e.target.value }))}
                  placeholder="e.g., witness_requirement, seal_requirement"
                  required
                />
              </div>
              <div className="form-group">
                <label>Rule Text *</label>
                <textarea
                  value={form.rule_text}
                  onChange={e => setForm(f => ({ ...f, rule_text: e.target.value }))}
                  placeholder="Describe the rule..."
                  rows={4}
                  required
                />
              </div>
              <div className="form-group">
                <label>Effective Date</label>
                <input
                  type="date"
                  value={form.effective_date}
                  onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Create Rule'}</button>
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
