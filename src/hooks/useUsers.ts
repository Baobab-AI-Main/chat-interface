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

export function useUsers(enabled: boolean = true) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    if (!enabled) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Use admin RPC function to bypass RLS
      const { data, error } = await supabase.rpc('admin_get_all_users')
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
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setUsers([])
      setLoading(false)
      setError(null)
      return
    }
    fetchUsers()
  }, [enabled, fetchUsers])

  const createUser = async (email: string, fullName: string, role: 'admin'|'user') => {
    if (!enabled) {
      throw new Error('User management is restricted')
    }
    // Use admin RPC function
    const { error, data } = await supabase.rpc('admin_create_user', {
      p_email: email,
      p_role: role,
      p_full_name: fullName
    })
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
    if (!enabled) {
      throw new Error('User management is restricted')
    }
    // Use admin RPC function
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: id })
    if (error) throw error
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  const updateUser = async (id: string, fields: Partial<{ fullName: string; role: 'admin'|'user' }>) => {
    if (!enabled) {
      throw new Error('User management is restricted')
    }
    // Use admin RPC function
    const { error, data } = await supabase.rpc('admin_update_user', {
      p_user_id: id,
      p_full_name: fields.fullName ?? null,
      p_role: fields.role ?? null
    })
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
