export default function DeleteConfirm({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirm Delete</h2>
          <button className="modal-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="delete-warning">
            <span className="delete-icon">&#x26A0;</span>
            <p>{message || 'Are you sure you want to delete this record? This action cannot be undone.'}</p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-danger" onClick={onConfirm}>
            Delete
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
