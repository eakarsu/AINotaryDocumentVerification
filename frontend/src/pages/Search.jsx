import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const entityPaths = {
  document: '/documents',
  client: '/clients',
  notarization: '/notarizations',
  signature: '/signatures',
  template: '/templates',
}

const entityIcons = {
  document: '📄',
  client: '👤',
  notarization: '🖋',
  signature: '✍',
  template: '📋',
}

const entityColors = {
  document: '#2563eb',
  client: '#f97316',
  notarization: '#8b5cf6',
  signature: '#22c55e',
  template: '#06b6d4',
}

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim() || query.trim().length < 2) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query.trim())}`)
      setResults(res.data.results || [])
    } catch {
      setResults([])
    }
    setLoading(false)
  }

  const grouped = results.reduce((acc, r) => {
    const key = r.entity || 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>Global Search</h1>
      </div>
      <form onSubmit={handleSearch} className="search-form-large">
        <input type="text" className="search-input-large" placeholder="Search documents, clients, notarizations, signatures, templates..."
          value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {searched && results.length === 0 && !loading && (
        <div className="empty-state">
          <p>No results found for "{query}"</p>
        </div>
      )}

      {Object.entries(grouped).map(([entity, items]) => (
        <div key={entity} className="search-group">
          <h3 className="search-group-title">
            <span style={{ marginRight: '8px' }}>{entityIcons[entity] || '📋'}</span>
            {entity.charAt(0).toUpperCase() + entity.slice(1)}s ({items.length})
          </h3>
          <div className="search-results-list">
            {items.map((item, i) => (
              <div key={i} className="search-result-card" onClick={() => navigate(entityPaths[entity] || '/')}
                style={{ borderLeft: `4px solid ${entityColors[entity] || '#64748b'}` }}>
                <div className="search-result-name">{item.name || `#${item.id}`}</div>
                <div className="search-result-meta">
                  {item.email && <span>{item.email}</span>}
                  {item.type && <span>{item.type}</span>}
                  {item.status && <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>{item.status}</span>}
                  {item.category && <span>{item.category}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
