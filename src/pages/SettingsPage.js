import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAudit, formatCurrency } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import {
  Settings, Building2, Sliders, ShieldAlert,
  Plus, Trash2, Save, RefreshCw, AlertTriangle,
  Download, Lock, Eye, EyeOff, Check
} from 'lucide-react'

// ─── Section Card ─────────────────────────────────────────────
function Section({ icon: Icon, title, color = 'var(--blue)', children }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{
        padding: '18px 24px', borderBottom: '1px solid var(--card-border)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>{title}</span>
      </div>
      <div style={{ padding: '22px 24px' }}>{children}</div>
    </div>
  )
}

// ─── Loan Config ──────────────────────────────────────────────
function LoanConfigSection({ settings, onSave }) {
  const [form, setForm] = useState({
    starting_capital: '',
    interest_rate: '',
    max_loan_amount: ''
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        starting_capital: settings.starting_capital || 30000,
        interest_rate: ((settings.interest_rate || 0.08) * 100).toFixed(0),
        max_loan_amount: settings.max_loan_amount || 10000
      })
    }
  }, [settings])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    await onSave({
      starting_capital: parseFloat(form.starting_capital),
      interest_rate: parseFloat(form.interest_rate) / 100,
      max_loan_amount: parseFloat(form.max_loan_amount)
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const previewProfit = (parseFloat(form.starting_capital) || 0) * (parseFloat(form.interest_rate) / 100 || 0)

  return (
    <Section icon={Sliders} title="Loan Configuration" color="var(--blue)">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, marginBottom: 20 }}>
        <div className="form-group">
          <label className="form-label">Starting Capital (₱)</label>
          <input type="number" min="0" step="1000" value={form.starting_capital} onChange={e => set('starting_capital', e.target.value)} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Total lending pool</div>
        </div>
        <div className="form-group">
          <label className="form-label">Interest Rate (%)</label>
          <input type="number" min="1" max="100" step="1" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Flat rate per loan</div>
        </div>
        <div className="form-group">
          <label className="form-label">Max Loan Amount (₱)</label>
          <input type="number" min="5000" step="500" value={form.max_loan_amount} onChange={e => set('max_loan_amount', e.target.value)} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Absolute ceiling</div>
        </div>
      </div>

      {/* Live preview */}
      <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: '14px 18px', marginBottom: 18, display: 'flex', gap: 30, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Profit per full capital cycle</div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--blue)' }}>{formatCurrency(previewProfit)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Min loan amount</div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>₱5,000</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fixed</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Pay periods / year</div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>26</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>5th & 20th cutoffs</div>
        </div>
      </div>

      <button onClick={handleSave} className="btn-primary" style={{ gap: 8 }}>
        {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save Configuration</>}
      </button>
    </Section>
  )
}

