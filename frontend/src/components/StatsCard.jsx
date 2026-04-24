export default function StatsCard({ title, value, icon, color }) {
  return (
    <div className="stats-card" style={{ borderLeftColor: color }}>
      <div className="stats-card-icon" style={{ color }}>{icon}</div>
      <div className="stats-card-info">
        <span className="stats-card-value">{value ?? '-'}</span>
        <span className="stats-card-title">{title}</span>
      </div>
    </div>
  )
}
