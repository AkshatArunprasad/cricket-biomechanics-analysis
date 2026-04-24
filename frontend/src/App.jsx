import { useState } from 'react';
import './App.css';

function App() {
  // useState hooks to track the video file, upload status, and results
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Waiting for video...");
  const [results, setResults] = useState(null);

  // This runs the moment a user picks a file from their computer
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResults(null);
    setStatus("Video selected. Ready to upload.");
  };

  // This runs when the user clicks the 'Upload & Analyse' button
  const uploadVideo = async () => {
    if (!file) {
      setStatus("Please select a video first!");
      return;
    }

    setStatus("Uploading & processing... (this may take a moment)");
    setResults(null);

    // FormData acts as the "envelope" to securely package the heavy MP4 file
    const formData = new FormData();
    formData.append("file", file);

    try {
      // The fetch API sends the POST request to your local FastAPI server
      const response = await fetch("http://127.0.0.1:8000/upload-video/", {
        method: "POST",
        body: formData,
      });

      // Checking if the backend returned a 200 OK status
      if (response.ok) {
        const data = await response.json();
        setStatus("✅ Analysis complete!");
        setResults(data);
      } else {
        const errorData = await response.json().catch(() => null);
        setStatus(
          `❌ Upload failed: ${errorData?.detail || "Check the FastAPI terminal for errors."}`
        );
      }
    } catch (error) {
      console.error("Error:", error);
      setStatus("🔴 Network Error: Is the FastAPI server running on port 8000?");
    }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto' }}>
      <h2>🏏 Cricket Biomechanics: Upload & Analyse</h2>

      <div style={{ margin: '20px 0' }}>
        {/* The native HTML file picker restricted to MP4s */}
        <input
          type="file"
          accept="video/mp4"
          onChange={handleFileChange}
        />
      </div>

      <div>
        <button
          onClick={uploadVideo}
          disabled={!file}
          style={{
            padding: '10px 24px',
            cursor: file ? 'pointer' : 'not-allowed',
            backgroundColor: file ? '#2563eb' : '#94a3b8',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '15px',
          }}
        >
          Upload & Analyse
        </button>
      </div>

      {/* Status box */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#f0f0f0',
        borderRadius: '6px',
      }}>
        <strong>Status:</strong> {status}
      </div>

      {/* Results panel — only shows after a successful upload */}
      {results && (
        <div style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
        }}>
          <h3 style={{ marginTop: 0 }}>📊 Analysis Results</h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <tbody>
              <tr>
                <td style={cellStyle}><strong>File saved as</strong></td>
                <td style={cellStyle}><code>{results.filename}</code></td>
              </tr>
              <tr>
                <td style={cellStyle}><strong>File size</strong></td>
                <td style={cellStyle}>{(results.size_bytes / (1024 * 1024)).toFixed(2)} MB</td>
              </tr>
              <tr>
                <td style={cellStyle}><strong>Frames processed</strong></td>
                <td style={cellStyle}>{results.frames_processed}</td>
              </tr>
              <tr>
                <td style={cellStyle}><strong>Frames with pose detected</strong></td>
                <td style={cellStyle}>{results.elbow_angles?.length ?? 0}</td>
              </tr>
            </tbody>
          </table>

          {results.elbow_angles && results.elbow_angles.length > 0 && (
            <>
              <h4>Right Elbow Angles (first 20 frames)</h4>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
              }}>
                {results.elbow_angles.slice(0, 20).map((angle, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#e0e7ff',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {angle}°
                  </span>
                ))}
                {results.elbow_angles.length > 20 && (
                  <span style={{ padding: '4px 10px', fontSize: '13px', color: '#64748b' }}>
                    … and {results.elbow_angles.length - 20} more
                  </span>
                )}
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '24px' }}>
                <div>
                  <strong>Min angle:</strong>{' '}
                  {Math.min(...results.elbow_angles).toFixed(2)}°
                </div>
                <div>
                  <strong>Max angle:</strong>{' '}
                  {Math.max(...results.elbow_angles).toFixed(2)}°
                </div>
                <div>
                  <strong>Avg angle:</strong>{' '}
                  {(results.elbow_angles.reduce((a, b) => a + b, 0) / results.elbow_angles.length).toFixed(2)}°
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Simple reusable cell style for the summary table
const cellStyle = {
  padding: '8px 12px',
  borderBottom: '1px solid #e2e8f0',
  fontSize: '14px',
};

export default App;