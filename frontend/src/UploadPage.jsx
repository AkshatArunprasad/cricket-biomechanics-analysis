import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SiteNavbar } from './SiteNavbar.jsx'
import { supabase } from './supabaseClient.js'

/* ─── keyframe animations ─── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

@keyframes up-fade-in {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes up-progress {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
@keyframes up-pulse {
  0%, 100% { opacity: 1;   }
  50%      { opacity: 0.4; }
}
@keyframes up-spin {
  to { transform: rotate(360deg); }
}
`

/* ─── design tokens (aligned to LandingPage) ─── */
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
  amber:    '#f59e0b',
  amberDim: 'rgba(245,158,11,0.12)',
  amberMid: 'rgba(245,158,11,0.30)',
  font:     "'Inter', 'Segoe UI', system-ui, sans-serif",
  radius:   '14px',
  radiusSm: '10px',
}

/* ─── cycling status messages for the loading overlay ─── */
const STATUS_MESSAGES = [
  'Uploading video to server…',
  'Extracting individual frames…',
  'Initialising pose-estimation model…',
  'Mapping 33-point skeleton…',
  'Detecting delivery window…',
  'Calculating elbow angles…',
  'Measuring trunk tilt…',
  'Analysing head stability…',
  'Generating annotated overlay…',
  'Packaging your results…',
]

/* ====================================================================
   FILMING TIPS PANEL
   ==================================================================== */
const tips = [
  { icon: '📐', text: 'Film from the side-on angle for best accuracy' },
  { icon: '🧍', text: 'Ensure the full body is visible in the frame' },
  { icon: '💡', text: 'Good lighting helps — avoid heavy shadows' },
  { icon: '📱', text: 'Keep the camera steady (tripod or rest)' },
  { icon: '🎬', text: 'Record the full run-up and follow-through' },
]

