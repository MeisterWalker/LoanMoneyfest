import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import LoadingScreen from './components/LoadingScreen'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import BorrowersPage from './pages/BorrowersPage'
import LoansPage from './pages/LoansPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import AuditPage from './pages/AuditPage'
import ForecastPage from './pages/ForecastPage'
import CollectionPage from './pages/CollectionPage'
import './index.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return user ? children : <Navigate to="/login" replace />
}

function AppLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login"      element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/"           element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard"  element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/borrowers"  element={<ProtectedRoute><AppLayout><BorrowersPage /></AppLayout></ProtectedRoute>} />
      <Route path="/loans"      element={<ProtectedRoute><AppLayout><LoansPage /></AppLayout></ProtectedRoute>} />
      <Route path="/collection" element={<ProtectedRoute><AppLayout><CollectionPage /></AppLayout></ProtectedRoute>} />
      <Route path="/forecast"   element={<ProtectedRoute><AppLayout><ForecastPage /></AppLayout></ProtectedRoute>} />
      <Route path="/audit"      element={<ProtectedRoute><AppLayout><AuditPage /></AppLayout></ProtectedRoute>} />
      <Route path="/settings"   element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
    </Routes>
  )
}

export default function App() {
  const [appLoaded, setAppLoaded] = useState(false)
  if (!appLoaded) return <LoadingScreen onComplete={() => setAppLoaded(true)} />
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
