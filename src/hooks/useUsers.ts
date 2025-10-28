import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface AppUser {
  id: string
  user_id: string | null
  email: string
  role: 'admin' | 'user'
  fullName: string | null
  profilePhoto: string | null
}

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, user_id, email, role, "Full Name", "Profile_Photo"')
        .order('created_at', { ascending: false })
      if (error) throw error
      const mapped: AppUser[] = (data || []).map((d: any) => ({
        id: d.id,
        user_id: d.user_id,
        email: d.email,
        role: d.role,
        fullName: d['Full Name'] || null,
        profilePhoto: d['Profile_Photo'] || null,
      }))
      setUsers(mapped)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const createUser = async (email: string, fullName: string, role: 'admin'|'user') => {
    const { error, data } = await supabase
      .from('users')
      .insert({ email, role, "Full Name": fullName })
      .select('id, user_id, email, role, "Full Name", "Profile_Photo"')
      .single()
    if (error) throw error
    const d: any = data
    setUsers(prev => [{
      id: d.id,
      user_id: d.user_id,
      email: d.email,
      role: d.role,
      fullName: d['Full Name'] || null,
      profilePhoto: d['Profile_Photo'] || null,
    }, ...prev])
  }

  const deleteUser = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) throw error
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  const updateUser = async (id: string, fields: Partial<{ fullName: string; role: 'admin'|'user' }>) => {
    const payload: any = {}
    if (fields.fullName !== undefined) payload['Full Name'] = fields.fullName
    if (fields.role !== undefined) payload['role'] = fields.role
    const { error, data } = await supabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select('id, user_id, email, role, "Full Name", "Profile_Photo"')
      .single()
    if (error) throw error
    const d: any = data
    setUsers(prev => prev.map(u => u.id===id ? ({
      id: d.id,
      user_id: d.user_id,
      email: d.email,
      role: d.role,
      fullName: d['Full Name'] || null,
      profilePhoto: d['Profile_Photo'] || null,
    }) : u))
  }

  return { users, loading, error, fetchUsers, createUser, deleteUser, updateUser }
}
