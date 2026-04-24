import { useState } from 'react';
import './App.css';

function App() {
  // useState hooks to track the video file and the current upload status
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Waiting for video...");

  // This runs the moment a user picks a file from their computer
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus("Video selected. Ready to upload.");
  };

  // This runs when the user clicks the 'Upload' button
  const uploadVideo = async () => {
    if (!file) {
      setStatus("Please select a video first!");
      return;
    }

    setStatus("Uploading to Python backend...");

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
        // data.file_path matches the JSON response your Python backend sends back
        setStatus(`Success! Python saved it at: ${data.file_path}`);
      } else {
        setStatus("Upload failed. Check the FastAPI terminal for errors.");
      }
    } catch (error) {
      console.error("Error:", error);
      setStatus("Network Error: Is the FastAPI server running?");
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Cricket Biomechanics: Upload Test</h2>

      <div style={{ margin: '20px 0' }}>
        {/* The native HTML file picker restricted to MP4s */}
        <input
          type="file"
          accept="video/mp4"
          onChange={handleFileChange}
        />
      </div>

      <div>
        {/* The trigger button */}
        <button
          onClick={uploadVideo}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Test File Upload
        </button>
      </div>

      {/* A simple debug box to show you exactly what the app is doing */}
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <strong>Status:</strong> {status}
      </div>
    </div>
  );
}

export default App;