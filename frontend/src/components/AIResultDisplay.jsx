import { useState } from 'react'

function ConfidenceBar({ value, label }) {
  const pct = typeof value === 'number' ? Math.round(value * (value <= 1 ? 100 : 1)) : 0
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="confidence-bar-wrapper">
      {label && <span className="confidence-label">{label}</span>}
      <div className="confidence-bar-track">
        <div
          className="confidence-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="confidence-value" style={{ color }}>{pct}%</span>
    </div>
  )
}

function RiskBadge({ level }) {
  const lvl = (level || 'unknown').toLowerCase()
  const colorMap = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  }
  const color = colorMap[lvl] || '#94a3b8'
  return (
    <span className="risk-badge" style={{ backgroundColor: `${color}20`, color, borderColor: color }}>
      {lvl.toUpperCase()}
    </span>
  )
}

function ExpandableCard({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`expandable-card ${open ? 'open' : ''}`}>
      <div className="expandable-card-header" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="expand-arrow">{open ? '\u25B2' : '\u25BC'}</span>
      </div>
      {open && <div className="expandable-card-body">{children}</div>}
    </div>
  )
}

export default function AIResultDisplay({ result, loading }) {
  if (loading) {
    return (
      <div className="ai-loading">
        <div className="ai-spinner" />
        <p className="ai-loading-text">AI is analyzing...</p>
        <p className="ai-loading-sub">This may take a few moments</p>
      </div>
    )
  }

  if (!result) return null

  const data = result.data || result.result || result

  return (
    <div className="ai-result fade-in">
      {/* Summary */}
      {data.summary && (
        <div className="ai-section">
          <h4 className="ai-section-title">Summary</h4>
          <div className="ai-summary-box">{data.summary}</div>
        </div>
      )}

      {/* Status / Verdict */}
      {(data.status || data.verdict) && (
        <div className="ai-section">
          <h4 className="ai-section-title">Result</h4>
          <div className="ai-verdict">
            <RiskBadge level={data.status || data.verdict} />
          </div>
        </div>
      )}

      {/* Confidence Score */}
      {data.confidence != null && (
        <div className="ai-section">
          <h4 className="ai-section-title">Confidence</h4>
          <ConfidenceBar value={data.confidence} />
        </div>
      )}

      {data.confidence_score != null && (
        <div className="ai-section">
          <h4 className="ai-section-title">Confidence Score</h4>
          <ConfidenceBar value={data.confidence_score} />
        </div>
      )}

      {/* Risk Level */}
      {data.risk_level && (
        <div className="ai-section">
          <h4 className="ai-section-title">Risk Level</h4>
          <RiskBadge level={data.risk_level} />
        </div>
      )}

      {/* Risk Score */}
      {data.risk_score != null && (
        <div className="ai-section">
          <h4 className="ai-section-title">Risk Score</h4>
          <ConfidenceBar value={data.risk_score} label="Risk" />
        </div>
      )}

      {/* Findings */}
      {data.findings && Array.isArray(data.findings) && data.findings.length > 0 && (
        <div className="ai-section">
          <h4 className="ai-section-title">Findings</h4>
          {data.findings.map((finding, i) => (
            <ExpandableCard
              key={i}
              title={typeof finding === 'string' ? finding : finding.title || finding.name || `Finding ${i + 1}`}
              defaultOpen={i === 0}
            >
              {typeof finding === 'string' ? (
                <p>{finding}</p>
              ) : (
                <div className="finding-details">
                  {finding.description && <p>{finding.description}</p>}
                  {finding.severity && (
                    <div className="finding-meta">
                      <span>Severity:</span> <RiskBadge level={finding.severity} />
                    </div>
                  )}
                  {finding.confidence && <ConfidenceBar value={finding.confidence} label="Confidence" />}
                </div>
              )}
            </ExpandableCard>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0 && (
        <div className="ai-section">
          <h4 className="ai-section-title">Recommendations</h4>
          <ol className="ai-recommendations">
            {data.recommendations.map((rec, i) => (
              <li key={i} className="ai-recommendation-item">
                <span className="rec-number">{i + 1}</span>
                <span className="rec-text">{typeof rec === 'string' ? rec : rec.text || rec.description || JSON.stringify(rec)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Entities */}
      {data.entities && Array.isArray(data.entities) && data.entities.length > 0 && (
        <div className="ai-section">
          <h4 className="ai-section-title">Entities</h4>
          <div className="entity-tags">
            {data.entities.map((entity, i) => (
              <span key={i} className="entity-tag">
                {typeof entity === 'string'
                  ? entity
                  : `${entity.type || ''}: ${entity.value || entity.name || ''}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {data.issues && Array.isArray(data.issues) && data.issues.length > 0 && (
        <div className="ai-section">
          <h4 className="ai-section-title">Issues</h4>
          {data.issues.map((issue, i) => (
            <div key={i} className="ai-issue-item">
              {typeof issue === 'string' ? (
                <p>{issue}</p>
              ) : (
                <>
                  <div className="issue-header">
                    <strong>{issue.title || issue.type || `Issue ${i + 1}`}</strong>
                    {issue.severity && <RiskBadge level={issue.severity} />}
                  </div>
                  {issue.description && <p className="issue-desc">{issue.description}</p>}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Compliance Status */}
      {data.compliant != null && (
        <div className="ai-section">
          <h4 className="ai-section-title">Compliance Status</h4>
          <div className="compliance-status">
            <span className={`compliance-badge ${data.compliant ? 'compliant' : 'non-compliant'}`}>
              {data.compliant ? '\u2705 Compliant' : '\u274C Non-Compliant'}
            </span>
          </div>
        </div>
      )}

      {/* Catch-all for other fields */}
      {renderRemainingFields(data)}
    </div>
  )
}

function renderRemainingFields(data) {
  const knownKeys = new Set([
    'summary', 'status', 'verdict', 'confidence', 'confidence_score',
    'risk_level', 'risk_score', 'findings', 'recommendations', 'entities',
    'issues', 'compliant', 'data', 'result', 'id', 'created_at', 'updated_at',
    '_id', '__v', 'document_id', 'client_id', 'analysis_type'
  ])

  const remaining = Object.entries(data).filter(
    ([key, val]) => !knownKeys.has(key) && val != null && typeof val !== 'object'
  )

  if (remaining.length === 0) return null

  return (
    <div className="ai-section">
      <h4 className="ai-section-title">Details</h4>
      <div className="ai-details-grid">
        {remaining.map(([key, val]) => (
          <div key={key} className="ai-detail-item">
            <span className="ai-detail-label">
              {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
            </span>
            <span className="ai-detail-value">{String(val)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
