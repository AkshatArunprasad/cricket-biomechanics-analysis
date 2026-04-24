import { useState } from 'react'
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
import { SiteNavbar } from './SiteNavbar.jsx'

function ProfileCard() {
  const stats = [
    { label: 'Total Sessions', value: '4', color: '#ffffff' },
    { label: 'Avg. Arm Speed', value: '84.5 km/h', color: '#22c55e' },
    { label: 'Latest Score', value: '8.2/10', color: '#22c55e' },
  ]
  return (
    <div
      style={{
        backgroundColor: '#111',
        border: '1px solid #1e1e1e',
        borderRadius: '16px',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '28px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="8" r="4" fill="white" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="white" />
        </svg>
      </div>

      <div style={{ flex: '1 1 200px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Rahul Sharma</h2>
        <p style={{ color: '#777', fontSize: '14px', marginBottom: '16px' }}>
          Fast Bowler • Right Arm
        </p>
        <div
          style={{
            display: 'flex',
            gap: 'clamp(24px, 6vw, 48px)',
            flexWrap: 'wrap',
          }}
        >
          {stats.map(({ label, value, color }) => (
            <div key={label}>
              <p style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>{label}</p>
              <p style={{ color, fontSize: '20px', fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const chartData = [
  { week: 'Week 1', armSpeed: 82, headStability: 83 },
  { week: 'Week 2', armSpeed: 84, headStability: 84 },
  { week: 'Week 3', armSpeed: 85, headStability: 86 },
  { week: 'Week 4', armSpeed: 87, headStability: 88 },
]

function CustomDot(props) {
  const { cx, cy, stroke } = props
  return <circle cx={cx} cy={cy} r={5} fill={stroke} stroke={stroke} />
}

function PerformanceChart() {
  return (
    <div
      style={{
        backgroundColor: '#111',
        border: '1px solid #1e1e1e',
        borderRadius: '16px',
        padding: '28px 32px',
        marginBottom: '36px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Performance Trends</h3>
          <p style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>
            Track your improvement over time
          </p>
        </div>
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

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical />
          <XAxis
            dataKey="week"
            tick={{ fill: '#666', fontSize: 13 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: '#666', fontSize: 13 }}
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
            labelStyle={{ color: '#aaa' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '16px' }}
            formatter={(value) => (
              <span
                style={{
                  color: String(value).includes('Head') ? '#06b6d4' : '#22c55e',
                  fontSize: '13px',
                }}
              >
                {value}
              </span>
            )}
          />
          <Line
            type="monotone"
            dataKey="armSpeed"
            name="Arm Speed (km/h)"
            stroke="#22c55e"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 7 }}
          />
          <Line
            type="monotone"
            dataKey="headStability"
            name="Head Stability"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={<CustomDot stroke="#06b6d4" />}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const sessions = [
  { date: 'April 24, 2026', time: '14:30', elbow: '118°', arm: '87 km/h', head: '8.2/10' },
  { date: 'April 17, 2026', time: '16:15', elbow: '120°', arm: '85 km/h', head: '8/10' },
  { date: 'April 10, 2026', time: '15:00', elbow: '122°', arm: '84 km/h', head: '7.8/10' },
  { date: 'April 3, 2026', time: '14:45', elbow: '125°', arm: '82 km/h', head: '7.5/10' },
]

function SessionCard({ date, time, elbow, arm, head }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#111',
        border: `1px solid ${hovered ? 'rgba(34,197,94,0.3)' : '#1e1e1e'}`,
        borderRadius: '14px',
        padding: '22px 28px',
        marginBottom: '16px',
        transition: 'border-color 0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="#22c55e" strokeWidth="2" />
              <line x1="16" y1="2" x2="16" y2="6" stroke="#22c55e" strokeWidth="2" />
              <line x1="8" y1="2" x2="8" y2="6" stroke="#22c55e" strokeWidth="2" />
              <line x1="3" y1="10" x2="21" y2="10" stroke="#22c55e" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '16px' }}>{date}</p>
            <p style={{ color: '#666', fontSize: '13px' }}>{time}</p>
          </div>
        </div>
        <button
          type="button"
          style={{
            backgroundColor: '#1e1e1e',
            color: '#fff',
            border: '1px solid #2e2e2e',
            borderRadius: '8px',
            padding: '8px 18px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2a2a2a'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1e1e1e'
          }}
        >
          View Details
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        {[
          { label: 'Elbow Angle', value: elbow },
          { label: 'Arm Speed', value: arm },
          { label: 'Head Stability', value: head },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              backgroundColor: '#181818',
              borderRadius: '10px',
              padding: '14px 18px',
            }}
          >
            <p style={{ color: '#666', fontSize: '12px', marginBottom: '6px' }}>{label}</p>
            <p style={{ fontSize: '18px', fontWeight: 700 }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SessionHistory() {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Session History</h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="2" y="7" width="20" height="14" rx="2" stroke="#666" strokeWidth="2" />
          <path
            d="M16 3l4 4-4 4"
            stroke="#666"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {sessions.map((s) => (
        <SessionCard key={`${s.date}-${s.time}`} {...s} />
      ))}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <div
      style={{
        backgroundColor: '#0a0a0a',
        minHeight: '100vh',
        color: '#fff',
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <SiteNavbar variant="app" activeLabel="Profile" />
      <main
        style={{
          padding: '40px clamp(20px, 4vw, 48px) 80px',
          maxWidth: '1200px',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <ProfileCard />
        <PerformanceChart />
        <SessionHistory />
      </main>
    </div>
  )
}
