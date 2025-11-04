import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Message } from "./components/Message";
import { ChatInput } from "./components/ChatInput";
import { ChatHeader } from "./components/ChatHeader";
import { Sidebar } from "./components/Sidebar";
import { RightSidebar, ConversationDetailEntry } from "./components/RightSidebar";
import { LoginPage } from "./components/LoginPage";
import { SettingsDialog } from "./components/SettingsDialog";
import { ScrollArea } from "./components/ui/scroll-area";
import { Sheet, SheetContent } from "./components/ui/sheet";
import { useIsMobile } from "./components/ui/use-mobile";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { supabase } from "./lib/supabase";
import { formatTitle } from "./lib/title";
import { appConfig } from "./config";

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SparklayerOrderSchema {
  order_id: string;
  customer: string;
  date: string;
  link?: string | null;
}

type XeroInvoiceStatus =
  | "draft"
  | "submitted"
  | "authorised"
  | "paid"
  | "voided"
  | "deleted";

interface XeroInvoiceSchema {
  invoice_id: string;
  amount_due: number;
  status: XeroInvoiceStatus;
  link?: string | null;
}

interface N8nResponsePayload {
  chat_response: string;
  order_from_sparklayer?: SparklayerOrderSchema | null;
  invoice_from_xero?: XeroInvoiceSchema | null;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  payload?: N8nResponsePayload;
}

interface AutomationStreamMetadata {
  nodeId?: string;
  nodeName?: string;
  itemIndex?: number;
  runIndex?: number;
  timestamp?: number;
}

type AutomationStreamEventType = "begin" | "item" | "end" | "error";

interface AutomationStreamEvent {
  type: AutomationStreamEventType;
  content?: string;
  metadata?: AutomationStreamMetadata;
}

type ConversationRow = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  payload: unknown;
  created_at: string;
};

type ChatMessageDetailRow = {
  id: string;
  message_id: string | null;
  detail_type: "order" | "invoice";
  order_id: string | null;
  order_customer: string | null;
  order_date: string | null;
  order_link: string | null;
  invoice_id: string | null;
  invoice_amount_due: number | null;
  invoice_status: XeroInvoiceStatus | null;
  invoice_link: string | null;
  created_at: string;
  conversation_id: string | null;
};

function isValidAutomationResponse(data: unknown): data is N8nResponsePayload {
  if (typeof data !== "object" || data === null) return false;
  const payload = data as Record<string, unknown>;
  return typeof payload.chat_response === "string";
}

function mapConversationRow(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: formatTitle(row.title ?? ""),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function mapMessageRow(row: MessageRow): ChatMessage {
  const message: ChatMessage = {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };

  if (row.payload && typeof row.payload === "object") {
    const candidate = row.payload as Record<string, unknown>;
    if (typeof candidate.chat_response === "string") {
      message.payload = candidate as unknown as N8nResponsePayload;
    }
  }

  return message;
}

function mapDetailRow(row: ChatMessageDetailRow): ConversationDetailEntry {
  const entry: ConversationDetailEntry = {
    id: row.id,
    createdAt: row.created_at,
    order: null,
    invoice: null,
  };

  if (row.order_id || row.detail_type === "order") {
    const hasOrderData = row.order_id || row.order_customer || row.order_date || row.order_link;
    if (hasOrderData) {
      entry.order = {
        orderId: row.order_id,
        customer: row.order_customer,
        date: row.order_date,
        link: row.order_link,
      };
    }
  }

  if (row.invoice_id || row.detail_type === "invoice") {
    const hasInvoiceData =
      row.invoice_id ||
      row.invoice_amount_due !== null ||
      row.invoice_status ||
      row.invoice_link;
    if (hasInvoiceData) {
      entry.invoice = {
        invoiceId: row.invoice_id,
        amountDue: row.invoice_amount_due,
        status: row.invoice_status,
        link: row.invoice_link,
      };
    }
  }

  return entry;
}

function sortMessagesByCreatedAt(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function normalizeAutomationPayload(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    return raw.length > 0 ? normalizeAutomationPayload(raw[0]) : raw;
  }

  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (record.output !== undefined) {
      const { output } = record;
      if (Array.isArray(output)) {
        return normalizeAutomationPayload(output);
      }
      if (output && typeof output === "object") {
        return normalizeAutomationPayload(output);
      }
    }
  }

  return raw;
}

