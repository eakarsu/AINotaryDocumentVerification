import { useNavigate } from 'react-router-dom'

export default function FeatureCard({ title, description, icon, count, path, gradient }) {
  const navigate = useNavigate()

  return (
    <div
      className="feature-card"
      style={{ background: gradient }}
      onClick={() => navigate(path)}
    >
      <div className="feature-card-icon">{icon}</div>
      <div className="feature-card-content">
        <h3 className="feature-card-title">{title}</h3>
        <p className="feature-card-desc">{description}</p>
      </div>
      <div className="feature-card-count">
        <span className="count-number">{count ?? '-'}</span>
        <span className="count-label">records</span>
      </div>
    </div>
  )
}
