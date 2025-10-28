import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../contexts/AuthContext'

export interface Team {
  id: string
  name: string
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'owner' | 'member'
  created_at: string
}

export function useTeams(isAdmin: boolean) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('teams').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setTeams((data || []) as Team[])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const createTeam = async (name: string) => {
    if (!isAdmin) throw new Error('Forbidden')
    const { data, error } = await supabase.from('teams').insert({ name }).select().single()
    if (error) throw error
    setTeams((prev) => [data as Team, ...prev])
  }

  const updateTeam = async (id: string, name: string) => {
    if (!isAdmin) throw new Error('Forbidden')
    const { data, error } = await supabase.from('teams').update({ name }).eq('id', id).select().single()
    if (error) throw error
    setTeams((prev) => prev.map((t) => (t.id === id ? (data as Team) : t)))
  }

  const deleteTeam = async (id: string) => {
    if (!isAdmin) throw new Error('Forbidden')
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (error) throw error
    setTeams((prev) => prev.filter((t) => t.id !== id))
  }

  const listMembers = async (teamId: string) => {
    const { data, error } = await supabase.from('team_members').select('*').eq('team_id', teamId)
    if (error) throw error
    return data as TeamMember[]
  }

  const addMember = async (teamId: string, userId: string, role: 'owner' | 'member' = 'member') => {
    if (!isAdmin) throw new Error('Forbidden')
    const { error } = await supabase.from('team_members').insert({ team_id: teamId, user_id: userId, role })
    if (error) throw error
  }

  const removeMember = async (teamId: string, userId: string) => {
    if (!isAdmin) throw new Error('Forbidden')
    const { error } = await supabase.from('team_members').delete().match({ team_id: teamId, user_id: userId })
    if (error) throw error
  }

  return { teams, loading, error, fetchTeams, createTeam, updateTeam, deleteTeam, listMembers, addMember, removeMember }
}
