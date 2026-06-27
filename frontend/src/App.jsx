import React from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import { Loader2 } from 'lucide-react'

function AppContent() {
  const { user, loading } = useAuth()

  // Full-screen loading spinner during token validation on startup
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center gap-4 text-slate-400">
        <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
        <p className="text-xs font-semibold tracking-wider uppercase animate-pulse">
          Validating Secure Session...
        </p>
      </div>
    )
  }

  // Render Login page if unauthenticated, otherwise serve the protected Dashboard
  if (!user) {
    return <Login />
  }

  return <Dashboard />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
