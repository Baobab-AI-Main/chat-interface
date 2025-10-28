import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { InvestorCard } from "./InvestorCard";
import { Badge } from "./ui/badge";

interface MessageProps {
  content: string;
  isUser: boolean;
  timestamp: string;
  senderName: string;
  senderAvatar?: string;
  searchQuery?: string;
  candidates?: any[];
  onInvestorClick?: (investorId: string) => void;
}

export function Message({ 
  content, 
  isUser, 
  timestamp, 
  senderName, 
  senderAvatar, 
  searchQuery,
  candidates,
  onInvestorClick 
}: MessageProps) {
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6`}>
      <Avatar className="w-8 h-8">
        <AvatarImage src={senderAvatar} alt={senderName} />
        <AvatarFallback className={isUser ? "bg-blue-100 text-blue-700" : "bg-black text-white"}>
          {isUser ? "U" : "AI"}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {/* Search Query Badge for User Messages */}
        {isUser && searchQuery && (
          <Badge variant="outline" className="mb-2 bg-blue-50 text-blue-700 border-blue-200">
            {searchQuery}
          </Badge>
        )}
        
        <div className={`rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-muted text-foreground'
        }`}>
          <p className="break-words">{content}</p>
        </div>
        
        {/* Candidate Results for AI Messages */}
        {!isUser && candidates && candidates.length > 0 && (
          <div className="mt-3 space-y-3 w-full max-w-md">
            {candidates.map((candidate) => (
              <InvestorCard
                key={candidate.id}
                investor={candidate}
                onClick={onInvestorClick || (() => {})}
              />
            ))}
          </div>
        )}
        
        <span className="mt-2 px-2 text-xs text-muted-foreground">
          {timestamp}
        </span>
      </div>
    </div>
  );
}