import {
  useState,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Image as ImageIcon, Send, X } from "lucide-react";
import { appConfig } from "../config";

interface ChatInputPayload {
  message: string;
  file?: File;
}

interface ChatInputProps {
  onSendMessage: (payload: ChatInputPayload) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = appConfig.chatInputPlaceholder,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateFile = (file: File) => {
    const ACCEPTED_TYPES = ["image/png", "image/jpeg"];
    const MAX_BYTES = 10 * 1024 * 1024;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only PNG and JPEG images are supported.");
      return false;
    }

    if (file.size > MAX_BYTES) {
      toast.error("Image must be 10MB or smaller.");
      return false;
    }

    return true;
  };

  const processFile = (file: File) => {
    if (!validateFile(file)) return;

    setAttachment(file);
  };

  const submitMessage = () => {
    const trimmed = message.trim();
    if (!trimmed) {
      if (!disabled) {
        toast.error("Please enter a message before sending.");
      }
      return;
    }

    if (!disabled) {
      const payload: ChatInputPayload = {
        message: trimmed,
        file: attachment ?? undefined,
      };

      setMessage("");
      resetAttachment();

      Promise.resolve(onSendMessage(payload)).catch((err) => {
        console.error("Failed to send message", err);
        toast.error("We could not send your message. Please try again.");
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

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = event.clipboardData?.files;
    if (!files || files.length === 0) return;

    const imageFile = Array.from(files).find((file) => file.type.startsWith("image/"));
    if (imageFile) {
      event.preventDefault();
      processFile(imageFile);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 border-t bg-background">
      {attachment ? (
        <div className="flex items-center gap-3 rounded-md border px-3 py-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-md bg-muted">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{attachment.name}</p>
            <p className="text-xs text-muted-foreground">
              {(attachment.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={resetAttachment}
            disabled={disabled}
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <div className="flex gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="shrink-0"
            aria-label="Attach image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
          />
        </div>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          onPaste={handlePaste}
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
      </div>
    </form>
  );
}