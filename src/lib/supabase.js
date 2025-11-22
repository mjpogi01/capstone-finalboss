import { createClient } from '@supabase/supabase-js'

/**
 * Always prefer environment variables so we can rotate Supabase projects/keys
 * without touching the source code. We keep the current project values as
 * fallbacks so local dev keeps working even if the env vars are missing, but
 * the recommendation is to set REACT_APP_SUPABASE_URL / _ANON_KEY in .env.local.
 */
const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL ||
  'https://kjqcswjljgavigyfzauj.supabase.co'

const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqcWNzd2psamdhdmlneWZ6YXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjA2NTQsImV4cCI6MjA3OTIzNjY1NH0.opTsSFI_7C19BS406d9hyZn1gtlLXfHMUs0dNiE9vL4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
