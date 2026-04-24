import { useState, useMemo } from 'react'

export default function DataTable({ columns, data, onRowClick, actions, exportName }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const perPage = 10

  const filtered = useMemo(() => {
    if (!data) return []
    if (!search.trim()) return data
    const s = search.toLowerCase()
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key]
        return val != null && String(val).toLowerCase().includes(s)
      })
    )
  }, [data, search, columns])

  const totalPages = Math.ceil(filtered.length / perPage)
  const pageData = filtered.slice(page * perPage, (page + 1) * perPage)

  const handlePageChange = (p) => {
    if (p >= 0 && p < totalPages) setPage(p)
  }

  const handleExport = () => {
    if (!filtered.length) return
    const headers = columns.map(c => c.label)
    const csvRows = [headers.join(',')]
    for (const row of filtered) {
      const values = columns.map(c => {
        const val = row[c.key]
        if (val === null || val === undefined) return ''
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"'
        }
        return str
      })
      csvRows.push(values.join(','))
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportName || 'export'}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="data-table-wrapper">
      <div className="data-table-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search records..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="export-btn" onClick={handleExport} title="Export to CSV">Export CSV</button>
          <span className="record-count">{filtered.length} records</span>
        </div>
      </div>
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              {actions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="empty-row">
                  No records found
                </td>
              </tr>
            ) : (
              pageData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className="clickable-row"
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                    </td>
                  ))}
                  {actions && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm"
            disabled={page === 0}
            onClick={() => handlePageChange(page - 1)}
          >
            Prev
          </button>
          <span className="page-info">
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="btn btn-sm"
            disabled={page >= totalPages - 1}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
