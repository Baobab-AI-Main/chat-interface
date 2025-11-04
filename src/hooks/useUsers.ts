import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'

export interface AppUser {
  id: string
  user_id: string | null
  email: string
  role: 'admin' | 'user'
  fullName: string | null
  profilePhoto: string | null
}

type SupabaseUserRow = {
  id: string
  user_id: string | null
  email: string
  role: AppUser['role']
  "Full Name": string | null
  "Profile_Photo": string | null
}

const toAppUser = (row: SupabaseUserRow): AppUser => ({
  id: row.id,
  user_id: row.user_id,
  email: row.email,
  role: row.role,
  fullName: row['Full Name'] ?? null,
  profilePhoto: row['Profile_Photo'] ?? null,
})

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
  const mapped: AppUser[] = ((data as SupabaseUserRow[] | null) ?? []).map(toAppUser)
      setUsers(mapped)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
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

  const createUser = async (email: string, fullName: string, role: 'admin'|'user', password: string = `TempPass${Date.now()}!`) => {
    if (!enabled) {
      throw new Error('User management is restricted')
    }
    const trimmedEmail = email.trim()
    const cleanedFullName = fullName.trim() || null
    let createdProfile: SupabaseUserRow | null = null

    if (supabaseAdmin) {
      const { data: created, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          role,
          full_name: cleanedFullName,
        },
      })

      if (adminError) {
        const message = adminError.message?.toLowerCase() ?? ''
        const isPermissionError = adminError.status === 403 || message.includes('not allowed') || message.includes('not_admin')

        if (!isPermissionError) {
          throw adminError
        }
        console.warn('Supabase admin API unavailable, falling back to SQL RPC:', adminError)
      } else {
        const newUserId = created?.user?.id
        if (!newUserId) {
          throw new Error('Failed to create user account')
        }

        const { data: userRow, error: publicError } = await supabase
          .from('users')
          .insert({
            user_id: newUserId,
            email: trimmedEmail,
            role,
            "Full Name": cleanedFullName,
          })
          .select('id, user_id, email, role, "Full Name", "Profile_Photo"')
          .single()

        if (publicError) throw publicError
        createdProfile = (userRow as SupabaseUserRow | null) ?? null
      }
    }

    if (!createdProfile) {
      const { data: fallbackRow, error: fallbackError } = await supabase.rpc('admin_create_user_complete', {
        p_email: trimmedEmail,
        p_password: password,
        p_role: role,
        p_full_name: cleanedFullName,
      })
      if (fallbackError) {
        throw fallbackError
      }
      createdProfile = (fallbackRow as SupabaseUserRow | null) ?? null
    }

    if (createdProfile) {
      setUsers(prev => [toAppUser(createdProfile), ...prev])
    } else {
      await fetchUsers()
    }
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
    if (!data) {
      await fetchUsers()
      return
    }
    const updatedUser = toAppUser(data as SupabaseUserRow)
    setUsers(prev => prev.map(u => u.id === id ? updatedUser : u))
  }

  return { users, loading, error, fetchUsers, createUser, deleteUser, updateUser }
}
