Project: Grassroots Cricket Biomechanics Tracker
Architecture: Decoupled. Python (FastAPI, OpenCV, MediaPipe) backend. React/Vue frontend.
Database: Supabase (PostgreSQL for kinematic data, Storage buckets for MP4s).
AI Layer: External Gemini API for coaching feedback. DO NOT use local LLMs.
Hardware Constraints: The development machine has 8GB of RAM. Video processing code must be highly memory-efficient. Read video frames sequentially and clear them from memory instantly; do not load entire MP4s into memory.
Workflow: Always generate an Artifact (Task List or Implementation Plan) for review before modifying the Python math engine.