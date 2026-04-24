import { useNavigate } from 'react-router-dom'
import { SiteNavbar } from './SiteNavbar.jsx'

const styles = {
  page: {
    backgroundColor: '#0a0a0a',
    color: '#ffffff',
    fontFamily: "'Segoe UI', sans-serif",
    minHeight: '100vh',
  },
}

function Hero({ onUploadClick }) {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '520px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px 60px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(34,197,94,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.35)',
          borderRadius: '999px',
          padding: '6px 16px',
          fontSize: '13px',
          color: '#22c55e',
          marginBottom: '32px',
          fontWeight: 500,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline
            points="22 12 18 12 15 21 9 3 6 12 2 12"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        AI-Powered Biomechanics
      </div>

      <h1
        style={{
          fontSize: 'clamp(42px, 7vw, 80px)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #ffffff 40%, #22c55e 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Your AI Cricket Coach
      </h1>

      <p
        style={{
          fontSize: '18px',
          color: '#888',
          marginBottom: '40px',
          maxWidth: '480px',
          lineHeight: 1.6,
        }}
      >
        Analyse your bowling mechanics using just your phone
      </p>

      <button
        type="button"
        aria-label="Upload your video for analysis"
        style={{
          backgroundColor: '#22c55e',
          color: '#000',
          border: 'none',
          borderRadius: '10px',
          padding: '15px 32px',
          fontSize: '16px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'transform 0.15s, background-color 0.2s',
        }}
        onClick={onUploadClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#16a34a'
          e.currentTarget.style.transform = 'scale(1.03)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#22c55e'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        Upload Your Video
        <span style={{ fontSize: '18px' }} aria-hidden>
          →
        </span>
      </button>
    </section>
  )
}

const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <polyline
          points="23 6 13.5 15.5 8.5 10.5 1 18"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="17 6 23 6 23 12"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: 'Track Elbow Angles',
    desc: 'Precise measurement of elbow extension throughout your bowling action',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="3" stroke="#22c55e" strokeWidth="2" />
        <path
          d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"
          stroke="#22c55e"
          strokeWidth="2"
        />
      </svg>
    ),
    title: 'Analyse Head Stability',
    desc: 'Monitor head position and movement for optimal balance and control',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <polyline
          points="22 12 18 12 15 21 9 3 6 12 2 12"
          stroke="#22c55e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: 'Improve Performance',
    desc: 'Get actionable AI feedback to refine your bowling technique',
  },
]

function FeatureCards() {
  return (
    <section
      id="analysis"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        padding: '0 clamp(20px, 4vw, 48px) 80px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {features.map(({ icon, title, desc }) => (
        <div
          key={title}
          style={{
            backgroundColor: '#111111',
            border: '1px solid #1e1e1e',
            borderRadius: '16px',
            padding: '32px 28px',
            transition: 'border-color 0.2s, transform 0.2s',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)'
            e.currentTarget.style.transform = 'translateY(-4px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#1e1e1e'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <div style={{ marginBottom: '20px' }}>{icon}</div>
          <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '10px' }}>{title}</h3>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.65 }}>{desc}</p>
        </div>
      ))}
    </section>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={styles.page}>
      <SiteNavbar variant="landing" />
      <Hero onUploadClick={() => navigate('/upload')} />
      <FeatureCards />
    </div>
  )
}
