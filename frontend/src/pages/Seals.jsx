import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'
import FormModal from '../components/FormModal'
import DeleteConfirm from '../components/DeleteConfirm'

const ENDPOINT = '/seals'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'seal_number', label: 'Seal Number' },
  { key: 'state', label: 'State' },
  { key: 'county', label: 'County' },
  { key: 'seal_type', label: 'Type' },
  { key: 'status', label: 'Status', render: (v) => <span className={`status-badge status-${(v || '').toLowerCase()}`}>{v || '-'}</span> },
  { key: 'commission_expiry', label: 'Expires', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const formFields = [
  { key: 'seal_number', label: 'Seal Number', required: true },
  { key: 'state', label: 'State', required: true },
  { key: 'county', label: 'County', required: true },
  { key: 'commission_number', label: 'Commission Number', required: true },
  { key: 'commission_expiry', label: 'Commission Expiry', type: 'date', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'expired', 'revoked', 'pending'], defaultValue: 'active' },
  { key: 'seal_type', label: 'Seal Type', type: 'select', options: ['embossed', 'ink', 'digital'], defaultValue: 'digital' },
]

export default function Seals() {
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

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{'\u{1F3AB}'} Seal Management</h1>
        <button className="btn btn-primary" onClick={handleCreate}>+ Add New</button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        onRowClick={handleRowClick}
      />

      {showDetail && selected && (
        <DetailModal
          title={`Seal: ${selected.seal_number || selected.id}`}
          data={selected}
          onClose={() => setShowDetail(false)}
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
        </DetailModal>
      )}

      {showForm && (
        <FormModal
          title={editing ? 'Edit Seal' : 'New Seal'}
          fields={formFields}
          initialData={editing}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {showDelete && (
        <DeleteConfirm
          message={`Delete seal "${selected?.seal_number}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}
