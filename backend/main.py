# =============================================================================
# main.py — Cricket Biomechanics Tracker (Backend Entry Point)
# =============================================================================
#
# This file boots up the FastAPI web server and defines the API endpoints that
# the frontend will talk to.  The main endpoint is:
#
#     POST /upload-video/   →  Accepts an MP4 file, saves it to disk,
#                               then runs MediaPipe Pose estimation on
#                               every frame to extract elbow angles.
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
from fastapi.middleware.cors import CORSMiddleware

# ── Computer-vision & maths imports ──────────────────────────────────────────
#
# cv2  (OpenCV)
#     The industry-standard library for reading and manipulating images/video.
#     We use it here to open the saved MP4 file and read it ONE FRAME AT A TIME
#     via cv2.VideoCapture — this keeps memory usage constant regardless of
#     video length.
#
# mediapipe (imported as "mp")
#     Google's pre-trained machine-learning pipeline for body-pose detection.
#     We use the new Tasks API (mp.tasks.vision.PoseLandmarker) which requires
#     a downloaded .task model file.  Given an RGB image, it returns 33 3D
#     landmarks (joints) on the human body.  We only need three:
#         Landmark 12 = Right Shoulder
#         Landmark 14 = Right Elbow
#         Landmark 16 = Right Wrist
#
# numpy (imported as "np")
#     The go-to library for fast numerical computation in Python.  We use it
#     to convert landmark coordinates into arrays and calculate the 2D angle
#     between three joint positions using trigonometry (arctan2).

import cv2
import mediapipe as mp
import numpy as np


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

# ── CORS (Cross-Origin Resource Sharing) ─────────────────────────────────────
#
# The React frontend runs on a DIFFERENT port (e.g. http://localhost:5173)
# than the FastAPI backend (http://localhost:8000).  Browsers block requests
# between different origins by default — this is a security feature.
#
# CORSMiddleware tells the browser: "it's OK, let these origins talk to me."
# allow_origins=["*"] means "accept requests from ANY origin."  This is fine
# for local development; in production you'd restrict it to your real domain.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Which frontends can call us
    allow_credentials=True,    # Allow cookies / auth headers
    allow_methods=["*"],       # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],       # Allow all request headers
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
# Utility: 2D Joint-Angle Calculator
# =============================================================================
#
# This function calculates the interior angle at a "middle" joint given three
# body landmarks.  For example, to find the elbow flexion angle you'd pass in:
#
#     a = shoulder [x, y]
#     b = elbow    [x, y]   ← the vertex of the angle
#     c = wrist    [x, y]
#
# HOW THE MATHS WORKS:
#
#   1. We form two vectors originating at the middle point (b):
#          vector_ba = a - b   (points from elbow toward shoulder)
#          vector_bc = c - b   (points from elbow toward wrist)
#
#   2. np.arctan2(y, x) gives us the angle each vector makes with the
#      positive x-axis.  It handles all four quadrants correctly (unlike
#      plain arctan which only covers -90° to +90°).
#
#   3. We subtract the two angles to get the interior angle, convert from
#      radians to degrees, and normalise to a 0–180° range.
#
# RETURNS:
#   A float in the range [0, 180] representing degrees of flexion.
#   180° = fully extended arm    ~30° = tightly bent arm

