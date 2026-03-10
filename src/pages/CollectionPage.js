import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/helpers'
import { Calendar, List, ChevronLeft, ChevronRight, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function snapToCutoff(year, month, day) {
  // Snap any day to the nearest upcoming cutoff (5th or 20th)
  if (day <= 5) return { year, month, day: 5 }
  if (day <= 20) return { year, month, day: 20 }
  // past 20th → snap to 5th of next month
  const next = new Date(year, month + 1, 5)
  return { year: next.getFullYear(), month: next.getMonth(), day: 5 }
}

function getInstallmentDates(loan) {
  if (!loan.release_date) return []
  const dates = []
  // Parse date parts directly to avoid UTC timezone shift
  const [ry, rm, rd] = loan.release_date.slice(0, 10).split('-').map(Number)
  // Snap release date to nearest cutoff first — handles any bad stored date
  let { year, month, day } = snapToCutoff(ry, rm - 1, rd)

  for (let i = 0; i < 4; i++) {
    if (day === 5) {
      day = 20
    } else {
      day = 5
      month += 1
      if (month > 11) { month = 0; year += 1 }
    }
    dates.push(new Date(year, month, day))
  }
  return dates
}

function buildSchedule(loans, borrowers) {
  const events = []
  for (const loan of loans) {
    if (!['Pending', 'Active', 'Partially Paid', 'Overdue'].includes(loan.status)) continue
    const borrower = borrowers.find(b => b.id === loan.borrower_id)
    const dates = getInstallmentDates(loan)
    dates.forEach((date, i) => {
      const installmentNum = i + 1
      const isPaid = installmentNum <= loan.payments_made
      const isNext = installmentNum === loan.payments_made + 1
      const today = new Date(); today.setHours(0,0,0,0)
      const isPast = date < today && !isPaid
      events.push({
        date,
        dateKey: date.toISOString().slice(0, 10),
        loan,
        borrower,
        installmentNum,
        isPaid,
        isNext,
        isPast,
        amount: loan.installment_amount
      })
    })
  }
  return events.sort((a, b) => a.date - b.date)
}

function EventDot({ isPaid, isPast, isNext }) {
  const color = isPaid ? 'var(--green)' : isPast ? 'var(--red)' : isNext ? 'var(--blue)' : 'var(--text-muted)'
  return <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

// ─── Calendar View ────────────────────────────────────────────
function CalendarView({ events, currentMonth, setCurrentMonth }) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [selected, setSelected] = useState(null)

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const getEventsForDay = (day) => {
    if (!day) return []
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.dateKey === key)
  }

  const selectedEvents = selected ? getEventsForDay(selected) : []
  const isCutoff = (day) => day === 5 || day === 20

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18 }}>
          {currentMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 0' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const dayDate = new Date(year, month, day); dayDate.setHours(0, 0, 0, 0)
          const isToday = dayDate.getTime() === today.getTime()
          const dayEvents = getEventsForDay(day)
          const isSelected = selected === day
          const cutoff = isCutoff(day)

          return (
            <div
              key={day}
              onClick={() => setSelected(isSelected ? null : day)}
              style={{
                minHeight: 64, borderRadius: 8, padding: '6px 8px', cursor: dayEvents.length > 0 || cutoff ? 'pointer' : 'default',
                background: isSelected ? 'rgba(59,130,246,0.15)' : cutoff ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isSelected ? 'rgba(59,130,246,0.4)' : cutoff ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)'}`,
                transition: 'all 0.1s ease'
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isToday ? 'var(--blue)' : 'transparent',
                fontSize: 13, fontWeight: isToday ? 700 : 400,
                color: isToday ? '#fff' : cutoff ? 'var(--blue)' : 'var(--text-primary)',
                marginBottom: 4
              }}>
                {day}
              </div>
              {cutoff && dayEvents.length === 0 && (
                <div style={{ fontSize: 9, color: 'rgba(59,130,246,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cutoff</div>
              )}
              {dayEvents.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {dayEvents.slice(0, 4).map((ev, i) => (
                    <EventDot key={i} isPaid={ev.isPaid} isPast={ev.isPast} isNext={ev.isNext} />
                  ))}
                  {dayEvents.length > 4 && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{dayEvents.length - 4}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected day panel */}
      {selected && (
        <div style={{ marginTop: 16, padding: '16px 18px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
            {new Date(year, month, selected).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          {selectedEvents.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{isCutoff(selected) ? 'Cutoff day — no installments scheduled' : 'No installments this day'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedEvents.map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <EventDot isPaid={ev.isPaid} isPast={ev.isPast} isNext={ev.isNext} />
                    <span style={{ fontWeight: 500 }}>{ev.borrower?.full_name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Installment {ev.installmentNum}/4</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: ev.isPaid ? 'var(--green)' : ev.isPast ? 'var(--red)' : 'var(--text-primary)' }}>
                      {formatCurrency(ev.amount)}
                    </span>
                    {ev.isPaid && <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ Paid</span>}
                    {ev.isPast && <span style={{ fontSize: 11, color: 'var(--red)' }}>⚠ Overdue</span>}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(59,130,246,0.15)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Total due</span>
                <span style={{ fontWeight: 700, color: 'var(--blue)' }}>
                  {formatCurrency(selectedEvents.filter(e => !e.isPaid).reduce((s, e) => s + e.amount, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Agenda View ──────────────────────────────────────────────
function AgendaView({ events }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const upcoming = events.filter(e => !e.isPaid && e.date >= today)
  const overdue = events.filter(e => e.isPast)

  const grouped = {}
  upcoming.forEach(e => {
    if (!grouped[e.dateKey]) grouped[e.dateKey] = []
    grouped[e.dateKey].push(e)
  })

  return (
    <div>
      {/* Overdue alerts */}
      {overdue.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={15} color="var(--red)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>Overdue ({overdue.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {overdue.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
                <div>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{ev.borrower?.full_name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>Installment {ev.installmentNum}/4 · {formatDate(ev.dateKey)}</span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--red)' }}>{formatCurrency(ev.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming grouped by date */}
      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={40} />
          <h3>All caught up!</h3>
          <p>No upcoming installments scheduled</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(grouped).map(([dateKey, dayEvents]) => {
            const date = new Date(dateKey)
            const isToday = date.getTime() === today.getTime()
            const daysLeft = Math.ceil((date - today) / (1000 * 60 * 60 * 24))
            const total = dayEvents.reduce((s, e) => s + e.amount, 0)

            return (
              <div key={dateKey}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={14} color={isToday ? 'var(--blue)' : 'var(--text-muted)'} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: isToday ? 'var(--blue)' : 'var(--text-primary)' }}>
                      {date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: isToday ? 'var(--blue)' : 'var(--text-muted)', background: isToday ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 10 }}>
                    {isToday ? '📅 Today' : daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft} days`}
                  </span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--green)', fontSize: 14 }}>
                    {formatCurrency(total)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dayEvents.map((ev, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Clock size={13} color="var(--text-muted)" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.borrower?.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {ev.borrower?.department} · Installment {ev.installmentNum} of 4
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(ev.amount)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loan: {formatCurrency(ev.loan.loan_amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Collection Page ─────────────────────────────────────
export default function CollectionPage() {
  const [loans, setLoans] = useState([])
  const [borrowers, setBorrowers] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('agenda') // 'agenda' | 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    const [{ data: l }, { data: b }] = await Promise.all([
      supabase.from('loans').select('*'),
      supabase.from('borrowers').select('*')
    ])
    setLoans(l || [])
    setBorrowers(b || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const events = buildSchedule(loans, borrowers)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const upcomingCount = events.filter(e => !e.isPaid && e.date >= today).length
  const overdueCount = events.filter(e => e.isPast).length
  const thisMonthTotal = events
    .filter(e => !e.isPaid && e.date.getMonth() === today.getMonth() && e.date.getFullYear() === today.getFullYear())
    .reduce((s, e) => s + e.amount, 0)

  if (loading) return (
    <div style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading schedule...</div>
    </div>
  )

  return (
    <div style={{ padding: '32px 28px', maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Collection Schedule</h1>
          <p className="page-subtitle">All upcoming installment due dates</p>
        </div>
        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
          {[['agenda', <List size={15} />, 'Agenda'], ['calendar', <Calendar size={15} />, 'Calendar']].map(([v, icon, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: view === v ? 'var(--blue)' : 'transparent',
              color: view === v ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Upcoming', value: upcomingCount, color: 'var(--blue)' },
          { label: 'Overdue', value: overdueCount, color: overdueCount > 0 ? 'var(--red)' : 'var(--text-muted)' },
          { label: 'This Month', value: formatCurrency(thisMonthTotal), color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { color: 'var(--blue)', label: 'Next due' },
          { color: 'var(--green)', label: 'Paid' },
          { color: 'var(--red)', label: 'Overdue' },
          { color: 'var(--text-muted)', label: 'Scheduled' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '22px 24px' }}>
        {view === 'calendar'
          ? <CalendarView events={events} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
          : <AgendaView events={events} />
        }
      </div>
    </div>
  )
}
