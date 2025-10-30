import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Send } from "lucide-react";
import { appConfig } from "../config";

interface ChatInputProps {
  onSendMessage: (message: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = appConfig.chatInputPlaceholder,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const submitMessage = () => {
    if (message.trim() && !disabled) {
      const payload = message.trim();
      setMessage("");
      Promise.resolve(onSendMessage(payload)).catch((err) => {
        console.error("Failed to send message", err);
      });
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMessage();
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t bg-background">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
      <Button 
        type="submit" 
        disabled={!message.trim() || disabled}
        size="icon"
        className="shrink-0 bg-black text-white hover:bg-gray-800"
      >
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}