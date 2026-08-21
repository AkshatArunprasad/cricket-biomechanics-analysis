import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { supabase } from './supabaseClient.js'
import AnalysisPage from './AnalysisPage.jsx'
import LandingPage  from './LandingPage.jsx'
import LoginPage    from './LoginPage.jsx'
import ProfilePage  from './ProfilePage.jsx'
import UploadPage   from './UploadPage.jsx'

// ── Protected route wrapper ────────────────────────────────────────────────
//
// Checks for an active Supabase session on mount.
// • While loading → renders nothing (avoids flash of protected content)
// • No session    → redirects to /login
// • Session found → renders children
//
// The `supabase.auth.onAuthStateChange` listener ensures the wrapper
// reacts to sign-out events even while the tab is open.

function ProtectedRoute({ children }) {
  const [session, setSession]   = useState(undefined)  // undefined = loading

  useEffect(() => {
    // Get the initial session synchronously from the local storage cache
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    // Subscribe to subsequent auth events (sign-in / sign-out / token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null          // still loading
  if (session === null)      return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/"       element={<LandingPage />} />
        <Route path="/login"  element={<LoginPage />}   />

        {/* Protected routes — require an active Supabase session */}
        <Route path="/upload"   element={<ProtectedRoute><UploadPage   /></ProtectedRoute>} />
        <Route path="/analysis" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
        <Route path="/profile"  element={<ProtectedRoute><ProfilePage  /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}