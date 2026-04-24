import { useState, useEffect } from 'react'
import api from '../api/axios'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function Calendar() {
  const [events, setEvents] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const [notars, sigs] = await Promise.all([
          api.get('/notarizations').catch(() => ({ data: [] })),
          api.get('/signatures').catch(() => ({ data: [] })),
        ])
        const notarEvents = (Array.isArray(notars.data) ? notars.data : notars.data?.data || []).map(n => ({
          id: `n-${n.id}`,
          title: `Notarization #${n.id}`,
          date: n.scheduled_date || n.created_at,
          type: 'notarization',
          status: n.status,
          details: n,
        }))
        const sigEvents = (Array.isArray(sigs.data) ? sigs.data : sigs.data?.data || []).map(s => ({
          id: `s-${s.id}`,
          title: `Signature: ${s.signer_name}`,
          date: s.signed_at || s.created_at,
          type: 'signature',
          status: s.status,
          details: s,
        }))
        setEvents([...notarEvents, ...sigEvents])
      } catch { setEvents([]) }
    }
    fetchEvents()
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const getEventsForDate = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date && e.date.startsWith(dateStr))
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []

  const typeColors = { notarization: '#8b5cf6', signature: '#22c55e' }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} className="calendar-cell empty" />)
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = getEventsForDate(d)
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
    const isSelected = d === selectedDate
    cells.push(
      <div key={d} className={`calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
        onClick={() => setSelectedDate(d)}>
        <span className="calendar-day-number">{d}</span>
        {dayEvents.length > 0 && (
          <div className="calendar-event-dots">
            {dayEvents.slice(0, 3).map((e, i) => (
              <span key={i} className="event-dot" style={{ background: typeColors[e.type] || '#64748b' }} />
            ))}
            {dayEvents.length > 3 && <span className="event-more">+{dayEvents.length - 3}</span>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>Calendar</h1>
      </div>
      <div className="calendar-layout">
        <div className="calendar-main">
          <div className="calendar-nav">
            <button className="btn btn-sm" onClick={prevMonth}>&#8249; Prev</button>
            <h2>{MONTHS[month]} {year}</h2>
            <button className="btn btn-sm" onClick={nextMonth}>Next &#8250;</button>
          </div>
          <div className="calendar-header-row">
            {DAYS.map(d => <div key={d} className="calendar-header-cell">{d}</div>)}
          </div>
          <div className="calendar-grid">{cells}</div>
        </div>

        <div className="calendar-sidebar">
          <h3>{selectedDate ? `${MONTHS[month]} ${selectedDate}, ${year}` : 'Select a date'}</h3>
          {selectedDate && selectedEvents.length === 0 && <p className="text-muted">No events on this day</p>}
          {selectedEvents.map(e => (
            <div key={e.id} className="calendar-event-card" style={{ borderLeft: `4px solid ${typeColors[e.type] || '#64748b'}` }}>
              <h4>{e.title}</h4>
              <span className={`status-badge status-${(e.status || '').toLowerCase()}`}>{e.status}</span>
              {e.type === 'notarization' && e.details.location && <p className="text-muted">{e.details.location}</p>}
              {e.type === 'notarization' && e.details.fee && <p className="text-muted">Fee: ${e.details.fee}</p>}
              {e.type === 'signature' && e.details.signer_email && <p className="text-muted">{e.details.signer_email}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
