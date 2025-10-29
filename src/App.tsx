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
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { supabase } from "./lib/supabase";

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

const AUTOMATION_ENDPOINT =
  "https://primary-production-b90af.up.railway.app/webhook/8406a7a5-61e5-43fc-a384-e61662223e53-niyaai" as const;

function isValidAutomationResponse(data: unknown): data is N8nResponsePayload {
  if (typeof data !== "object" || data === null) return false;
  const payload = data as Record<string, unknown>;
  return typeof payload.chat_response === "string";
}

function mapConversationRow(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title && row.title.trim() !== "" ? row.title : "Untitled conversation",
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
      message.payload = candidate as N8nResponsePayload;
    }
  }

  return message;
}

function sortMessagesByCreatedAt(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function AppContent() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ChatMessage[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((conv) => conv.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const activeMessages = useMemo(() => {
    if (!activeConversationId) return [] as ChatMessage[];
    return messagesByConversation[activeConversationId] ?? [];
  }, [messagesByConversation, activeConversationId]);

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
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [activeMessages]);

  const sidebarDetails: ConversationDetailEntry[] = useMemo(() => {
    return activeMessages
      .filter((message) => {
        const payload = message.payload;
        return (
          !!payload?.order_from_sparklayer || !!payload?.invoice_from_xero
        );
      })
      .map((message) => ({
        messageId: message.id,
        createdAt: message.createdAt,
        order: message.payload?.order_from_sparklayer
          ? {
              orderId: message.payload.order_from_sparklayer.order_id,
              customer: message.payload.order_from_sparklayer.customer,
              date: message.payload.order_from_sparklayer.date,
              link: message.payload.order_from_sparklayer.link ?? null,
            }
          : null,
        invoice: message.payload?.invoice_from_xero
          ? {
              invoiceId: message.payload.invoice_from_xero.invoice_id,
              amountDue: message.payload.invoice_from_xero.amount_due,
              status: message.payload.invoice_from_xero.status,
              link: message.payload.invoice_from_xero.link ?? null,
            }
          : null,
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [activeMessages]);

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
    } catch (error) {
      console.error("Failed to start conversation", error);
      toast.error("We couldn't start a new conversation. Please try again.");
    }
  }, [user?.id, persistConversationUpdates, refreshConversations]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

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
      const truncatedTitle = trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
      const nextTitle = shouldUpdateTitle ? truncatedTitle : activeConversation?.title ?? "Untitled conversation";

      setSending(true);

      let userMessage: ChatMessage | null = null;

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

      try {
        const response = await fetch(AUTOMATION_ENDPOINT, {
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

        const data = await response.json();
        if (!isValidAutomationResponse(data)) {
          throw new Error("Automation response missing chat_response");
        }

        const automationPayload: N8nResponsePayload = {
          chat_response: data.chat_response,
          order_from_sparklayer: data.order_from_sparklayer ?? null,
          invoice_from_xero: data.invoice_from_xero ?? null,
        };

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

        await refreshConversations({ selectId: conversationId });
      } catch (error) {
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
    ]
  );

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <div className="h-screen flex bg-background">
        <Sidebar
          onNewSearch={handleNewSearch}
          searchHistory={searchHistory}
          onSelectSearch={handleSelectConversation}
          onSettingsClick={() => setSettingsOpen(true)}
        />

        <div className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-5xl flex flex-col h-full">
            <ChatHeader
              searchTitle={activeConversation?.title || "Untitled conversation"}
              isConnected={true}
              connectionSource="n8n"
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

        <RightSidebar details={activeConversationId ? sidebarDetails : []} />
      </div>

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