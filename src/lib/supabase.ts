import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tfkscifaetvnzydkbvit.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRma3NjaWZhZXR2bnp5ZGtidml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNjYxODAsImV4cCI6MjA5MDk0MjE4MH0.3KDB2oVg_9M2k1e3ug-fd-yfC2sJM1oPO4-dL5nWUWE';

// Custom storage to handle "Remember Me"
// We use localStorage for the preference, but the actual session data
// is stored in either localStorage or sessionStorage based on that preference.
const STORAGE_KEY = 'pmms-auth-remember';

const customStorage = {
  getItem: (key: string) => {
    try {
      const remember = localStorage.getItem(STORAGE_KEY) !== 'false';
      return (remember ? localStorage.getItem(key) : sessionStorage.getItem(key)) || localStorage.getItem(key);
    } catch (e) {
      console.warn('Storage access error:', e);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      const remember = localStorage.getItem(STORAGE_KEY) !== 'false';
      if (remember) {
        localStorage.setItem(key, value);
      } else {
        sessionStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('Storage set error:', e);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage remove error:', e);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Admin client with service_role key — bypasses RLS for privileged operations
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRma3NjaWZhZXR2bnp5ZGtidml0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM2NjE4MCwiZXhwIjoyMDkwOTQyMTgwfQ.csMD4ZQ10oEPqtAcEGf8HXVEHdQSVhXlheWPol-TiYs';

export const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
