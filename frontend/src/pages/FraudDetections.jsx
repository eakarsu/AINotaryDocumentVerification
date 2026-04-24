import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'
import FormModal from '../components/FormModal'
import DeleteConfirm from '../components/DeleteConfirm'
import AIResultDisplay from '../components/AIResultDisplay'

const ENDPOINT = '/fraud-detections'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'document_title', label: 'Document' },
  { key: 'risk_level', label: 'Risk Level', render: (v) => <span className={`risk-badge risk-${(v || '').toLowerCase()}`}>{v || '-'}</span> },
  { key: 'risk_score', label: 'Risk Score', render: (v) => v != null ? `${v}%` : '-' },
  { key: 'status', label: 'Status', render: (v) => <span className={`status-badge status-${(v || '').toLowerCase()}`}>{v || '-'}</span> },
  { key: 'detected_at', label: 'Detected', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const formFields = [
  { key: 'document_id', label: 'Document ID' },
  { key: 'document_title', label: 'Document Title', required: true },
  { key: 'risk_level', label: 'Risk Level', type: 'select', options: ['low', 'medium', 'high', 'critical'], defaultValue: 'low' },
  { key: 'risk_score', label: 'Risk Score (0-100)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'investigating', 'confirmed', 'dismissed', 'resolved'], defaultValue: 'pending' },
  { key: 'fraud_type', label: 'Fraud Type', type: 'select', options: ['Forgery', 'Identity Theft', 'Document Tampering', 'Signature Fraud', 'Other'] },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'content', label: 'Document Content', type: 'textarea' },
]

export default function FraudDetections() {
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

  const handleAIScan = async (record) => {
    setAiLoading(true); setAiResult(null)
    try {
      const res = await api.post('/ai/detect-fraud', {
        document_id: record.document_id || record.id,
        content: record.content || record.description || record.document_title,
      })
      setAiResult(res.data)
    } catch (err) {
      setAiResult({ summary: 'Scan failed: ' + (err.response?.data?.message || err.message), risk_level: 'high' })
    } finally { setAiLoading(false) }
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{'\u{1F6E1}'} Fraud Detection</h1>
        <button className="btn btn-primary" onClick={handleCreate}>+ Add New</button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        onRowClick={handleRowClick}
        actions={(row) => (
          <button className="btn btn-sm btn-ai" onClick={() => { setSelected(row); setShowDetail(true); handleAIScan(row) }}>
            AI Scan
          </button>
        )}
      />
      {showDetail && selected && (
        <DetailModal title={`Fraud Detection: ${selected.document_title || selected.id}`} data={selected} onClose={() => { setShowDetail(false); setAiResult(null) }} onEdit={handleEdit} onDelete={handleDeleteClick}>
          <div className="detail-grid">
            {Object.entries(selected).filter(([k]) => k !== '__v').map(([key, value]) => (
              <div key={key} className="detail-field">
                <span className="detail-label">{key.replace(/_/g, ' ').replace(/^./, s => s.toUpperCase())}</span>
                <span className="detail-value">{value == null ? '-' : String(value)}</span>
              </div>
            ))}
          </div>
          <div className="ai-section-wrapper">
            <button className="btn btn-ai" onClick={() => handleAIScan(selected)} disabled={aiLoading}>
              {aiLoading ? 'Scanning...' : '\u{1F9E0} AI Fraud Scan'}
            </button>
            <AIResultDisplay result={aiResult} loading={aiLoading} />
          </div>
        </DetailModal>
      )}
      {showForm && <FormModal title={editing ? 'Edit Record' : 'New Fraud Detection'} fields={formFields} initialData={editing} onSubmit={handleSubmit} onClose={() => setShowForm(false)} />}
      {showDelete && <DeleteConfirm message="Delete this fraud detection record?" onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />}
    </div>
  )
}
