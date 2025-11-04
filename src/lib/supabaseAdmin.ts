import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

if (!supabaseUrl) {
  console.warn('Supabase env missing: VITE_SUPABASE_URL');
}

if (!supabaseServiceRoleKey) {
  console.warn('Supabase service role key missing: admin operations disabled');
}

export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
