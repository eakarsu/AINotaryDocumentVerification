import { useState, useEffect } from 'react'
import api from '../api/axios'

export default function Reports() {
  const [stats, setStats] = useState(null)
  const [revenue, setRevenue] = useState([])
  const [activity, setActivity] = useState([])
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    Promise.all([
      api.get('/reports').catch(() => ({ data: null })),
      api.get('/reports/revenue').catch(() => ({ data: [] })),
      api.get('/reports/activity').catch(() => ({ data: [] })),
    ]).then(([s, r, a]) => {
      setStats(s.data)
      setRevenue(r.data)
      setActivity(a.data)
    })
  }, [])

  const getTotal = (rows) => rows?.reduce((s, r) => s + parseInt(r.total || 0), 0) || 0
  const getRevenue = (rows) => rows?.reduce((s, r) => s + parseFloat(r.revenue || 0), 0) || 0

  const typeIcons = { document: '📄', notarization: '🖋', payment: '💳', signature: '✍', client: '👤' }
  const typeColors = { document: '#2563eb', notarization: '#8b5cf6', payment: '#10b981', signature: '#22c55e', client: '#f97316' }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>Reports & Analytics</h1>
      </div>

      <div className="report-tabs">
        {['overview', 'revenue', 'activity'].map(tab => (
          <button key={tab} className={`report-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
        <div className="report-section">
          <div className="report-stats-grid">
            <div className="report-stat-card">
              <div className="report-stat-icon" style={{ background: '#2563eb' }}>📄</div>
              <div className="report-stat-info">
                <h3>{getTotal(stats.documents)}</h3>
                <p>Total Documents</p>
              </div>
              <div className="report-stat-breakdown">
                {stats.documents?.map((d, i) => <span key={i} className="breakdown-item">{d.status}: {d.total}</span>)}
              </div>
            </div>
            <div className="report-stat-card">
              <div className="report-stat-icon" style={{ background: '#8b5cf6' }}>🖋</div>
              <div className="report-stat-info">
                <h3>{getTotal(stats.notarizations)}</h3>
                <p>Notarizations</p>
              </div>
              <div className="report-stat-breakdown">
                {stats.notarizations?.map((d, i) => <span key={i} className="breakdown-item">{d.status}: {d.total}</span>)}
              </div>
            </div>
            <div className="report-stat-card">
              <div className="report-stat-icon" style={{ background: '#10b981' }}>💳</div>
              <div className="report-stat-info">
                <h3>${getRevenue(stats.payments).toFixed(2)}</h3>
                <p>Total Revenue</p>
              </div>
              <div className="report-stat-breakdown">
                {stats.payments?.map((d, i) => <span key={i} className="breakdown-item">{d.status}: ${parseFloat(d.revenue || 0).toFixed(2)}</span>)}
              </div>
            </div>
            <div className="report-stat-card">
              <div className="report-stat-icon" style={{ background: '#f97316' }}>👥</div>
              <div className="report-stat-info">
                <h3>{getTotal(stats.clients)}</h3>
                <p>Total Clients</p>
              </div>
              <div className="report-stat-breakdown">
                {stats.clients?.map((d, i) => <span key={i} className="breakdown-item">{d.verified ? 'Verified' : 'Unverified'}: {d.total}</span>)}
              </div>
            </div>
            <div className="report-stat-card">
              <div className="report-stat-icon" style={{ background: '#22c55e' }}>✍</div>
              <div className="report-stat-info">
                <h3>{getTotal(stats.signatures)}</h3>
                <p>Signatures</p>
              </div>
              <div className="report-stat-breakdown">
                {stats.signatures?.map((d, i) => <span key={i} className="breakdown-item">{d.status}: {d.total}</span>)}
              </div>
            </div>
            <div className="report-stat-card">
              <div className="report-stat-icon" style={{ background: '#ef4444' }}>🛡</div>
              <div className="report-stat-info">
                <h3>{getTotal(stats.fraud_detections)}</h3>
                <p>Fraud Alerts</p>
              </div>
              <div className="report-stat-breakdown">
                {stats.fraud_detections?.map((d, i) => <span key={i} className="breakdown-item">{d.risk_level}: {d.total}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="report-section">
          <h2 style={{ marginBottom: '20px' }}>Monthly Revenue</h2>
          {revenue.length === 0 ? (
            <p className="text-muted">No revenue data available</p>
          ) : (
            <div className="revenue-chart">
              {revenue.map((r, i) => {
                const maxRev = Math.max(...revenue.map(x => parseFloat(x.revenue || 0)), 1)
                const height = (parseFloat(r.revenue || 0) / maxRev) * 200
                return (
                  <div key={i} className="revenue-bar-container">
                    <div className="revenue-amount">${parseFloat(r.revenue || 0).toFixed(0)}</div>
                    <div className="revenue-bar" style={{ height: `${Math.max(height, 4)}px` }} />
                    <div className="revenue-label">{r.month}</div>
                    <div className="revenue-count">{r.count} txns</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="report-section">
          <h2 style={{ marginBottom: '20px' }}>Recent Activity</h2>
          <div className="activity-feed">
            {activity.length === 0 ? (
              <p className="text-muted">No recent activity</p>
            ) : activity.map((item, i) => (
              <div key={i} className="activity-item">
                <div className="activity-icon" style={{ background: typeColors[item.type] || '#64748b' }}>
                  {typeIcons[item.type] || '📋'}
                </div>
                <div className="activity-content">
                  <p className="activity-desc">{item.description}</p>
                  <div className="activity-meta">
                    <span className={`status-badge status-${(item.status || '').toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span>
                    <span className="activity-time">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
