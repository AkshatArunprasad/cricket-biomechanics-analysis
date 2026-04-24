# =============================================================================
# main.py — Cricket Biomechanics Tracker (Backend Entry Point)
# =============================================================================
#
# This file boots up the FastAPI web server and defines the API endpoints that
# the frontend will talk to.  Right now there is only one endpoint:
#
#     POST /upload-video/   →  Accepts an MP4 file, saves it to disk.
#
# IMPORTANT (8 GB RAM constraint – see vision.md):
#   We NEVER load an entire video into memory.  Instead we stream incoming
#   bytes to disk in small 1 MB chunks.  Downstream processing (OpenCV,
#   MediaPipe) will later read the saved file frame-by-frame — also without
#   loading the whole video.
# =============================================================================


# ── Standard-library imports ─────────────────────────────────────────────────
#
# "os"    – lets us work with file paths and create directories.
# "uuid"  – generates unique IDs so two uploads never overwrite each other.
# "shutil"– provides high-level file operations (we use it as a fallback
#           reference, though our manual chunked loop is preferred here).

import os
import uuid

# ── Third-party imports ──────────────────────────────────────────────────────
#
# fastapi.FastAPI
#     The main class that creates our web application.  Think of it as the
#     "app object" — we attach URL routes (endpoints) to it.
#
# fastapi.UploadFile
#     A wrapper around uploaded files.  Crucially, FastAPI stores large uploads
#     in a *temporary file on disk* (via SpooledTemporaryFile), NOT in RAM.
#     This is key for our 8 GB memory budget.
#
# fastapi.File
#     A helper that tells FastAPI "this parameter comes from a multipart form
#     file field."  It works together with UploadFile.
#
# fastapi.HTTPException
#     Lets us return proper HTTP error codes (like 400 Bad Request) with a
#     human-readable message when something goes wrong.

from fastapi import FastAPI, UploadFile, File, HTTPException


# =============================================================================
# App Initialisation
# =============================================================================
#
# We create one FastAPI instance.  This is what Uvicorn (our ASGI server) will
# import and serve.  The arguments are optional metadata that shows up in the
# auto-generated docs at  http://127.0.0.1:8000/docs
#
# Run the server with:
#     uvicorn main:app --reload
#
# --reload  makes the server restart whenever you save a file — handy during
# development, but do NOT use it in production.

app = FastAPI(
    title="Cricket Biomechanics Tracker API",
    description=(
        "Backend service for the Grassroots Cricket Biomechanics Tracker. "
        "Upload MP4 bowling videos and receive pose-estimation data and "
        "AI-generated coaching feedback."
    ),
    version="0.1.0",
)


# ── Upload directory setup ───────────────────────────────────────────────────
#
# All uploaded videos land in a local folder called "uploads/".
# os.makedirs with exist_ok=True creates it if missing, silently does nothing
# if it already exists.

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Maximum file size we allow (in bytes).  100 MB is generous for a single
# bowling-action clip and prevents someone from accidentally filling the disk.
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB

# Chunk size for streaming the upload to disk.
# 1 MB strikes a good balance: small enough to keep memory usage low on an
# 8 GB machine, large enough that we don't make millions of tiny read() calls.
CHUNK_SIZE = 1 * 1024 * 1024  # 1 MB


# =============================================================================
# Health-check endpoint
# =============================================================================
#
# A GET route at the root URL ("/") that simply confirms the server is alive.
# This is a common pattern — load balancers and uptime monitors hit this route.
#
# HOW ROUTING WORKS IN FASTAPI:
#   The @app.get("/") decorator tells FastAPI:
#     "When an HTTP GET request arrives at path '/', call this function."
#   The function's return value is automatically converted to JSON.

@app.get("/")
async def root():
    """Return a simple health-check message."""
    return {"status": "ok", "message": "Cricket Biomechanics Tracker API is running."}


# =============================================================================
# POST /upload-video/  — Receive an MP4 video upload
# =============================================================================
#
# HOW THIS ENDPOINT WORKS:
#
#   1. The client sends a POST request with the video file attached as
#      multipart/form-data (this is the standard way browsers upload files).
#
#   2. FastAPI automatically parses the multipart body and gives us an
#      UploadFile object.  For large files, the raw bytes live in a temp file
#      on disk, NOT in RAM.
#
#   3. We read from that UploadFile in small chunks (1 MB at a time) and write
#      each chunk to a permanent file inside "uploads/".  At no point is the
#      whole video in memory at once.
#
#   4. After saving, we return the filename so the frontend knows what to
#      reference in future API calls (e.g., "analyse this video").
#
# WHY "async def"?
#   FastAPI is an *asynchronous* framework.  Using "async def" lets the server
#   handle other requests while it waits for slow I/O (like reading chunks from
#   the network).  The "await" keyword yields control back to the event loop
#   during those waits.