// ─── Departments ──────────────────────────────────────────────
function DepartmentsSection({ departments, onRefresh, adminEmail }) {
  const [newDept, setNewDept] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { toast } = useToast()

  const handleAdd = async () => {
    const trimmed = newDept.trim()
    if (!trimmed) return
    const exists = departments.some(d => d.name.toLowerCase() === trimmed.toLowerCase())
    if (exists) { toast('Department already exists', 'error'); return }
    setAdding(true)
    const { error } = await supabase.from('departments').insert({ name: trimmed })
    if (error) { toast('Failed to add department', 'error'); setAdding(false); return }
    await logAudit({ action_type: 'DEPT_ADDED', module: 'Settings', description: `Department added: ${trimmed}`, changed_by: adminEmail })
    toast(`"${trimmed}" added`, 'success')
    setNewDept('')
    setAdding(false)
    onRefresh()
  }

  const handleDelete = async (dept) => {
    // Check if any borrowers use this dept
    const { data } = await supabase.from('borrowers').select('id').eq('department_id', dept.id).limit(1)
    if (data?.length > 0) { toast('Cannot delete — borrowers are assigned to this department', 'error'); setDeleteTarget(null); return }
    await supabase.from('departments').delete().eq('id', dept.id)
    await logAudit({ action_type: 'DEPT_DELETED', module: 'Settings', description: `Department deleted: ${dept.name}`, changed_by: adminEmail })
    toast(`"${dept.name}" removed`, 'info')
    setDeleteTarget(null)
    onRefresh()
  }

  return (
    <Section icon={Building2} title="Department Management" color="var(--purple)">
      {/* Add new */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <input
          placeholder="New department name..."
          value={newDept}
          onChange={e => setNewDept(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          style={{ flex: 1 }}
        />
        <button onClick={handleAdd} disabled={adding || !newDept.trim()} className="btn-primary" style={{ gap: 6, padding: '0 18px' }}>
          <Plus size={15} /> Add
        </button>
      </div>

      {/* Department list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {departments.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No departments yet</p>
        )}
        {departments.map(dept => (
          <div key={dept.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)',
            borderRadius: 10, padding: '12px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)' }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{dept.name}</span>
            </div>
            {deleteTarget?.id === dept.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Delete?</span>
                <button onClick={() => handleDelete(dept)} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Yes</button>
                <button onClick={() => setDeleteTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setDeleteTarget(dept)} className="btn-delete" style={{ fontSize: 12, padding: '4px 10px' }}>
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

// ─── Danger Zone / 3-Layer Reset ─────────────────────────────
function DangerZoneSection({ loans, adminEmail, onReset }) {
  const [step, setStep] = useState(0) // 0=idle, 1=warning, 2=type-reset, 3=password
  const [resetInput, setResetInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetting, setResetting] = useState(false)
  const { toast } = useToast()

  const RESET_PASSWORD = '197309'

  const generateCSV = () => {
    if (!loans.length) return null
    const headers = ['ID', 'Borrower ID', 'Amount', 'Total Repayment', 'Installment', 'Status', 'Payments Made', 'Remaining Balance', 'Release Date', 'Due Date', 'Created']
    const rows = loans.map(l => [l.id, l.borrower_id, l.loan_amount, l.total_repayment, l.installment_amount, l.status, l.payments_made, l.remaining_balance, l.release_date, l.due_date, l.created_at])
    return [headers, ...rows].map(r => r.join(',')).join('\n')
  }

  const downloadCSV = () => {
    const csv = generateCSV()
    if (!csv) return
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
    const filename = `LoanManifest_Archive_${dateStr}_${timeStr}.csv`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = async () => {
    setResetting(true)
    // Auto-download archive first
    downloadCSV()
    await new Promise(r => setTimeout(r, 800))

    // Reset: clear capital logs + profit records, revert starting capital
    await supabase.from('capital_logs').delete().neq('id', 0)
    await supabase.from('settings').update({ starting_capital: 30000 }).eq('id', 1)
    await logAudit({
      action_type: 'DASHBOARD_RESET',
      module: 'Settings',
      description: 'Dashboard reset performed. Capital logs cleared, starting capital reverted to ₱30,000. Archive downloaded.',
      changed_by: adminEmail
    })

    toast('Dashboard reset complete. Archive downloaded.', 'success')
    setStep(0)
    setResetInput('')
    setPasswordInput('')
    setResetting(false)
    onReset && onReset()
  }

  const cancel = () => { setStep(0); setResetInput(''); setPasswordInput('') }

  return (
    <Section icon={ShieldAlert} title="Danger Zone" color="var(--red)">
      <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: 'var(--text-primary)' }}>Reset Dashboard Data</div>
            <div style={{ fontSize: 13, color: 'var(--text-label)', maxWidth: 500 }}>
              Clears capital growth logs and profit records. Reverts Starting Capital to ₱30,000.
              <strong style={{ color: 'var(--text-primary)' }}> Does NOT delete borrowers, loans, installments, or audit history.</strong>
            </div>
          </div>
          {step === 0 && (
            <button
              onClick={() => setStep(1)}
              style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              Reset Dashboard
            </button>
          )}
        </div>

        {/* Step 1: Warning */}
        {step === 1 && (
          <div style={{ marginTop: 20, padding: '18px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <AlertTriangle size={20} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ Are you sure?</div>
                <div style={{ fontSize: 13, color: 'var(--text-label)' }}>
                  This will clear dashboard statistics and revert starting capital. A CSV archive of all loans will be downloaded automatically before the reset.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Continue
              </button>
              <button onClick={cancel} className="btn-cancel">Cancel</button>
            </div>
          </div>
        )}

        {/* Step 2: Type RESET */}
        {step === 2 && (
          <div style={{ marginTop: 20, padding: '18px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--text-label)', marginBottom: 12 }}>
              Type <strong style={{ color: 'var(--red)', fontFamily: 'monospace', fontSize: 14 }}>RESET</strong> exactly to continue:
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                placeholder="Type RESET"
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                style={{ flex: 1, fontFamily: 'monospace', fontSize: 14, letterSpacing: '0.1em' }}
                autoFocus
              />
              <button
                onClick={() => resetInput === 'RESET' ? setStep(3) : null}
                disabled={resetInput !== 'RESET'}
                style={{
                  background: resetInput === 'RESET' ? 'var(--red)' : 'rgba(239,68,68,0.15)',
                  color: resetInput === 'RESET' ? '#fff' : 'rgba(239,68,68,0.4)',
                  border: 'none', borderRadius: 8, padding: '8px 20px', cursor: resetInput === 'RESET' ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.15s ease'
                }}
              >
                Next
              </button>
              <button onClick={cancel} className="btn-cancel">Cancel</button>
            </div>
          </div>
        )}

        {/* Step 3: Password */}
        {step === 3 && (
          <div style={{ marginTop: 20, padding: '18px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <Lock size={15} color="var(--red)" />
              <span style={{ fontSize: 13, color: 'var(--text-label)' }}>Enter admin password to confirm:</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Admin password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  style={{ width: '100%', paddingRight: 40 }}
                  autoFocus
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                onClick={() => {
                  if (passwordInput !== RESET_PASSWORD) {
                    alert('Incorrect password')
                    setPasswordInput('')
                    return
                  }
                  handleReset()
                }}
                disabled={resetting || !passwordInput}
                style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                {resetting ? <><RefreshCw size={13} style={{ animation: 'spin 0.6s linear infinite' }} /> Resetting...</> : '🗑️ Reset Now'}
              </button>
              <button onClick={cancel} className="btn-cancel">Cancel</button>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={12} /> A CSV archive will be downloaded automatically before reset
            </div>
          </div>
        )}
      </div>

      {/* Manual archive download */}
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>Download Data Archive</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Export all loan records as CSV at any time</div>
        </div>
        <button onClick={downloadCSV} className="btn-edit" style={{ gap: 6 }}>
          <Download size={14} /> Export CSV
        </button>
      </div>
    </Section>
  )
}

// ─── Main Settings Page ───────────────────────────────────────
export default function SettingsPage() {
  const [settings, setSettings] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    const [{ data: s }, { data: d }, { data: l }] = await Promise.all([
      supabase.from('settings').select('*').eq('id', 1).single(),
      supabase.from('departments').select('*').order('name'),
      supabase.from('loans').select('*')
    ])
    setSettings(s)
    setDepartments(d || [])
    setLoans(l || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSaveConfig = async (values) => {
    const { error } = await supabase.from('settings').update(values).eq('id', 1)
    if (error) { toast('Failed to save settings', 'error'); return }
    await logAudit({ action_type: 'SETTINGS_UPDATED', module: 'Settings', description: `Loan config updated — Capital: ₱${values.starting_capital?.toLocaleString()}, Rate: ${(values.interest_rate * 100).toFixed(0)}%, Max: ₱${values.max_loan_amount?.toLocaleString()}`, changed_by: user?.email })
    toast('Settings saved — changes apply across the app', 'success')
    fetchData()
  }

  if (loading) return (
    <div style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading settings...</div>
    </div>
  )

  return (
    <div style={{ padding: '32px 28px', maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your lending system</p>
        </div>
      </div>

      <LoanConfigSection settings={settings} onSave={handleSaveConfig} />
      <DepartmentsSection departments={departments} onRefresh={fetchData} adminEmail={user?.email} />
      <DangerZoneSection loans={loans} adminEmail={user?.email} onReset={fetchData} />
    </div>
  )
}
