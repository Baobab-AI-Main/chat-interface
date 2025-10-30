import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Org {
  org_name: string
  org_logo: string | null
}

/**
 * Shared helper to fetch the top org record.
 * Use this for per-visit fetches (e.g., login screen).
 */
export async function fetchOrgOnce() {
  const { data, error } = await supabase
    .from('org')
    .select('org_name, org_logo')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as Org | null
}

export function useOrg() {
  const [org, setOrg] = useState<Org | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchOrgOnce()
        if (data) setOrg(data)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const updateOrg = async (patch: Partial<Org>) => {
    const { data, error } = await supabase
      .from('org')
      .upsert(patch)
      .select('org_name, org_logo')
      .single()
    if (error) throw error
    setOrg(data as Org)
  }

  const uploadLogo = async (file: File) => {
    if (!file.type.includes('png')) throw new Error('Only PNG supported')
    const path = `logo-${Date.now()}.png`
    const { error } = await supabase.storage.from('org').upload(path, file, { cacheControl: '3600', upsert: true, contentType: 'image/png' })
    if (error) throw error
    const { data } = supabase.storage.from('org').getPublicUrl(path)
    await updateOrg({ org_logo: data.publicUrl })
  }

  return { org, loading, error, updateOrg, uploadLogo }
}
