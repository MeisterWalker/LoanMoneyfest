const fs = require('fs'), path = require('path')

// Fix 1 — PublicApplyPage validation
const applyPath = path.join(__dirname, 'src', 'pages', 'PublicApplyPage.js')
let apply = fs.readFileSync(applyPath, 'utf8')

const oldV = `  const validateStep1 = () => {
    if (!form.full_name.trim()) return 'Full name is required'
    if (!form.department) return 'Department is required'
    if (!form.phone.trim()) return 'Phone number is required'
    if (!form.email.trim() || !form.email.includes('@')) return 'Valid email is required'
    return null
  }

  const validateStep2 = () => {
    if (!form.trustee_name.trim()) return 'Trustee name is required'
    if (!form.trustee_phone.trim()) return 'Trustee phone is required'
    if (!form.trustee_relationship.trim()) return 'Trustee relationship is required'
    return null
  }`

const newV = `  const isGibberish = (val) => {
    const v = val.trim()
    if (v.length < 2) return true
    const freq = {}
    for (const c of v.toLowerCase()) freq[c] = (freq[c] || 0) + 1
    const maxFreq = Math.max(...Object.values(freq))
    if (maxFreq / v.length > 0.5) return true
    return false
  }

  const isValidPHPhone = (val) => /^(09|\\+639)\\d{9}$/.test(val.replace(/\\s/g, ''))
  const isValidEmail = (val) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(val)
  const isValidName = (val) => {
    const v = val.trim()
    if (v.length < 3) return false
    if (!/[a-zA-Z]/.test(v)) return false
    if (isGibberish(v)) return false
    return true
  }

  const validateStep1 = () => {
    if (!form.full_name.trim()) return 'Full name is required'
    if (!isValidName(form.full_name)) return 'Please enter a valid full name (e.g. Juan dela Cruz)'
    if (!form.department) return 'Department is required'
    if (!form.phone.trim()) return 'Phone number is required'
    if (!isValidPHPhone(form.phone)) return 'Enter a valid PH phone number (e.g. 09XX XXX XXXX)'
    if (!form.email.trim()) return 'Email address is required'
    if (!isValidEmail(form.email)) return 'Enter a valid email address'
    if (form.address.trim() && form.address.trim().length < 5) return 'Please enter a valid home address'
    return null
  }

  const validateStep2 = () => {
    if (!form.trustee_name.trim()) return 'Trustee name is required'
    if (!isValidName(form.trustee_name)) return 'Please enter a valid trustee name'
    if (!form.trustee_phone.trim()) return 'Trustee phone is required'
    if (!isValidPHPhone(form.trustee_phone)) return 'Enter a valid PH phone number for trustee'
    if (!form.trustee_relationship.trim()) return 'Trustee relationship is required'
    if (form.trustee_relationship.trim().length < 3) return 'Please enter a valid relationship (e.g. Spouse, Sibling)'
    return null
  }`

if (apply.includes(oldV)) { apply = apply.replace(oldV, newV); fs.writeFileSync(applyPath, apply); console.log('✅ Fix 1 — validation improved') }
else console.log('ℹ️  Fix 1 already applied')

// Fix 2 — ApplicationsPage release method display
const appPath = path.join(__dirname, 'src', 'pages', 'ApplicationsPage.js')
let app = fs.readFileSync(appPath, 'utf8')

const oldR = `            {app.release_method && (
              <div style={{ marginTop: 6, fontSize: 13, color: '#7A8AAA', display: 'flex', alignItems: 'center', gap: 6 }}>
                Release Method: <span style={{ color: '#CBD5F0', fontWeight: 600 }}>{app.release_method}</span>
                {app.release_method !== 'Physical Cash' && app.release_method !== 'RCBC' && (
                  <span style={{ fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: '2px 7px' }}>Transaction fee applies</span>
                )}
                {(app.release_method === 'Physical Cash' || app.release_method === 'RCBC') && (
                  <span style={{ fontSize: 11, color: '#22C55E', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '2px 7px' }}>No fee</span>
                )}
              </div>
            )}`

const newR = `            {app.release_method ? (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px' }}>
                <img
                  src={app.release_method === 'GCash' ? '/gcash-logo.png' : app.release_method === 'RCBC' ? '/rcbc-logo.png' : app.release_method === 'Other Bank Transfer' ? '/bank-logo.png' : '/cash-logo.png'}
                  alt={app.release_method}
                  style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#4B5580', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preferred Release Method</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#F0F4FF', marginTop: 2 }}>{app.release_method}</div>
                </div>
                {(app.release_method === 'Physical Cash' || app.release_method === 'RCBC') ? (
                  <span style={{ fontSize: 11, color: '#22C55E', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>\u2713 No fee</span>
                ) : (
                  <span style={{ fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>Fee applies</span>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, fontSize: 12, color: '#EF4444' }}>
                \u26A0\uFE0F No release method specified
              </div>
            )}`

if (app.includes(oldR)) { app = app.replace(oldR, newR); fs.writeFileSync(appPath, app); console.log('✅ Fix 2 — release method display improved') }
else console.log('ℹ️  Fix 2 already applied')

console.log('\n🎉 Done! Run: git add . && git commit -m "fix release method display and form validation" && git push')
