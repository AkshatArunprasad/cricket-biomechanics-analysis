// frontend/src/supabaseClient.js
//
// Single shared Supabase client instance for the entire frontend.
// Import this module everywhere instead of calling createClient() inline.
// The ANON key is safe to bundle — it is designed to be public and is
// protected by Row Level Security policies in the database.

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
