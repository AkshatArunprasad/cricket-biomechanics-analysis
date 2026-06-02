import { useNavigate } from 'react-router-dom'
import { SiteNavbar } from './SiteNavbar.jsx'

/* ─── keyframe animations (can't be expressed via inline styles) ─── */
const animationCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

@keyframes lp-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center;  }
}
@keyframes lp-pulse-ring {
  0%   { transform: scale(1);   opacity: 0.5; }
  70%  { transform: scale(2.2); opacity: 0;   }
  100% { transform: scale(2.2); opacity: 0;   }
}
@keyframes lp-float {
  0%, 100% { transform: translateY(0);   }
  50%      { transform: translateY(-8px); }
}
@keyframes lp-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes lp-count-bar {
  from { width: 0; }
  to   { width: 100%; }
}
@keyframes lp-grid-glow {
  0%, 100% { opacity: 0.03; }
  50%      { opacity: 0.07; }
}
`

/* ─── design tokens ─── */
const T = {
  bg:       '#06080c',
  surface:  '#0d1117',
  card:     '#111822',
  border:   '#1b2535',
  accent:   '#22c55e',
  accentDim:'rgba(34,197,94,0.12)',
  accentMid:'rgba(34,197,94,0.35)',
  text:     '#e2e8f0',
  muted:    '#7b8ba3',
  white:    '#ffffff',
  font:     "'Inter', 'Segoe UI', system-ui, sans-serif",
  radius:   '14px',
  radiusSm: '10px',
}

/* ─── page wrapper ─── */
const pageStyle = {
  backgroundColor: T.bg,
  color: T.text,
  fontFamily: T.font,
  minHeight: '100vh',
  overflowX: 'hidden',
}

/* ====================================================================
   1. HERO BADGE PILL
   ==================================================================== */
function HeroBadge() {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        background: `linear-gradient(135deg, ${T.accentDim}, rgba(34,197,94,0.06))`,
        border: `1px solid ${T.accentMid}`,
        borderRadius: '999px',
        padding: '7px 20px 7px 12px',
        fontSize: '13px',
        fontWeight: 600,
        color: T.accent,
        letterSpacing: '0.3px',
        cursor: 'default',
        animation: 'lp-fade-up 0.6s ease-out both',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* pulsing dot */}
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '8px',
          height: '8px',
        }}
      >
        <span
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: T.accent,
            animation: 'lp-pulse-ring 2s ease-out infinite',
          }}
        />
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: T.accent,
          }}
        />
      </span>
      New: Advanced Spin &amp; Pace Biomechanics
    </div>
  )
}

/* ====================================================================
   2. HERO SECTION  (dual CTA)
   ==================================================================== */
function Hero({ onAnalyze, onDemo }) {
  return (
    <section
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '100px 24px 64px',
        overflow: 'hidden',
      }}
    >
      {/* ambient radial glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 60% 50% at 50% 30%, rgba(34,197,94,0.10) 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 20% 60%, rgba(34,197,94,0.04) 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 80% 60%, rgba(34,197,94,0.04) 0%, transparent 70%)
          `,
          pointerEvents: 'none',
        }}
      />
      {/* faint grid overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(34,197,94,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.05) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          animation: 'lp-grid-glow 6s ease-in-out infinite',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <HeroBadge />

        <h1
          style={{
            fontSize: 'clamp(40px, 6.5vw, 76px)',
            fontWeight: 900,
            lineHeight: 1.08,
            margin: '32px 0 0',
            letterSpacing: '-2px',
            background: `linear-gradient(160deg, ${T.white} 30%, ${T.accent} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'lp-fade-up 0.7s ease-out 0.1s both',
          }}
        >
          Unlock Your
          <br />
          Bowling Potential
        </h1>

        <p
          style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: T.muted,
            maxWidth: '540px',
            lineHeight: 1.65,
            margin: '24px auto 0',
            animation: 'lp-fade-up 0.7s ease-out 0.25s both',
          }}
        >
          Upload a single bowling video and our AI extracts frame-by-frame
          kinematics — elbow angles, trunk alignment, rotational power — so you
          can train like the pros.
        </p>

        {/* dual CTA */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '40px',
            animation: 'lp-fade-up 0.7s ease-out 0.4s both',
          }}
        >
          {/* Primary CTA */}
          <button
            type="button"
            id="cta-analyze"
            aria-label="Analyze my bowling action"
            onClick={onAnalyze}
            style={{
              background: `linear-gradient(135deg, ${T.accent}, #16a34a)`,
              color: '#000',
              border: 'none',
              borderRadius: T.radiusSm,
              padding: '16px 36px',
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: T.font,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 0 24px rgba(34,197,94,0.25)',
              letterSpacing: '0.2px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'
              e.currentTarget.style.boxShadow = '0 0 40px rgba(34,197,94,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = '0 0 24px rgba(34,197,94,0.25)'
            }}
          >
            Analyze My Action
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Secondary CTA */}
          <button
            type="button"
            id="cta-demo"
            aria-label="View a demo analysis"
            onClick={onDemo}
            style={{
              background: 'transparent',
              color: T.text,
              border: `1.5px solid ${T.border}`,
              borderRadius: T.radiusSm,
              padding: '16px 36px',
              fontSize: '16px',
              fontWeight: 600,
              fontFamily: T.font,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'transform 0.2s, border-color 0.2s, color 0.2s',
              letterSpacing: '0.2px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.accent
              e.currentTarget.style.color = T.accent
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.border
              e.currentTarget.style.color = T.text
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <polygon points="5 3 19 12 5 21" fill="currentColor" />
            </svg>
            View Demo
          </button>
        </div>
      </div>
    </section>
  )
}

