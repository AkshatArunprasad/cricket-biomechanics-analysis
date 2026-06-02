-- =============================================================================
-- CricketVision — Supabase schema (single-run migration)
-- =============================================================================
-- Paste this entire file into: Supabase Dashboard → SQL Editor → Run
--
-- Maps to FastAPI upload response (Phase 1):
--   elbow_angles, release_frame_index, release_elbow_angle, body_alignment_angle,
--   head_drop_variance, frames_processed, annotated_release_frame (→ Storage URL),
--   filename, message
--
-- Phase 2 metric columns are nullable on kinematic_data so no ALTER TABLE later.
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- Provides uuid_generate_v4() for primary-key defaults.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- TABLE: profiles
-- One row per auth.users signup. Players link to a coach via coach_id.
-- =============================================================================

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'player'
                CHECK (role IN ('player', 'coach')),
  coach_id    UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
  'Extends Supabase Auth. role is player or coach; coach_id links a player to their coach.';


-- =============================================================================
-- TABLE: sessions
-- One row per video upload / analysis run.
-- annotated_frame_url replaces inline base64 from the API once Storage is wired.
-- =============================================================================

CREATE TABLE public.sessions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  filename              TEXT NOT NULL,
  handedness            TEXT NOT NULL DEFAULT 'right'
                          CHECK (handedness IN ('right', 'left')),
  frames_processed      INTEGER,
  release_frame_index   INTEGER,
  annotated_frame_url   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sessions IS
  'Bowling analysis session per uploaded video.';

CREATE INDEX idx_sessions_user_id ON public.sessions (user_id);


-- =============================================================================
-- TABLE: kinematic_data
-- One row per session (1:1). Phase 1 metrics + nullable Phase 2 columns.
-- =============================================================================

