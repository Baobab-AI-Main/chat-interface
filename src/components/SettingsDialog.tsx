import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { User, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useTeams } from '../hooks/useTeams';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Team management uses live data via Supabase (see useTeams)

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user, workspace, updateProfile, uploadProfileAvatar, updateWorkspace, uploadWorkspaceLogo, isAdmin } = useAuth();
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [workspaceName, setWorkspaceName] = useState(workspace.name);

  const { teams, loading, error, createTeam, updateTeam, deleteTeam } = useTeams(isAdmin)

  const handleProfileSave = async () => {
    try {
      await updateProfile({ name: profileName, email: profileEmail });
      toast('Profile updated successfully');
    } catch (e: any) {
      toast(`Failed to update profile: ${e.message || e}`)
    }
  };

  const handleProfilePhotoUpload = async (file?: File) => {
    if (!file) return;
    try {
      await uploadProfileAvatar(file)
      toast('Profile photo updated')
    } catch (e: any) {
      toast(`Failed to upload photo: ${e.message || e}`)
    }
  }

  const handleWorkspaceSave = async () => {
    try {
      await updateWorkspace({ name: workspaceName });
      toast('Workspace settings updated successfully');
    } catch (e: any) {
      toast(`Failed to update workspace: ${e.message || e}`)
    }
  };

  const handleWorkspaceLogoUpload = async (file?: File) => {
    if (!file) return;
    try {
      await uploadWorkspaceLogo(file)
      toast('Workspace logo updated')
    } catch (e: any) {
      toast(`Failed to upload logo: ${e.message || e}`)
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="team" disabled={!isAdmin}>
              Team Management
              {!isAdmin && <span className="ml-2 text-xs">(Admin)</span>}
            </TabsTrigger>
            <TabsTrigger value="workspace" disabled={!isAdmin}>
              Workspace
              {!isAdmin && <span className="ml-2 text-xs">(Admin)</span>}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="profile" className="space-y-6 mt-0">
              <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-slate-200">
                      <User className="h-10 w-10 text-slate-600" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="file" accept="image/png,image/jpeg" onChange={(e)=>handleProfilePhotoUpload(e.target.files?.[0]||undefined)} />
                      <Upload className="w-4 h-4" /> Upload Photo
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG or PNG. Max size 2MB.
                    </p>
                  </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full Name</Label>
                  <Input
                    id="profile-name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <div>
                    <Badge variant="secondary" className="capitalize">
                      {user?.role}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleProfileSave} className="bg-black hover:bg-gray-800">
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-4 mt-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Teams</h3>
                  <p className="text-sm text-muted-foreground">
                    Create and manage teams
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="New team name" onKeyDown={async (e)=>{
                    const el = e.currentTarget as HTMLInputElement
                    if(e.key==='Enter' && el.value.trim()){
                      try { await createTeam(el.value.trim()); el.value='' } catch(e:any){ toast(e.message||String(e)) }
                    }
                  }} />
                  <Button className="bg-black hover:bg-gray-800" onClick={async ()=>{
                    const input = (document.activeElement as HTMLInputElement)
                    if (input && input.tagName==='INPUT' && input.value.trim()){
                      try { await createTeam(input.value.trim()); input.value='' } catch(e:any){ toast(e.message||String(e)) }
                    }
                  }}>Create</Button>
                </div>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow><TableCell colSpan={2}>Loading...</TableCell></TableRow>
                    )}
                    {!loading && teams.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Input defaultValue={t.name} onBlur={async (e)=>{
                            const v=e.currentTarget.value.trim();
                            if (v && v!==t.name){ try{ await updateTeam(t.id, v)} catch(e:any){ toast(e.message||String(e)) } }
                          }} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={async ()=>{
                            try { await deleteTeam(t.id) } catch(e:any){ toast(e.message||String(e)) }
                          }}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && teams.length===0 && (
                      <TableRow><TableCell colSpan={2} className="text-muted-foreground">No teams yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="workspace" className="space-y-6 mt-0">
              <div>
                <h3 className="font-medium mb-4">Workspace Settings</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Customize your workspace branding and information
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Workspace Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 border rounded-lg flex items-center justify-center bg-white">
                      <img src={workspace.logo} alt="Workspace logo" className="h-12 object-contain" />
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="file" accept="image/png" onChange={(e)=>handleWorkspaceLogoUpload(e.target.files?.[0]||undefined)} />
                        <Upload className="w-4 h-4" /> PNG only
                      </label>
                      <p className="text-xs text-muted-foreground mt-2">
                        Recommended size: 200x200px. PNG format.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Enter workspace name"
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will appear in the sidebar and throughout the application.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleWorkspaceSave} className="bg-black hover:bg-gray-800">
                  Save Changes
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
