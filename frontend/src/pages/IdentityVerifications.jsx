import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'
import FormModal from '../components/FormModal'
import DeleteConfirm from '../components/DeleteConfirm'
import AIResultDisplay from '../components/AIResultDisplay'

const ENDPOINT = '/identity-verifications'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'client_name', label: 'Client' },
  { key: 'document_type', label: 'ID Type' },
  { key: 'document_number', label: 'ID Number' },
  { key: 'status', label: 'Status', render: (v) => <span className={`status-badge status-${(v || '').toLowerCase()}`}>{v || '-'}</span> },
  { key: 'confidence_score', label: 'Confidence', render: (v) => v != null ? `${Math.round(v * 100)}%` : '-' },
  { key: 'created_at', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const formFields = [
  { key: 'client_name', label: 'Client Name', required: true },
  { key: 'client_id', label: 'Client ID' },
  { key: 'document_type', label: 'ID Type', type: 'select', options: ['Passport', 'Drivers License', 'State ID', 'Military ID', 'SSN Card'], required: true },
  { key: 'document_number', label: 'ID Number', required: true },
  { key: 'issuing_state', label: 'Issuing State' },
  { key: 'expiration_date', label: 'Expiration Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'verified', 'failed', 'expired'], defaultValue: 'pending' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

export default function IdentityVerifications() {
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
      if (editing?.id) await api.put(`${ENDPOINT}/${editing.id}`, formData)
      else await api.post(ENDPOINT, formData)
      setShowForm(false); fetchData()
    } catch (err) { alert(err.response?.data?.message || 'Error saving') }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`${ENDPOINT}/${selected.id}`)
      setShowDelete(false); setShowDetail(false); setSelected(null); fetchData()
    } catch (err) { alert(err.response?.data?.message || 'Error deleting') }
  }

  const handleAIVerify = async (record) => {
    setAiLoading(true); setAiResult(null)
    try {
      const res = await api.post('/ai/verify-identity', {
        client_id: record.client_id || record.id,
        document_type: record.document_type,
        document_number: record.document_number,
      })
      setAiResult(res.data)
    } catch (err) {
      setAiResult({ summary: 'Verification failed: ' + (err.response?.data?.message || err.message), risk_level: 'high' })
    } finally { setAiLoading(false) }
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{'\u{1F464}'} Identity Verifications</h1>
        <button className="btn btn-primary" onClick={handleCreate}>+ Add New</button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        onRowClick={handleRowClick}
        actions={(row) => (
          <button className="btn btn-sm btn-ai" onClick={() => { setSelected(row); setShowDetail(true); handleAIVerify(row) }}>
            AI Verify
          </button>
        )}
      />
      {showDetail && selected && (
        <DetailModal title={`Verification: ${selected.client_name || selected.id}`} data={selected} onClose={() => { setShowDetail(false); setAiResult(null) }} onEdit={handleEdit} onDelete={handleDeleteClick}>
          <div className="detail-grid">
            {Object.entries(selected).filter(([k]) => k !== '__v').map(([key, value]) => (
              <div key={key} className="detail-field">
                <span className="detail-label">{key.replace(/_/g, ' ').replace(/^./, s => s.toUpperCase())}</span>
                <span className="detail-value">{value == null ? '-' : String(value)}</span>
              </div>
            ))}
          </div>
          <div className="ai-section-wrapper">
            <button className="btn btn-ai" onClick={() => handleAIVerify(selected)} disabled={aiLoading}>
              {aiLoading ? 'Verifying...' : '\u{1F9E0} AI Verify Identity'}
            </button>
            <AIResultDisplay result={aiResult} loading={aiLoading} />
          </div>
        </DetailModal>
      )}
      {showForm && <FormModal title={editing ? 'Edit Verification' : 'New Verification'} fields={formFields} initialData={editing} onSubmit={handleSubmit} onClose={() => setShowForm(false)} />}
      {showDelete && <DeleteConfirm message="Delete this verification?" onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />}
    </div>
  )
}