CREATE TABLE public.kinematic_data (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id                UUID NOT NULL UNIQUE REFERENCES public.sessions (id) ON DELETE CASCADE,

  -- Phase 1 (from current FastAPI JSON)
  release_elbow_angle       DOUBLE PRECISION,
  body_alignment_angle      DOUBLE PRECISION,
  head_drop_variance        DOUBLE PRECISION,

  -- Phase 2 (nullable until pipeline implements them)
  knee_flexion_at_ffc       DOUBLE PRECISION,
  knee_flexion_at_release   DOUBLE PRECISION,
  hip_shoulder_separation   DOUBLE PRECISION,
  head_x_variance           DOUBLE PRECISION,
  injury_risk_score         DOUBLE PRECISION,
  risk_level                TEXT,
  arm_speed_normalised      DOUBLE PRECISION,
  gemini_coaching           TEXT,
  camera_angle_warning      BOOLEAN,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.kinematic_data IS
  'Biomechanical metrics for one session. Phase 2 columns are nullable placeholders.';

CREATE INDEX idx_kinematic_data_session_id ON public.kinematic_data (session_id);


-- =============================================================================
-- TABLE: elbow_angle_series
-- One row per frame — powers elbow-angle chart and frame scrubber.
-- =============================================================================

CREATE TABLE public.elbow_angle_series (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  frame_index   INTEGER NOT NULL,
  elbow_angle   DOUBLE PRECISION NOT NULL,
  UNIQUE (session_id, frame_index)
);

COMMENT ON TABLE public.elbow_angle_series IS
  'Per-frame elbow flexion angles (from elbow_angles array in API response).';

CREATE INDEX idx_elbow_angle_series_session_id ON public.elbow_angle_series (session_id);


-- =============================================================================
-- TABLE: delivery_tags
-- Phase 3: variation tells (stock, googly, carrom, yorker) + wrist at release.
-- =============================================================================

CREATE TABLE public.delivery_tags (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL UNIQUE REFERENCES public.sessions (id) ON DELETE CASCADE,
  tag               TEXT NOT NULL,
  wrist_release_x   DOUBLE PRECISION,
  wrist_release_y   DOUBLE PRECISION,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.delivery_tags IS
  'Delivery type tag and wrist position at release for variation analysis.';

CREATE INDEX idx_delivery_tags_session_id ON public.delivery_tags (session_id);


-- =============================================================================
-- TRIGGER: Auto-create profile on auth signup
-- Inserts profiles.id = auth.users.id; full_name from sign-up metadata if set.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'player'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();


-- =============================================================================
-- ROW LEVEL SECURITY — enable on every table
-- =============================================================================

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kinematic_data      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elbow_angle_series  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tags       ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- RLS HELPERS
-- is_coach() — current user has role coach
-- owns_session(session_id) — session belongs to auth.uid()
-- is_coached_session(session_id) — coach may read a linked player's session
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'coach'
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_session(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = p_session_id
      AND s.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_coached_session(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.profiles player ON player.id = s.user_id
    WHERE s.id = p_session_id
      AND player.coach_id = auth.uid()
      AND public.is_coach()
  );
$$;


-- =============================================================================
-- RLS: profiles
-- Users may SELECT and UPDATE only their own row (signup trigger creates the row).
-- =============================================================================

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- =============================================================================
-- RLS: sessions
-- Players: full CRUD on own sessions (user_id = auth.uid()).
-- Coaches: SELECT on sessions for players where profiles.coach_id = auth.uid().
-- =============================================================================

CREATE POLICY "sessions_select_own"
  ON public.sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "sessions_select_coached"
  ON public.sessions
  FOR SELECT
  TO authenticated
  USING (public.is_coached_session(id));

CREATE POLICY "sessions_insert_own"
  ON public.sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions_update_own"
  ON public.sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions_delete_own"
  ON public.sessions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- =============================================================================
-- RLS: kinematic_data
-- Players: full CRUD when parent session is owned.
-- Coaches: SELECT on coached players' sessions.
-- =============================================================================

CREATE POLICY "kinematic_data_select_own"
  ON public.kinematic_data
  FOR SELECT
  TO authenticated
  USING (public.owns_session(session_id));

CREATE POLICY "kinematic_data_select_coached"
  ON public.kinematic_data
  FOR SELECT
  TO authenticated
  USING (public.is_coached_session(session_id));

CREATE POLICY "kinematic_data_insert_own"
  ON public.kinematic_data
  FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_session(session_id));

CREATE POLICY "kinematic_data_update_own"
  ON public.kinematic_data
  FOR UPDATE
  TO authenticated
  USING (public.owns_session(session_id))
  WITH CHECK (public.owns_session(session_id));

CREATE POLICY "kinematic_data_delete_own"
  ON public.kinematic_data
  FOR DELETE
  TO authenticated
  USING (public.owns_session(session_id));


-- =============================================================================
-- RLS: elbow_angle_series
-- Players: full CRUD when parent session is owned.
-- Coaches: SELECT on coached players' sessions.
-- =============================================================================

CREATE POLICY "elbow_angle_series_select_own"
  ON public.elbow_angle_series
  FOR SELECT
  TO authenticated
  USING (public.owns_session(session_id));

CREATE POLICY "elbow_angle_series_select_coached"
  ON public.elbow_angle_series
  FOR SELECT
  TO authenticated
  USING (public.is_coached_session(session_id));

CREATE POLICY "elbow_angle_series_insert_own"
  ON public.elbow_angle_series
  FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_session(session_id));

CREATE POLICY "elbow_angle_series_update_own"
  ON public.elbow_angle_series
  FOR UPDATE
  TO authenticated
  USING (public.owns_session(session_id))
  WITH CHECK (public.owns_session(session_id));

CREATE POLICY "elbow_angle_series_delete_own"
  ON public.elbow_angle_series
  FOR DELETE
  TO authenticated
  USING (public.owns_session(session_id));


-- =============================================================================
-- RLS: delivery_tags
-- Players: full CRUD when parent session is owned.
-- Coaches: SELECT on coached players' sessions.
-- =============================================================================

CREATE POLICY "delivery_tags_select_own"
  ON public.delivery_tags
  FOR SELECT
  TO authenticated
  USING (public.owns_session(session_id));

CREATE POLICY "delivery_tags_select_coached"
  ON public.delivery_tags
  FOR SELECT
  TO authenticated
  USING (public.is_coached_session(session_id));

CREATE POLICY "delivery_tags_insert_own"
  ON public.delivery_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_session(session_id));

CREATE POLICY "delivery_tags_update_own"
  ON public.delivery_tags
  FOR UPDATE
  TO authenticated
  USING (public.owns_session(session_id))
  WITH CHECK (public.owns_session(session_id));

CREATE POLICY "delivery_tags_delete_own"
  ON public.delivery_tags
  FOR DELETE
  TO authenticated
  USING (public.owns_session(session_id));
