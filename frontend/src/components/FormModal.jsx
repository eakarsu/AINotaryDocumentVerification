import { useState, useEffect } from 'react'

export default function FormModal({ title, fields, initialData, onSubmit, onClose }) {
  const [formData, setFormData] = useState({})

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData })
    } else {
      const defaults = {}
      fields.forEach((f) => {
        defaults[f.key] = f.defaultValue ?? ''
      })
      setFormData(defaults)
    }
  }, [initialData, fields])

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              {fields.map((field) => (
                <div key={field.key} className="form-group">
                  <label className="form-label">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      className="form-input"
                      value={formData[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      required={field.required}
                    >
                      <option value="">Select...</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt.value ?? opt} value={opt.value ?? opt}>
                          {opt.label ?? opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      className="form-input form-textarea"
                      value={formData[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      required={field.required}
                      rows={4}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      className="form-input"
                      value={formData[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      required={field.required}
                      placeholder={field.placeholder || ''}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              {initialData ? 'Update' : 'Create'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
