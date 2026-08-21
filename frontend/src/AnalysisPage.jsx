import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom' // NEW: Added router hooks
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SiteNavbar } from './SiteNavbar.jsx'

/* ─── keyframe animations ─── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

@keyframes an-fade-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes an-pulse {
  0%, 100% { opacity: 1;   }
  50%      { opacity: 0.4; }
}
@keyframes an-score-ring {
  from { stroke-dashoffset: 283; }
}
`

/* ─── design tokens ─── */
const T = {
  bg: '#06080c',
  surface: '#0d1117',
  card: '#111822',
  border: '#1b2535',
  accent: '#22c55e',
  accentDim: 'rgba(34,197,94,0.12)',
  accentMid: 'rgba(34,197,94,0.35)',
  text: '#e2e8f0',
  muted: '#7b8ba3',
  white: '#ffffff',
  amber: '#f59e0b',
  amberDim: 'rgba(245,158,11,0.12)',
  amberMid: 'rgba(245,158,11,0.30)',
  red: '#ef4444',
  redDim: 'rgba(239,68,68,0.10)',
  redMid: 'rgba(239,68,68,0.30)',
  blue: '#3b82f6',
  blueDim: 'rgba(59,130,246,0.12)',
  purple: '#a855f7',
  purpleDim: 'rgba(168,85,247,0.12)',
  font: "'Inter', 'Segoe UI', system-ui, sans-serif",
  radius: '14px',
  radiusSm: '10px',
}

/* badge colour presets */
const BADGE = {
  green: { bg: T.accentDim, border: T.accentMid, text: T.accent },
  amber: { bg: T.amberDim, border: T.amberMid, text: T.amber },
  red: { bg: T.redDim, border: T.redMid, text: T.red },
}

/* ====================================================================
   CAMERA ANGLE WARNING BANNER
   ==================================================================== */
function CameraWarning() {
  return (
    <div
      id="camera-warning"
      role="alert"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.04))',
        border: `1px solid ${T.amberMid}`,
        borderRadius: T.radius,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '24px',
        animation: 'an-fade-in 0.5s ease-out both',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 9v4M12 17h.01" stroke={T.amber} strokeWidth="2" strokeLinecap="round" />
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={T.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <p style={{ fontSize: '14px', fontWeight: 700, color: T.amber, marginBottom: '2px' }}>
          Camera Angle Warning
        </p>
        <p style={{ fontSize: '13px', color: T.muted, lineHeight: 1.5 }}>
          The video appears to be filmed too front-on. For best biomechanical accuracy, film from a
          side-on angle. Elbow and trunk measurements may be less reliable.
        </p>
      </div>
    </div>
  )
}

/* ====================================================================
   OVERALL ACTION SCORE CARD
   ==================================================================== */
function computeScore(releaseAngle, bodyAlignment, headVariance) {
  // Simple heuristic score out of 100 — mocked but data-driven
  let score = 50

  // Elbow: 180° ideal, penalise below 165°
  if (releaseAngle != null) {
    if (releaseAngle >= 175) score += 25
    else if (releaseAngle >= 165) score += 15
    else score += 5
  }

  // Body alignment: ≤10° ideal
  if (bodyAlignment != null) {
    if (bodyAlignment <= 10) score += 15
    else if (bodyAlignment <= 15) score += 10
    else score += 2
  }

  // Head stability: ≤0.001 ideal
  if (headVariance != null) {
    if (headVariance <= 0.001) score += 10
    else if (headVariance <= 0.002) score += 7
    else score += 2
  }

  return Math.min(100, score)
}

