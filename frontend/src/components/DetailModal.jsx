export default function DetailModal({ title, data, onClose, onEdit, onDelete, children }) {
  if (!data) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children ? (
            children
          ) : (
            <div className="detail-grid">
              {Object.entries(data).map(([key, value]) => {
                if (key === '__v') return null
                const label = key
                  .replace(/_/g, ' ')
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (s) => s.toUpperCase())
                return (
                  <div key={key} className="detail-field">
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">
                      {value === null || value === undefined
                        ? '-'
                        : typeof value === 'object'
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {onEdit && (
            <button className="btn btn-primary" onClick={onEdit}>
              Edit
            </button>
          )}
          {onDelete && (
            <button className="btn btn-danger" onClick={onDelete}>
              Delete
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
