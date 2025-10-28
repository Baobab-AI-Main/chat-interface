import { Button } from "./ui/button";
import { Plus, Search, Clock, Settings, LogOut } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useAuth } from "../contexts/AuthContext";

interface SearchHistoryItem {
  id: string;
  title: string;
  date: string;
  isActive?: boolean;
}

interface SidebarProps {
  onNewSearch: () => void;
  searchHistory: SearchHistoryItem[];
  onSelectSearch: (searchId: string) => void;
  onSettingsClick: () => void;
  onTeamManagementClick?: () => void;
}

export function Sidebar({ onNewSearch, searchHistory, onSelectSearch, onSettingsClick, onTeamManagementClick }: SidebarProps) {
  const { workspace, logout } = useAuth();

  return (
    <div className="w-64 bg-card border-r flex flex-col h-full">
      {/* Logo and Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <img src={workspace.logo} alt={workspace.name} className="h-8" />
        </div>
        <div className="text-sm text-muted-foreground mb-2">
          {workspace.name}
        </div>
        <div className="space-y-2">
          <Button 
            onClick={onNewSearch}
            className="w-full bg-black text-white hover:bg-gray-800 rounded-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Search
          </Button>
        </div>
      </div>

      {/* Search History */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Searches
        </div>
        <ScrollArea className="h-full">
          <div className="space-y-2">
            {searchHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectSearch(item.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  item.isActive 
                    ? 'bg-muted border border-border' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Search className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* User Profile and Settings */}
      <div className="p-4 border-t space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-slate-200 text-xs">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{user?.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 justify-start"
            onClick={onSettingsClick}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={logout}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}