import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'

const ENDPOINT = '/audit-trail'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'action', label: 'Action' },
  { key: 'entity_type', label: 'Entity Type' },
  { key: 'entity_id', label: 'Entity ID' },
  { key: 'user_name', label: 'User' },
  { key: 'ip_address', label: 'IP Address' },
  { key: 'created_at', label: 'Timestamp', render: (v) => v ? new Date(v).toLocaleString() : '-' },
]

export default function AuditTrail() {
  const [data, setData] = useState([])
  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  const fetchData = useCallback(async () => {
    try { const res = await api.get(ENDPOINT); setData(Array.isArray(res.data) ? res.data : res.data.data || []) } catch { setData([]) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRowClick = (row) => { setSelected(row); setShowDetail(true) }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{'\u{1F4CA}'} Audit Trail</h1>
        <span className="read-only-badge">Read Only</span>
      </div>
      <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
      {showDetail && selected && (
        <DetailModal title={`Audit Entry: ${selected.action || selected.id}`} data={selected} onClose={() => setShowDetail(false)} />
      )}
    </div>
  )
}
