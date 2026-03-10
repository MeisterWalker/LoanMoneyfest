const fs = require('fs')
const path = require('path')
let count = 0

function patch(filePath, oldStr, newStr, label) {
  const content = fs.readFileSync(filePath, 'utf8')
  if (content.includes(oldStr)) {
    fs.writeFileSync(filePath, content.replace(oldStr, newStr))
    console.log('OK: ' + label)
    count++
  } else {
    console.log('SKIP: ' + label)
  }
}

const helpers  = path.join(__dirname, 'src/lib/helpers.js')
const loans    = path.join(__dirname, 'src/pages/LoansPage.js')
const dash     = path.join(__dirname, 'src/pages/DashboardPage.js')
const borrow   = path.join(__dirname, 'src/pages/BorrowersPage.js')
const collect  = path.join(__dirname, 'src/pages/CollectionPage.js')

// 1. helpers.js
patch(helpers,
"      changed_by: changed_by || 'system'\n    })\n  } catch (e) {\n    console.error('Audit log failed:', e)\n  }\n}",
"      changed_by: changed_by || 'admin',\n      created_at: new Date().toISOString()\n    })\n    if (error) console.error('Audit log insert error:', error)\n  } catch (e) {\n    console.error('Audit log failed:', e)\n  }\n}",
'helpers.js - fallback + error logging')

// 2. CollectionPage - wrong column name
patch(collect,
"      module: 'Collection', action: 'Email Sent', description: action, created_at: new Date().toISOString()",
"      action_type: 'EMAIL_SENT', module: 'Collection', description: action, changed_by: 'admin', created_at: new Date().toISOString()",
'CollectionPage - fixed column name')

// 3. LoansPage - handleStatusUpdate
patch(loans,
"  const handleStatusUpdate = async (loanId, newStatus) => {\n    await supabase.from('loans').update({ status: newStatus }).eq('id', loanId)\n    fetchData()\n  }",
"  const handleStatusUpdate = async (loanId, newStatus) => {\n    await supabase.from('loans').update({ status: newStatus }).eq('id', loanId)\n    const loan = loans.find(l => l.id === loanId)\n    const borrower = borrowers.find(b => b.id === loan?.borrower_id)\n    await logAudit({\n      action_type: 'LOAN_STATUS_CHANGED',\n      module: 'Loan',\n      description: 'Loan status changed to ' + newStatus + ' for ' + (borrower?.full_name || 'Unknown'),\n      changed_by: user?.email\n    })\n    fetchData()\n  }",
'LoansPage - handleStatusUpdate logged')

// 4. LoansPage - LOAN_EDITED detail
patch(loans,
"      await logAudit({ action_type: 'LOAN_EDITED', module: 'Loan', description: `Loan edited for borrower`, changed_by: user?.email })",
"      const editedBorrower = borrowers.find(b => b.id === form.borrower_id)\n      await logAudit({ action_type: 'LOAN_EDITED', module: 'Loan', description: 'Loan edited for ' + (editedBorrower?.full_name || 'Unknown') + ' - P' + (form.loan_amount?.toLocaleString()), changed_by: user?.email })",
'LoansPage - LOAN_EDITED detail improved')

// 5. DashboardPage - useAuth import
patch(dash,
"import { useNavigate } from 'react-router-dom'",
"import { useNavigate } from 'react-router-dom'\nimport { useAuth } from '../context/AuthContext'",
'DashboardPage - useAuth import')

// 6. DashboardPage - user destructure
patch(dash,
"export default function DashboardPage() {",
"export default function DashboardPage() {\n  const { user } = useAuth()",
'DashboardPage - user added')

// 7. DashboardPage - handleMarkPaid
patch(dash,
"    fetchData()\n  }\n\n  // -- Computed stats",
"    await logAudit({\n      action_type: 'INSTALLMENT_PAID',\n      module: 'Loan',\n      description: 'Installment ' + newPaid + ' of 4 via Dashboard for ' + (b?.full_name || 'Unknown'),\n      changed_by: user?.email\n    })\n    fetchData()\n  }\n\n  // -- Computed stats",
'DashboardPage - handleMarkPaid logged')

// 8. BorrowersPage - what changed in edit
patch(borrow,
"      await logAudit({ action_type: 'BORROWER_EDITED', module: 'Borrower', description: `Borrower profile updated: ${form.full_name}`, changed_by: user?.email })",
"      const changes = []\n      if (editing.full_name !== form.full_name) changes.push('name')\n      if (editing.department !== form.department) changes.push('department')\n      if (editing.phone !== form.phone) changes.push('phone')\n      if (editing.email !== form.email) changes.push('email')\n      if (editing.admin_notes !== form.admin_notes) changes.push('admin notes')\n      if (String(editing.loan_limit) !== String(form.loan_limit)) changes.push('loan limit')\n      const changeDesc = changes.length ? ' (changed: ' + changes.join(', ') + ')' : ''\n      await logAudit({ action_type: 'BORROWER_EDITED', module: 'Borrower', description: 'Borrower updated: ' + form.full_name + changeDesc, changed_by: user?.email })",
'BorrowersPage - BORROWER_EDITED shows what changed')

console.log('\n' + count + ' fixes applied.')
console.log('Next: git add . && git commit -m "complete audit log coverage" && git push')
