import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'
import FormModal from '../components/FormModal'
import DeleteConfirm from '../components/DeleteConfirm'

const ENDPOINT = '/witnesses'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'id_type', label: 'ID Type' },
  { key: 'relationship', label: 'Relationship' },
  { key: 'notarization_id', label: 'Notarization' },
  { key: 'created_at', label: 'Created', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const formFields = [
  { key: 'name', label: 'Full Name', required: true },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'id_type', label: 'ID Type', type: 'select', options: ['drivers_license', 'passport', 'state_id', 'military_id', 'other'] },
  { key: 'id_number', label: 'ID Number' },
  { key: 'notarization_id', label: 'Notarization ID', type: 'number' },
  { key: 'relationship', label: 'Relationship', type: 'select', options: ['spouse', 'family', 'friend', 'colleague', 'neighbor', 'attorney', 'other'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

export default function Witnesses() {
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
        <h1>Witnesses</h1>
        <button className="btn btn-primary" onClick={handleCreate}>+ Add Witness</button>
      </div>
      <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
      {showDetail && selected && <DetailModal title={`Witness: ${selected.name || selected.id}`} data={selected} onClose={() => setShowDetail(false)} onEdit={handleEdit} onDelete={handleDeleteClick} />}
      {showForm && <FormModal title={editing ? 'Edit Witness' : 'New Witness'} fields={formFields} initialData={editing} onSubmit={handleSubmit} onClose={() => setShowForm(false)} />}
      {showDelete && <DeleteConfirm message={`Delete witness "${selected?.name}"?`} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />}
    </div>
  )
}
