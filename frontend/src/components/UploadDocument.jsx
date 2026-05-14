import { useState, useRef } from 'react'
import api from '../api/axios'

export default function UploadDocument({ onUploaded }) {
  const [mode, setMode] = useState('file') // 'file' | 'text'
  const [textContent, setTextContent] = useState('')
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState('Other')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('title', title || 'Uploaded Document')
      formData.append('type', docType)

      if (mode === 'file' && fileRef.current?.files?.[0]) {
        formData.append('file', fileRef.current.files[0])
      } else if (mode === 'text') {
        formData.append('content', textContent)
      } else {
        alert('Please select a file or enter text content')
        setLoading(false)
        return
      }

      const res = await api.post('/documents/upload-text', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
      if (onUploaded) onUploaded(res.data.document)
    } catch (err) {
      setResult({ error: err.response?.data?.error || err.message })
    }
    setLoading(false)
  }

  return (
    <div className="upload-document-panel">
      <h3>&#x1F4E4; Upload Document for AI Analysis</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${mode === 'file' ? 'btn-primary' : ''}`}
          onClick={() => setMode('file')}
        >
          File Upload
        </button>
        <button
          className={`btn btn-sm ${mode === 'text' ? 'btn-primary' : ''}`}
          onClick={() => setMode('text')}
        >
          Paste Text
        </button>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label>Document Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Property Deed - John Doe"
          />
        </div>
        <div className="form-group">
          <label>Document Type</label>
          <select value={docType} onChange={e => setDocType(e.target.value)}>
            {['Contract', 'Deed', 'Affidavit', 'Power of Attorney', 'Will', 'Trust', 'Other'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {mode === 'file' ? (
          <div className="form-group">
            <label>Text File (.txt, .md, .rtf)</label>
            <input type="file" ref={fileRef} accept=".txt,.text,.md,.rtf" />
          </div>
        ) : (
          <div className="form-group">
            <label>Document Content</label>
            <textarea
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              placeholder="Paste or type document content here..."
              rows={8}
              style={{ width: '100%' }}
            />
          </div>
        )}

        <button type="submit" className="btn btn-ai" disabled={loading}>
          {loading ? 'Uploading & Analyzing...' : '&#x1F9E0; Upload & Analyze'}
        </button>
      </form>

      {result && (
        <div className="upload-result" style={{ marginTop: 16 }}>
          {result.error ? (
            <div className="alert alert-error">{result.error}</div>
          ) : (
            <div>
              <div className="alert alert-success">
                Document created: <strong>{result.document?.title}</strong> (ID: {result.document?.id})
              </div>
              {result.analysis && (
                <div className="ai-result-compact" style={{ marginTop: 12 }}>
                  <h4>AI Analysis Result</h4>
                  <div className="detail-grid">
                    {result.analysis.analysis?.summary && (
                      <div className="detail-field">
                        <span className="detail-label">Summary</span>
                        <span className="detail-value">{result.analysis.analysis.summary}</span>
                      </div>
                    )}
                    {result.analysis.analysis?.risk_level && (
                      <div className="detail-field">
                        <span className="detail-label">Risk Level</span>
                        <span className={`status-badge status-${result.analysis.analysis.risk_level}`}>
                          {result.analysis.analysis.risk_level}
                        </span>
                      </div>
                    )}
                    {result.analysis.analysis?.document_type && (
                      <div className="detail-field">
                        <span className="detail-label">Document Type</span>
                        <span className="detail-value">{result.analysis.analysis.document_type}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
