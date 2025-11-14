import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase URL or service key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const main = async () => {
  const { data, error } = await supabase.auth.admin.listUsers({ limit: 5 });
  if (error) {
    console.error('listUsers error:', error);
    process.exit(1);
  }

  for (const user of data.users) {
    console.log({ id: user.id, email: user.email, created_at: user.created_at });
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
