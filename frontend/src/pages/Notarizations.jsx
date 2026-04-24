import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'
import FormModal from '../components/FormModal'
import DeleteConfirm from '../components/DeleteConfirm'

const ENDPOINT = '/notarizations'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'document_title', label: 'Document' },
  { key: 'client_name', label: 'Client' },
  { key: 'notary_name', label: 'Notary' },
  { key: 'status', label: 'Status', render: (v) => <span className={`status-badge status-${(v || '').toLowerCase()}`}>{v || '-'}</span> },
  { key: 'type', label: 'Type' },
  { key: 'scheduled_at', label: 'Scheduled', render: (v) => v ? new Date(v).toLocaleString() : '-' },
]

const formFields = [
  { key: 'document_id', label: 'Document ID' },
  { key: 'document_title', label: 'Document Title', required: true },
  { key: 'client_name', label: 'Client Name', required: true },
  { key: 'client_email', label: 'Client Email', type: 'email' },
  { key: 'notary_name', label: 'Notary Name' },
  { key: 'type', label: 'Type', type: 'select', options: ['Acknowledgment', 'Jurat', 'Copy Certification', 'Oath/Affirmation', 'Signature Witnessing'] },
  { key: 'status', label: 'Status', type: 'select', options: ['scheduled', 'in_progress', 'completed', 'cancelled'], defaultValue: 'scheduled' },
  { key: 'scheduled_at', label: 'Scheduled At', type: 'datetime-local' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

export default function Notarizations() {
  const [data, setData] = useState([])
  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showDelete, setShowDelete] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(ENDPOINT)
      setData(Array.isArray(res.data) ? res.data : res.data.data || [])
    } catch { setData([]) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRowClick = (row) => { setSelected(row); setShowDetail(true) }
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

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{'\u{1F58B}'} E-Notarizations</h1>
        <button className="btn btn-primary" onClick={handleCreate}>+ Add New</button>
      </div>
      <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
      {showDetail && selected && (
        <DetailModal title={`Notarization: ${selected.document_title || selected.id}`} data={selected} onClose={() => setShowDetail(false)} onEdit={handleEdit} onDelete={handleDeleteClick} />
      )}
      {showForm && (
        <FormModal title={editing ? 'Edit Notarization' : 'New Notarization'} fields={formFields} initialData={editing} onSubmit={handleSubmit} onClose={() => setShowForm(false)} />
      )}
      {showDelete && (
        <DeleteConfirm message={`Delete this notarization?`} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
      )}
    </div>
  )
}