@app.post("/upload-video/")
async def upload_video(file: UploadFile = File(...)):
    """
    Accept an MP4 video upload, stream it to disk in 1 MB chunks, and return
    the saved filename.

    Parameters
    ----------
    file : UploadFile
        The video file sent by the client.  FastAPI requires the
        `python-multipart` package to parse this — that's why it's in
        requirements.txt even though we never import it directly.

    Returns
    -------
    dict
        JSON with the saved filename and a success message.
    """

    # ── Step 1: Validate the file type ───────────────────────────────────
    #
    # We only accept MP4 files.  content_type is set by the client, so this
    # isn't bulletproof security, but it catches honest mistakes (e.g.,
    # someone uploading a .pdf by accident).

    if file.content_type != "video/mp4":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid file type: '{file.content_type}'. "
                "Only MP4 videos (video/mp4) are accepted."
            ),
        )

    # ── Step 2: Generate a unique filename ───────────────────────────────
    #
    # uuid4() produces a random unique ID like "a3f1c2d4-..."  so two users
    # uploading "bowling.mp4" at the same time won't overwrite each other.

    unique_filename = f"{uuid.uuid4()}.mp4"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # ── Step 3: Stream the upload to disk in chunks ──────────────────────
    #
    # THIS IS THE MEMORY-CRITICAL SECTION.
    #
    # Instead of doing  contents = await file.read()  (which would pull the
    # ENTIRE video into RAM), we read one CHUNK_SIZE block at a time, write
    # it to disk, and move on.  Peak memory usage stays around ~1 MB no
    # matter how large the video is.
    #
    # We also track total_size so we can reject files that exceed our limit
    # *during* the upload, rather than after the whole thing is in memory.

    total_size = 0

    try:
        with open(file_path, "wb") as destination:
            while True:
                # Read the next chunk.  "await" lets other requests be
                # served while we wait for bytes from the network.
                chunk = await file.read(CHUNK_SIZE)

                # An empty bytes object means we've reached the end of the
                # upload — break out of the loop.
                if not chunk:
                    break

                # Running total to enforce the size limit.
                total_size += len(chunk)
                if total_size > MAX_FILE_SIZE_BYTES:
                    # Clean up the partial file before raising an error.
                    destination.close()
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"File too large. Maximum allowed size is "
                            f"{MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
                        ),
                    )

                # Write this chunk to the permanent file on disk.
                destination.write(chunk)
    finally:
        # Always close the UploadFile's internal file handle to free
        # resources, even if an error occurred above.
        await file.close()

    # ══════════════════════════════════════════════════════════════════════
    # TODO — MEDIAPIPE POSE ESTIMATION (future implementation)
    # ══════════════════════════════════════════════════════════════════════
    #
    # This is where the biomechanics analysis pipeline will be added:
    #
    #   1. Open the saved video with OpenCV:
    #          cap = cv2.VideoCapture(file_path)
    #
    #   2. Initialise MediaPipe Pose:
    #          mp_pose = mediapipe.solutions.pose
    #          pose = mp_pose.Pose(static_image_mode=False, ...)
    #
    #   3. Loop through frames ONE AT A TIME (memory-efficient):
    #          while cap.isOpened():
    #              success, frame = cap.read()
    #              if not success:
    #                  break
    #              # Convert BGR → RGB (MediaPipe expects RGB)
    #              rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    #              results = pose.process(rgb_frame)
    #              # Extract landmark coordinates (shoulder, elbow, wrist…)
    #              # … store kinematic data …
    #              del frame, rgb_frame  # free memory immediately
    #
    #   4. Release resources:
    #          cap.release()
    #          pose.close()
    #
    #   5. Send the extracted kinematics to the Gemini API for coaching
    #      feedback (see google-generativeai in requirements.txt).
    #
    #   6. Store results in Supabase (PostgreSQL) and return them to the
    #      frontend.
    #
    # All of this will process frames sequentially and delete them from
    # memory immediately — critical for our 8 GB RAM constraint.
    # ══════════════════════════════════════════════════════════════════════

    # ── Step 4: Return success response ──────────────────────────────────

    return {
        "message": "Video uploaded successfully.",
        "filename": unique_filename,
        "size_bytes": total_size,
    }
