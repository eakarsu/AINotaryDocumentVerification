import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'
import FormModal from '../components/FormModal'
import DeleteConfirm from '../components/DeleteConfirm'
import AIResultDisplay from '../components/AIResultDisplay'

const ENDPOINT = '/documents'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status', render: (v) => <span className={`status-badge status-${(v || '').toLowerCase()}`}>{v || '-'}</span> },
  { key: 'client_name', label: 'Client' },
  { key: 'created_at', label: 'Created', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const formFields = [
  { key: 'title', label: 'Title', required: true },
  { key: 'type', label: 'Type', type: 'select', options: ['Contract', 'Deed', 'Affidavit', 'Power of Attorney', 'Will', 'Trust', 'Other'], required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['draft', 'pending', 'verified', 'notarized', 'rejected'], defaultValue: 'draft' },
  { key: 'client_name', label: 'Client Name' },
  { key: 'client_email', label: 'Client Email', type: 'email' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'content', label: 'Content', type: 'textarea' },
]

export default function Documents() {
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

  const handleAIAnalyze = async (doc) => {
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await api.post('/ai/analyze-document', {
        document_id: doc.id,
        content: doc.content || doc.description || doc.title,
        analysis_type: 'comprehensive'
      })
      setAiResult(res.data)
    } catch (err) {
      setAiResult({ summary: 'Analysis failed: ' + (err.response?.data?.message || err.message), risk_level: 'high' })
    } finally { setAiLoading(false) }
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{'\u{1F4C4}'} Documents</h1>
        <button className="btn btn-primary" onClick={handleCreate}>+ Add New</button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        onRowClick={handleRowClick}
        actions={(row) => (
          <button className="btn btn-sm btn-ai" onClick={() => { setSelected(row); setShowDetail(true); handleAIAnalyze(row) }}>
            AI Analyze
          </button>
        )}
      />

      {showDetail && selected && (
        <DetailModal
          title={`Document: ${selected.title || selected.id}`}
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
            <button className="btn btn-ai" onClick={() => handleAIAnalyze(selected)} disabled={aiLoading}>
              {aiLoading ? 'Analyzing...' : '\u{1F9E0} AI Analyze Document'}
            </button>
            <AIResultDisplay result={aiResult} loading={aiLoading} />
          </div>
        </DetailModal>
      )}

      {showForm && (
        <FormModal
          title={editing ? 'Edit Document' : 'New Document'}
          fields={formFields}
          initialData={editing}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {showDelete && (
        <DeleteConfirm
          message={`Delete document "${selected?.title}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}
