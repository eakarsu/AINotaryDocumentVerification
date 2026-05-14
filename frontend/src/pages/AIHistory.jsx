import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

export default function AIHistory() {
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await api.get(`/ai/history?page=${page}&limit=${pagination.limit}`)
      setData(res.data.data || [])
      if (res.data.pagination) setPagination(res.data.pagination)
    } catch {
      setData([])
    }
    setLoading(false)
  }, [pagination.limit])

  useEffect(() => { fetchData(1) }, []) // eslint-disable-line

  const handlePageChange = (newPage) => {
    fetchData(newPage)
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>&#x1F9E0; AI History</h1>
        <span className="badge">{pagination.total} total analyses</span>
      </div>

      {loading ? (
        <div className="loading-state">Loading AI history...</div>
      ) : data.length === 0 ? (
        <div className="empty-state">No AI analyses yet. Run an analysis from the Documents page.</div>
      ) : (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Confidence</th>
                  <th>Model</th>
                  <th>Tokens</th>
                  <th>Date</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <>
                    <tr key={row.id} className="clickable-row" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                      <td>{row.id}</td>
                      <td>{row.document_title || row.document_id || '-'}</td>
                      <td><span className="status-badge">{row.analysis_type}</span></td>
                      <td>{row.confidence ? (parseFloat(row.confidence) * 100).toFixed(0) + '%' : '-'}</td>
                      <td className="truncate" style={{ maxWidth: 120 }}>{row.model_used || '-'}</td>
                      <td>{row.tokens_used || '-'}</td>
                      <td>{row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-ai">
                          {expanded === row.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expanded === row.id && (
                      <tr key={`${row.id}-exp`}>
                        <td colSpan={8}>
                          <div className="ai-result-expanded">
                            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', maxHeight: 400, overflow: 'auto' }}>
                              {row.result_parsed
                                ? JSON.stringify(row.result_parsed, null, 2)
                                : row.result || 'No result data'}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                &laquo; Prev
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next &raquo;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
