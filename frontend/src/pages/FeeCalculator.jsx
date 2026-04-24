import { useState } from 'react'

const STATE_FEES = {
  'Alabama': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Alaska': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Reasonable' },
  'Arizona': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 10.00, travel: 'Negotiable' },
  'Arkansas': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'California': { acknowledgment: 15.00, jurat: 15.00, oath: 15.00, deposition: 30.00, travel: 'Negotiable' },
  'Colorado': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 10.00, travel: 'Reasonable' },
  'Connecticut': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Delaware': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Florida': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 20.00, travel: 'Negotiable' },
  'Georgia': { acknowledgment: 2.00, jurat: 2.00, oath: 2.00, deposition: 2.00, travel: 'Negotiable' },
  'Hawaii': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Reasonable' },
  'Idaho': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Illinois': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Indiana': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 10.00, travel: 'Negotiable' },
  'Iowa': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Kansas': { acknowledgment: 7.00, jurat: 7.00, oath: 7.00, deposition: 7.00, travel: 'Negotiable' },
  'Kentucky': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Louisiana': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Maine': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Reasonable' },
  'Maryland': { acknowledgment: 4.00, jurat: 4.00, oath: 4.00, deposition: 4.00, travel: 'Negotiable' },
  'Massachusetts': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Michigan': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 10.00, travel: 'Negotiable' },
  'Minnesota': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Mississippi': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Missouri': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Montana': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 10.00, travel: 'Reasonable' },
  'Nebraska': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Nevada': { acknowledgment: 15.00, jurat: 15.00, oath: 15.00, deposition: 15.00, travel: 'Negotiable' },
  'New Hampshire': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 10.00, travel: 'Negotiable' },
  'New Jersey': { acknowledgment: 2.50, jurat: 2.50, oath: 2.50, deposition: 2.50, travel: 'Negotiable' },
  'New Mexico': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'New York': { acknowledgment: 2.00, jurat: 2.00, oath: 2.00, deposition: 2.00, travel: 'Negotiable' },
  'North Carolina': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 10.00, travel: 'Negotiable' },
  'North Dakota': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Ohio': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Oklahoma': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Oregon': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 10.00, travel: 'Negotiable' },
  'Pennsylvania': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Rhode Island': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'South Carolina': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'South Dakota': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 10.00, travel: 'Negotiable' },
  'Tennessee': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Texas': { acknowledgment: 6.00, jurat: 6.00, oath: 6.00, deposition: 6.00, travel: 'Negotiable' },
  'Utah': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 10.00, travel: 'Negotiable' },
  'Vermont': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 10.00, travel: 'Reasonable' },
  'Virginia': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Washington': { acknowledgment: 10.00, jurat: 10.00, oath: 10.00, deposition: 10.00, travel: 'Negotiable' },
  'West Virginia': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Wisconsin': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
  'Wyoming': { acknowledgment: 5.00, jurat: 5.00, oath: 5.00, deposition: 5.00, travel: 'Negotiable' },
}

export default function FeeCalculator() {
  const [state, setState] = useState('')
  const [actType, setActType] = useState('acknowledgment')
  const [quantity, setQuantity] = useState(1)
  const [additionalFees, setAdditionalFees] = useState({ travel: 0, copies: 0, other: 0 })

  const fees = state ? STATE_FEES[state] : null
  const perActFee = fees ? fees[actType] || 0 : 0
  const subtotal = perActFee * quantity
  const additional = parseFloat(additionalFees.travel || 0) + parseFloat(additionalFees.copies || 0) + parseFloat(additionalFees.other || 0)
  const total = subtotal + additional

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>Fee Calculator</h1>
        <p className="page-subtitle">Calculate notary fees by state</p>
      </div>

      <div className="calculator-layout">
        <div className="calculator-form-card">
          <h3>Calculate Fees</h3>
          <div className="form-group">
            <label>State</label>
            <select className="form-input" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Select a state...</option>
              {Object.keys(STATE_FEES).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Notarial Act</label>
            <select className="form-input" value={actType} onChange={(e) => setActType(e.target.value)}>
              <option value="acknowledgment">Acknowledgment</option>
              <option value="jurat">Jurat</option>
              <option value="oath">Oath/Affirmation</option>
              <option value="deposition">Deposition</option>
            </select>
          </div>
          <div className="form-group">
            <label>Number of Signatures</label>
            <input type="number" className="form-input" min="1" max="100" value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
          <h4 style={{ marginTop: '20px' }}>Additional Fees</h4>
          <div className="form-group">
            <label>Travel Fee ($)</label>
            <input type="number" className="form-input" min="0" step="0.01" value={additionalFees.travel}
              onChange={(e) => setAdditionalFees({...additionalFees, travel: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Copy Fees ($)</label>
            <input type="number" className="form-input" min="0" step="0.01" value={additionalFees.copies}
              onChange={(e) => setAdditionalFees({...additionalFees, copies: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Other Fees ($)</label>
            <input type="number" className="form-input" min="0" step="0.01" value={additionalFees.other}
              onChange={(e) => setAdditionalFees({...additionalFees, other: e.target.value})} />
          </div>
        </div>

        <div className="calculator-result-card">
          <h3>Fee Summary</h3>
          {!state ? (
            <p className="text-muted">Select a state to see fees</p>
          ) : (
            <>
              <div className="fee-summary">
                <div className="fee-row">
                  <span>State</span>
                  <span>{state}</span>
                </div>
                <div className="fee-row">
                  <span>{actType.charAt(0).toUpperCase() + actType.slice(1)} (per act)</span>
                  <span>${perActFee.toFixed(2)}</span>
                </div>
                <div className="fee-row">
                  <span>Quantity</span>
                  <span>x {quantity}</span>
                </div>
                <div className="fee-row fee-subtotal">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {parseFloat(additionalFees.travel) > 0 && (
                  <div className="fee-row"><span>Travel</span><span>${parseFloat(additionalFees.travel).toFixed(2)}</span></div>
                )}
                {parseFloat(additionalFees.copies) > 0 && (
                  <div className="fee-row"><span>Copies</span><span>${parseFloat(additionalFees.copies).toFixed(2)}</span></div>
                )}
                {parseFloat(additionalFees.other) > 0 && (
                  <div className="fee-row"><span>Other</span><span>${parseFloat(additionalFees.other).toFixed(2)}</span></div>
                )}
                <div className="fee-row fee-total">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <div className="fee-note">
                <p>Travel fee policy: {fees?.travel || 'N/A'}</p>
              </div>

              <h4 style={{ marginTop: '24px' }}>All {state} Fees</h4>
              <div className="state-fees-table">
                {Object.entries(fees).filter(([k]) => k !== 'travel').map(([act, fee]) => (
                  <div key={act} className="fee-row">
                    <span>{act.charAt(0).toUpperCase() + act.slice(1)}</span>
                    <span>${typeof fee === 'number' ? fee.toFixed(2) : fee}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
