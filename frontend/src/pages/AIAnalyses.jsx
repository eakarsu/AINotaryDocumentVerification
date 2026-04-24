import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'
import FormModal from '../components/FormModal'
import DeleteConfirm from '../components/DeleteConfirm'
import AIResultDisplay from '../components/AIResultDisplay'

const ENDPOINT = '/ai-analyses'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'analysis_type', label: 'Type' },
  { key: 'document_title', label: 'Document' },
  { key: 'status', label: 'Status', render: (v) => <span className={`status-badge status-${(v || '').toLowerCase()}`}>{v || '-'}</span> },
  { key: 'confidence_score', label: 'Confidence', render: (v) => v != null ? `${Math.round(v * 100)}%` : '-' },
  { key: 'created_at', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const formFields = [
  { key: 'document_id', label: 'Document ID' },
  { key: 'document_title', label: 'Document Title' },
  { key: 'analysis_type', label: 'Analysis Type', type: 'select', options: ['summary', 'entity_extraction', 'classification', 'sentiment', 'comprehensive'], required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'processing', 'completed', 'failed'], defaultValue: 'pending' },
  { key: 'content', label: 'Content to Analyze', type: 'textarea', required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

export default function AIAnalyses() {
  const [data, setData] = useState([])
  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [showNewAnalysis, setShowNewAnalysis] = useState(false)
  const [analysisContent, setAnalysisContent] = useState('')
  const [analysisType, setAnalysisType] = useState('summary')

  const fetchData = useCallback(async () => {
    try { const res = await api.get(ENDPOINT); setData(Array.isArray(res.data) ? res.data : res.data.data || []) } catch { setData([]) }
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
    try { await api.delete(`${ENDPOINT}/${selected.id}`); setShowDelete(false); setShowDetail(false); setSelected(null); fetchData() }
    catch (err) { alert(err.response?.data?.message || 'Error deleting') }
  }

  const runNewAnalysis = async () => {
    if (!analysisContent.trim()) return
    setAiLoading(true); setAiResult(null)
    try {
      const endpoint = analysisType === 'entity_extraction' ? '/ai/extract-entities' : '/ai/generate-summary'
      const res = await api.post(endpoint, { content: analysisContent })
      setAiResult(res.data)
    } catch (err) {
      setAiResult({ summary: 'Analysis failed: ' + (err.response?.data?.message || err.message) })
    } finally { setAiLoading(false) }
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{'\u{1F9E0}'} AI Analyses</h1>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={() => setShowNewAnalysis(!showNewAnalysis)}>New Analysis</button>
          <button className="btn btn-primary" onClick={handleCreate}>+ Add Record</button>
        </div>
      </div>

      {showNewAnalysis && (
        <div className="ai-analysis-panel">
          <h3>Run AI Analysis</h3>
          <div className="form-group">
            <label className="form-label">Analysis Type</label>
            <select className="form-input" value={analysisType} onChange={(e) => setAnalysisType(e.target.value)}>
              <option value="summary">Generate Summary</option>
              <option value="entity_extraction">Extract Entities</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea className="form-input form-textarea" rows={6} value={analysisContent} onChange={(e) => setAnalysisContent(e.target.value)} placeholder="Paste document content here..." />
          </div>
          <button className="btn btn-ai" onClick={runNewAnalysis} disabled={aiLoading}>
            {aiLoading ? 'Analyzing...' : 'Run Analysis'}
          </button>
          <AIResultDisplay result={aiResult} loading={aiLoading} />
        </div>
      )}

      <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
      {showDetail && selected && (
        <DetailModal title={`Analysis: ${selected.analysis_type || selected.id}`} data={selected} onClose={() => { setShowDetail(false); setAiResult(null) }} onEdit={handleEdit} onDelete={handleDeleteClick}>
          <div className="detail-grid">
            {Object.entries(selected).filter(([k]) => k !== '__v' && k !== 'result').map(([key, value]) => (
              <div key={key} className="detail-field">
                <span className="detail-label">{key.replace(/_/g, ' ').replace(/^./, s => s.toUpperCase())}</span>
                <span className="detail-value">{value == null ? '-' : String(value)}</span>
              </div>
            ))}
          </div>
          {selected.result && (
            <div className="ai-section-wrapper">
              <h4>Analysis Results</h4>
              <AIResultDisplay result={selected.result} loading={false} />
            </div>
          )}
        </DetailModal>
      )}
      {showForm && <FormModal title={editing ? 'Edit Analysis' : 'New Analysis Record'} fields={formFields} initialData={editing} onSubmit={handleSubmit} onClose={() => setShowForm(false)} />}
      {showDelete && <DeleteConfirm message="Delete this analysis?" onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />}
    </div>
  )
}
