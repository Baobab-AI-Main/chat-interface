import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTeams } from '../hooks/useTeams'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'

export function TeamManagement({ onClose }: { onClose: () => void }) {
  const { isAdmin } = useAuth()
  const { teams, loading, error, createTeam, updateTeam, deleteTeam } = useTeams(isAdmin)
  const [name, setName] = useState('')

  if (!isAdmin) {
    return (
      <div className="flex-1 p-6">
        <Alert variant="destructive"><AlertDescription>Access denied</AlertDescription></Alert>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Team Management</h2>
        <Button variant="outline" onClick={onClose}>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Team</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={async ()=>{ if(name.trim()){ await createTeam(name.trim()); setName('') } }} disabled={!name.trim()}>Create</Button>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid gap-3">
        {loading && <div className="text-sm text-muted-foreground">Loading teams...</div>}
        {!loading && teams.length === 0 && (
          <div className="text-sm text-muted-foreground">No teams yet.</div>
        )}
        {teams.map(t => (
          <Card key={t.id}>
            <CardContent className="p-4 flex items-center gap-2">
              <Input defaultValue={t.name} onBlur={async (e)=>{ const v=e.currentTarget.value.trim(); if(v && v!==t.name){ await updateTeam(t.id, v) } }} />
              <Button variant="outline" onClick={async ()=>{ await deleteTeam(t.id) }}>Delete</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
