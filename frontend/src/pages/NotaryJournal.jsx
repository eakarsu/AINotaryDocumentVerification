import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'
import FormModal from '../components/FormModal'
import DeleteConfirm from '../components/DeleteConfirm'

const ENDPOINT = '/notary-journal'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'signer_name', label: 'Signer Name' },
  { key: 'document_type', label: 'Document Type' },
  { key: 'notary_act', label: 'Notary Act' },
  { key: 'fee', label: 'Fee', render: (v) => v != null ? `$${Number(v).toFixed(2)}` : '-' },
  { key: 'date_performed', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const formFields = [
  { key: 'document_type', label: 'Document Type', type: 'select', options: ['deed', 'affidavit', 'power_of_attorney', 'will', 'contract', 'lease', 'mortgage', 'trust', 'certificate', 'other'], required: true },
  { key: 'signer_name', label: 'Signer Name', required: true },
  { key: 'signer_address', label: 'Signer Address', type: 'textarea' },
  { key: 'id_type', label: 'ID Type', type: 'select', options: ['drivers_license', 'passport', 'state_id', 'military_id', 'tribal_id'] },
  { key: 'id_number', label: 'ID Number' },
  { key: 'notary_act', label: 'Notary Act', type: 'select', options: ['acknowledgment', 'jurat', 'oath', 'affirmation', 'copy_certification', 'signature_witnessing'], required: true },
  { key: 'fee', label: 'Fee ($)', type: 'number' },
  { key: 'date_performed', label: 'Date Performed', type: 'datetime-local' },
  { key: 'witness_name', label: 'Witness Name' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

export default function NotaryJournal() {
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
        <h1>{'\u{1F4D6}'} Notary Journal</h1>
        <button className="btn btn-primary" onClick={handleCreate}>+ Add New</button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        onRowClick={handleRowClick}
      />

      {showDetail && selected && (
        <DetailModal
          title={`Journal Entry #${selected.id}`}
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
          title={editing ? 'Edit Journal Entry' : 'New Journal Entry'}
          fields={formFields}
          initialData={editing}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {showDelete && (
        <DeleteConfirm
          message={`Delete journal entry #${selected?.id}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}
