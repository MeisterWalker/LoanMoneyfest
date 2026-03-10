const fs = require('fs')
const path = require('path')
const filePath = path.join(__dirname, 'src', 'pages', 'PublicApplyPage.js')
let content = fs.readFileSync(filePath, 'utf8')
let changed = false

// Fix 1 — Payment methods grid → clean list table
const oldGrid = `          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { logo: '/cash-logo.png', label: 'Physical Cash', desc: 'Receive loan in cash directly. No fees.', border: 'rgba(34,197,94,0.25)' },
              { logo: '/gcash-logo.png', label: 'GCash', desc: 'Send installment via GCash. Details upon approval.', border: 'rgba(0,163,255,0.25)' },
              { logo: '/rcbc-logo.png', label: 'RCBC', desc: 'Bank transfer via RCBC. Free for RCBC to RCBC.', border: 'rgba(220,38,38,0.25)' },
              { logo: '/bank-logo.png', label: 'Other Bank', desc: 'Instapay/PESONet. Fee: ₱15–₱50 varies per bank.', border: 'rgba(139,92,246,0.25)' },
            ].map((item, i) => (
              <div key={i} style={{ background: '#141B2D', border: \`1px solid \${item.border}\`, borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
                <img src={item.logo} alt={item.label} style={{ height: 40, objectFit: 'contain', marginBottom: 10 }} />
                <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 13, color: '#F0F4FF', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: '#7A8AAA', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}`

const newGrid = `          <div style={{ background: '#141B2D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
            {[
              { logo: '/cash-logo.png', label: 'Physical Cash', fee: 'Free', freebie: true },
              { logo: '/gcash-logo.png', label: 'GCash', fee: '₱15 or 1% (whichever is higher)', freebie: false },
              { logo: '/rcbc-logo.png', label: 'RCBC to RCBC', fee: 'Free', freebie: true },
              { logo: '/bank-logo.png', label: 'Other Bank (Instapay/PESONet)', fee: 'Borrower covers transfer fee', freebie: false },
            ].map((item, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={item.logo} alt={item.label} style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#CBD5F0' }}>{item.label}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: item.freebie ? '#22C55E' : '#F59E0B', background: item.freebie ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)', padding: '4px 12px', borderRadius: 20, border: \`1px solid \${item.freebie ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}\`, whiteSpace: 'nowrap' }}>
                  {item.freebie ? '✓ Free' : item.fee}
                </span>
              </div>
            ))}`

if (content.includes(oldGrid)) { content = content.replace(oldGrid, newGrid); changed = true; console.log('✅ Fix 1 applied — payment methods table') }
else console.log('ℹ️  Fix 1 already applied or not found')

// Fix 2 — FAQ fee table logos
const oldFaq = `                  { method: '💵 Physical Cash', fee: 'Free — no deductions', freebie: true },
                  { method: '💙 GCash', fee: '₱15 or 1% (whichever is higher)', freebie: false },
                  { method: '🏦 RCBC to RCBC', fee: 'Free — same bank transfer', freebie: true },
                  { method: '🏛️ Other Bank (Instapay/PESONet)', fee: 'Borrower covers transfer fee', freebie: false },
                ].map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'rgba(255,255,255,0.03)', border: \`1px solid \${row.freebie ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)'}\`, borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: '#CBD5F0' }}>{row.method}</span>`

const newFaq = `                  { logo: '/cash-logo.png', method: 'Physical Cash', fee: 'Free — no deductions', freebie: true },
                  { logo: '/gcash-logo.png', method: 'GCash', fee: '₱15 or 1% (whichever is higher)', freebie: false },
                  { logo: '/rcbc-logo.png', method: 'RCBC to RCBC', fee: 'Free — same bank transfer', freebie: true },
                  { logo: '/bank-logo.png', method: 'Other Bank (Instapay/PESONet)', fee: 'Borrower covers transfer fee', freebie: false },
                ].map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'rgba(255,255,255,0.03)', border: \`1px solid \${row.freebie ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)'}\`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={row.logo} alt={row.method} style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#CBD5F0' }}>{row.method}</span>
                    </div>`

if (content.includes(oldFaq)) { content = content.replace(oldFaq, newFaq); changed = true; console.log('✅ Fix 2 applied — FAQ fee table logos') }
else console.log('ℹ️  Fix 2 already applied or not found')

if (changed) { fs.writeFileSync(filePath, content, 'utf8'); console.log('\n🎉 All fixes saved!') }
else console.log('\nℹ️  No changes needed — file may already be up to date')
