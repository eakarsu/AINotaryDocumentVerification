import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'
import FormModal from '../components/FormModal'
import DeleteConfirm from '../components/DeleteConfirm'

const ENDPOINT = '/templates'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status', render: (v) => <span className={`status-badge status-${(v || '').toLowerCase()}`}>{v || '-'}</span> },
  { key: 'version', label: 'Version' },
  { key: 'updated_at', label: 'Updated', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const formFields = [
  { key: 'name', label: 'Template Name', required: true },
  { key: 'category', label: 'Category', type: 'select', options: ['Real Estate', 'Legal', 'Financial', 'Healthcare', 'Corporate', 'Personal'] },
  { key: 'type', label: 'Document Type', type: 'select', options: ['Contract', 'Deed', 'Affidavit', 'Power of Attorney', 'Will', 'Trust', 'Certificate'] },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'draft', 'archived'], defaultValue: 'draft' },
  { key: 'version', label: 'Version', defaultValue: '1.0' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'content', label: 'Template Content', type: 'textarea' },
]

export default function Templates() {
  const [data, setData] = useState([])
  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showDelete, setShowDelete] = useState(false)

  const fetchData = useCallback(async () => {
    try { const res = await api.get(ENDPOINT); setData(Array.isArray(res.data) ? res.data : res.data.data || []) } catch { setData([]) }
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
    try { await api.delete(`${ENDPOINT}/${selected.id}`); setShowDelete(false); setShowDetail(false); setSelected(null); fetchData() }
    catch (err) { alert(err.response?.data?.message || 'Error deleting') }
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{'\u{1F4CB}'} Templates</h1>
        <button className="btn btn-primary" onClick={handleCreate}>+ Add New</button>
      </div>
      <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
      {showDetail && selected && <DetailModal title={`Template: ${selected.name || selected.id}`} data={selected} onClose={() => setShowDetail(false)} onEdit={handleEdit} onDelete={handleDeleteClick} />}
      {showForm && <FormModal title={editing ? 'Edit Template' : 'New Template'} fields={formFields} initialData={editing} onSubmit={handleSubmit} onClose={() => setShowForm(false)} />}
      {showDelete && <DeleteConfirm message={`Delete template "${selected?.name}"?`} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />}
    </div>
  )
}
