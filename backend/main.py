# =============================================================================
# main.py — Cricket Biomechanics Tracker (Backend Entry Point)
# =============================================================================
#
# This file boots up the FastAPI web server and defines the API endpoints that
# the frontend will talk to.  The main endpoint is:
#
#     POST /upload-video/   →  Accepts an MP4 file, saves it to disk,
#                               then runs MediaPipe Pose estimation on
#                               every frame to extract elbow angles,
#                               body alignment, and head stability.
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
import base64

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
#
# math
#     Standard-library maths module.  We use math.atan2 and math.degrees for
#     the body-alignment (trunk-tilt) calculation.

import math
import cv2
import mediapipe as mp
import numpy as np

# ── Pose-skeleton connection map ─────────────────────────────────────────────
#
# MediaPipe 0.10.33 removed the legacy `mediapipe.solutions` subpackage,
# so `mp.solutions.pose.POSE_CONNECTIONS` no longer exists.  We define
# the 33-landmark connection set ourselves — these are the pairs of
# landmark indices that should be joined by lines to form a skeleton.
#
# Source: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker

POSE_CONNECTIONS = frozenset([
    # Face
    (0, 1), (1, 2), (2, 3), (3, 7),
    (0, 4), (4, 5), (5, 6), (6, 8),
    (9, 10),
    # Torso
    (11, 12), (11, 23), (12, 24), (23, 24),
    # Left arm
    (11, 13), (13, 15), (15, 17), (15, 19), (15, 21), (17, 19),
    # Right arm
    (12, 14), (14, 16), (16, 18), (16, 20), (16, 22), (18, 20),
    # Left leg
    (23, 25), (25, 27), (27, 29), (27, 31), (29, 31),
    # Right leg
    (24, 26), (26, 28), (28, 30), (28, 32), (30, 32),
])


def draw_pose_landmarks(image, landmarks, h, w):
    """
    Draw a full-body skeleton on *image* using pure OpenCV.

    Parameters
    ----------
    image     : numpy array – BGR image to draw on (modified in-place).
    landmarks : list        – 33 Tasks-API NormalizedLandmark objects.
    h, w      : int         – image height and width in pixels.
    """
    # Convert normalised landmarks to pixel coordinates once.
    pts = [(int(lm.x * w), int(lm.y * h)) for lm in landmarks]

    # Draw the connection lines (bones)
    for start_idx, end_idx in POSE_CONNECTIONS:
        if start_idx < len(pts) and end_idx < len(pts):
            cv2.line(
                image, pts[start_idx], pts[end_idx],
                color=(50, 205, 50),  # lime-green in BGR
                thickness=2,
                lineType=cv2.LINE_AA,
            )

    # Draw the landmark dots (joints)
    for px, py in pts:
        cv2.circle(image, (px, py), 4, (0, 0, 255), -1, cv2.LINE_AA)
        cv2.circle(image, (px, py), 5, (255, 255, 255), 1, cv2.LINE_AA)


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
# Utility: Body-Alignment Angle (Trunk Tilt)
# =============================================================================
#
# Given the Nose and Front Ankle coordinates, calculate the angle of the line
# connecting the ankle to the nose relative to a perfectly vertical axis.
# 0° = perfectly upright;  positive values = leaning / falling away.
#
# The vertical axis runs straight up from the ankle, so a vertical line has
# a dx of 0.  We measure how far the nose deviates from that vertical.

