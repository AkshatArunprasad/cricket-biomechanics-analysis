import { useState } from 'react'
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

function VideoPanel({ currentFrame }) {
  const [playing, setPlaying] = useState(false)
  const totalFrames = 60

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
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#16a34a'
            e.currentTarget.style.transform = 'scale(1.03)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#22c55e'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          {playing ? '⏸ Pause' : '▶ Play Analysis'}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#666',
            fontSize: '13px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <polyline
              points="22 12 18 12 15 21 9 3 6 12 2 12"
              stroke="#666"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
  }
  const s = badgeStyles[badgeColor] || badgeStyles.green

  return (
    <div
      style={{
        backgroundColor: '#111',
        border: '1px solid #1e1e1e',
        borderRadius: '14px',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        {icon}
      </div>
      <p style={{ color: '#777', fontSize: '13px', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '28px', fontWeight: 800, marginBottom: '14px' }}>{value}</p>
      <div
        style={{
          backgroundColor: s.bg,
          border: `1px solid ${s.border}`,
          borderRadius: '8px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke={s.text} strokeWidth="2" />
          <line x1="12" y1="8" x2="12" y2="12" stroke={s.text} strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" stroke={s.text} strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span style={{ color: s.text, fontSize: '13px', fontWeight: 500 }}>{badge}</span>
      </div>
    </div>
  )
}

const elbowData = [
  { frame: 0, angle: 150 },
  { frame: 5, angle: 145 },
  { frame: 10, angle: 138 },
  { frame: 15, angle: 133 },
  { frame: 20, angle: 129 },
  { frame: 25, angle: 124 },
  { frame: 30, angle: 122 },
  { frame: 35, angle: 120 },
  { frame: 40, angle: 118 },
  { frame: 45, angle: 117 },
  { frame: 50, angle: 119 },
  { frame: 55, angle: 126 },
  { frame: 60, angle: 135 },
]

function ElbowChart({ currentFrame }) {
  return (
    <div
      style={{
        backgroundColor: '#111',
        border: '1px solid #1e1e1e',
        borderRadius: '16px',
        padding: '28px 28px 20px',
        marginBottom: '24px',
      }}
    >
      <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>Elbow Angle Over Time</h3>
      <p style={{ color: '#666', fontSize: '13px', marginBottom: '24px' }}>
        Frame-by-frame elbow extension analysis
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={elbowData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
          <XAxis
            dataKey="frame"
            label={{
              value: 'Frame',
              position: 'insideBottom',
              offset: -10,
              fill: '#666',
              fontSize: 12,
            }}
            tick={{ fill: '#666', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 160]}
            ticks={[0, 40, 80, 120, 160]}
            label={{
              value: 'Angle (degrees)',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: '#666',
              fontSize: 12,
            }}
            tick={{ fill: '#666', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #2e2e2e',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(v) => [`${v}°`, 'Elbow Angle']}
            labelFormatter={(l) => `Frame ${l}`}
          />
          <ReferenceLine x={currentFrame} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1.5} />
          <Line
            type="monotone"
            dataKey="angle"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#22c55e', stroke: '#22c55e' }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const feedback = [
  {
    color: '#22c55e',
    title: 'Strong elbow extension:',
    text: 'Your elbow angle at release (118°) is within the optimal range for fast bowling. This indicates good arm mechanics.',
  },
  {
    color: '#22c55e',
    title: 'Above-average arm speed:',
    text: 'Your arm speed of 87 km/h suggests good power generation through the bowling action.',
  },
  {
    color: '#f59e0b',
    title: 'Head stability improvement:',
    text: 'Your head drops slightly at the point of release. Try to keep your head level and eyes focused on the target throughout the delivery stride.',
  },
]

function AICoachFeedback() {
  return (
    <div
      style={{
        backgroundColor: 'rgba(34,197,94,0.04)',
        border: '1px solid rgba(34,197,94,0.15)',
        borderRadius: '16px',
        padding: '28px 32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>AI Coach Feedback</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {feedback.map(({ color, title, text }) => (
          <div key={title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: color,
                marginTop: '6px',
                flexShrink: 0,
              }}
            />
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
  const currentFrame = 40

  const metrics = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline
            points="22 12 18 12 15 21 9 3 6 12 2 12"
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      label: 'Elbow Angle at Release',
      value: '118°',
      badge: 'Within optimal range',
      badgeColor: 'green',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <polygon
            points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      label: 'Arm Speed',
      value: '87 km/h',
      badge: 'Above average',
      badgeColor: 'green',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="3" stroke="#22c55e" strokeWidth="2" />
          <path
            d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"
            stroke="#22c55e"
            strokeWidth="2"
          />
        </svg>
      ),
      label: 'Head Stability Score',
      value: '8.2/10',
      badge: 'Minor head movement detected',
      badgeColor: 'amber',
    },
  ]

  return (
    <div
      style={{
        backgroundColor: '#0a0a0a',
        minHeight: '100vh',
        color: '#fff',
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <SiteNavbar variant="app" activeLabel="Analysis" />

      <main
        style={{
          padding: '40px clamp(20px, 4vw, 48px) 80px',
          maxWidth: '1300px',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>Biomechanics Analysis</h1>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '32px' }}>
          Your bowling action has been analysed. Review the metrics and insights below.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '20px',
            marginBottom: '32px',
            alignItems: 'start',
          }}
        >
          <VideoPanel currentFrame={currentFrame} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxWidth: '100%',
            }}
          >
            {metrics.map((m) => (
              <MetricCard key={m.label} {...m} />
            ))}
          </div>
        </div>

        <ElbowChart currentFrame={currentFrame} />
        <AICoachFeedback />
      </main>
    </div>
  )
}
