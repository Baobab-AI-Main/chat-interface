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

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock team members
const MOCK_TEAM = [
  { id: '1', name: 'John Doe', email: 'admin@brunel.com', role: 'admin', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'user@brunel.com', role: 'user', status: 'active' },
  { id: '3', name: 'Mike Johnson', email: 'mike@brunel.com', role: 'user', status: 'active' },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user, workspace, updateProfile, updateWorkspace, isAdmin } = useAuth();
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [workspaceName, setWorkspaceName] = useState(workspace.name);

  const handleProfileSave = () => {
    updateProfile({ name: profileName, email: profileEmail });
    toast('Profile updated successfully');
  };

  const handleWorkspaceSave = () => {
    updateWorkspace({ name: workspaceName });
    toast('Workspace settings updated successfully');
  };

  const handleLogoUpload = () => {
    toast('Logo upload feature coming soon');
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
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG or GIF. Max size 2MB.
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
                  <h3 className="font-medium">Team Members</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your team members and their roles
                  </p>
                </div>
                <Button className="bg-black hover:bg-gray-800">
                  Invite Member
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_TEAM.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className="capitalize bg-green-100 text-green-700"
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            disabled={member.id === user?.id}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
                        <input type="file" accept="image/png" onChange={(e)=>handleLogoUpload(e.target.files?.[0]||undefined)} />
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
