import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showPwChange, setShowPwChange] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile/me')
      setProfile(res.data)
      setForm({ name: res.data.name, email: res.data.email })
    } catch {
      setProfile(user)
      setForm({ name: user?.name || '', email: user?.email || '' })
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setError(''); setMessage('')
    try {
      const res = await api.put('/profile/me', form)
      setProfile(res.data)
      setEditing(false)
      setMessage('Profile updated successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError(''); setMessage('')
    if (pwForm.new_password !== pwForm.confirm_password) {
      setError('New passwords do not match')
      return
    }
    try {
      await api.put('/profile/me/password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password
      })
      setMessage('Password changed successfully')
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
      setShowPwChange(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password')
    }
  }

  const p = profile || user

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>Profile & Settings</h1>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-avatar-large">
            {p?.name ? p.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <h2>{p?.name}</h2>
          <p className="text-muted">{p?.email}</p>
          <span className="status-badge status-active">{p?.role || 'notary'}</span>
          <p className="text-muted" style={{ marginTop: '12px', fontSize: '0.85rem' }}>
            Member since {p?.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
          </p>
        </div>

        <div className="profile-details-card">
          <h3>Account Information</h3>
          {!editing ? (
            <div className="profile-info-list">
              <div className="profile-info-row">
                <span className="profile-label">Full Name</span>
                <span className="profile-value">{p?.name}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-label">Email</span>
                <span className="profile-value">{p?.email}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-label">Role</span>
                <span className="profile-value">{p?.role}</span>
              </div>
              <div className="profile-actions-row">
                <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit Profile</button>
                <button className="btn btn-secondary" onClick={() => setShowPwChange(!showPwChange)}>
                  {showPwChange ? 'Cancel' : 'Change Password'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" className="form-input" value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-input" value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="profile-actions-row">
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setEditing(false); setForm({ name: p?.name, email: p?.email }) }}>Cancel</button>
              </div>
            </form>
          )}

          {showPwChange && (
            <form onSubmit={handleChangePassword} className="profile-form" style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
              <h3>Change Password</h3>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" className="form-input" value={pwForm.current_password}
                  onChange={(e) => setPwForm({...pwForm, current_password: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" className="form-input" value={pwForm.new_password}
                  onChange={(e) => setPwForm({...pwForm, new_password: e.target.value})} required minLength={6} />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" className="form-input" value={pwForm.confirm_password}
                  onChange={(e) => setPwForm({...pwForm, confirm_password: e.target.value})} required minLength={6} />
              </div>
              <button type="submit" className="btn btn-primary">Update Password</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
