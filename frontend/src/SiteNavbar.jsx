import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient.js'

const LINKS = [
  { label: 'Upload', to: '/upload', hash: undefined },
  { label: 'Analysis', to: '/analysis', hash: undefined },
  { label: 'Profile', to: '/profile', hash: undefined },
]

function linkTo({ to, hash }) {
  return hash ? { pathname: to, hash } : to
}

export function SiteNavbar({ variant = 'landing', activeLabel }) {
  const isApp = variant === 'app'
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '18px clamp(20px, 4vw, 48px)',
        backgroundColor: '#0d0d0d',
        borderBottom: '1px solid #1a1a1a',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline
            points="22 12 18 12 15 21 9 3 6 12 2 12"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '0.3px' }}>
          CricketVision
        </span>
      </Link>

      <div
        style={{
          display: 'flex',
          gap: isApp ? '12px' : 'clamp(16px, 3vw, 36px)',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        {LINKS.map(({ label, to, hash }) => {
          const isActive = isApp && label === activeLabel
          const destination = linkTo({ to, hash })

          const baseStyle = {
            textDecoration: 'none',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'color 0.2s, background-color 0.2s, border-color 0.2s',
            ...(isApp
              ? {
                  color: isActive ? '#ffffff' : '#aaaaaa',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: isActive ? '#1e1e1e' : 'transparent',
                  border: isActive ? '1px solid #2e2e2e' : '1px solid transparent',
                }
              : {
                  color: '#cccccc',
                }),
          }

          const icons = { Upload: '⬆', Analysis: '📊', Profile: '👤' }

          return (
            <Link
              key={label}
              to={destination}
              style={baseStyle}
              onMouseEnter={(e) => {
                if (isApp) {
                  if (!isActive) e.currentTarget.style.color = '#22c55e'
                } else {
                  e.currentTarget.style.color = '#22c55e'
                }
              }}
              onMouseLeave={(e) => {
                if (isApp) {
                  if (!isActive) e.currentTarget.style.color = '#aaaaaa'
                } else {
                  e.currentTarget.style.color = '#cccccc'
                }
              }}
            >
              <span style={{ fontSize: '13px' }} aria-hidden>
                {icons[label]}
              </span>{' '}
              {label}
            </Link>
          )
        })}

        {/* Sign-out button — only shown in the app navbar */}
        {isApp && (
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              background: 'transparent',
              color: '#aaaaaa',
              border: '1px solid transparent',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '15px',
              fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#aaaaaa'; e.currentTarget.style.borderColor = 'transparent' }}
          >
            <span style={{ fontSize: '13px' }} aria-hidden>↩</span> Sign Out
          </button>
        )}
      </div>
    </nav>
  )
}
