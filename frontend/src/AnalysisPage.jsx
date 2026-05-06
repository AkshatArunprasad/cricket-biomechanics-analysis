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

function VideoPanel({ currentFrame, totalFrames }) {
  const [playing, setPlaying] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          backgroundColor: '#181818',
          border: '1px solid #1e1e1e',
          borderRadius: '14px 14px 0 0',
          flex: 1,
          minHeight: 'min(400px, 50vh)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden>
          <polygon
            points="5 3 19 12 5 21 5 3"
            stroke="#555"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p style={{ color: '#888', fontSize: '15px', fontWeight: 500 }}>Uploaded Video Playback</p>
        <p style={{ color: '#555', fontSize: '13px' }}>Frame-by-frame analysis overlay</p>
      </div>

      <div
        style={{
          backgroundColor: '#141414',
          border: '1px solid #1e1e1e',
          borderTop: 'none',
          borderRadius: '0 0 14px 14px',
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
            backgroundColor: '#22c55e',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 22px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background-color 0.2s, transform 0.15s',
          }}
        >
          {playing ? '⏸ Pause' : '▶ Play Analysis'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '13px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Frame: {currentFrame}/{totalFrames}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, badge, badgeColor }) {
  const badgeStyles = {
    green: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', text: '#22c55e' },
    amber: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
    red:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',  text: '#ef4444' },
  }
  const s = badgeStyles[badgeColor] || badgeStyles.green

  return (
    <div style={{ backgroundColor: '#111', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '24px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
        {icon}
      </div>
      <p style={{ color: '#777', fontSize: '13px', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '28px', fontWeight: 800, marginBottom: '14px' }}>{value}</p>
      <div style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: s.text, fontSize: '13px', fontWeight: 500 }}>{badge}</span>
      </div>
    </div>
  )
}

// NEW: Accepts dynamic chartData as a prop
function ElbowChart({ currentFrame, chartData }) {
  return (
    <div style={{ backgroundColor: '#111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '28px 28px 20px', marginBottom: '24px' }}>
      <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>Elbow Angle Over Time</h3>
      <p style={{ color: '#666', fontSize: '13px', marginBottom: '24px' }}>Frame-by-frame elbow extension analysis</p>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
          <XAxis dataKey="frame" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 180]} ticks={[0, 45, 90, 135, 180]} tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '8px', color: '#fff' }} formatter={(v) => [`${v}°`, 'Elbow Angle']} />
          <ReferenceLine x={currentFrame} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1.5} />
          <Line type="monotone" dataKey="angle" stroke="#22c55e" strokeWidth={2.5} dot={false} activeDot={{ r: 7 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function AICoachFeedback({ releaseAngle, bodyAlignmentAngle, headDropVariance }) {
  const isChucking = releaseAngle < 165;
  const isFallingAway = bodyAlignmentAngle !== null && bodyAlignmentAngle > 15;
  const isHeadUnstable = headDropVariance !== null && headDropVariance > 0.002;

  const feedback = [
    {
      color: isChucking ? '#f59e0b' : '#22c55e',
      title: isChucking ? 'Arm bend detected:' : 'High arm action:',
      text: `Your arm angle at release is ${releaseAngle}°. ${isChucking ? 'This indicates a slight throw. Focus on keeping your bowling arm locked brushing past your ear.' : 'Excellent extension. A high release point generates sharper dip and bounce.'}`,
    },
    {
      color: isFallingAway ? '#ef4444' : '#22c55e',
      title: isFallingAway ? 'Falling away at release:' : 'Aligned body position:',
      text: isFallingAway
        ? `Your trunk tilt is ${bodyAlignmentAngle}° at the point of release. You are falling away from the crease, leaking energy sideways instead of driving it toward the batsman. Focus on bowling "through the crease" with your head over your front knee.`
        : `Your trunk tilt is ${bodyAlignmentAngle ?? 'N/A'}° at release — nice and upright. Your energy is being directed efficiently toward the target.`,
    },
    {
      color: isHeadUnstable ? '#f59e0b' : '#22c55e',
      title: isHeadUnstable ? 'Head dropping in gather:' : 'Stable head position:',
      text: isHeadUnstable
        ? `Your head stability variance is ${headDropVariance?.toFixed(4)}. Your head is moving vertically during the delivery stride. A stable head keeps your eyes level and improves accuracy. Try to "run tall" into the crease.`
        : `Your head stability variance is ${headDropVariance?.toFixed(4) ?? 'N/A'} — very stable through the gather. This helps keep your eyes level and improves accuracy.`,
    },
    {
      color: '#22c55e',
      title: 'Body drive:',
      text: 'Ensure you are pivoting powerfully over a braced front leg to maximize revs on the ball.',
    }
  ]

  return (
    <div style={{ backgroundColor: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '16px', padding: '28px 32px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e', marginBottom: '22px' }}>AI Coach Feedback</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {feedback.map(({ color, title, text }) => (
          <div key={title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, marginTop: '6px', flexShrink: 0 }} />
            <p style={{ fontSize: '14px', color: '#ccc', lineHeight: 1.7 }}>
              <span style={{ color: '#fff', fontWeight: 700 }}>{title}</span> {text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalysisPage() {
  // NEW: Grab the data from the router
  const location = useLocation();
  const navigate = useNavigate();
  const pythonData = location.state?.analysisData;

  // If someone tries to visit /analysis directly without uploading a video, send them back
  if (!pythonData || !pythonData.elbow_angles) {
    return (
      <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', padding: '100px', textAlign: 'center' }}>
        <h2>No video data found!</h2>
        <button onClick={() => navigate('/upload')} style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}>Go Upload</button>
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

  // Find the absolute highest angle to calculate the point of release
  const maxAngle = Math.max(...liveChartData.map(d => d.angle));
  const releaseFrame = liveChartData.findIndex(d => d.angle === maxAngle);

  const metrics = [
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      label: 'Elbow Angle at Release',
      value: `${maxAngle}°`,
      badge: maxAngle >= 165 ? 'Legal Delivery' : 'Flexion Warning',
      badgeColor: maxAngle >= 165 ? 'green' : 'amber',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      label: 'Frames Processed',
      value: totalFrames,
      badge: 'Live Data',
      badgeColor: 'green',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><line x1="12" y1="2" x2="12" y2="22" stroke={bodyAlignmentAngle > 15 ? '#ef4444' : '#22c55e'} strokeWidth="2" strokeLinecap="round" /><line x1="12" y1="2" x2="18" y2="8" stroke={bodyAlignmentAngle > 15 ? '#ef4444' : '#22c55e'} strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="2" r="1.5" fill={bodyAlignmentAngle > 15 ? '#ef4444' : '#22c55e'} /></svg>,
      label: 'Body Alignment (Trunk Tilt)',
      value: bodyAlignmentAngle !== null ? `${bodyAlignmentAngle}°` : 'N/A',
      badge: bodyAlignmentAngle !== null
        ? (bodyAlignmentAngle <= 15 ? 'Aligned' : 'Falling Away')
        : 'No Data',
      badgeColor: bodyAlignmentAngle !== null
        ? (bodyAlignmentAngle <= 15 ? 'green' : 'red')
        : 'amber',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6" r="4" stroke={headDropVariance > 0.002 ? '#f59e0b' : '#22c55e'} strokeWidth="2" /><path d="M12 10v6" stroke={headDropVariance > 0.002 ? '#f59e0b' : '#22c55e'} strokeWidth="2" strokeLinecap="round" /><path d="M8 20h8" stroke={headDropVariance > 0.002 ? '#f59e0b' : '#22c55e'} strokeWidth="2" strokeLinecap="round" /></svg>,
      label: 'Head Stability (Variance)',
      value: headDropVariance !== null ? headDropVariance.toFixed(4) : 'N/A',
      badge: headDropVariance !== null
        ? (headDropVariance <= 0.002 ? 'Stable' : 'Head Drop Detected')
        : 'No Data',
      badgeColor: headDropVariance !== null
        ? (headDropVariance <= 0.002 ? 'green' : 'amber')
        : 'amber',
    },
  ]

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: "'Segoe UI', sans-serif" }}>
      <SiteNavbar variant="app" activeLabel="Analysis" />

      <main style={{ padding: '40px clamp(20px, 4vw, 48px) 80px', maxWidth: '1300px', margin: '0 auto', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>Biomechanics Analysis</h1>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '32px' }}>
          Your bowling action has been analysed. Review the metrics and insights below.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '20px', marginBottom: '32px', alignItems: 'start' }}>
          <VideoPanel currentFrame={releaseFrame} totalFrames={totalFrames} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>
            {metrics.map((m) => (
              <MetricCard key={m.label} {...m} />
            ))}
          </div>
        </div>

        <ElbowChart currentFrame={releaseFrame} chartData={liveChartData} />
        <AICoachFeedback
          releaseAngle={maxAngle}
          bodyAlignmentAngle={bodyAlignmentAngle}
          headDropVariance={headDropVariance}
        />
      </main>
    </div>
  )
}