/* ====================================================================
   3. SOCIAL PROOF STATS BAR
   ==================================================================== */
const stats = [
  { value: '10,000+', label: 'Deliveries Analyzed',      icon: '🏏' },
  { value: '350+',    label: 'Clubs & Academies',         icon: '🏟️' },
  { value: '98%',     label: 'Accuracy on Key Angles',    icon: '🎯' },
  { value: '1st XI',  label: 'Used by First-Team Players',icon: '⭐' },
]

function StatsBar() {
  return (
    <section
      id="stats-bar"
      style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '0',
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '0 24px 72px',
        animation: 'lp-fade-up 0.7s ease-out 0.55s both',
      }}
    >
      {stats.map(({ value, label, icon }, i) => (
        <div
          key={label}
          style={{
            flex: '1 1 200px',
            textAlign: 'center',
            padding: '28px 16px',
            borderRight:
              i < stats.length - 1 ? `1px solid ${T.border}` : 'none',
            minWidth: '180px',
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }} aria-hidden>
            {icon}
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 800,
              letterSpacing: '-1px',
              color: T.white,
              marginBottom: '4px',
            }}
          >
            {value}
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: T.muted,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
            }}
          >
            {label}
          </div>
        </div>
      ))}
    </section>
  )
}

/* ====================================================================
   4. HOW IT WORKS — 3-STEP STRIP
   ==================================================================== */
