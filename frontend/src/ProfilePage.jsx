import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from './supabaseClient.js'
import { SiteNavbar } from './SiteNavbar.jsx'

// ── Design tokens (matching UploadPage / LandingPage) ───────────────────────
const T = {
  bg:       '#06080c',
  surface:  '#0d1117',
  card:     '#111822',
  border:   '#1b2535',
  accent:   '#22c55e',
  accentDim:'rgba(34,197,94,0.12)',
  text:     '#e2e8f0',
  muted:    '#7b8ba3',
  white:    '#ffffff',
  cyan:     '#06b6d4',
  font:     "'Inter','Segoe UI',system-ui,sans-serif",
  radius:   '14px',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function avg(arr) {
  const valid = arr.filter((v) => v != null && !isNaN(v))
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

function fmt(val, decimals = 1, fallback = '—') {
  return val == null || isNaN(val) ? fallback : Number(val).toFixed(decimals)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ── Score ring SVG (shows action quality 0–100) ──────────────────────────────
function ScoreRing({ score }) {
  const r = 30
  const circ = 2 * Math.PI * r
  const pct  = Math.min(Math.max(score ?? 0, 0), 100)
  const dash  = (pct / 100) * circ
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-label={`Action score: ${pct}`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke={T.border} strokeWidth="6" />
      <circle
        cx="40" cy="40" r={r}
        fill="none"
        stroke={T.accent}
        strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="44" textAnchor="middle" fill={T.white} fontSize="14" fontWeight="700">
        {pct.toFixed(0)}
      </text>
    </svg>
  )
}

// ── Profile card ─────────────────────────────────────────────────────────────
function ProfileCard({ sessionCount, avgElbow, avgTrunkTilt, actionScore }) {
  const stats = [
    { label: 'Total Sessions', value: sessionCount ?? '—',    color: T.white  },
    { label: 'Avg. Elbow Angle', value: avgElbow  != null ? `${fmt(avgElbow)}°`    : '—', color: T.accent },
    { label: 'Avg. Trunk Tilt',  value: avgTrunkTilt != null ? `${fmt(avgTrunkTilt)}°` : '—', color: T.accent },
  ]
  return (
    <div style={{
      backgroundColor: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius,
      padding: '28px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      marginBottom: '24px',
      flexWrap: 'wrap',
    }}>
      {/* Score ring avatar */}
      <ScoreRing score={actionScore} />

      <div style={{ flex: '1 1 200px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px', color: T.white }}>
          Guest Bowler
        </h2>
        <p style={{ color: T.muted, fontSize: '14px', marginBottom: '16px' }}>
          Cricket Biomechanics Tracker
        </p>
        <div style={{ display: 'flex', gap: 'clamp(24px,6vw,48px)', flexWrap: 'wrap' }}>
          {stats.map(({ label, value, color }) => (
            <div key={label}>
              <p style={{ color: T.muted, fontSize: '12px', marginBottom: '4px' }}>{label}</p>
              <p style={{ color, fontSize: '20px', fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Performance chart ─────────────────────────────────────────────────────────
//
// Maps each session's kinematic_data into a chart point.
// X-axis = session number (1, 2, 3…), Y-axis = metric score (0–180).

function CustomDot(props) {
  const { cx, cy, stroke } = props
  return <circle cx={cx} cy={cy} r={5} fill={stroke} stroke={stroke} />
}

function PerformanceChart({ chartData }) {
  if (!chartData || chartData.length === 0) return null
  return (
    <div style={{
      backgroundColor: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius,
      padding: '28px 32px',
      marginBottom: '36px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: T.white }}>Performance Trends</h3>
          <p style={{ color: T.muted, fontSize: '13px', marginTop: '4px' }}>
            Elbow angle and trunk tilt across sessions
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical />
          <XAxis dataKey="session" tick={{ fill: T.muted, fontSize: 13 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 180]} ticks={[0, 45, 90, 135, 180]} tick={{ fill: T.muted, fontSize: 13 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.white }}
            labelStyle={{ color: T.muted }}
          />
          <Legend wrapperStyle={{ paddingTop: '16px' }} formatter={(v) => (
            <span style={{ color: v.includes('Trunk') ? T.cyan : T.accent, fontSize: '13px' }}>{v}</span>
          )} />
          <Line type="monotone" dataKey="elbowAngle" name="Elbow Angle (°)" stroke={T.accent} strokeWidth={2} dot={<CustomDot />} activeDot={{ r: 7 }} />
          <Line type="monotone" dataKey="trunkTilt"  name="Trunk Tilt (°)"  stroke={T.cyan}  strokeWidth={2} dot={<CustomDot stroke={T.cyan} />} activeDot={{ r: 7 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Metric averages strip ─────────────────────────────────────────────────────
function MetricAverages({ avgElbow, avgTrunkTilt, avgHeadVariance, cameraWarningCount, totalSessions }) {
  const items = [
    { label: 'Avg. Elbow Angle',   value: avgElbow        != null ? `${fmt(avgElbow)}°`        : '—' },
    { label: 'Avg. Trunk Tilt',    value: avgTrunkTilt    != null ? `${fmt(avgTrunkTilt)}°`    : '—' },
    { label: 'Head Variance (avg)', value: avgHeadVariance != null ? fmt(avgHeadVariance, 5)    : '—' },
    { label: 'Camera Warnings',    value: totalSessions ? `${cameraWarningCount}/${totalSessions}` : '—' },
  ]
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))',
      gap: '16px',
      marginBottom: '36px',
    }}>
      {items.map(({ label, value }) => (
        <div key={label} style={{
          backgroundColor: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: '20px 22px',
        }}>
          <p style={{ color: T.muted, fontSize: '12px', marginBottom: '8px' }}>{label}</p>
          <p style={{ color: T.accent, fontSize: '22px', fontWeight: 700 }}>{value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({ session, kinematics }) {
  const [hovered, setHovered] = useState(false)
  const date = fmtDate(session.created_at)
  const time = fmtTime(session.created_at)

  const metrics = [
    { label: 'Elbow Angle', value: kinematics?.release_elbow_angle  != null ? `${fmt(kinematics.release_elbow_angle)}°`  : '—' },
    { label: 'Trunk Tilt',  value: kinematics?.body_alignment_angle != null ? `${fmt(kinematics.body_alignment_angle)}°` : '—' },
    { label: 'Head Stability', value: kinematics?.head_drop_variance != null ? fmt(kinematics.head_drop_variance, 5) : '—' },
  ]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: T.card,
        border: `1px solid ${hovered ? 'rgba(34,197,94,0.3)' : T.border}`,
        borderRadius: T.radius,
        padding: '22px 28px',
        marginBottom: '16px',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            backgroundColor: T.accentDim,
            border: `1px solid rgba(34,197,94,0.2)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={T.accent} strokeWidth="2" />
              <line x1="16" y1="2" x2="16" y2="6" stroke={T.accent} strokeWidth="2" />
              <line x1="8"  y1="2" x2="8"  y2="6" stroke={T.accent} strokeWidth="2" />
              <line x1="3"  y1="10" x2="21" y2="10" stroke={T.accent} strokeWidth="2" />
            </svg>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '16px', color: T.white }}>{date}</p>
            <p style={{ color: T.muted, fontSize: '13px' }}>
              {time} · {session.handedness ?? 'right'}-arm · {session.frames_processed ?? '?'} frames
            </p>
          </div>
        </div>
        {/* Video link if we have one */}
        {session.annotated_frame_url && (
          <a
            href={session.annotated_frame_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: T.surface,
              color: T.white,
              border: `1px solid ${T.border}`,
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background-color 0.2s',
            }}
          >
            View Frame ↗
          </a>
        )}
      </div>

      {/* Metric chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {metrics.map(({ label, value }) => (
          <div key={label} style={{ backgroundColor: T.surface, borderRadius: '10px', padding: '14px 18px' }}>
            <p style={{ color: T.muted, fontSize: '12px', marginBottom: '6px' }}>{label}</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: T.white }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Camera warning badge */}
      {kinematics?.camera_angle_warning && (
        <p style={{ marginTop: '12px', fontSize: '12px', color: '#f59e0b' }}>
          ⚠ Camera angle warning — video may be too front-on for accurate analysis
        </p>
      )}
    </div>
  )
}

// ── Session history list ──────────────────────────────────────────────────────
function SessionHistory({ sessions, kinematicsMap, loading, error }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: T.white }}>Session History</h3>
        <span style={{ fontSize: '13px', color: T.muted }}>
          {loading ? 'Loading…' : error ? 'Error loading data' : `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {error && (
        <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>
          Could not load sessions: {error}
        </p>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div style={{
          backgroundColor: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: '48px',
          textAlign: 'center',
          color: T.muted,
        }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No sessions yet</p>
          <p style={{ fontSize: '13px' }}>Upload a bowling video to see your analysis history here.</p>
        </div>
      )}

      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} kinematics={kinematicsMap[s.id]} />
      ))}
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [sessions,    setSessions]    = useState([])
  const [kinematicsMap, setKinMap]   = useState({})   // { session_id → kinematic_data row }
  const [loading,    setLoading]      = useState(true)
  const [error,      setError]        = useState(null)

  // ── Fetch all sessions + their kinematic_data on mount ───────────────────
  //
  // While there is no auth layer we simply fetch ALL rows (they all belong
  // to the ghost user).  Once Auth is wired, add a `.eq('user_id', uid)` filter.
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        // Get the authenticated user so we only fetch their sessions.
        const { data: { user } } = await supabase.auth.getUser()
        const uid = user?.id

        if (!uid) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        // 1. Fetch sessions for this user (newest first)
        const { data: sessionRows, error: sessErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })

        if (sessErr) throw sessErr

        setSessions(sessionRows ?? [])

        if (!sessionRows || sessionRows.length === 0) {
          setLoading(false)
          return
        }

        // 2. Fetch kinematic_data for all those session ids in one query
        const ids = sessionRows.map((s) => s.id)
        const { data: kinRows, error: kinErr } = await supabase
          .from('kinematic_data')
          .select('*')
          .in('session_id', ids)

        if (kinErr) throw kinErr

        // Build a map: { session_id → kinematic_data row } for O(1) lookup
        const map = {}
        ;(kinRows ?? []).forEach((k) => { map[k.session_id] = k })
        setKinMap(map)
      } catch (err) {
        console.error('[ProfilePage] fetch error:', err)
        setError(err.message ?? String(err))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // ── Derived aggregates ────────────────────────────────────────────────────
  const kinRows = Object.values(kinematicsMap)

  const avgElbow        = avg(kinRows.map((k) => k.release_elbow_angle))
  const avgTrunkTilt    = avg(kinRows.map((k) => k.body_alignment_angle))
  const avgHeadVariance = avg(kinRows.map((k) => k.head_drop_variance))
  const cameraWarnings  = kinRows.filter((k) => k.camera_angle_warning).length

  // Action score: based on elbow straightness (180° = perfect) and trunk tilt (0° = perfect).
  // Normalise to 0–100 — this is a simple proxy until the Gemini AI score lands.
  const elbowScore  = avgElbow     != null ? Math.min((avgElbow / 180) * 100, 100)             : null
  const tiltScore   = avgTrunkTilt != null ? Math.max(100 - (avgTrunkTilt / 45) * 100, 0)      : null
  const actionScore = elbowScore != null && tiltScore != null
    ? (elbowScore * 0.6 + tiltScore * 0.4)   // weighted blend
    : (elbowScore ?? tiltScore ?? 0)

  // Chart data: one point per session (ordered oldest→newest for the chart)
  const chartData = [...sessions]
    .reverse()
    .map((s, i) => {
      const k = kinematicsMap[s.id]
      return {
        session:    `S${i + 1}`,
        elbowAngle: k?.release_elbow_angle  ?? null,
        trunkTilt:  k?.body_alignment_angle ?? null,
      }
    })
    .filter((p) => p.elbowAngle != null || p.trunkTilt != null)

  return (
    <div style={{
      backgroundColor: T.bg,
      minHeight: '100vh',
      color: T.text,
      fontFamily: T.font,
    }}>
      <SiteNavbar variant="app" activeLabel="Profile" />
      <main style={{
        padding: '40px clamp(20px, 4vw, 48px) 80px',
        maxWidth: '1200px',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>
        {/* Profile header */}
        <ProfileCard
          sessionCount={sessions.length}
          avgElbow={avgElbow}
          avgTrunkTilt={avgTrunkTilt}
          actionScore={actionScore}
        />

        {/* Metric averages strip */}
        {!loading && sessions.length > 0 && (
          <MetricAverages
            avgElbow={avgElbow}
            avgTrunkTilt={avgTrunkTilt}
            avgHeadVariance={avgHeadVariance}
            cameraWarningCount={cameraWarnings}
            totalSessions={sessions.length}
          />
        )}

        {/* Performance trends chart */}
        {chartData.length > 1 && <PerformanceChart chartData={chartData} />}

        {/* Session history */}
        <SessionHistory
          sessions={sessions}
          kinematicsMap={kinematicsMap}
          loading={loading}
          error={error}
        />
      </main>
    </div>
  )
}