function buildAutomationPayload(raw: unknown): N8nResponsePayload | null {
  const normalized = normalizeAutomationPayload(raw);

  if (isValidAutomationResponse(normalized)) {
    return {
      chat_response: normalized.chat_response,
      order_from_sparklayer: normalized.order_from_sparklayer ?? null,
      invoice_from_xero: normalized.invoice_from_xero ?? null,
    };
  }

  if (typeof normalized === "string" && normalized.trim() !== "") {
    return {
      chat_response: normalized,
      order_from_sparklayer: null,
      invoice_from_xero: null,
    };
  }

  return null;
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch (error) {
    console.warn("Failed to parse automation stream content", error);
    return input;
  }
}

function createTemporaryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return `temp-${crypto.randomUUID()}`;
    } catch (error) {
      console.warn("Falling back to timestamp id", error);
    }
  }
  return `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function AppContent() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ChatMessage[]>>({});
  const [detailsByConversation, setDetailsByConversation] = useState<Record<string, ConversationDetailEntry[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((conv) => conv.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const activeMessages = useMemo(() => {
    if (!activeConversationId) return [] as ChatMessage[];
    return messagesByConversation[activeConversationId] ?? [];
  }, [messagesByConversation, activeConversationId]);

  const searchHistory = useMemo(() => {
    return conversations
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((conversation) => ({
        id: conversation.id,
        title: formatTitle(conversation.title || ""),
        date: new Intl.DateTimeFormat("en-GB").format(new Date(conversation.updatedAt)),
        isActive: conversation.id === activeConversationId,
      }));
  }, [conversations, activeConversationId]);

  const persistConversationUpdates = useCallback(
    async (conversationId: string, updates: { title?: string; updatedAt?: string }) => {
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.updatedAt !== undefined) payload.updated_at = updates.updatedAt;
      if (Object.keys(payload).length === 0) return;

      const { error } = await supabase.from("chat_conversations").update(payload).eq("id", conversationId);
      if (error) throw error;
    },
    []
  );

  const fetchConversationDetails = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("chat_message_details")
      .select(
        "id, message_id, detail_type, order_id, order_customer, order_date, order_link, invoice_id, invoice_amount_due, invoice_status, invoice_link, created_at, conversation_id"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data ?? [])
      .map((row) => mapDetailRow(row as ChatMessageDetailRow))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, []);

  const updateDetailsForConversation = useCallback(
    async (conversationId: string) => {
      try {
        const details = await fetchConversationDetails(conversationId);
        setDetailsByConversation((prev) => ({
          ...prev,
          [conversationId]: details,
        }));
      } catch (error) {
        console.error("Failed to refresh conversation details", error);
      }
    },
    [fetchConversationDetails]
  );

  const refreshConversations = useCallback(
    async (options?: { selectId?: string }) => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("chat_conversations")
        .select("id, title, created_at, updated_at")
        .eq("owner_user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Failed to load conversations", error);
        toast.error("We couldn't load your conversations.");
        return;
      }

      const mapped = (data ?? []).map((row) => mapConversationRow(row as ConversationRow));
      setConversations(mapped);

      setActiveConversationId((prev) => {
        if (options?.selectId && mapped.some((conversation) => conversation.id === options.selectId)) {
          return options.selectId;
        }
        if (prev && mapped.some((conversation) => conversation.id === prev)) {
          return prev;
        }
        return mapped[0]?.id ?? null;
      });
    },
    [user?.id]
  );

  useEffect(() => {
    if (!user?.id) {
      setConversations([]);
      setMessagesByConversation({});
      setDetailsByConversation({});
      setActiveConversationId(null);
      return;
    }

    void refreshConversations();
  }, [user?.id, refreshConversations]);

  useEffect(() => {
    if (!activeConversationId || !user?.id) return;

    let isCancelled = false;
    const conversationId = activeConversationId;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, conversation_id, role, content, payload, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load messages", error);
        toast.error("We couldn't load messages for this conversation.");
        return;
      }

      if (isCancelled) return;

      const mapped = (data ?? []).map((row) => mapMessageRow(row as MessageRow));
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: sortMessagesByCreatedAt(mapped),
      }));
    };

    void fetchMessages();

    return () => {
      isCancelled = true;
    };
  }, [activeConversationId, user?.id]);

  useEffect(() => {
    if (!activeConversationId || !user?.id) return;

    let isCancelled = false;
    const conversationId = activeConversationId;

    const loadDetails = async () => {
      try {
        const details = await fetchConversationDetails(conversationId);
        if (isCancelled) return;
        setDetailsByConversation((prev) => ({
          ...prev,
          [conversationId]: details,
        }));
      } catch (error) {
        if (isCancelled) return;
        console.error("Failed to load conversation details", error);
        toast.error("We couldn't load conversation details.");
      }
    };

    void loadDetails();

    return () => {
      isCancelled = true;
    };
  }, [activeConversationId, user?.id, fetchConversationDetails]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [activeMessages]);

  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(false);
      setIsDetailsOpen(false);
    }
  }, [isMobile]);

  const sidebarDetails: ConversationDetailEntry[] = useMemo(() => {
    if (!activeConversationId) return [];
    return detailsByConversation[activeConversationId] ?? [];
  }, [detailsByConversation, activeConversationId]);

  const hasDetails = sidebarDetails.length > 0;

  useEffect(() => {
    if (!hasDetails) {
      setIsDetailsOpen(false);
    }
  }, [hasDetails]);

  const handleNewSearch = useCallback(async () => {
    if (!user?.id) {
      toast.error("You need to sign in to start a conversation.");
      return;
    }

    try {
      const { data: conversationRow, error: conversationError } = await supabase
        .from("chat_conversations")
        .insert({
          owner_user_id: user.id,
          participant_ids: [user.id],
          title: "Untitled conversation",
        })
        .select("id, title, created_at, updated_at")
        .single();

      if (conversationError) throw conversationError;

      const conversation = mapConversationRow(conversationRow as ConversationRow);
      setConversations((prev) => [conversation, ...prev]);
      setActiveConversationId(conversation.id);

      const { data: messageRow, error: messageError } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversation.id,
          role: "assistant",
          content: "How can I help you?",
          payload: null,
        })
        .select("id, conversation_id, role, content, payload, created_at")
        .single();

      if (messageError) throw messageError;

      const introMessage = mapMessageRow(messageRow as MessageRow);
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversation.id]: sortMessagesByCreatedAt([introMessage]),
      }));

      try {
        await persistConversationUpdates(conversation.id, {
          updatedAt: introMessage.createdAt,
        });
      } catch (metadataError) {
        console.error("Failed to persist conversation metadata", metadataError);
      }

      await refreshConversations({ selectId: conversation.id });
      if (isMobile) {
        setIsSidebarOpen(false);
      }
    } catch (error) {
      console.error("Failed to start conversation", error);
      toast.error("We couldn't start a new conversation. Please try again.");
    }
  }, [user?.id, persistConversationUpdates, refreshConversations, isMobile]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
      if (isMobile) {
        setIsSidebarOpen(false);
        setIsDetailsOpen(false);
      }
    },
    [isMobile]
  );

  const handleSendMessage = useCallback(
    async (prompt: string) => {
      if (!user?.id || !activeConversationId) {
        toast.error("Select or create a conversation before sending a message.");
        return;
      }

      const trimmed = prompt.trim();
      if (!trimmed) return;

      const conversationId = activeConversationId;
      const shouldUpdateTitle =
        !activeConversation?.title ||
        activeConversation.title === "Untitled conversation" ||
        activeConversation.title.trim() === "";
      const truncatedTitle = formatTitle(trimmed);
      const nextTitle = shouldUpdateTitle
        ? truncatedTitle
        : formatTitle(activeConversation?.title ?? "");

      setSending(true);

      let userMessage: ChatMessage | null = null;
      let provisionalId: string | null = null;

      try {
        const { data: userRow, error: userError } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: conversationId,
            sender_user_id: user.id,
            role: "user",
            content: trimmed,
            payload: null,
          })
          .select("id, conversation_id, role, content, payload, created_at")
          .single();

        if (userError) throw userError;

        userMessage = mapMessageRow(userRow as MessageRow);

        setMessagesByConversation((prev) => ({
          ...prev,
          [conversationId]: sortMessagesByCreatedAt([...(prev[conversationId] ?? []), userMessage!]),
        }));

        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  title: nextTitle,
                  updatedAt: userMessage!.createdAt,
                }
              : conversation
          )
        );

        try {
          await persistConversationUpdates(conversationId, {
            updatedAt: userMessage.createdAt,
            ...(shouldUpdateTitle ? { title: nextTitle } : {}),
          });
        } catch (metadataError) {
          console.error("Failed to persist conversation metadata after user message", metadataError);
        }
      } catch (error) {
        console.error("Failed to record user message", error);
        toast.error("We couldn't record your message. Please try again.");
        setSending(false);
        return;
      }

      const automationEndpoint = appConfig.automationEndpoint;
      if (!automationEndpoint) {
        toast.error("Automation endpoint is not configured.");
        setSending(false);
        return;
      }

      try {
        const response = await fetch(automationEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: trimmed,
            conversation_id: conversationId,
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Automation returned ${response.status}`);
        }

        if (!response.body) {
          const rawPayload = await response.json();
          const automationPayload = buildAutomationPayload(rawPayload);

          if (!automationPayload) {
            console.error("Unexpected automation payload", rawPayload);
            throw new Error("Automation response missing chat_response");
          }

          const { data: assistantRow, error: assistantError } = await supabase
            .from("chat_messages")
            .insert({
              conversation_id: conversationId,
              sender_user_id: null,
              role: "assistant",
              content: automationPayload.chat_response,
              payload: automationPayload,
            })
            .select("id, conversation_id, role, content, payload, created_at")
            .single();

          if (assistantError) throw assistantError;

          const assistantMessage = mapMessageRow(assistantRow as MessageRow);

          setMessagesByConversation((prev) => ({
            ...prev,
            [conversationId]: sortMessagesByCreatedAt([...(prev[conversationId] ?? []), assistantMessage]),
          }));

          setConversations((prev) =>
            prev.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    title: nextTitle,
                    updatedAt: assistantMessage.createdAt,
                  }
                : conversation
            )
          );

          try {
            await persistConversationUpdates(conversationId, {
              updatedAt: assistantMessage.createdAt,
              ...(shouldUpdateTitle ? { title: nextTitle } : {}),
            });
          } catch (metadataError) {
            console.error("Failed to persist conversation metadata after automation message", metadataError);
          }

          void updateDetailsForConversation(conversationId);
          await refreshConversations({ selectId: conversationId });
          return;
        }

        provisionalId = createTemporaryId();

        const provisionalMessage: ChatMessage = {
          id: provisionalId,
          conversationId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
        };

        setMessagesByConversation((prev) => {
          const existing = prev[conversationId] ?? [];
          return {
            ...prev,
            [conversationId]: sortMessagesByCreatedAt([...existing, provisionalMessage]),
          };
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedContent = "";
        let finalPayload: N8nResponsePayload | null = null;
        let streamError: string | null = null;

        const updateProvisionalContent = (content: string) => {
          setMessagesByConversation((prev) => {
            const existing = prev[conversationId] ?? [];
            return {
              ...prev,
              [conversationId]: existing.map((message) =>
                message.id === provisionalId ? { ...message, content } : message
              ),
            };
          });
        };

        const processLine = (line: string) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;

          let event: AutomationStreamEvent;
          try {
            event = JSON.parse(trimmedLine) as AutomationStreamEvent;
          } catch (parseError) {
            console.error("Failed to parse automation stream chunk", parseError, line);
            return;
          }

          if (event.type === "error") {
            streamError = event.content ?? "The automation reported an error.";
            return;
          }

          if (event.type !== "item" || typeof event.content !== "string") {
            return;
          }

          const nodeName = event.metadata?.nodeName ?? "";

          if (/respond to webhook/i.test(nodeName)) {
            const parsedContent = safeJsonParse(event.content);
            const automationPayload = buildAutomationPayload(parsedContent);

            if (automationPayload) {
              finalPayload = automationPayload;
              streamedContent = automationPayload.chat_response;
              updateProvisionalContent(streamedContent);
            } else {
              console.warn("Unexpected respond-to-webhook payload", parsedContent);
            }

            return;
          }

          streamedContent += event.content;
          updateProvisionalContent(streamedContent);
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const chunk = buffer.slice(0, newlineIndex);
            processLine(chunk);
            buffer = buffer.slice(newlineIndex + 1);
            newlineIndex = buffer.indexOf("\n");
          }
        }

        buffer += decoder.decode();
        if (buffer.trim()) {
          processLine(buffer);
        }

        if (streamError) {
          throw new Error(streamError);
        }

        if (!finalPayload && streamedContent) {
          finalPayload = {
            chat_response: streamedContent,
            order_from_sparklayer: null,
            invoice_from_xero: null,
          };
        }

        if (!finalPayload) {
          throw new Error("Automation stream ended without a message.");
        }

        const { data: assistantRow, error: assistantError } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: conversationId,
            sender_user_id: null,
            role: "assistant",
            content: finalPayload.chat_response,
            payload: finalPayload,
          })
          .select("id, conversation_id, role, content, payload, created_at")
          .single();

        if (assistantError) throw assistantError;

        const assistantMessage = mapMessageRow(assistantRow as MessageRow);

        setMessagesByConversation((prev) => {
          const existing = prev[conversationId] ?? [];
          const filtered = provisionalId
            ? existing.filter((message) => message.id !== provisionalId)
            : existing;
          return {
            ...prev,
            [conversationId]: sortMessagesByCreatedAt([...filtered, assistantMessage]),
          };
        });

        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  title: nextTitle,
                  updatedAt: assistantMessage.createdAt,
                }
              : conversation
          )
        );

        try {
          await persistConversationUpdates(conversationId, {
            updatedAt: assistantMessage.createdAt,
            ...(shouldUpdateTitle ? { title: nextTitle } : {}),
          });
        } catch (metadataError) {
          console.error("Failed to persist conversation metadata after automation message", metadataError);
        }

        void updateDetailsForConversation(conversationId);
        await refreshConversations({ selectId: conversationId });
      } catch (error) {
        if (provisionalId) {
          setMessagesByConversation((prev) => {
            const existing = prev[conversationId] ?? [];
            return {
              ...prev,
              [conversationId]: existing.filter((message) => message.id !== provisionalId),
            };
          });
        }

        console.error("Automation request failed", error);
        const fallbackContent =
          error instanceof Error
            ? `I couldn't reach the automation service: ${error.message}`
            : "I couldn't reach the automation service due to an unknown error.";

        try {
          const { data: assistantRow, error: assistantInsertError } = await supabase
            .from("chat_messages")
            .insert({
              conversation_id: conversationId,
              sender_user_id: null,
              role: "assistant",
              content: fallbackContent,
              payload: null,
            })
            .select("id, conversation_id, role, content, payload, created_at")
            .single();

          if (assistantInsertError) throw assistantInsertError;

          const assistantMessage = mapMessageRow(assistantRow as MessageRow);

          setMessagesByConversation((prev) => ({
            ...prev,
            [conversationId]: sortMessagesByCreatedAt([...(prev[conversationId] ?? []), assistantMessage]),
          }));

          setConversations((prev) =>
            prev.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    title: nextTitle,
                    updatedAt: assistantMessage.createdAt,
                  }
                : conversation
            )
          );

          try {
            await persistConversationUpdates(conversationId, {
              updatedAt: assistantMessage.createdAt,
              ...(shouldUpdateTitle ? { title: nextTitle } : {}),
            });
          } catch (metadataError) {
            console.error("Failed to persist conversation metadata after automation failure", metadataError);
          }

          void updateDetailsForConversation(conversationId);
          await refreshConversations({ selectId: conversationId });
        } catch (loggingError) {
          console.error("Failed to log automation failure", loggingError);
          toast.error("Automation failed and we couldn't log the result.");
        }

        toast.error("Automation request failed. Please try again.");
      } finally {
        setSending(false);
      }
    },
    [
      user?.id,
      activeConversationId,
      activeConversation,
      persistConversationUpdates,
      refreshConversations,
      updateDetailsForConversation,
    ]
  );

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <div className="h-screen flex bg-background overflow-hidden">
        {!isMobile && (
          <Sidebar
            onNewSearch={handleNewSearch}
            searchHistory={searchHistory}
            onSelectSearch={handleSelectConversation}
            onSettingsClick={() => setSettingsOpen(true)}
          />
        )}

        <div className="flex-1 flex flex-col items-center overflow-hidden">
          <div className="w-full max-w-5xl flex flex-col h-full">
            <ChatHeader
              searchTitle={formatTitle(activeConversation?.title ?? "")}
              isMobile={isMobile}
              hasDetails={hasDetails}
              onOpenSidebar={isMobile ? () => setIsSidebarOpen(true) : undefined}
              onOpenDetails={isMobile && hasDetails ? () => setIsDetailsOpen(true) : undefined}
            />
            <ScrollArea ref={scrollAreaRef} className="flex-1 h-0">
              <div className="p-6 space-y-1">
                {activeConversationId ? (
                  activeMessages.length > 0 ? (
                    activeMessages.map((message) => (
                      <Message
                        key={message.id}
                        content={message.content}
                        role={message.role}
                        createdAt={message.createdAt}
                      />
                    ))
                  ) : (
                    <div className="py-12 text-sm text-muted-foreground text-center">
                      No messages yet. Start by asking a question.
                    </div>
                  )
                ) : (
                  <div className="py-12 text-sm text-muted-foreground text-center">
                    Select or create a conversation to get started.
                  </div>
                )}
              </div>
            </ScrollArea>
            <ChatInput onSendMessage={handleSendMessage} disabled={sending || !activeConversationId} />
          </div>
        </div>
        {!isMobile && <RightSidebar details={activeConversationId ? sidebarDetails : []} />}
      </div>

      {isMobile && (
        <>
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetContent side="left" className="p-0">
              <Sidebar
                onNewSearch={handleNewSearch}
                searchHistory={searchHistory}
                onSelectSearch={handleSelectConversation}
                onSettingsClick={() => setSettingsOpen(true)}
                mode="drawer"
                onClose={() => setIsSidebarOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <Sheet open={isDetailsOpen && hasDetails} onOpenChange={setIsDetailsOpen}>
            <SheetContent side="right" className="p-0">
              <RightSidebar details={sidebarDetails} />
            </SheetContent>
          </Sheet>
        </>
      )}

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}