const steps = [
  {
    num: '01',
    title: 'Upload Video',
    desc: 'Record your bowling action from any angle using just your phone camera.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="17 8 12 3 7 8" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="3" x2="12" y2="15" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'AI Extracts Kinematics',
    desc: 'Our pose-estimation model identifies 33 body landmarks at 60 fps to build a full kinematic profile.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="4" r="2" stroke={T.accent} strokeWidth="2" />
        <path d="M12 6v5m0 0l-4 5m4-5l4 5" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 11h10" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
        <path d="M8 21l4-5 4 5" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Get Pro Feedback',
    desc: 'Receive actionable insights — joint angle charts, comparison benchmarks, and technique recommendations.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '0 24px 88px',
      }}
    >
      <h2
        style={{
          textAlign: 'center',
          fontSize: 'clamp(24px, 3.5vw, 36px)',
          fontWeight: 800,
          color: T.white,
          letterSpacing: '-0.8px',
          marginBottom: '12px',
        }}
      >
        How It Works
      </h2>
      <p
        style={{
          textAlign: 'center',
          color: T.muted,
          fontSize: '16px',
          marginBottom: '56px',
          maxWidth: '480px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        From footage to feedback in under 60 seconds
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}
      >
        {steps.map(({ num, title, desc, icon }, i) => (
          <div
            key={num}
            style={{
              position: 'relative',
              background: `linear-gradient(165deg, ${T.card}, ${T.surface})`,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius,
              padding: '36px 28px 32px',
              transition: 'border-color 0.25s, transform 0.25s',
              animation: `lp-fade-up 0.6s ease-out ${0.15 * i}s both`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.accentMid
              e.currentTarget.style.transform = 'translateY(-6px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.border
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {/* step number watermark */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: '16px',
                right: '20px',
                fontSize: '64px',
                fontWeight: 900,
                color: 'rgba(34,197,94,0.06)',
                lineHeight: 1,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {num}
            </span>

            <div
              style={{
                width: '52px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                background: T.accentDim,
                marginBottom: '20px',
              }}
            >
              {icon}
            </div>

            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: T.white,
                marginBottom: '8px',
              }}
            >
              {title}
            </h3>
            <p style={{ fontSize: '14px', color: T.muted, lineHeight: 1.7 }}>
              {desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ====================================================================
   5. FEATURE CARDS — Core Metrics
   ==================================================================== */
const featureCards = [
  {
    title: 'Elbow Extension',
    desc: 'Precisely measures elbow flexion-extension through the bowling arc, automatically flagging angles that exceed ICC thresholds for legal deliveries.',
    metric: '15°',
    metricLabel: 'ICC threshold',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M16 4l-4 8h6l-4 8" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.02))',
  },
  {
    title: 'Trunk Tilt',
    desc: 'Tracks lateral and forward lean of the torso at front-foot contact — a key predictor of pace, accuracy, and lower-back injury risk.',
    metric: '30–40°',
    metricLabel: 'Optimal range',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="3" stroke={T.accent} strokeWidth="2" />
        <path d="M3 15l6-6 4 4 8-8" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.02))',
  },
  {
    title: 'Rotational Power',
    desc: 'Quantifies the shoulder-hip separation angle and angular velocity at delivery stride, the biomechanical engine behind raw pace.',
    metric: '40°+',
    metricLabel: 'Elite separation',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke={T.accent} strokeWidth="2" />
        <path d="M12 3a9 9 0 0 1 0 18" stroke={T.accent} strokeWidth="2" strokeDasharray="4 3" />
        <circle cx="12" cy="12" r="2" fill={T.accent} />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.02))',
  },
]

function FeatureCards() {
  return (
    <section
      id="features"
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '0 24px 96px',
      }}
    >
      <h2
        style={{
          textAlign: 'center',
          fontSize: 'clamp(24px, 3.5vw, 36px)',
          fontWeight: 800,
          color: T.white,
          letterSpacing: '-0.8px',
          marginBottom: '12px',
        }}
      >
        Core Metrics We Track
      </h2>
      <p
        style={{
          textAlign: 'center',
          color: T.muted,
          fontSize: '16px',
          marginBottom: '56px',
          maxWidth: '520px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Data-driven insights drawn from the same biomechanics science used by
        elite coaching setups
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}
      >
        {featureCards.map(({ title, desc, metric, metricLabel, icon, gradient }, i) => (
          <div
            key={title}
            style={{
              position: 'relative',
              background: gradient,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius,
              padding: '36px 28px 32px',
              overflow: 'hidden',
              transition: 'border-color 0.25s, transform 0.25s, box-shadow 0.25s',
              animation: `lp-fade-up 0.6s ease-out ${0.15 * i}s both`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.accentMid
              e.currentTarget.style.transform = 'translateY(-6px)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.border
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {/* icon badge */}
            <div
              style={{
                width: '54px',
                height: '54px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                background: T.accentDim,
                border: `1px solid ${T.accentMid}`,
                marginBottom: '22px',
              }}
            >
              {icon}
            </div>

            <h3
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: T.white,
                marginBottom: '10px',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: T.muted,
                lineHeight: 1.7,
                marginBottom: '20px',
              }}
            >
              {desc}
            </p>

            {/* metric callout chip */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(34,197,94,0.08)',
                border: `1px solid rgba(34,197,94,0.20)`,
                borderRadius: '999px',
                padding: '6px 16px',
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: T.accent,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {metric}
              </span>
              <span
                style={{ fontSize: '12px', color: T.muted, fontWeight: 500 }}
              >
                {metricLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ====================================================================
   6. FOOTER CTA BAND
   ==================================================================== */
function FooterCTA({ onAnalyze }) {
  return (
    <section
      style={{
        textAlign: 'center',
        padding: '80px 24px 96px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 50% 70% at 50% 100%, rgba(34,197,94,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <h2
        style={{
          fontSize: 'clamp(24px, 4vw, 40px)',
          fontWeight: 800,
          color: T.white,
          letterSpacing: '-1px',
          marginBottom: '16px',
          position: 'relative',
        }}
      >
        Ready to bowl smarter?
      </h2>
      <p
        style={{
          color: T.muted,
          fontSize: '16px',
          marginBottom: '36px',
          maxWidth: '420px',
          marginLeft: 'auto',
          marginRight: 'auto',
          position: 'relative',
        }}
      >
        Upload your first video — it&rsquo;s free — and see what the AI finds
        in under a minute.
      </p>
      <button
        type="button"
        id="cta-footer"
        onClick={onAnalyze}
        style={{
          background: `linear-gradient(135deg, ${T.accent}, #16a34a)`,
          color: '#000',
          border: 'none',
          borderRadius: T.radiusSm,
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 700,
          fontFamily: T.font,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'transform 0.2s, box-shadow 0.2s',
          boxShadow: '0 0 24px rgba(34,197,94,0.25)',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'
          e.currentTarget.style.boxShadow = '0 0 40px rgba(34,197,94,0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
          e.currentTarget.style.boxShadow = '0 0 24px rgba(34,197,94,0.25)'
        }}
      >
        Get Started — Free
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </section>
  )
}

/* ====================================================================
   PAGE ROOT — wires routing (unchanged) + assembles sections
   ==================================================================== */
export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={pageStyle}>
      {/* inject keyframe animations */}
      <style>{animationCSS}</style>

      <SiteNavbar variant="landing" />
      <Hero
        onAnalyze={() => navigate('/upload')}
        onDemo={() => navigate('/analysis')}
      />
      <StatsBar />
      <HowItWorks />
      <FeatureCards />
      <FooterCTA onAnalyze={() => navigate('/upload')} />
    </div>
  )
}
