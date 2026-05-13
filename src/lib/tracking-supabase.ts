import { createClient } from '@supabase/supabase-js';

// Read-only access to antria-3pl-tracking Supabase (public anon key)
export const trackingSupabase = createClient(
  'https://geqdzdujqpchrxsetgew.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcWR6ZHVqcXBjaHJ4c2V0Z2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODY1NjUsImV4cCI6MjA5MTU2MjU2NX0.QcjPYYuUCeFw-AUPRVrCr58fQN6bEOY5zKPZQ56qKUU',
  { db: { schema: 'tracking' } }
);