def calculate_angle(a, b, c):
    """
    Calculate the 2D interior angle at point *b* formed by the line segments
    a→b and c→b.

    Parameters
    ----------
    a : list or array-like
        [x, y] coordinates of the first point  (e.g. shoulder).
    b : list or array-like
        [x, y] coordinates of the vertex point (e.g. elbow).
    c : list or array-like
        [x, y] coordinates of the third point  (e.g. wrist).

    Returns
    -------
    float
        The angle in degrees, clamped to the range [0, 180].
    """

    # Convert inputs to NumPy arrays so we can do vector maths.
    a = np.array(a)  # e.g. [0.45, 0.32]
    b = np.array(b)
    c = np.array(c)

    # Calculate the angle (in radians) of each vector relative to the x-axis.
    # np.arctan2(y, x) is used instead of np.arctan(y/x) because it correctly
    # handles all four quadrants and avoids division-by-zero errors.
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) \
            - np.arctan2(a[1] - b[1], a[0] - b[0])

    # Convert radians → degrees.
    angle = np.abs(radians * 180.0 / np.pi)

    # Normalise: if the angle came out greater than 180°, flip it so we
    # always report the interior (smaller) angle.
    if angle > 180.0:
        angle = 360.0 - angle

    return angle


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
    Accept an MP4 video upload, stream it to disk in 1 MB chunks, run
    MediaPipe Pose estimation on every frame, and return the per-frame
    elbow-angle measurements.

    Parameters
    ----------
    file : UploadFile
        The video file sent by the client.  FastAPI requires the
        `python-multipart` package to parse this — that's why it's in
        requirements.txt even though we never import it directly.

    Returns
    -------
    dict
        JSON with the saved filename, frame count, and elbow-angle list.
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
    # Step 4 — MediaPipe Pose Estimation (frame-by-frame)
    # ══════════════════════════════════════════════════════════════════════
    #
    # Now that the video is safely on disk, we open it with OpenCV and feed
    # each frame to MediaPipe Pose.  The key memory rules:
    #
    #   ✓  Read ONE frame at a time with cap.read()
    #   ✓  Delete (del) the frame as soon as we're done with it
    #   ✗  NEVER append frames to a list or accumulate images in memory
    #
    # We only store the lightweight numeric angle values (floats).
    # ══════════════════════════════════════════════════════════════════════

    # ── 4a. Initialise MediaPipe PoseLandmarker (new Tasks API) ──────────
    #
    # MediaPipe 0.10.33+ uses the "Tasks API" instead of the old
    # mp.solutions.pose interface.  The new API requires:
    #   1. A downloaded .task model file (pose_landmarker_lite.task)
    #   2. A RunningMode — we use VIDEO because we're processing sequential
    #      frames with temporal tracking (faster & smoother than IMAGE mode).
    #   3. A timestamp in milliseconds for each frame.
    #
    # BaseOptions points to the model file on disk.
    # min_pose_detection_confidence = how sure the model must be to detect
    #                                 a person initially (0.5 = 50%).
    # min_tracking_confidence       = how sure it must be to keep tracking
    #                                 across frames (0.5 = 50%).

    # Path to the model file (downloaded to the backend/ directory).
    MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker_lite.task")

    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    RunningMode = mp.tasks.vision.RunningMode
    PoseLandmark = mp.tasks.vision.PoseLandmark

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    landmarker = PoseLandmarker.create_from_options(options)

    # ── 4b. Open the saved video with OpenCV ─────────────────────────────
    #
    # cv2.VideoCapture opens the file and lets us read it frame-by-frame.
    # It does NOT load the whole video into RAM — it reads from disk on
    # each call to cap.read().

    cap = cv2.VideoCapture(file_path)

    if not cap.isOpened():
        # If OpenCV can't open the file, inform the client.
        landmarker.close()
        raise HTTPException(
            status_code=400,
            detail="OpenCV could not open the uploaded video. The file may be corrupted.",
        )

    # Get the video's frames-per-second so we can compute timestamps.
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    # We'll collect the per-frame elbow angles in a simple list of floats.
    # Even for long videos this is tiny:  36,000 frames × 8 bytes = ~0.3 MB.
    elbow_angles = []
    frame_count = 0

    # ── 4c. Frame-by-frame processing loop ───────────────────────────────
    #
    # This is the heart of the pipeline.  For EVERY frame in the video:
    #   1. Read it from disk
    #   2. Convert colour space (BGR → RGB)
    #   3. Run pose detection
    #   4. Extract joint coordinates & calculate angle
    #   5. Immediately free the frame from memory

    try:
        angle_data = []
        frame_count = 0
        while cap.isOpened():
            # cap.read() returns two values:
            #   success (bool) – True if a frame was read, False at end-of-video
            #   frame (numpy array) – the image data in BGR colour format
            success, frame = cap.read()

            if not success:
                # No more frames — we've reached the end of the video.
                break

            frame_count += 1

            # ── Convert BGR → RGB ────────────────────────────────────
            #
            # OpenCV reads frames in BGR (Blue-Green-Red) order, but
            # MediaPipe expects RGB (Red-Green-Blue).  This one-liner
            # swaps the colour channels.
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # ── Wrap in a MediaPipe Image ─────────────────────────────
            #
            # The new Tasks API requires an mp.Image object instead of
            # a raw numpy array.  mp.Image wraps the array without
            # copying it, so no extra memory is used.
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

            # ── Compute the timestamp in milliseconds ────────────────
            #
            # RunningMode.VIDEO requires a monotonically increasing
            # timestamp for each frame.  We derive it from the frame
            # count and the video's FPS.
            timestamp_ms = int((frame_count - 1) * (1000.0 / fps))

            # ── Run MediaPipe Pose detection ─────────────────────────
            #
            # detect_for_video() feeds the frame through the neural
            # network.  If a person is detected, result.pose_landmarks
            # will be a list of detected poses (we requested num_poses=1).
            # Each pose is a list of 33 NormalizedLandmark objects with
            # .x, .y, .z coordinates in the range [0, 1].
            result = landmarker.detect_for_video(mp_image, timestamp_ms)

            # ── Extract landmarks & calculate angle ──────────────────
            if result.pose_landmarks and len(result.pose_landmarks) > 0:
                # result.pose_landmarks[0] = the first (and only) person.
                landmarks = result.pose_landmarks[0]

                # MediaPipe landmark indices for the right arm:
                #   12 = Right Shoulder
                #   14 = Right Elbow
                #   16 = Right Wrist
                #
                # Each landmark has .x and .y (normalised 0–1 coordinates).
                # We extract them as simple [x, y] lists to pass into our
                # calculate_angle() function.

                shoulder = [
                    landmarks[PoseLandmark.RIGHT_SHOULDER].x,
                    landmarks[PoseLandmark.RIGHT_SHOULDER].y,
                ]
                elbow = [
                    landmarks[PoseLandmark.RIGHT_ELBOW].x,
                    landmarks[PoseLandmark.RIGHT_ELBOW].y,
                ]
                wrist = [
                    landmarks[PoseLandmark.RIGHT_WRIST].x,
                    landmarks[PoseLandmark.RIGHT_WRIST].y,
                ]

                # Calculate the elbow flexion angle.
                # shoulder → elbow → wrist  (elbow is the vertex).
                angle = calculate_angle(shoulder, elbow, wrist)

                # Round to 2 decimal places for clean output.
                angle = round(angle, 2)

                # Store the angle value (lightweight float — negligible memory).
                elbow_angles.append(angle)

                # Print to the terminal so you can watch it in real-time
                # while the server processes the video.
                angle_data.append(round(angle, 2))
                frame_count += 1
            else:
                # No pose detected in this frame — skip it.
                print(f"Frame {frame_count}: No pose detected.")

            # ── FREE MEMORY IMMEDIATELY ──────────────────────────────
            #
            # This is CRITICAL on an 8 GB machine.  A single 1080p frame
            # is ~6 MB of raw pixel data.  If we kept every frame, a
            # 30-second video at 30 fps = 900 frames × 6 MB = 5.4 GB!
            # By deleting here, peak usage stays at ~12 MB (two frames
            # worth: the original BGR + the RGB copy).
            del frame, rgb_frame

    finally:
        # ── 4d. Release resources ────────────────────────────────────────
        #
        # ALWAYS release the VideoCapture and close the PoseLandmarker,
        # even if an error occurred during processing.  The "finally"
        # block guarantees this runs no matter what.
        cap.release()
        landmarker.close()

    # ══════════════════════════════════════════════════════════════════════
    # TODO — FUTURE ENHANCEMENTS
    # ══════════════════════════════════════════════════════════════════════
    #
    #   • Send the elbow_angles data to the Gemini API for AI coaching
    #     feedback  (see google-generativeai in requirements.txt).
    #
    #   • Store results in Supabase (PostgreSQL) so the frontend can
    #     fetch historical data and plot graphs.
    #
    #   • Extract additional joints (hip, knee, ankle) for full-body
    #     bowling-action analysis.
    # ══════════════════════════════════════════════════════════════════════

    # ── Step 5: Return success response ──────────────────────────────────

    # Return the packaged data
    return {
        "message": "Video processed successfully.",
        "filename": unique_filename,
        "frames_processed": frame_count,
        "elbow_angles": angle_data
    }
