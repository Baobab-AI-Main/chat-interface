import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface MessageProps {
  content: string;
  role: "user" | "assistant" | "system";
  createdAt: string;
  senderAvatar?: string;
}

export function Message({ content, role, createdAt, senderAvatar }: MessageProps) {
  const isUser = role === "user";

  const formattedTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-6`}>
      <Avatar className="w-8 h-8">
        <AvatarImage src={senderAvatar} alt={isUser ? "You" : "BrunelAI"} />
        <AvatarFallback className={isUser ? "bg-blue-100 text-blue-700" : "bg-black text-white"}>
          {isUser ? "U" : "AI"}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[70%]`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser ? "bg-blue-600 text-white" : "bg-muted text-foreground"
          }`}
        >
          <ReactMarkdown
            className={`space-y-2 break-words whitespace-pre-wrap [&_*]:leading-relaxed ${
              isUser ? "[&_a]:text-white" : ""
            }`}
            linkTarget="_blank"
            remarkPlugins={[remarkBreaks]}
          >
            {content}
          </ReactMarkdown>
        </div>

        <span className="mt-2 px-2 text-xs text-muted-foreground">{formattedTime}</span>
      </div>
    </div>
  );
}