def calculate_body_alignment(nose, ankle):
    """
    Calculate the angle between the ankle→nose line and the vertical axis.

    Parameters
    ----------
    nose  : list  – [x, y] normalised coordinates of the nose.
    ankle : list  – [x, y] normalised coordinates of the front ankle.

    Returns
    -------
    float
        Angle in degrees (0 = upright, positive = tilted).
    """
    dx = nose[0] - ankle[0]
    dy = ankle[1] - nose[1]   # NOTE: y increases downward in image coords,
                               # so ankle_y > nose_y when standing upright.
    if dy == 0:
        return 90.0  # Completely horizontal — extreme case
    angle_rad = math.atan2(abs(dx), abs(dy))
    return round(math.degrees(angle_rad), 2)


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

    # ── Per-frame landmark coordinates for biomechanical phase detection ──
    #
    # We track several coordinates each frame so that AFTER the loop we can
    # run the Vertical Extension Method to detect the true release frame:
    #   1. Find the "delivery window" — frames where wrist is above nose
    #   2. Within that window, find max shoulder→wrist Euclidean distance
    #
    # We also keep Nose & Ankle coords for body-alignment and head-stability.
    nose_y_per_frame = []          # float – Y-coordinate of Nose per frame
    nose_coords_per_frame = []     # [x, y] of Nose per frame
    ankle_coords_per_frame = []    # [x, y] of Left Ankle (27) per frame
    ankle_y_per_frame = []         # float – Y-coordinate of Left Ankle per frame
    wrist_y_per_frame = []         # float – Y-coordinate of Right Wrist (16) per frame
    shoulder_coords_per_frame = [] # [x, y] of Right Shoulder (12) per frame
    wrist_coords_per_frame = []    # [x, y] of Right Wrist (16) per frame

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

                # ── Capture Nose, Ankle, and Wrist coordinates ───────
                nose = [
                    landmarks[0].x,   # Landmark 0 = Nose
                    landmarks[0].y,
                ]
                left_ankle = [
                    landmarks[27].x,  # Landmark 27 = Left Ankle
                    landmarks[27].y,
                ]
                nose_y_per_frame.append(nose[1])
                nose_coords_per_frame.append(nose)
                ankle_coords_per_frame.append(left_ankle)
                ankle_y_per_frame.append(left_ankle[1])
                wrist_y_per_frame.append(wrist[1])  # wrist already extracted above
                shoulder_coords_per_frame.append(shoulder)
                wrist_coords_per_frame.append(wrist)

            else:
                # No pose detected in this frame — append None placeholders
                # so that indices stay aligned with the coordinate lists.
                angle_data.append(None)
                nose_y_per_frame.append(None)
                nose_coords_per_frame.append(None)
                ankle_coords_per_frame.append(None)
                ankle_y_per_frame.append(None)
                wrist_y_per_frame.append(None)
                shoulder_coords_per_frame.append(None)
                wrist_coords_per_frame.append(None)
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
    # Step 5 — Vertical Extension Method (Release Frame Detection)
    # ══════════════════════════════════════════════════════════════════════
    #
    # The previous "Front Foot Contact" approach failed because camera
    # perspective makes foot/ankle tracking unreliable.  The new method
    # uses the bowling ARM geometry, which is clearly visible from any
    # common broadcast or smartphone angle:
    #
    #   1. DELIVERY WINDOW — Find all frames where the Right Wrist
    #      (Landmark 16) is physically ABOVE the Nose (Landmark 0).
    #      In normalised image coordinates (0 = top, 1 = bottom),
    #      "above" means  wrist_y < nose_y.
    #
    #   2. MAX EXTENSION — Within that delivery window, calculate the
    #      Euclidean distance between the Right Shoulder (Landmark 12)
    #      and the Right Wrist (Landmark 16).  The release frame is the
    #      one with the MAXIMUM distance — full arm extension at the
    #      peak of the delivery arc.
    #
    #   3. FALLBACK — If no frames satisfy the delivery-window filter
    #      (e.g. poor detection), fall back to the frame with the
    #      absolute minimum wrist Y (highest point on screen).
    #
    # All downstream metrics (elbow angle, body alignment, head
    # stability) are recalculated at this release frame.
    # ══════════════════════════════════════════════════════════════════════

    body_alignment_angle = None
    head_drop_variance = None
    release_frame_index = None
    release_elbow_angle = None

    if angle_data:
        # ── 5a. Build the Delivery Window ────────────────────────────────
        #
        # Collect indices of frames where the wrist is above the nose.
        # Both values must be non-None for the comparison to be valid.

        delivery_window = []
        for i in range(len(wrist_y_per_frame)):
            wy = wrist_y_per_frame[i]
            ny = nose_y_per_frame[i]
            if wy is not None and ny is not None and wy < ny:
                delivery_window.append(i)

        # ── 5b. Find Max Shoulder→Wrist Extension ────────────────────────
        #
        # Within the delivery window, compute the Euclidean distance
        # between shoulder and wrist for each candidate frame and pick
        # the one with the greatest distance (fullest arm extension).

        if delivery_window:
            best_dist = -1.0
            best_frame = delivery_window[0]

            for idx in delivery_window:
                s = shoulder_coords_per_frame[idx]
                wr = wrist_coords_per_frame[idx]
                if s is not None and wr is not None:
                    dist = math.sqrt(
                        (wr[0] - s[0]) ** 2 + (wr[1] - s[1]) ** 2
                    )
                    if dist > best_dist:
                        best_dist = dist
                        best_frame = idx

            release_frame_index = best_frame
        else:
            # ── 5b-fallback: absolute min wrist Y ────────────────────────
            #
            # If the delivery window is empty (poor detection, unusual
            # angle), fall back to the frame where the wrist reaches its
            # highest physical point (lowest Y value).
            wrist_y_safe = [
                y if y is not None else 2.0
                for y in wrist_y_per_frame
            ]
            if wrist_y_safe:
                release_frame_index = int(np.argmin(wrist_y_safe))
            else:
                release_frame_index = 0

        # ── 5c. Recalculate Elbow Angle at Release ───────────────────────
        #
        # Use the angle_data entry at the release frame index.  The
        # angle_data list is aligned with the per-frame coordinate lists.

        if release_frame_index < len(angle_data) and angle_data[release_frame_index] is not None:
            release_elbow_angle = angle_data[release_frame_index]

        # ── 5d. Body Alignment at Release ────────────────────────────────
        #
        # At the true release frame, compute the angle of the Ankle→Nose
        # line relative to the vertical axis.  0° = perfectly upright.

        nose_at_release = nose_coords_per_frame[release_frame_index]
        ankle_at_release = ankle_coords_per_frame[release_frame_index]

        if nose_at_release is not None and ankle_at_release is not None:
            body_alignment_angle = calculate_body_alignment(
                nose_at_release, ankle_at_release
            )

        # ── 5e. Head Stability (pre-release window) ─────────────────────
        #
        # Look at the 15 frames immediately before the release frame and
        # measure the variance of the Nose's Y-coordinate.  High variance
        # means the head is bouncing / dropping during the gather.

        window_start = max(0, release_frame_index - 15)
        window_end = release_frame_index  # exclusive

        nose_y_window = [
            y for y in nose_y_per_frame[window_start:window_end]
            if y is not None
        ]

        if len(nose_y_window) >= 2:
            head_drop_variance = round(float(np.var(nose_y_window)), 6)
        else:
            head_drop_variance = 0.0

    # ══════════════════════════════════════════════════════════════════════
    # Step 6 — Generate Annotated Release Frame (Skeleton Overlay)
    # ══════════════════════════════════════════════════════════════════════
    #
    # Re-open the video, seek to the exact release frame, run pose
    # detection in IMAGE mode, and draw:
    #   1. The full MediaPipe 33-landmark skeleton
    #   2. A cyan line for Trunk Tilt (Ankle → Nose)
    #   3. A yellow poly-line for Elbow Angle (Shoulder → Elbow → Wrist)
    #
    # The annotated frame is then JPEG-encoded and returned as a Base64
    # string.  This avoids any canvas-sync issues on the frontend — the
    # browser simply renders an <img> tag.
    # ══════════════════════════════════════════════════════════════════════

    annotated_release_frame_b64 = None

    if release_frame_index is not None:
        # Re-open the video just to grab ONE frame
        cap2 = cv2.VideoCapture(file_path)
        if cap2.isOpened():
            # Seek directly to the release frame
            cap2.set(cv2.CAP_PROP_POS_FRAMES, release_frame_index)
            grabbed, release_bgr = cap2.read()
            cap2.release()

            if grabbed and release_bgr is not None:
                # ── Run pose detection on this single frame (IMAGE mode) ─
                image_options = PoseLandmarkerOptions(
                    base_options=BaseOptions(model_asset_path=MODEL_PATH),
                    running_mode=RunningMode.IMAGE,
                    num_poses=1,
                    min_pose_detection_confidence=0.5,
                    min_pose_presence_confidence=0.5,
                    min_tracking_confidence=0.5,
                )
                image_landmarker = PoseLandmarker.create_from_options(image_options)

                release_rgb = cv2.cvtColor(release_bgr, cv2.COLOR_BGR2RGB)
                mp_img = mp.Image(
                    image_format=mp.ImageFormat.SRGB, data=release_rgb
                )
                detection = image_landmarker.detect(mp_img)
                image_landmarker.close()

                if detection.pose_landmarks and len(detection.pose_landmarks) > 0:
                    landmarks = detection.pose_landmarks[0]
                    h, w, _ = release_bgr.shape

                    # ── 6a. Draw the full skeleton using pure OpenCV ─────
                    #
                    # We use our own draw_pose_landmarks() helper which
                    # draws bones (green lines) and joints (red dots)
                    # directly with cv2 — no legacy mediapipe.solutions
                    # dependency required.
                    draw_pose_landmarks(release_bgr, landmarks, h, w)

                    # ── 6b. Draw Trunk Tilt line (Ankle → Nose) ──────────
                    #
                    # Cyan line showing the body-alignment axis.
                    nose_px = (
                        int(landmarks[0].x * w),
                        int(landmarks[0].y * h),
                    )
                    ankle_px = (
                        int(landmarks[27].x * w),
                        int(landmarks[27].y * h),
                    )
                    cv2.line(
                        release_bgr, ankle_px, nose_px,
                        color=(255, 255, 0),   # Cyan in BGR
                        thickness=3,
                        lineType=cv2.LINE_AA,
                    )
                    # Small label
                    cv2.putText(
                        release_bgr, "Trunk Tilt",
                        (ankle_px[0] + 8, ankle_px[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                        (255, 255, 0), 2, cv2.LINE_AA,
                    )

                    # ── 6c. Draw Elbow Angle lines (Shoulder→Elbow→Wrist)
                    #
                    # Yellow poly-line highlighting the bowling arm.
                    shoulder_px = (
                        int(landmarks[PoseLandmark.RIGHT_SHOULDER].x * w),
                        int(landmarks[PoseLandmark.RIGHT_SHOULDER].y * h),
                    )
                    elbow_px = (
                        int(landmarks[PoseLandmark.RIGHT_ELBOW].x * w),
                        int(landmarks[PoseLandmark.RIGHT_ELBOW].y * h),
                    )
                    wrist_px = (
                        int(landmarks[PoseLandmark.RIGHT_WRIST].x * w),
                        int(landmarks[PoseLandmark.RIGHT_WRIST].y * h),
                    )

                    cv2.line(
                        release_bgr, shoulder_px, elbow_px,
                        color=(0, 255, 255),   # Yellow in BGR
                        thickness=3,
                        lineType=cv2.LINE_AA,
                    )
                    cv2.line(
                        release_bgr, elbow_px, wrist_px,
                        color=(0, 255, 255),
                        thickness=3,
                        lineType=cv2.LINE_AA,
                    )
                    # Angle label at the elbow joint
                    elbow_angle_val = calculate_angle(
                        [landmarks[PoseLandmark.RIGHT_SHOULDER].x,
                         landmarks[PoseLandmark.RIGHT_SHOULDER].y],
                        [landmarks[PoseLandmark.RIGHT_ELBOW].x,
                         landmarks[PoseLandmark.RIGHT_ELBOW].y],
                        [landmarks[PoseLandmark.RIGHT_WRIST].x,
                         landmarks[PoseLandmark.RIGHT_WRIST].y],
                    )
                    cv2.putText(
                        release_bgr,
                        f"{round(elbow_angle_val)} deg",
                        (elbow_px[0] + 10, elbow_px[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                        (0, 255, 255), 2, cv2.LINE_AA,
                    )

                # ── 6d. Encode the annotated frame as Base64 JPEG ────────
                success_enc, buffer = cv2.imencode(
                    ".jpg", release_bgr, [cv2.IMWRITE_JPEG_QUALITY, 90]
                )
                if success_enc:
                    annotated_release_frame_b64 = base64.b64encode(
                        buffer.tobytes()
                    ).decode("utf-8")

                # Free the frame memory
                del release_bgr, release_rgb

    # ══════════════════════════════════════════════════════════════════════
    # TODO — FUTURE ENHANCEMENTS
    # ══════════════════════════════════════════════════════════════════════
    #
    #   • Send the elbow_angles data to the Gemini API for AI coaching
    #     feedback  (see google-generativeai in requirements.txt).
    #
    #   • Store results in Supabase (PostgreSQL) so the frontend can
    #     fetch historical data and plot graphs.
    # ══════════════════════════════════════════════════════════════════════

    # ── Step 7: Return success response ──────────────────────────────────

    # Return the packaged data — now includes biomechanical metrics
    # and the annotated release frame image.
    return {
        "message": "Video processed successfully.",
        "filename": unique_filename,
        "frames_processed": frame_count,
        "elbow_angles": [a for a in angle_data if a is not None],
        "release_frame_index": release_frame_index,
        "release_elbow_angle": release_elbow_angle,
        "body_alignment_angle": body_alignment_angle,
        "head_drop_variance": head_drop_variance,
        "annotated_release_frame": annotated_release_frame_b64,
    }
