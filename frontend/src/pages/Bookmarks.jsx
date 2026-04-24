import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const entityPaths = {
  document: '/documents',
  client: '/clients',
  notarization: '/notarizations',
  signature: '/signatures',
  template: '/templates',
  payment: '/payments',
  seal: '/seals',
}

const entityIcons = {
  document: '\u{1F4C4}', client: '\u{1F464}', notarization: '\u{1F58B}', signature: '\u270D',
  template: '\u{1F4CB}', payment: '\u{1F4B3}', seal: '\u{1F3AB}',
}

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([])
  const navigate = useNavigate()

  const fetchBookmarks = useCallback(async () => {
    try { const res = await api.get('/bookmarks'); setBookmarks(res.data) } catch { setBookmarks([]) }
  }, [])

  useEffect(() => { fetchBookmarks() }, [fetchBookmarks])

  const removeBookmark = async (id) => {
    try { await api.delete(`/bookmarks/${id}`); fetchBookmarks() } catch { alert('Failed to remove bookmark') }
  }

  const grouped = bookmarks.reduce((acc, b) => {
    const key = b.entity_type || 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(b)
    return acc
  }, {})

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>Bookmarks</h1>
      </div>

      {bookmarks.length === 0 ? (
        <div className="empty-state">
          <p className="text-muted">No bookmarks yet. Bookmark items from other pages to quick-access them here.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="bookmark-group">
            <h3 className="bookmark-group-title">
              {entityIcons[type] || '\u{1F4CC}'} {type.charAt(0).toUpperCase() + type.slice(1)}s
            </h3>
            <div className="bookmark-list">
              {items.map(b => (
                <div key={b.id} className="bookmark-card">
                  <div className="bookmark-info" onClick={() => navigate(entityPaths[type] || '/')}>
                    <span className="bookmark-icon">{entityIcons[type] || '\u{1F4CC}'}</span>
                    <div>
                      <p className="bookmark-label">{b.label || `${type} #${b.entity_id}`}</p>
                      <p className="text-muted" style={{ fontSize: '0.8rem' }}>Added {new Date(b.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={() => removeBookmark(b.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
