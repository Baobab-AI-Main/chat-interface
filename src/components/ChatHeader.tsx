import { Button } from "./ui/button";
import { Menu, PanelRight, X } from "lucide-react";

interface ChatHeaderProps {
  searchTitle: string;
  onClose?: () => void;
  onOpenSidebar?: () => void;
  onOpenDetails?: () => void;
  isMobile?: boolean;
  hasDetails?: boolean;
}

export function ChatHeader({
  searchTitle,
  onClose,
  onOpenSidebar,
  onOpenDetails,
  isMobile = false,
  hasDetails = false,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-3">
        {isMobile && onOpenSidebar && (
          <Button variant="ghost" size="icon" onClick={onOpenSidebar} aria-label="Open sidebar">
            <Menu className="w-4 h-4" />
          </Button>
        )}
        <div className="flex flex-col min-w-0">
          <h3 className="font-medium truncate" title={searchTitle}>
            {searchTitle}
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isMobile && hasDetails && onOpenDetails && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenDetails}
            aria-label="View conversation details"
          >
            <PanelRight className="w-4 h-4" />
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
