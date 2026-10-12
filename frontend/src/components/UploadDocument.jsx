import { useState, useRef } from 'react'
import api from '../api/axios'
import FullFieldPresets from './FullFieldPresets'
import AIReport from './AIReport'

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

      <FullFieldPresets value={{ title, docType, textContent }} onChange={(next) => { setTitle(next.title); setDocType(next.docType); setTextContent(next.textContent); setMode('text'); setResult(null) }} presets={[
        { label: 'Deed excerpt', values: { title: 'Sample property deed', docType: 'Deed', textContent: 'Morgan Lee grants the property at 42 Oak Street to Avery Chen. Consideration: $285,000. Verify legal description, signatures, acknowledgment, and recording requirements.' } },
        { label: 'Affidavit excerpt', values: { title: 'Sample identity affidavit', docType: 'Affidavit', textContent: 'I, Jordan Rivera, state that the attached inventory is accurate to the best of my knowledge. Signed April 12, 2026, in Albany, New York. Confirm identity and notarial wording.' } },
        { label: 'Power of attorney excerpt', values: { title: 'Sample limited power of attorney', docType: 'Power of Attorney', textContent: 'Priya Shah appoints Alex Morgan to manage the listed property and banking matters through December 31, 2026. Review scope, revocation, witnesses, and acknowledgment.' } },
      ]} />
      {mode === 'file' && <p>Select a genuine local file before uploading; examples switch to editable text and preserve any existing file selection.</p>}
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
              {result.analysis && <AIReport response={result.analysis.analysis ?? result.analysis} title="Document analysis" />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
