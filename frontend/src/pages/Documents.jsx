import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'
import FormModal from '../components/FormModal'
import DeleteConfirm from '../components/DeleteConfirm'
import AIResultDisplay from '../components/AIResultDisplay'
import UploadDocument from '../components/UploadDocument'

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
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [docAiAnalyses, setDocAiAnalyses] = useState({}) // document_id -> analyses array
  const [showUpload, setShowUpload] = useState(false)

  const fetchData = useCallback(async (page = 1) => {
    try {
      const res = await api.get(`${ENDPOINT}?page=${page}&limit=${pagination.limit}`)
      const rows = Array.isArray(res.data) ? res.data : res.data.data || []
      setData(rows)
      if (res.data.pagination) setPagination(res.data.pagination)
    } catch { setData([]) }
  }, [pagination.limit])

  useEffect(() => { fetchData(1) }, [fetchData])

  const fetchDocAnalyses = async (docId) => {
    try {
      const res = await api.get(`/ai-analyses?document_id=${docId}`)
      const analyses = Array.isArray(res.data) ? res.data : res.data.data || []
      setDocAiAnalyses(prev => ({ ...prev, [docId]: analyses }))
    } catch {}
  }

  const handleRowClick = (row) => {
    setSelected(row)
    setShowDetail(true)
    setAiResult(null)
    fetchDocAnalyses(row.id)
  }

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
      fetchData(pagination.page)
    } catch (err) { alert(err.response?.data?.message || 'Error saving record') }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`${ENDPOINT}/${selected.id}`)
      setShowDelete(false)
      setShowDetail(false)
      setSelected(null)
      fetchData(pagination.page)
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
      // Refresh analyses for this doc
      fetchDocAnalyses(doc.id)
    } catch (err) {
      setAiResult({ summary: 'Analysis failed: ' + (err.response?.data?.message || err.message), risk_level: 'high' })
    } finally { setAiLoading(false) }
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{'\u{1F4C4}'} Documents</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ai" onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? 'Hide Upload' : '\u{1F4E4} Upload & Analyze'}
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>+ Add New</button>
        </div>
      </div>

      {showUpload && (
        <div className="upload-panel-wrapper" style={{ marginBottom: 20, padding: 20, background: '#f8f9fa', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <UploadDocument onUploaded={() => { fetchData(1); setShowUpload(false) }} />
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        onRowClick={handleRowClick}
        actions={(row) => (
          <button className="btn btn-sm btn-ai" onClick={(e) => { e.stopPropagation(); setSelected(row); setShowDetail(true); handleAIAnalyze(row) }}>
            AI Analyze
          </button>
        )}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-sm" disabled={pagination.page <= 1} onClick={() => fetchData(pagination.page - 1)}>&laquo; Prev</button>
          <span className="pagination-info">Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
          <button className="btn btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchData(pagination.page + 1)}>Next &raquo;</button>
        </div>
      )}

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

          {/* Previous AI analyses for this document */}
          {docAiAnalyses[selected?.id]?.length > 0 && (
            <div className="prev-analyses" style={{ marginTop: 20 }}>
              <h4 style={{ marginBottom: 8 }}>Previous AI Analyses ({docAiAnalyses[selected.id].length})</h4>
              {docAiAnalyses[selected.id].slice(0, 3).map(a => (
                <div key={a.id} style={{ padding: '8px 12px', background: '#f8f9fa', borderRadius: 6, marginBottom: 8, fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span><strong>{a.analysis_type}</strong></span>
                    <span style={{ color: '#888' }}>{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  {a.result_parsed?.summary && (
                    <p style={{ margin: 0, color: '#555' }}>{a.result_parsed.summary}</p>
                  )}
                  {a.result_parsed?.risk_level && (
                    <span className={`status-badge status-${a.result_parsed.risk_level}`} style={{ marginTop: 4, display: 'inline-block' }}>
                      Risk: {a.result_parsed.risk_level}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
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
