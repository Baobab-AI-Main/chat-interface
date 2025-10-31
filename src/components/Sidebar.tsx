import { Button } from "./ui/button";
import { Plus, Search, Clock, Settings, LogOut, X } from "lucide-react";
import type { CSSProperties } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "../contexts/AuthContext";
import { formatTitle } from "../lib/title";

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
  mode?: "inline" | "drawer";
  onClose?: () => void;
}

export function Sidebar({
  onNewSearch,
  searchHistory,
  onSelectSearch,
  onSettingsClick,
  mode = "inline",
  onClose,
}: SidebarProps) {
  const { user, workspace, logout } = useAuth();
  const isDrawer = mode === "drawer";
  const containerClasses = isDrawer
    ? "w-full bg-card flex flex-col h-full"
    : "min-w-0 bg-card border-r flex flex-col h-full";
  const inlineWidthStyles: CSSProperties | undefined = isDrawer
    ? undefined
    : {
        flexBasis: "25%",
        maxWidth: "25%",
        width: "25%",
      };

  return (
    <div className={containerClasses} style={inlineWidthStyles}>
      {/* Logo and Header */}
      <div className={`p-4 border-b ${isDrawer ? "pt-3" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isDrawer && onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="-ml-1"
                title="Close sidebar"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <img src={workspace.logo} alt={workspace.name} className="h-8 max-w-full object-contain" />
          </div>
          <Button
            onClick={onNewSearch}
            className="rounded-[8px] bg-black text-white hover:bg-gray-800"
            size="icon"
          >
            <Plus className="w-4 h-4" />
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
              <button
                type="button"
                key={item.id}
                onClick={() => onSelectSearch(item.id)}
                className={`w-full p-3 rounded-lg cursor-pointer transition-colors text-left ${
                  item.isActive
                    ? "bg-muted border border-border"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <Search className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm max-w-full truncate" title={item.title}>
                      {formatTitle(item.title)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{item.date}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* User Profile and Settings */}
      <div className="p-4 border-t space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
          <Avatar className="h-8 w-8">
            {user?.avatar ? (
              <AvatarImage
                key={user.avatar}
                src={user.avatar}
                alt={user.name ? `${user.name}'s avatar` : "User avatar"}
              />
            ) : null}
            <AvatarFallback className="bg-slate-200 text-xs">
              {user?.name?.split(" ").map((n) => n[0]).join("")?.toUpperCase() || "U"}
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