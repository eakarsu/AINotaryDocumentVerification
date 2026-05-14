import { useState } from 'react'
import api from '../api/axios'
import AIResultDisplay from '../components/AIResultDisplay'

const TOOLS = [
  { id: 'witness-vetting', label: 'Witness Vetting', endpoint: '/ai/witness-vetting' },
  { id: 'client-risk-score', label: 'Client Risk Score', endpoint: '/ai/client-risk-score' },
  { id: 'template-suggestion', label: 'Template Suggestion', endpoint: '/ai/template-suggestion' },
  { id: 'fee-optimization', label: 'Fee Optimization', endpoint: '/ai/fee-optimization' },
]

export default function AIRiskAnalysis() {
  const [activeTool, setActiveTool] = useState('witness-vetting')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const [witness, setWitness] = useState({
    full_name: '',
    relationship_to_signer: '',
    id_type: '',
    id_number: '',
    notes: '',
  })
  const [client, setClient] = useState({
    client_id: '',
    full_name: '',
    history_summary: '',
    transaction_value: '',
    flags: '',
  })
  const [template, setTemplate] = useState({
    document_purpose: '',
    jurisdiction: '',
    parties: '',
    requirements: '',
  })
  const [fee, setFee] = useState({
    document_type: '',
    jurisdiction: '',
    complexity: '',
    target_margin: '',
  })

  const run = async () => {
    setLoading(true)
    setResult(null)
    setError('')
    try {
      let body
      const tool = TOOLS.find(t => t.id === activeTool)
      if (activeTool === 'witness-vetting') {
        body = { ...witness }
      } else if (activeTool === 'client-risk-score') {
        body = {
          client_id: client.client_id ? parseInt(client.client_id, 10) : undefined,
          full_name: client.full_name,
          history_summary: client.history_summary,
          transaction_value: client.transaction_value ? parseFloat(client.transaction_value) : undefined,
          flags: client.flags ? client.flags.split(',').map(s => s.trim()).filter(Boolean) : [],
        }
      } else if (activeTool === 'template-suggestion') {
        body = { ...template }
      } else {
        body = {
          document_type: fee.document_type || undefined,
          jurisdiction: fee.jurisdiction || undefined,
          complexity: fee.complexity || undefined,
          target_margin: fee.target_margin ? parseFloat(fee.target_margin) : undefined,
        }
      }
      const res = await api.post(tool.endpoint, body)
      setResult(res.data)
    } catch (err) {
      const status = err.response?.status
      if (status === 503) {
        setError('AI service unavailable — OPENROUTER_API_KEY is not configured on the server.')
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || err.message || 'AI request failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{'\u{1F50E}'} AI Risk & Templates</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            className={`btn ${activeTool === t.id ? 'btn-ai' : 'btn-secondary'}`}
            onClick={() => { setActiveTool(t.id); setResult(null); setError('') }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ai-analysis-panel">
        {activeTool === 'witness-vetting' && (
          <>
            <h3>Witness Vetting</h3>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={witness.full_name} onChange={e => setWitness({ ...witness, full_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Relationship to Signer</label>
              <input className="form-input" value={witness.relationship_to_signer} onChange={e => setWitness({ ...witness, relationship_to_signer: e.target.value })} placeholder="Friend, neighbor, none..." />
            </div>
            <div className="form-group">
              <label className="form-label">ID Type</label>
              <input className="form-input" value={witness.id_type} onChange={e => setWitness({ ...witness, id_type: e.target.value })} placeholder="Driver's license, passport..." />
            </div>
            <div className="form-group">
              <label className="form-label">ID Number</label>
              <input className="form-input" value={witness.id_number} onChange={e => setWitness({ ...witness, id_number: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input form-textarea" rows={3} value={witness.notes} onChange={e => setWitness({ ...witness, notes: e.target.value })} />
            </div>
          </>
        )}

        {activeTool === 'client-risk-score' && (
          <>
            <h3>Client Risk Score</h3>
            <div className="form-group">
              <label className="form-label">Client ID (optional)</label>
              <input className="form-input" type="number" value={client.client_id} onChange={e => setClient({ ...client, client_id: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={client.full_name} onChange={e => setClient({ ...client, full_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">History Summary</label>
              <textarea className="form-input form-textarea" rows={3} value={client.history_summary} onChange={e => setClient({ ...client, history_summary: e.target.value })} placeholder="Prior transactions, disputes, watchlist hits..." />
            </div>
            <div className="form-group">
              <label className="form-label">Transaction Value</label>
              <input className="form-input" type="number" value={client.transaction_value} onChange={e => setClient({ ...client, transaction_value: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Flags (comma-separated)</label>
              <input className="form-input" value={client.flags} onChange={e => setClient({ ...client, flags: e.target.value })} placeholder="PEP, sanctions, adverse media" />
            </div>
          </>
        )}

        {activeTool === 'fee-optimization' && (
          <>
            <h3>Fee Optimization</h3>
            <div className="form-group">
              <label className="form-label">Document Type *</label>
              <input className="form-input" value={fee.document_type} onChange={e => setFee({ ...fee, document_type: e.target.value })} placeholder="Real estate, POA, affidavit..." />
            </div>
            <div className="form-group">
              <label className="form-label">Jurisdiction</label>
              <input className="form-input" value={fee.jurisdiction} onChange={e => setFee({ ...fee, jurisdiction: e.target.value })} placeholder="CA, NY..." />
            </div>
            <div className="form-group">
              <label className="form-label">Complexity</label>
              <input className="form-input" value={fee.complexity} onChange={e => setFee({ ...fee, complexity: e.target.value })} placeholder="standard | high | rush" />
            </div>
            <div className="form-group">
              <label className="form-label">Target Margin (0.0 - 1.0)</label>
              <input className="form-input" type="number" step="0.01" value={fee.target_margin} onChange={e => setFee({ ...fee, target_margin: e.target.value })} />
            </div>
          </>
        )}

        {activeTool === 'template-suggestion' && (
          <>
            <h3>Template Suggestion</h3>
            <div className="form-group">
              <label className="form-label">Document Purpose *</label>
              <input className="form-input" value={template.document_purpose} onChange={e => setTemplate({ ...template, document_purpose: e.target.value })} placeholder="Real estate deed, POA, affidavit..." />
            </div>
            <div className="form-group">
              <label className="form-label">Jurisdiction</label>
              <input className="form-input" value={template.jurisdiction} onChange={e => setTemplate({ ...template, jurisdiction: e.target.value })} placeholder="CA, NY..." />
            </div>
            <div className="form-group">
              <label className="form-label">Parties</label>
              <textarea className="form-input form-textarea" rows={2} value={template.parties} onChange={e => setTemplate({ ...template, parties: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Requirements / Notes</label>
              <textarea className="form-input form-textarea" rows={3} value={template.requirements} onChange={e => setTemplate({ ...template, requirements: e.target.value })} />
            </div>
          </>
        )}

        <button className="btn btn-ai" onClick={run} disabled={loading}>
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>

        {error && <div style={{ color: '#ef4444', marginTop: 12 }}>{error}</div>}
        <AIResultDisplay result={result} loading={loading} />
      </div>
    </div>
  )
}