function FilmingTips() {
  return (
    <div
      style={{
        background: `linear-gradient(165deg, ${T.card}, ${T.surface})`,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: '24px 24px 20px',
        animation: 'up-fade-in 0.5s ease-out 0.15s both',
      }}
    >
      <h3
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: T.white,
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke={T.accent} strokeWidth="2" />
          <path d="M12 16v-4M12 8h.01" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
        </svg>
        Filming Tips
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tips.map(({ icon, text }) => (
          <div
            key={text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: T.muted,
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }} aria-hidden>
              {icon}
            </span>
            {text}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ====================================================================
   HANDEDNESS TOGGLE
   ==================================================================== */
function HandednessToggle({ value, onChange }) {
  const options = ['Right', 'Left']

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'up-fade-in 0.5s ease-out 0.2s both',
      }}
    >
      <span style={{ fontSize: '14px', fontWeight: 600, color: T.text }}>
        Bowling Arm:
      </span>
      <div
        style={{
          display: 'flex',
          borderRadius: '8px',
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
        }}
      >
        {options.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt)}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: T.font,
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s, color 0.2s',
                backgroundColor: active ? T.accent : T.card,
                color: active ? '#000' : T.muted,
              }}
            >
              {opt === 'Right' ? '🫲' : '🫱'} {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ====================================================================
   3-STEP PROGRESS INDICATOR
   ==================================================================== */
const STEPS = ['Upload', 'Processing', 'Results']

function StepIndicator({ current }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0',
        marginBottom: '40px',
        animation: 'up-fade-in 0.5s ease-out both',
      }}
    >
      {STEPS.map((label, i) => {
        const isActive  = i === current
        const isDone    = i < current
        const color     = isDone ? T.accent : isActive ? T.accent : T.muted

        return (
          <div
            key={label}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            {/* connector line (skip before first) */}
            {i > 0 && (
              <div
                style={{
                  width: 'clamp(32px, 8vw, 80px)',
                  height: '2px',
                  backgroundColor: isDone ? T.accent : T.border,
                  transition: 'background-color 0.4s',
                }}
              />
            )}

            {/* circle + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: `2px solid ${color}`,
                  backgroundColor: isDone || isActive ? T.accentDim : 'transparent',
                  color,
                  transition: 'all 0.4s',
                }}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ====================================================================
   PROCESSING OVERLAY  (replaces the old "Analyzing..." text)
   ==================================================================== */
function ProcessingOverlay({ messageIndex }) {
  const msg = STATUS_MESSAGES[messageIndex % STATUS_MESSAGES.length]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(6,8,12,0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '32px',
        padding: '24px',
      }}
    >
      {/* spinner ring */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          border: `4px solid ${T.border}`,
          borderTopColor: T.accent,
          animation: 'up-spin 0.9s linear infinite',
        }}
      />

      {/* status message */}
      <p
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: T.white,
          textAlign: 'center',
          maxWidth: '380px',
          lineHeight: 1.5,
          animation: 'up-pulse 1.6s ease-in-out infinite',
        }}
      >
        {msg}
      </p>

      {/* animated progress bar */}
      <div
        style={{
          width: 'min(340px, 80vw)',
          height: '6px',
          borderRadius: '999px',
          backgroundColor: T.border,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '999px',
            background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)`,
            backgroundSize: '200% 100%',
            animation: 'up-progress 1.5s ease-in-out infinite',
          }}
        />
      </div>

      <p style={{ fontSize: '13px', color: T.muted }}>
        This usually takes 15–45 seconds
      </p>
    </div>
  )
}

/* ====================================================================
   PAGE ROOT
   ==================================================================== */
export default function UploadPage() {
  const navigate = useNavigate()
  const [dragOver, setDragOver] = useState(false)
  const [videoFile, setVideoFile] = useState(null)
  const [videoURL, setVideoURL] = useState(null)
  // NEW: State to track when the backend is crunching the video
  const [isUploading, setIsUploading] = useState(false)
  const [handedness, setHandedness] = useState('Right')
  const [msgIdx, setMsgIdx] = useState(0)
  const inputRef = useRef(null)

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (videoURL) URL.revokeObjectURL(videoURL)
    }
  }, [videoURL])

  // Cycle status messages while uploading
  useEffect(() => {
    if (!isUploading) return
    const id = setInterval(() => setMsgIdx((i) => i + 1), 3000)
    return () => clearInterval(id)
  }, [isUploading])

  /* ── current step for the indicator ── */
  const currentStep = isUploading ? 1 : videoFile ? 0 : 0

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return
    setVideoFile(file)
    setVideoURL((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleBrowse = (e) => {
    handleFile(e.target.files[0])
    e.target.value = ''
  }

  // The engine that talks to FastAPI.
  // API_BASE_URL is read from the Vite environment (frontend/.env → VITE_API_BASE_URL).
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

  const handleAnalyze = async () => {
    if (!videoFile) return;

    setIsUploading(true);
    setMsgIdx(0);

    // Get the authenticated user's UUID from Supabase Auth.
    // ProtectedRoute ensures this page is only reachable with a session.
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? null

    const formData = new FormData();
    formData.append("file", videoFile);
    formData.append("handedness", handedness);
    if (userId) formData.append("user_id", userId);
    // If userId is null the backend ghost-user fallback handles it.

    try {
      // Send the file to FastAPI
      const response = await fetch(`${API_BASE_URL}/upload-video/`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const pythonData = await response.json();
        // Redirect to the analysis page, passing the results through router state.
        navigate('/analysis', { state: { analysisData: pythonData } });
      } else {
        const errorBody = await response.text();
        console.error('Upload failed:', response.status, errorBody);
        alert(`Upload failed (${response.status}). Check the FastAPI terminal for details.`);
        setIsUploading(false);
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Network Error: Is the FastAPI server running at " + API_BASE_URL + "?");
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: T.bg,
        minHeight: '100vh',
        color: T.text,
        fontFamily: T.font,
      }}
    >
      <style>{css}</style>
      <SiteNavbar variant="app" activeLabel="Upload" />

      {/* processing overlay */}
      {isUploading && <ProcessingOverlay messageIndex={msgIdx} />}

      <main
        style={{
          padding: '48px clamp(20px, 4vw, 48px) 80px',
          maxWidth: '1200px',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* step indicator */}
        <StepIndicator current={currentStep} />

        {/* page heading */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '16px',
            marginBottom: '36px',
            animation: 'up-fade-in 0.5s ease-out 0.05s both',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: T.white,
                marginBottom: '6px',
                letterSpacing: '-0.5px',
              }}
            >
              Upload Your Bowling Video
            </h1>
            <p style={{ color: T.muted, fontSize: '15px' }}>
              Upload a video of your bowling action to receive detailed
              biomechanical analysis
            </p>
          </div>
          <HandednessToggle value={handedness} onChange={setHandedness} />
        </div>

        {/* main grid: dropzone + preview + tips */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '20px',
          }}
        >
          {/* ─── Drag & Drop Zone (EXISTING logic preserved) ─── */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? T.accent : T.border}`,
              borderRadius: T.radius,
              backgroundColor: dragOver ? T.accentDim : T.card,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 32px',
              gap: '16px',
              transition: 'border-color 0.2s, background-color 0.2s',
              minHeight: '360px',
              animation: 'up-fade-in 0.5s ease-out 0.1s both',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: T.accentDim,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                  stroke={T.accent}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="17 8 12 3 7 8"
                  stroke={T.accent}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="12" y1="3" x2="12" y2="15"
                  stroke={T.accent}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p style={{ fontSize: '17px', fontWeight: 600, color: T.white, textAlign: 'center' }}>
              {videoFile ? videoFile.name : 'Drag & drop your video'}
            </p>
            {videoFile && (
              <p style={{ fontSize: '12px', color: T.muted }}>
                {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            )}
            {!videoFile && <p style={{ fontSize: '14px', color: T.muted }}>or</p>}

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label="Browse for a video file"
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
                transition: 'transform 0.15s, box-shadow 0.2s',
                boxShadow: '0 0 16px rgba(34,197,94,0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)'
                e.currentTarget.style.boxShadow = '0 0 28px rgba(34,197,94,0.35)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 0 16px rgba(34,197,94,0.2)'
              }}
            >
              Browse Files
            </button>

            <input
              ref={inputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,video/*,.mp4,.mov,.avi"
              style={{ display: 'none' }}
              onChange={handleBrowse}
            />

            <p style={{ fontSize: '12px', color: T.muted, marginTop: '4px' }}>
              Supported: MP4, MOV, AVI · Max 100 MB
            </p>
          </div>

          {/* ─── Video Preview Zone (EXISTING logic preserved) ─── */}
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: T.radius,
              backgroundColor: T.card,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '360px',
              overflow: 'hidden',
              animation: 'up-fade-in 0.5s ease-out 0.15s both',
            }}
          >
            {videoURL ? (
              <video
                src={videoURL}
                controls
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '280px',
                  borderRadius: T.radius,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <>
                <svg
                  width="52"
                  height="52"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ marginBottom: '16px' }}
                  aria-hidden
                >
                  <polygon
                    points="5 3 19 12 5 21 5 3"
                    stroke={T.border}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p style={{ color: T.muted, fontSize: '14px' }}>
                  Video preview will appear here
                </p>
              </>
            )}
          </div>

          {/* ─── Filming Tips ─── */}
          <FilmingTips />
        </div>

        {/* ─── Analyse button (EXISTING onClick + disabled logic preserved) ─── */}
        {videoFile && (
          <div
            style={{
              marginTop: '28px',
              display: 'flex',
              justifyContent: 'flex-end',
              animation: 'up-fade-in 0.4s ease-out both',
            }}
          >
            <button
              type="button"
              id="btn-analyze"
              aria-label="Analyse uploaded video"
              // NEW: Trigger our Python function instead of instantly navigating
              onClick={handleAnalyze}
              // Disable the button while uploading so they don't spam it
              disabled={isUploading}
              style={{
                // Change color if uploading
                background: isUploading
                  ? '#16a34a'
                  : `linear-gradient(135deg, ${T.accent}, #16a34a)`,
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 40px',
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: T.font,
                // Change cursor if uploading
                cursor: isUploading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'transform 0.15s, box-shadow 0.2s',
                boxShadow: '0 0 20px rgba(34,197,94,0.2)',
              }}
              onMouseEnter={(e) => {
                if (!isUploading) {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
                  e.currentTarget.style.boxShadow = '0 0 32px rgba(34,197,94,0.35)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isUploading) {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(34,197,94,0.2)'
                }
              }}
            >
              {/* Change the text based on state */}
              {isUploading ? 'Analyzing…' : 'Analyse Video'}
              {!isUploading && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}