# 🏏 CricketVision — AI-Powered Cricket Bowling Biomechanics Tracker

CricketVision lets a cricket bowler upload a video of their bowling action and receive **automated biomechanical analysis and AI-generated coaching feedback** — powered by computer vision and a large language model.

Upload a delivery → the system detects the release point, measures elbow angle, trunk tilt, and head stability, then generates a personalised coaching breakdown with drills, based on the bowler's actual numbers.

---

## ✨ Features

- **Automatic release-point detection** using a custom Vertical Extension Method (finds the frame where the wrist is above the nose and shoulder→wrist distance peaks)
- **Elbow angle at release** — flags deliveries that may exceed the ICC's legal 15° extension threshold
- **Trunk tilt (body alignment)** — measures lateral lean away from vertical at release
- **Head stability variance** — tracks vertical head movement through the delivery stride
- **Camera angle detection** — warns the user if the video was filmed too front-on for reliable measurement
- **Skeleton overlay** — annotated release frame with joint markers, trunk tilt line, and elbow angle line drawn directly onto the image
- **AI coaching feedback** — Gemini analyses the bowler's specific metrics and generates a written summary, strengths, areas to improve, and named drills targeting the actual issues detected
- **Session history** — authenticated users can view past sessions and track trends over time
- **Frame-by-frame elbow angle chart** — full delivery visualised, not just the release instant

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| Computer Vision | MediaPipe PoseLandmarker (Tasks API), OpenCV |
| Database | Supabase (PostgreSQL) with Row Level Security |
| File Storage | Supabase Storage |
| Auth | Supabase Auth |
| AI Coaching | Google Gemini (`google-genai` SDK) |

---

## 🏗️ Architecture

```
cricket-biomechanics-analysis/
├── backend/
│   ├── main.py              ← FastAPI server: upload, pose estimation, metrics, DB persist, AI coaching
│   └── pose_landmarker_lite.task   ← MediaPipe pose model
├── frontend/
│   └── src/
│       ├── LandingPage.jsx
│       ├── UploadPage.jsx    ← video upload + handedness selection
│       ├── AnalysisPage.jsx  ← results, metrics, chart, AI feedback
│       ├── ProfilePage.jsx   ← session history
│       └── supabaseClient.js
└── supabase/
    └── schema.sql            ← tables + RLS policies
```

### Processing Pipeline

1. **Upload** — video is streamed to disk in 1 MB chunks (keeps memory usage low, never loads the full file into RAM) and uploaded to Supabase Storage
2. **Pose estimation** — every frame is processed with MediaPipe PoseLandmarker; landmarks are extracted and each frame is discarded immediately after processing
3. **Release detection** — the Vertical Extension Method scans the landmark sequence to find the true ball-release frame
4. **Metric calculation** — elbow angle, trunk tilt, and head stability variance are computed at the release frame; camera angle is checked for reliability
5. **Annotation** — the release frame is re-rendered with a skeleton overlay, trunk tilt line, and elbow angle line, then uploaded to storage
6. **AI coaching** — the computed metrics are sent to Gemini with a structured prompt; the model returns a JSON coaching report (summary, strengths, areas to improve, drills)
7. **Persistence** — session, kinematic data, elbow angle series, and coaching feedback are written to Supabase
8. **Results** — the frontend renders the annotated frame, metric cards, elbow angle chart, and AI coaching panel

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A Supabase project (Database + Storage + Auth enabled)
- A Google Gemini API key ([aistudio.google.com](https://aistudio.google.com))

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

Run the server:

```bash
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Run the dev server:

```bash
npm run dev
```

### Database Setup

Run `supabase/schema.sql` in the Supabase SQL Editor to create the required tables, RLS policies, and the profile-creation trigger. Then create a public storage bucket named `videos`.

---

## 📊 Database Schema

| Table | Purpose |
|---|---|
| `profiles` | One per user — player or coach role |
| `sessions` | One per video upload — filename, handedness, frame count, annotated frame URL |
| `kinematic_data` | Computed metrics per session, including AI coaching feedback |
| `elbow_angle_series` | Per-frame elbow angle data, powering the chart |
| `delivery_tags` | Reserved for future delivery-type classification |

---

## 🗺️ Roadmap

- [ ] Server-side JWT verification (currently relies on client-submitted user ID)
- [ ] Knee flexion and hip-shoulder separation metrics
- [ ] Delivery type tagging (yorker, googly, bouncer, etc.)
- [ ] Export analysis as PNG / shareable link
- [ ] Coach-linked accounts for reviewing multiple players' sessions

---

## 📄 License

This project is for portfolio and educational purposes.
