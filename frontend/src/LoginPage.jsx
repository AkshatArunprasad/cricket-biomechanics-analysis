// frontend/src/LoginPage.jsx
//
// Authentication gate — sign-in and sign-up via Supabase Auth (email + password).
// On success the user is redirected to /upload.
// On an existing session the page immediately redirects away.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient.js'

/* ── keyframe animations ── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

@keyframes lp-fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes lp-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes lp-pulse-ring {
  0%   { transform: scale(1);   opacity: 0.6; }
  70%  { transform: scale(2.4); opacity: 0;   }
  100% { transform: scale(2.4); opacity: 0;   }
}
@keyframes lp-spin {
  to { transform: rotate(360deg); }
}
`

/* ── design tokens ── */
const T = {
  bg:        '#06080c',
  surface:   '#0d1117',
  card:      '#111822',
  border:    '#1b2535',
  accent:    '#22c55e',
  accentDim: 'rgba(34,197,94,0.12)',
  accentMid: 'rgba(34,197,94,0.35)',
  text:      '#e2e8f0',
  muted:     '#7b8ba3',
  white:     '#ffffff',
  red:       '#ef4444',
  redDim:    'rgba(239,68,68,0.10)',
  redMid:    'rgba(239,68,68,0.28)',
  font:      "'Inter','Segoe UI',system-ui,sans-serif",
  radius:    '14px',
}

/* ── small spinner ── */
function Spinner() {
  return (
    <div
      style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        border: '2px solid rgba(0,0,0,0.2)',
        borderTopColor: '#000',
        animation: 'lp-spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}

/* ── text input ── */
function Field({ id, label, type = 'text', value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label
        htmlFor={id}
        style={{ fontSize: '13px', fontWeight: 600, color: T.muted, letterSpacing: '0.3px' }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : 'email'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          backgroundColor: T.surface,
          color: T.white,
          border: `1.5px solid ${focused ? T.accent : T.border}`,
          borderRadius: '10px',
          padding: '13px 16px',
          fontSize: '15px',
          fontFamily: T.font,
          outline: 'none',
          transition: 'border-color 0.2s',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

/* ── page root ── */
export default function LoginPage() {
  const navigate = useNavigate()

  const [mode,     setMode]     = useState('signin')   // 'signin' | 'signup'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [checking, setChecking] = useState(true)       // initial session check
  const [error,    setError]    = useState(null)
  const [success,  setSuccess]  = useState(null)

  const isSignup = mode === 'signup'

  // ── If already logged in, skip straight to /upload ────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate('/upload', { replace: true })
      } else {
        setChecking(false)
      }
    })
  }, [navigate])

  // ── Sign-in handler ───────────────────────────────────────────────────────
  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      navigate('/upload', { replace: true })
    }
  }

  // ── Sign-up handler ───────────────────────────────────────────────────────
  const handleSignUp = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || 'Unnamed Bowler' },
      },
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSuccess(
        'Account created! Check your email to confirm your address, then sign in.'
      )
      setLoading(false)
      setMode('signin')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isSignup) handleSignUp()
    else handleSignIn()
  }

  // Show nothing while checking the existing session
  if (checking) return null

  return (
    <div
      style={{
        backgroundColor: T.bg,
        minHeight: '100vh',
        color: T.text,
        fontFamily: T.font,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{css}</style>

      {/* Ambient glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(34,197,94,0.09) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo */}
      <a
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          color: T.white,
          marginBottom: '36px',
          animation: 'lp-fade-up 0.5s ease-out both',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline
            points="22 12 18 12 15 21 9 3 6 12 2 12"
            stroke={T.accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.3px' }}>
          CricketVision
        </span>
      </a>

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: `linear-gradient(165deg, ${T.card}, ${T.surface})`,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: '40px 36px',
          animation: 'lp-fade-up 0.55s ease-out 0.1s both',
        }}
      >
        {/* Live badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: T.accentDim,
            border: `1px solid ${T.accentMid}`,
            borderRadius: '999px',
            padding: '5px 14px',
            fontSize: '12px',
            fontWeight: 600,
            color: T.accent,
            marginBottom: '24px',
          }}
        >
          <span style={{ position: 'relative', display: 'inline-flex', width: '8px', height: '8px' }}>
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                backgroundColor: T.accent,
                animation: 'lp-pulse-ring 2s ease-out infinite',
              }}
            />
            <span
              style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: T.accent }}
            />
          </span>
          Secure · Powered by Supabase Auth
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 800,
            color: T.white,
            letterSpacing: '-0.5px',
            marginBottom: '6px',
          }}
        >
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: '14px', color: T.muted, marginBottom: '32px' }}>
          {isSignup
            ? 'Start analysing your bowling action today — free forever.'
            : 'Sign in to view your sessions and analysis history.'}
        </p>

        {/* Success banner */}
        {success && (
          <div
            style={{
              background: T.accentDim,
              border: `1px solid ${T.accentMid}`,
              borderRadius: '10px',
              padding: '14px 16px',
              fontSize: '14px',
              color: T.accent,
              marginBottom: '20px',
              lineHeight: 1.5,
            }}
          >
            ✓ {success}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            style={{
              background: T.redDim,
              border: `1px solid ${T.redMid}`,
              borderRadius: '10px',
              padding: '14px 16px',
              fontSize: '14px',
              color: T.red,
              marginBottom: '20px',
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {isSignup && (
            <Field
              id="full-name"
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Virat Sharma"
            />
          )}

          <Field
            id="email"
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <Field
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
          />

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '6px',
              background: loading
                ? '#16a34a'
                : `linear-gradient(135deg, ${T.accent}, #16a34a)`,
              color: '#000',
              border: 'none',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 700,
              fontFamily: T.font,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'transform 0.15s, box-shadow 0.2s',
              boxShadow: '0 0 20px rgba(34,197,94,0.2)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 0 32px rgba(34,197,94,0.35)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(34,197,94,0.2)'
            }}
          >
            {loading && <Spinner />}
            {loading
              ? isSignup ? 'Creating account…' : 'Signing in…'
              : isSignup ? 'Create Account' : 'Sign In'}
            {!loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </form>

        {/* Mode toggle */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '28px',
            fontSize: '14px',
            color: T.muted,
          }}
        >
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
          {' '}
          <button
            type="button"
            onClick={() => { setMode(isSignup ? 'signin' : 'signup'); setError(null); setSuccess(null) }}
            style={{
              background: 'none',
              border: 'none',
              color: T.accent,
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: T.font,
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            {isSignup ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>

      {/* Footer note */}
      <p
        style={{
          marginTop: '28px',
          fontSize: '12px',
          color: T.muted,
          textAlign: 'center',
          animation: 'lp-fade-up 0.6s ease-out 0.3s both',
        }}
      >
        Your data is encrypted and never shared. Sessions are stored securely in Supabase.
      </p>
    </div>
  )
}
