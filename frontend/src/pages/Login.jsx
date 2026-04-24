import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = () => {
    setEmail('admin@notary.com')
    setPassword('password123')
    setTimeout(() => {
      const form = document.getElementById('login-form')
      if (form) form.requestSubmit()
    }, 100)
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <span className="login-logo">&#x1F50F;</span>
          <h1>AI Notary</h1>
          <p>Document Verification Platform</p>
        </div>
        <form id="login-form" onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
          <button type="button" className="btn btn-demo btn-block" onClick={handleDemoLogin}>
            Demo Login
          </button>
        </form>
        <div className="login-footer">
          <p>Secure AI-Powered Notary Platform</p>
        </div>
      </div>
    </div>
  )
}
