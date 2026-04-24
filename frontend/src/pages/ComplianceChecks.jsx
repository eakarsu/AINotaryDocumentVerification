import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'
import FormModal from '../components/FormModal'
import DeleteConfirm from '../components/DeleteConfirm'
import AIResultDisplay from '../components/AIResultDisplay'

const ENDPOINT = '/compliance-checks'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'document_id', label: 'Document ID' },
  { key: 'check_type', label: 'Check Type' },
  { key: 'status', label: 'Status', render: (v) => <span className={`status-badge status-${(v || '').toLowerCase()}`}>{v || '-'}</span> },
  { key: 'checked_by', label: 'Checked By' },
  { key: 'created_at', label: 'Created', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const formFields = [
  { key: 'document_id', label: 'Document ID', type: 'number', required: true },
  { key: 'check_type', label: 'Check Type', type: 'select', options: ['state_compliance', 'federal_compliance', 'identity_match', 'expiry_check', 'signature_verification', 'seal_verification', 'witness_requirement', 'jurisdiction_check'], required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'passed', 'failed', 'warning'], defaultValue: 'pending' },
  { key: 'issues', label: 'Issues', type: 'textarea' },
  { key: 'recommendations', label: 'Recommendations', type: 'textarea' },
  { key: 'checked_by', label: 'Checked By' },
]

export default function ComplianceChecks() {
  const [data, setData] = useState([])
  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(ENDPOINT)
      setData(Array.isArray(res.data) ? res.data : res.data.data || [])
    } catch { setData([]) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRowClick = (row) => { setSelected(row); setShowDetail(true); setAiResult(null) }
  const handleCreate = () => { setEditing(null); setShowForm(true) }
  const handleEdit = () => { setEditing(selected); setShowDetail(false); setShowForm(true) }
  const handleDeleteClick = () => { setShowDelete(true) }

  const handleSubmit = async (formData) => {
    try {
      if (editing && editing.id) {
        await api.put(`${ENDPOINT}/${editing.id}`, formData)
      } else {
        await api.post(ENDPOINT, formData)
      }
      setShowForm(false)
      fetchData()
    } catch (err) { alert(err.response?.data?.message || 'Error saving record') }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`${ENDPOINT}/${selected.id}`)
      setShowDelete(false)
      setShowDetail(false)
      setSelected(null)
      fetchData()
    } catch (err) { alert(err.response?.data?.message || 'Error deleting record') }
  }

  const handleAICheck = async (record) => {
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await api.post('/ai/check-compliance', {
        document_id: record.document_id,
        state: 'California',
        document_type: record.check_type || 'general'
      })
      setAiResult(res.data)
    } catch (err) {
      setAiResult({ summary: 'Compliance check failed: ' + (err.response?.data?.message || err.message), risk_level: 'high' })
    } finally { setAiLoading(false) }
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{'\u2705'} Compliance Checks</h1>
        <button className="btn btn-primary" onClick={handleCreate}>+ Add New</button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        onRowClick={handleRowClick}
        actions={(row) => (
          <button className="btn btn-sm btn-ai" onClick={() => { setSelected(row); setShowDetail(true); handleAICheck(row) }}>
            AI Check
          </button>
        )}
      />

      {showDetail && selected && (
        <DetailModal
          title={`Compliance Check #${selected.id}`}
          data={selected}
          onClose={() => { setShowDetail(false); setAiResult(null) }}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        >
          <div className="detail-grid">
            {Object.entries(selected).filter(([k]) => k !== '__v').map(([key, value]) => (
              <div key={key} className="detail-field">
                <span className="detail-label">{key.replace(/_/g, ' ').replace(/^./, s => s.toUpperCase())}</span>
                <span className="detail-value">{value == null ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
              </div>
            ))}
          </div>
          <div className="ai-section-wrapper">
            <button className="btn btn-ai" onClick={() => handleAICheck(selected)} disabled={aiLoading}>
              {aiLoading ? 'Checking...' : '\u2705 AI Compliance Check'}
            </button>
            <AIResultDisplay result={aiResult} loading={aiLoading} />
          </div>
        </DetailModal>
      )}

      {showForm && (
        <FormModal
          title={editing ? 'Edit Compliance Check' : 'New Compliance Check'}
          fields={formFields}
          initialData={editing}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {showDelete && (
        <DeleteConfirm
          message={`Delete compliance check #${selected?.id}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}