function ScoreCard({ score }) {
  const circumference = 2 * Math.PI * 45 // r=45
  const offset = circumference - (score / 100) * circumference
  const color = score >= 75 ? T.accent : score >= 50 ? T.amber : T.red
  const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Developing' : 'Needs Work'

  return (
    <div
      id="score-card"
      style={{
        background: `linear-gradient(165deg, ${T.card}, ${T.surface})`,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '28px',
        marginBottom: '24px',
        animation: 'an-fade-in 0.5s ease-out 0.05s both',
      }}
    >
      {/* ring */}
      <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke={T.border} strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ animation: 'an-score-ring 1.2s ease-out forwards', filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '28px', fontWeight: 900, color: T.white }}>{score}</span>
          <span style={{ fontSize: '10px', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>/100</span>
        </div>
      </div>

      <div>
        <p style={{ fontSize: '11px', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
          Overall Action Score
        </p>
        <p style={{ fontSize: '24px', fontWeight: 800, color: T.white, marginBottom: '6px' }}>
          {label}
        </p>
        <p style={{ fontSize: '13px', color: T.muted, lineHeight: 1.5 }}>
          Composite score based on elbow extension, trunk alignment, and head stability at the point of delivery.
        </p>
      </div>
    </div>
  )
}

/* ====================================================================
   EXPORT / SHARE BUTTONS
   ==================================================================== */
function ActionButtons() {
  const handleExport = () => alert('Export PNG: Coming soon!')
  const handleShare = () => alert('Share link: Coming soon!')

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        animation: 'an-fade-in 0.5s ease-out 0.1s both',
      }}
    >
      <button
        type="button"
        id="btn-export"
        onClick={handleExport}
        style={{
          background: T.card,
          color: T.text,
          border: `1px solid ${T.border}`,
          borderRadius: '8px',
          padding: '9px 18px',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: T.font,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Export PNG
      </button>

      <button
        type="button"
        id="btn-share"
        onClick={handleShare}
        style={{
          background: T.card,
          color: T.text,
          border: `1px solid ${T.border}`,
          borderRadius: '8px',
          padding: '9px 18px',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: T.font,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
          <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
          <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="2" />
        </svg>
        Share
      </button>
    </div>
  )
}

/* ====================================================================
   VIDEO PANEL  (EXISTING — preserved, re-themed)
   ==================================================================== */
function VideoPanel({ currentFrame, totalFrames, annotatedFrame }) {
  const [playing, setPlaying] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          backgroundColor: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: `${T.radius} ${T.radius} 0 0`,
          flex: 1,
          minHeight: 'min(400px, 50vh)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {annotatedFrame ? (
          <>
            {/* Annotated Release Frame from Python */}
            <img
              src={`data:image/jpeg;base64,${annotatedFrame}`}
              alt="Analyzed Release Point with skeleton overlay"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: `${T.radius} ${T.radius} 0 0`,
                display: 'block',
              }}
            />
            {/* Floating label */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                backgroundColor: T.accentDim,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${T.accentMid}`,
                borderRadius: '8px',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: T.accent,
                  boxShadow: `0 0 8px rgba(34, 197, 94, 0.6)`,
                  animation: 'an-pulse 2s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  color: T.accent,
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                Analyzed Release Point
              </span>
            </div>
          </>
        ) : (
          /* Fallback: original placeholder when no annotated frame is available */
          <>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden>
              <polygon
                points="5 3 19 12 5 21 5 3"
                stroke={T.border}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p style={{ color: T.muted, fontSize: '15px', fontWeight: 500 }}>Uploaded Video Playback</p>
            <p style={{ color: T.muted, fontSize: '13px' }}>Frame-by-frame analysis overlay</p>
          </>
        )}
      </div>

      <div
        style={{
          backgroundColor: T.surface,
          border: `1px solid ${T.border}`,
          borderTop: 'none',
          borderRadius: `0 0 ${T.radius} ${T.radius}`,
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
          style={{
            background: `linear-gradient(135deg, ${T.accent}, #16a34a)`,
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 22px',
            fontSize: '14px',
            fontWeight: 700,
            fontFamily: T.font,
            cursor: 'pointer',
            transition: 'transform 0.15s',
          }}
        >
          {playing ? '⏸ Pause' : '▶ Play Analysis'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: T.muted, fontSize: '13px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Frame: {currentFrame}/{totalFrames}
        </div>
      </div>
    </div>
  )
}

/* ====================================================================
   METRIC CARD  (EXISTING logic + new Benchmark Percentile row)
   ==================================================================== */
function MetricCard({ icon, label, value, badge, badgeColor, percentile }) {
  const s = BADGE[badgeColor] || BADGE.green

  return (
    <div
      style={{
        backgroundColor: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: '24px',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = T.accentMid
        e.currentTarget.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.border
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: T.surface,
          border: `1px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        {icon}
      </div>
      <p style={{ color: T.muted, fontSize: '13px', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '28px', fontWeight: 800, marginBottom: '14px', color: T.white }}>{value}</p>
      <div
        style={{
          backgroundColor: s.bg,
          border: `1px solid ${s.border}`,
          borderRadius: '8px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: percentile ? '12px' : '0',
        }}
      >
        <span style={{ color: s.text, fontSize: '13px', fontWeight: 500 }}>{badge}</span>
      </div>

      {/* Benchmark Percentile */}
      {percentile && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            paddingTop: '4px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 20V10M18 20V4M6 20v-4" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: '11px', color: T.muted, fontWeight: 500 }}>
            {percentile}
          </span>
        </div>
      )}
    </div>
  )
}

/* ====================================================================
   ELBOW CHART  (EXISTING — preserved exactly, re-themed)
   ==================================================================== */
function ElbowChart({ currentFrame, chartData }) {
  return (
    <div
      style={{
        backgroundColor: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: '28px 28px 20px',
        marginBottom: '24px',
        animation: 'an-fade-in 0.5s ease-out 0.15s both',
      }}
    >
      <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px', color: T.white }}>
        Elbow Angle Over Time
      </h3>
      <p style={{ color: T.muted, fontSize: '13px', marginBottom: '24px' }}>
        Frame-by-frame elbow extension analysis
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="frame" tick={{ fill: T.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 180]} ticks={[0, 45, 90, 135, 180]} tick={{ fill: T.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: '8px',
              color: T.white,
            }}
            formatter={(v) => [`${v}°`, 'Elbow Angle']}
          />
          <ReferenceLine x={currentFrame} stroke={T.accent} strokeDasharray="4 3" strokeWidth={1.5} />
          <Line type="monotone" dataKey="angle" stroke={T.accent} strokeWidth={2.5} dot={false} activeDot={{ r: 7 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ====================================================================
   AI COACH FEEDBACK  — Restructured into labelled sections
   ==================================================================== */
function FeedbackSection({ title, icon, items }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h4
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: T.white,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
        }}
      >
        {icon}
        {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '4px' }}>
        {items.map(({ color, text }, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: color,
                marginTop: '6px',
                flexShrink: 0,
                boxShadow: `0 0 6px ${color}40`,
              }}
            />
            <p style={{ fontSize: '14px', color: T.text, lineHeight: 1.7 }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AICoachFeedback({ geminiCoaching, releaseAngle, bodyAlignmentAngle, headDropVariance }) {
  // ─── Preferred path: real Gemini-generated feedback ───
  if (geminiCoaching) {
    const strengthItems = (geminiCoaching.strengths || []).map((text) => ({
      color: T.accent,
      text,
    }))
    const improveItems = (geminiCoaching.areas_to_improve || []).map((text) => ({
      color: T.amber,
      text,
    }))

    return (
      <div
        style={{
          background: `linear-gradient(165deg, rgba(34,197,94,0.05), rgba(34,197,94,0.01))`,
          border: `1px solid ${T.accentMid}`,
          borderRadius: T.radius,
          padding: '28px 32px',
          animation: 'an-fade-in 0.5s ease-out 0.25s both',
        }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: T.accent,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={T.accent} strokeWidth="2" strokeLinejoin="round" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={T.accent} strokeWidth="2" strokeLinejoin="round" />
          </svg>
          AI Coach Feedback
        </h3>

        {/* Summary paragraph */}
        {geminiCoaching.summary && (
          <p
            style={{
              fontSize: '14px',
              color: T.text,
              lineHeight: 1.7,
              marginBottom: '24px',
              paddingBottom: '20px',
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            {geminiCoaching.summary}
          </p>
        )}

        {strengthItems.length > 0 && (
          <FeedbackSection
            title="Strengths"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 11l3 3 8-8" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            items={strengthItems}
          />
        )}

        {improveItems.length > 0 && (
          <FeedbackSection
            title="Areas to Improve"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 9v4M12 17h.01" stroke={T.amber} strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
            items={improveItems}
          />
        )}

        {/* Drills — richer cards since they carry name/focus/description */}
        {geminiCoaching.drills && geminiCoaching.drills.length > 0 && (
          <div>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: T.white,
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Recommended Drills
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {geminiCoaching.drills.map((drill, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radiusSm,
                    padding: '14px 18px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: T.white }}>{drill.name}</p>
                    {drill.focus && (
                      <span style={{ fontSize: '11px', color: T.accent, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {drill.focus}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: T.muted, lineHeight: 1.6 }}>{drill.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Fallback: original rule-based feedback (unchanged) ───
  const isChucking = releaseAngle < 165
  const isFallingAway = bodyAlignmentAngle !== null && bodyAlignmentAngle > 15
  const isHeadUnstable = headDropVariance !== null && headDropVariance > 0.002

  const sections = [
    {
      title: 'Arm Mechanics',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M16 4l-4 8h6l-4 8" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      items: [
        {
          color: isChucking ? T.amber : T.accent,
          text: isChucking
            ? `Your arm angle at release is ${releaseAngle}°. This indicates a slight throw — your arm is bending beyond the legal threshold. Focus on keeping your bowling arm locked, brushing past your ear at the point of release.`
            : `Your arm angle at release is ${releaseAngle}°. Excellent extension — a high release point generates sharper dip and bounce off the surface.`,
        },
      ],
    },
    {
      title: 'Trunk Alignment',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="3" stroke={T.accent} strokeWidth="2" />
          <path d="M3 15l6-6 4 4 8-8" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      items: [
        {
          color: isFallingAway ? T.red : T.accent,
          text: isFallingAway
            ? `Your trunk tilt is ${bodyAlignmentAngle}° at the point of release. You are falling away from the crease, leaking energy sideways instead of driving it toward the batsman. Focus on bowling "through the crease" with your head over your front knee.`
            : `Your trunk tilt is ${bodyAlignmentAngle ?? 'N/A'}° at release — nice and upright. Your energy is being directed efficiently toward the target.`,
        },
      ],
    },
    {
      title: 'Head Stability',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="6" r="4" stroke={T.accent} strokeWidth="2" />
          <path d="M12 10v6" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      items: [
        {
          color: isHeadUnstable ? T.amber : T.accent,
          text: isHeadUnstable
            ? `Your head stability variance is ${headDropVariance?.toFixed(4)}. Your head is moving vertically during the delivery stride. A stable head keeps your eyes level and improves accuracy. Try to "run tall" into the crease.`
            : `Your head stability variance is ${headDropVariance?.toFixed(4) ?? 'N/A'} — very stable through the gather. This helps keep your eyes level and improves accuracy.`,
        },
      ],
    },
    {
      title: 'Recommended Drills',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M9 11l3 3 8-8" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      items: [
        {
          color: T.accent,
          text: isChucking
            ? 'Locked-arm drill: Bowl with a brace on your elbow to build muscle memory for full extension. Start from a standing position before adding the run-up.'
            : 'Maintain your excellent arm action with regular "high-arm" bowling drills from a standing start.',
        },
        {
          color: T.accent,
          text: isFallingAway
            ? 'Front-knee drive: Place a target cone directly in front of your front foot and practice bowling over it to promote upright body mechanics.'
            : 'Pivoting over a braced front leg maximises revolutions on the ball — continue this with targeted seam-position drills.',
        },
        {
          color: T.accent,
          text: 'Cool-down: 10 minutes of shoulder band exercises and thoracic spine rotations to maintain mobility and reduce injury risk.',
        },
      ],
    },
  ]

  return (
    <div
      style={{
        background: `linear-gradient(165deg, rgba(34,197,94,0.05), rgba(34,197,94,0.01))`,
        border: `1px solid ${T.accentMid}`,
        borderRadius: T.radius,
        padding: '28px 32px',
        animation: 'an-fade-in 0.5s ease-out 0.25s both',
      }}
    >
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: T.accent,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={T.accent} strokeWidth="2" strokeLinejoin="round" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={T.accent} strokeWidth="2" strokeLinejoin="round" />
        </svg>
        AI Coach Feedback
      </h3>

      {sections.map((sec) => (
        <FeedbackSection key={sec.title} {...sec} />
      ))}
    </div>
  )
}
/* ====================================================================
   PAGE ROOT  (EXISTING data flow preserved exactly)
   ==================================================================== */
export default function AnalysisPage() {
  // NEW: Grab the data from the router
  const location = useLocation();
  const navigate = useNavigate();
  const pythonData = location.state?.analysisData;

  // If someone tries to visit /analysis directly without uploading a video, send them back
  if (!pythonData || !pythonData.elbow_angles) {
    return (
      <div style={{ backgroundColor: T.bg, minHeight: '100vh', color: T.white, fontFamily: T.font }}>
        <style>{css}</style>
        <SiteNavbar variant="app" activeLabel="Analysis" />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '20px',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke={T.border} strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" stroke={T.muted} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h2 style={{ fontSize: '22px', fontWeight: 700 }}>No Analysis Data Found</h2>
          <p style={{ color: T.muted, maxWidth: '360px' }}>
            Upload a bowling video first to receive your biomechanical analysis.
          </p>
          <button
            type="button"
            onClick={() => navigate('/upload')}
            style={{
              background: `linear-gradient(135deg, ${T.accent}, #16a34a)`,
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: 700,
              fontFamily: T.font,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Upload Video
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // MAPPING THE LIVE DATA
  const totalFrames = pythonData.frames_processed;

  // NEW: Extract the biomechanical metrics from the Python response
  const bodyAlignmentAngle = pythonData.body_alignment_angle;
  const headDropVariance = pythonData.head_drop_variance;

  // Format the raw array into the exact {frame, angle} objects that Recharts wants
  const liveChartData = pythonData.elbow_angles.map((angle, index) => ({
    frame: index,
    angle: Math.round(angle)
  }));

  // Extract the release frame and elbow angle directly from the backend.
  // The Python Vertical Extension Method has already computed these accurately.
  const releaseFrame = pythonData.release_frame_index ?? 0;
  const releaseAngle = pythonData.release_elbow_angle != null
    ? Math.round(pythonData.release_elbow_angle)
    : null;

  // Camera angle warning check
  const showCameraWarning = pythonData?.camera_angle_warning === true;

  // Overall action score
  const overallScore = computeScore(releaseAngle, bodyAlignmentAngle, headDropVariance);

  // Benchmark percentiles (heuristic for now)
  const elbowPercentile = releaseAngle != null
    ? (releaseAngle >= 175 ? 'Top 10% of amateur bowlers' : releaseAngle >= 165 ? 'Top 35% of amateur bowlers' : 'Below average — improvement possible')
    : null
  const trunkPercentile = bodyAlignmentAngle != null
    ? (bodyAlignmentAngle <= 10 ? 'Top 15% for trunk control' : bodyAlignmentAngle <= 15 ? 'Top 40% for trunk control' : 'Bottom 30% — falling away')
    : null
  const headPercentile = headDropVariance != null
    ? (headDropVariance <= 0.001 ? 'Top 10% head stability' : headDropVariance <= 0.002 ? 'Top 30% head stability' : 'Below average stability')
    : null

  const metrics = [
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      label: 'Elbow Angle at Release',
      value: releaseAngle != null ? `${releaseAngle}°` : 'N/A',
      badge: releaseAngle != null ? (releaseAngle >= 165 ? 'Legal Delivery' : 'Flexion Warning') : 'No Data',
      badgeColor: releaseAngle != null ? (releaseAngle >= 165 ? 'green' : 'amber') : 'amber',
      percentile: elbowPercentile,
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      label: 'Frames Processed',
      value: totalFrames,
      badge: 'Live Data',
      badgeColor: 'green',
      percentile: null,
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><line x1="12" y1="2" x2="12" y2="22" stroke={bodyAlignmentAngle > 15 ? T.red : T.accent} strokeWidth="2" strokeLinecap="round" /><line x1="12" y1="2" x2="18" y2="8" stroke={bodyAlignmentAngle > 15 ? T.red : T.accent} strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="2" r="1.5" fill={bodyAlignmentAngle > 15 ? T.red : T.accent} /></svg>,
      label: 'Body Alignment (Trunk Tilt)',
      value: bodyAlignmentAngle !== null ? `${bodyAlignmentAngle}°` : 'N/A',
      badge: bodyAlignmentAngle !== null
        ? (bodyAlignmentAngle <= 15 ? 'Aligned' : 'Falling Away')
        : 'No Data',
      badgeColor: bodyAlignmentAngle !== null
        ? (bodyAlignmentAngle <= 15 ? 'green' : 'red')
        : 'amber',
      percentile: trunkPercentile,
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6" r="4" stroke={headDropVariance > 0.002 ? T.amber : T.accent} strokeWidth="2" /><path d="M12 10v6" stroke={headDropVariance > 0.002 ? T.amber : T.accent} strokeWidth="2" strokeLinecap="round" /><path d="M8 20h8" stroke={headDropVariance > 0.002 ? T.amber : T.accent} strokeWidth="2" strokeLinecap="round" /></svg>,
      label: 'Head Stability (Variance)',
      value: headDropVariance !== null ? headDropVariance.toFixed(4) : 'N/A',
      badge: headDropVariance !== null
        ? (headDropVariance <= 0.002 ? 'Stable' : 'Head Drop Detected')
        : 'No Data',
      badgeColor: headDropVariance !== null
        ? (headDropVariance <= 0.002 ? 'green' : 'amber')
        : 'amber',
      percentile: headPercentile,
    },
  ]

  return (
    <div style={{ backgroundColor: T.bg, minHeight: '100vh', color: T.text, fontFamily: T.font }}>
      <style>{css}</style>
      <SiteNavbar variant="app" activeLabel="Analysis" />

      <main
        style={{
          padding: '40px clamp(20px, 4vw, 48px) 80px',
          maxWidth: '1300px',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* header row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            marginBottom: '24px',
            animation: 'an-fade-in 0.4s ease-out both',
          }}
        >
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', color: T.white, letterSpacing: '-0.5px' }}>
              Biomechanics Analysis
            </h1>
            <p style={{ color: T.muted, fontSize: '14px' }}>
              Your bowling action has been analysed. Review the metrics and insights below.
            </p>
          </div>
          <ActionButtons />
        </div>

        {/* camera angle warning */}
        {showCameraWarning && <CameraWarning />}

        {/* overall score */}
        <ScoreCard score={overallScore} />

        {/* video + metrics grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '20px',
            marginBottom: '32px',
            alignItems: 'start',
            animation: 'an-fade-in 0.5s ease-out 0.1s both',
          }}
        >
          <VideoPanel
            currentFrame={releaseFrame}
            totalFrames={totalFrames}
            annotatedFrame={pythonData.annotated_release_frame}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>
            {metrics.map((m) => (
              <MetricCard key={m.label} {...m} />
            ))}
          </div>
        </div>

        <ElbowChart currentFrame={releaseFrame} chartData={liveChartData} />

        <AICoachFeedback
          geminiCoaching={pythonData.gemini_coaching}
          releaseAngle={releaseAngle}
          bodyAlignmentAngle={bodyAlignmentAngle}
          headDropVariance={headDropVariance}
        />
      </main>
    </div>
  )
}