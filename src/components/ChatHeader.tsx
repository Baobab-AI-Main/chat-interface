import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { X } from "lucide-react";

interface ChatHeaderProps {
  searchTitle: string;
  isConnected?: boolean;
  connectionSource?: string;
  onClose?: () => void;
}

export function ChatHeader({ 
  searchTitle, 
  isConnected = false, 
  connectionSource = "LinkedIn",
  onClose
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <h3 className="font-medium">{searchTitle}</h3>
          {isConnected && (
            <Badge variant="secondary" className="w-fit text-xs bg-green-100 text-green-700 border-green-200">
              Connected to {connectionSource}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}