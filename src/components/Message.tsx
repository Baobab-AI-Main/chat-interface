import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Spinner } from "./ui/spinner";
import { appConfig } from "../config";
import { Markdown } from "./Markdown";
import "./Message.css";

interface MessageAttachment {
  fileName: string;
  mimeType: string;
  previewUrl?: string | null;
}

interface MessageProps {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  createdAt: string;
  senderAvatar?: string;
  attachment?: MessageAttachment | null;
}

export function Message({
  id,
  content,
  role,
  createdAt,
  senderAvatar,
  attachment,
}: MessageProps) {
  const isUser = role === "user";
  const idForChecks = typeof id === "string" ? id : String(id ?? "");
  const isProvisionalAssistant = role === "assistant" && idForChecks.startsWith("temp-");
  const hasContent = content.trim() !== "";
  const shouldShowSpinner = role === "assistant" && (isProvisionalAssistant || !hasContent);
  const [showThinking, setShowThinking] = useState(false);

  useEffect(() => {
    let timer: number | undefined;

    if (shouldShowSpinner) {
      timer = window.setTimeout(() => setShowThinking(true), 5000);
    }

    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
      setShowThinking(false);
    };
  }, [shouldShowSpinner]);

  const formattedTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-6`}>
      <Avatar className="w-8 h-8">
        <AvatarImage src={senderAvatar} alt={isUser ? "You" : appConfig.brandFallbackName} />
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
          {shouldShowSpinner ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Spinner size="sm" className="message-spinner text-muted-foreground" />
                {showThinking && (
                  <span className="text-xs text-muted-foreground message-thinking">Thinking</span>
                )}
              </div>
              {hasContent ? (
                <Markdown content={content} invert={isUser} />
              ) : (
                <span className="text-sm text-muted-foreground">Waiting for a response...</span>
              )}
            </div>
          ) : (
            <Markdown content={content} invert={isUser} />
          )}

          {attachment ? (
            <div className={`mt-3 rounded-lg bg-background/60 p-2 ${isUser ? "text-white" : "text-foreground"}`}>
              {attachment.previewUrl ? (
                <img
                  src={attachment.previewUrl}
                  alt={attachment.fileName}
                  className="max-h-48 w-full rounded-md object-contain"
                />
              ) : (
                <p className="text-xs">
                  Image attachment: <span className="font-medium">{attachment.fileName}</span>
                </p>
              )}
            </div>
          ) : null}
        </div>

        <span className="mt-2 px-2 text-xs text-muted-foreground">{formattedTime}</span>
      </div>
    </div>
  );
}