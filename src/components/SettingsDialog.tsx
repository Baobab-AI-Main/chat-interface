import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { useUsers } from '../hooks/useUsers';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = 'profile' | 'team' | 'workspace';

// Team management uses live data via Supabase (see useTeams)

function CreateUserInline({ onCreate }: { onCreate: (p: { fullName: string; email: string; role: 'admin'|'user' }) => Promise<void> | void }){
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin'|'user'>('user')
  return (
    <div className="flex gap-2">
      <Input placeholder="Full name" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
      <Input placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <select className="border rounded px-2 text-sm" value={role} onChange={(e)=>setRole(e.target.value as any)}>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <Button className="bg-black hover:bg-gray-800" onClick={async ()=>{ if(fullName && email){ await onCreate({ fullName, email, role }); setFullName(''); setEmail(''); setRole('user') } }}>Create</Button>
    </div>
  )
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user, workspace, updateProfile, uploadProfileAvatar, updateWorkspace, uploadWorkspaceLogo, isAdmin } = useAuth();
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const { users, loading, error, createUser, deleteUser, updateUser } = useUsers(isAdmin)

  // Sync workspaceName when workspace.name changes
  useEffect(() => {
    setWorkspaceName(workspace.name);
  }, [workspace.name]);

  useEffect(() => {
    if (!isAdmin && activeTab !== 'profile') {
      setActiveTab('profile');
    }
  }, [isAdmin, activeTab]);

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
    if (workspaceLoading) return;
    try {
      setWorkspaceLoading(true);
      await updateWorkspace({ name: workspaceName });
      toast.success('Workspace settings updated successfully');
    } catch (e: any) {
      toast.error(`Failed to update workspace: ${e.message || e}`);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const handleWorkspaceLogoUpload = async (file?: File) => {
    if (!file) return;
    if (logoUploading) return;
    
    // Enforce PNG-only validation
    if (!file.type.includes('png')) {
      toast.error('Only PNG files are supported');
      return;
    }
    
    try {
      setLogoUploading(true);
      await uploadWorkspaceLogo(file);
      toast.success('Workspace logo updated');
    } catch (e: any) {
      toast.error(`Failed to upload logo: ${e.message || e}`);
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as SettingsTab)}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {isAdmin && <TabsTrigger value="team">Team Management</TabsTrigger>}
            {isAdmin && <TabsTrigger value="workspace">Workspace</TabsTrigger>}
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
                    disabled
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

            {isAdmin && (
              <TabsContent value="team" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Users</h3>
                    <p className="text-sm text-muted-foreground">
                      Add or remove users with roles
                    </p>
                  </div>
                  <CreateUserInline onCreate={async (payload)=>{
                    try { await createUser(payload.email, payload.fullName, payload.role) } catch(e:any){ toast(e.message||String(e)) }
                  }} />
                </div>

                {error && <div className="text-sm text-red-600">{error}</div>}

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && (
                        <TableRow><TableCell colSpan={2}>Loading...</TableCell></TableRow>
                      )}
                      {!loading && users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <Input defaultValue={u.fullName || ''} onBlur={async (e)=>{
                              const v=e.currentTarget.value.trim();
                              if (v && v!==u.fullName){ try{ await updateUser(u.id, { fullName: v }) } catch(e:any){ toast(e.message||String(e)) } }
                            }} />
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{u.role}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={async ()=>{
                              try { await deleteUser(u.id) } catch(e:any){ toast(e.message||String(e)) }
                            }}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!loading && users.length===0 && (
                        <TableRow><TableCell colSpan={4} className="text-muted-foreground">No users yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            )}

            {isAdmin && (
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
                        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="file" 
                            accept="image/png" 
                            onChange={(e)=>handleWorkspaceLogoUpload(e.target.files?.[0]||undefined)}
                            disabled={logoUploading}
                            className="cursor-pointer"
                          />
                          <Upload className="w-4 h-4" /> {logoUploading ? 'Uploading...' : 'PNG only'}
                        </label>
                        <p className="text-xs text-muted-foreground mt-2">
                          Recommended size: 200x200px. PNG format only.
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
                  <Button 
                    onClick={handleWorkspaceSave} 
                    className="bg-black hover:bg-gray-800"
                    disabled={workspaceLoading || logoUploading}
                  >
                    {workspaceLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
