import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Repositories from './pages/Repositories'
import DriftEvents from './pages/DriftEvents'
import ChangeRequests from './pages/ChangeRequests'
import AuditLog from './pages/AuditLog'

function ProtectedLayout() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="flex-1 ml-64 p-6 max-w-6xl">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/repositories" element={<Repositories />} />
          <Route path="/drift" element={<DriftEvents />} />
          <Route path="/change-requests" element={<ChangeRequests />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  )
}

// Wrapped export with provider
export function AppWithProvider() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}
