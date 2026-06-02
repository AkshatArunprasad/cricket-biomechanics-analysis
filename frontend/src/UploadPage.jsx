import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SiteNavbar } from './SiteNavbar.jsx'

// Base URL of the FastAPI backend. Configured via frontend/.env (VITE_API_BASE_URL),
// falling back to localhost for local development.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export default function UploadPage() {
  const navigate = useNavigate()
  const [dragOver, setDragOver] = useState(false)
  const [videoFile, setVideoFile] = useState(null)
  const [videoURL, setVideoURL] = useState(null)
  // NEW: State to track when the backend is crunching the video
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (videoURL) URL.revokeObjectURL(videoURL)
    }
  }, [videoURL])

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

  // NEW: The engine that talks to Python
  const handleAnalyze = async () => {
    if (!videoFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", videoFile);

    try {
      // Send the file to FastAPI
      const response = await fetch(`${API_BASE_URL}/upload-video/`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const pythonData = await response.json();
        // Redirect to the analysis page, but pass the Python math along in the router state!
        navigate('/analysis', { state: { analysisData: pythonData } });
      } else {
        alert("Upload failed. Check the FastAPI terminal for errors.");
        setIsUploading(false);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Network Error: Is the FastAPI server running?");
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#0a0a0a',
        minHeight: '100vh',
        color: '#fff',
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <SiteNavbar variant="app" activeLabel="Upload" />

      <main
        style={{
          padding: '48px clamp(20px, 4vw, 48px) 80px',
          maxWidth: '1200px',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '8px' }}>
          Upload Your Bowling Video
        </h1>
        <p style={{ color: '#777', fontSize: '15px', marginBottom: '36px' }}>
          Upload a video of your bowling action to receive detailed biomechanical analysis
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '20px',
          }}
        >
          {/* ... Drag and Drop Zone (Unchanged) ... */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? '#22c55e' : '#2e2e2e'}`,
              borderRadius: '16px',
              backgroundColor: dragOver ? 'rgba(34,197,94,0.05)' : '#111',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 32px',
              gap: '16px',
              transition: 'border-color 0.2s, background-color 0.2s',
              minHeight: '360px',
            }}
          >
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                stroke="#cccccc"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="17 8 12 3 7 8"
                stroke="#cccccc"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="12"
                y1="3"
                x2="12"
                y2="15"
                stroke="#cccccc"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

            <p style={{ fontSize: '17px', fontWeight: 600, color: '#fff', textAlign: 'center' }}>
              {videoFile ? videoFile.name : 'Drag & drop your video'}
            </p>
            <p style={{ fontSize: '14px', color: '#666' }}>or</p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label="Browse for a video file"
              style={{
                backgroundColor: '#22c55e',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 28px',
                fontSize: '15px',
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
              Browse Files
            </button>

            <input
              ref={inputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,video/*,.mp4,.mov,.avi"
              style={{ display: 'none' }}
              onChange={handleBrowse}
            />

            <p style={{ fontSize: '13px', color: '#555', marginTop: '8px' }}>
              Supported formats: MP4, MOV, AVI
            </p>
          </div>

          {/* ... Video Preview Zone (Unchanged) ... */}
          <div
            style={{
              border: '1px solid #1e1e1e',
              borderRadius: '16px',
              backgroundColor: '#111',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '360px',
              overflow: 'hidden',
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
                  borderRadius: '16px',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ marginBottom: '16px' }}
                  aria-hidden
                >
                  <polygon
                    points="5 3 19 12 5 21 5 3"
                    stroke="#444"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p style={{ color: '#555', fontSize: '14px' }}>Video preview will appear here</p>
              </>
            )}
          </div>
        </div>

        {videoFile && (
          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              aria-label="Analyse uploaded video"
              // NEW: Trigger our Python function instead of instantly navigating
              onClick={handleAnalyze}
              // Disable the button while uploading so they don't spam it
              disabled={isUploading}
              style={{
                // Change color if uploading
                backgroundColor: isUploading ? '#16a34a' : '#22c55e',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 36px',
                fontSize: '16px',
                fontWeight: 700,
                // Change cursor if uploading
                cursor: isUploading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'background-color 0.2s, transform 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isUploading) {
                  e.currentTarget.style.backgroundColor = '#16a34a'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isUploading) {
                  e.currentTarget.style.backgroundColor = '#22c55e'
                  e.currentTarget.style.transform = 'scale(1)'
                }
              }}
            >
              {/* Change the text based on state */}
              {isUploading ? 'Analyzing...' : 'Analyse Video →'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}