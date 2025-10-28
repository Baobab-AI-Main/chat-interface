/*
 Seed a default org row if none exists.
 Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (recommended) or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (may fail due to RLS).

 Usage examples:
   # PowerShell
   # $env:SUPABASE_URL = 'https://<your-supabase-or-kong-domain>'
   # $env:SUPABASE_SERVICE_ROLE_KEY = '<service_role_key>'
   # $env:SEED_ORG_NAME = 'BrunelAI'
   # $env:SEED_ORG_LOGO = 'https://example.com/logo.png'
   # node scripts/seed-org.js
*/

const { createClient } = require('@supabase/supabase-js')

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing SUPABASE_URL and/or key (SUPABASE_SERVICE_ROLE_KEY preferred).')
    process.exit(1)
  }

  const client = createClient(url, key, { auth: { persistSession: false } })

  // Check if an org row exists
  const existing = await client.from('org').select('id, org_name, org_logo').limit(1).maybeSingle()
  if (existing.error) {
    console.error('Failed to query org table:', existing.error.message)
    process.exit(1)
  }

  const name = process.env.SEED_ORG_NAME || 'BrunelAI'
  const logo = process.env.SEED_ORG_LOGO || 'figma:asset/2a8790cd130a03ff81ea4aec63fd5860503e90bf.png'

  if (existing.data?.id) {
    console.log('Org row exists. Updating name/logo...')
    const upd = await client.from('org').update({ org_name: name, org_logo: logo }).eq('id', existing.data.id).select('id, org_name, org_logo').single()
    if (upd.error) {
      console.error('Failed to update org row:', upd.error.message)
      process.exit(1)
    }
    console.log('Updated org:', upd.data)
    return
  }

  console.log('No org row found. Inserting default org...')
  const ins = await client.from('org').insert({ org_name: name, org_logo: logo }).select('id, org_name, org_logo').single()
  if (ins.error) {
    console.error('Failed to insert org row:', ins.error.message)
    console.error('Tip: Use SUPABASE_SERVICE_ROLE_KEY to bypass RLS for seeding.')
    process.exit(1)
  }
  console.log('Inserted org:', ins.data)
}

main().catch((e) => { console.error(e); process.exit(1) })
