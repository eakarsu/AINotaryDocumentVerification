import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const notifRef = useRef(null)

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/notifications')
        setNotifications(res.data || [])
      } catch { /* ignore */ }
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch { /* ignore */ }
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch { /* ignore */ }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const typeIcons = { info: 'i', success: '✓', warning: '!', error: '✕' }
  const typeColors = { info: '#06b6d4', success: '#10b981', warning: '#f59e0b', error: '#ef4444' }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar}>
          &#9776;
        </button>
        <div className="navbar-brand" onClick={() => navigate('/')}>
          <span className="brand-icon">&#x1F50F;</span>
          <span className="brand-text">AI Notary</span>
        </div>
      </div>

      <div className="navbar-center">
        <form onSubmit={handleSearchSubmit} className="navbar-search-form">
          <input
            type="text"
            className="navbar-search-input"
            placeholder="Search anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="navbar-search-btn">&#x1F50D;</button>
        </form>
      </div>

      <div className="navbar-right">
        <div className="notification-wrapper" ref={notifRef}>
          <button className="notification-btn" onClick={() => setShowNotifs(!showNotifs)}>
            <span className="notification-icon">&#x1F514;</span>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          {showNotifs && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h4>Notifications</h4>
                {unreadCount > 0 && (
                  <button className="btn-link" onClick={markAllRead}>Mark all read</button>
                )}
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notification-empty">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div
                      key={n.id}
                      className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                      onClick={() => { markAsRead(n.id); if (n.link) navigate(n.link); setShowNotifs(false) }}
                    >
                      <span className="notification-type-icon" style={{ background: typeColors[n.type] || '#64748b' }}>
                        {typeIcons[n.type] || 'i'}
                      </span>
                      <div className="notification-content">
                        <p className="notification-title">{n.title}</p>
                        <p className="notification-message">{n.message}</p>
                        <span className="notification-time">
                          {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="user-info" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
          <div className="user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="user-name">{user?.name || user?.email || 'User'}</span>
        </div>
        <button className="btn btn-logout" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  )
}
