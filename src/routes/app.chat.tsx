import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Plus,
  Sparkles,
  Loader2,
  Copy,
  Check,
  MessageSquare,
  History as HistoryIcon,
  Search,
  Pin,
  PinOff,
  Trash2,
  Edit2,
  ArrowDown,
  Bot,
  Menu,
  PanelLeftClose,
  Brain,
  Zap,
  BookOpen,
  Star,
} from "lucide-react";
import { chatService, uploadsService } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { toast } from "sonner";
import { emitAppRefresh } from "@/lib/events";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { motion, AnimatePresence } from "framer-motion";

// ── Suggested prompts ──────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { icon: Brain, label: "Explain a concept", text: "Explain this concept simply" },
  { icon: Zap, label: "Generate a quiz", text: "Generate a quick quiz" },
  { icon: BookOpen, label: "Summarise notes", text: "Summarise my last note" },
  { icon: Star, label: "Revision plan", text: "What should I revise today?" },
];

const FOLLOW_UP_CHIPS = [
  "Explain in more detail",
  "Give me an example",
  "Create flashcards from this",
  "Quiz me on this topic",
];

// ── Types for Local Persistence ───────────────────────────────────────────
interface LocalMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface LocalConversation {
  id: string;
  title: string;
  messages: LocalMessage[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

// ── Route ──────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

const ACTIVE_SESSION_KEY = "studygpt.chat.activeSessionId";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

// ── Page Component ─────────────────────────────────────────────────────────
function ChatPage() {
  const user = useUser();
  const initials = (user?.name ?? "ME")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Core state with synchronous local storage initialization
  const [localHistory, setLocalHistory] = useState<LocalConversation[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("studyglow.chat.history");
    if (stored) {
      try {
        const parsed: LocalConversation[] = JSON.parse(stored);
        console.log("History loaded:", parsed);
        return parsed;
      } catch (e) {
        console.warn("Failed to load local chat history", e);
      }
    }
    return [];
  });

  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const storedActiveId = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (storedActiveId) {
      const storedHistory = localStorage.getItem("studyglow.chat.history");
      if (storedHistory) {
        try {
          const parsed: LocalConversation[] = JSON.parse(storedHistory);
          if (parsed.some((x) => x.id === storedActiveId)) {
            console.log("Active conversation restored:", storedActiveId);
            return storedActiveId;
          }
        } catch {}
      }
    }
    
    // Fallback: restore latest conversation
    const storedHistory = localStorage.getItem("studyglow.chat.history");
    if (storedHistory) {
      try {
        const parsed: LocalConversation[] = JSON.parse(storedHistory);
        if (parsed.length > 0) {
          const sorted = [...parsed].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          console.log("Active conversation restored:", sorted[0].id);
          return sorted[0].id;
        }
      } catch {}
    }
    return null;
  });

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // UI state
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sendingRef = useRef(false);
  const isFirstRender = useRef(true);

  // ── Persist Active Session ID ────────────────────────────────────────────
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (activeId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeId);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }, [activeId]);

  // ── Helper to Save History ───────────────────────────────────────────────
  const saveToLocalStorage = (historyList: LocalConversation[]) => {
    localStorage.setItem("studyglow.chat.history", JSON.stringify(historyList));
    console.log("History saved:", historyList);
  };

  // ── Auto-scroll to newest message ────────────────────────────────────────
  const activeConv = useMemo(() => {
    return localHistory.find((c) => c.id === activeId) || null;
  }, [localHistory, activeId]);

  const messages = useMemo(() => {
    return activeConv?.messages ?? [];
  }, [activeConv]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  // ── Scroll-to-bottom indicator ───────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      setShowScrollDown(!isNearBottom && messages.length > 3);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [messages.length]);

  // ── Derived data for sidebar ─────────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    if (!sidebarSearch.trim()) return localHistory;
    const q = sidebarSearch.toLowerCase();
    return localHistory.filter((s) => s.title.toLowerCase().includes(q));
  }, [localHistory, sidebarSearch]);

  const unpinnedSessions = useMemo(
    () => filteredSessions.filter((s) => !s.pinned),
    [filteredSessions]
  );

  const filteredPinned = useMemo(
    () => filteredSessions.filter((s) => s.pinned),
    [filteredSessions]
  );

  // ── New chat ─────────────────────────────────────────────────────────────
  const newChat = () => {
    setActiveId(null);
    setShowSidebar(false);
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    let sid = activeId;
    setInput("");
    setSending(true);

    const nowStr = new Date().toISOString();
    const userMsg: LocalMessage = {
      role: "user",
      content: text,
      timestamp: nowStr,
    };

    try {
      if (!sid) {
        // Create session on backend to get a unique database-bound ID
        const s = await chatService.createSession(text.slice(0, 60));
        sid = s.id;
        setActiveId(sid);

        const newConv: LocalConversation = {
          id: sid,
          title: text.slice(0, 60),
          messages: [userMsg],
          createdAt: nowStr,
          updatedAt: nowStr,
          pinned: false,
        };

        const updatedHistory = [newConv, ...localHistory].slice(0, 20);
        setLocalHistory(updatedHistory);
        saveToLocalStorage(updatedHistory);
      } else {
        // Append user message to local active conversation
        const updatedHistory = localHistory.map((c) => {
          if (c.id === sid) {
            return {
              ...c,
              messages: [...c.messages, userMsg],
              updatedAt: nowStr,
            };
          }
          return c;
        });
        setLocalHistory(updatedHistory);
        saveToLocalStorage(updatedHistory);
      }

      // Trigger AI generation
      const { aiMessage } = await chatService.sendMessage(sid, text);

      const aiMsg: LocalMessage = {
        role: "assistant",
        content: aiMessage.content,
        timestamp: aiMessage.created_at || new Date().toISOString(),
      };

      // Append AI response to local history
      setLocalHistory((prev) => {
        const updated = prev.map((c) => {
          if (c.id === sid) {
            return {
              ...c,
              messages: [...c.messages, aiMsg],
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });
        saveToLocalStorage(updated);
        return updated;
      });

      emitAppRefresh({ source: "chat" });
    } catch (e: any) {
      toast.error(e?.message || "Failed to send message");
      setInput(text);
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  }, [input, activeId, localHistory]);

  // ── File upload context ──────────────────────────────────────────────────
  const openFilePicker = () => fileInputRef.current?.click();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadsService.upload(file);
      toast.success(`Uploaded ${file.name}`);
      let sid = activeId;
      const nowStr = new Date().toISOString();

      if (!sid) {
        const s = await chatService.createSession(file.name.slice(0, 60));
        sid = s.id;
        setActiveId(sid);
      }

      const contextMsg = `📎 I've uploaded a document: "${uploaded.filename}". Please use this document as context for our conversation. Ask me what I want to know about it.`;
      const { userMessage, aiMessage } = await chatService.sendMessage(sid, contextMsg);

      const userMsg: LocalMessage = {
        role: "user",
        content: contextMsg,
        timestamp: userMessage.created_at || nowStr,
      };

      const aiMsg: LocalMessage = {
        role: "assistant",
        content: aiMessage.content,
        timestamp: aiMessage.created_at || nowStr,
      };

      setLocalHistory((prev) => {
        const existing = prev.find((c) => c.id === sid);
        let updated;
        if (existing) {
          updated = prev.map((c) => {
            if (c.id === sid) {
              return {
                ...c,
                messages: [...c.messages, userMsg, aiMsg],
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          });
        } else {
          const newConv: LocalConversation = {
            id: sid!,
            title: file.name.slice(0, 60),
            messages: [userMsg, aiMsg],
            createdAt: nowStr,
            updatedAt: nowStr,
            pinned: false,
          };
          updated = [newConv, ...prev].slice(0, 20);
        }
        saveToLocalStorage(updated);
        return updated;
      });

      emitAppRefresh({ source: "uploads" });
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ── Voice input ──────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (typeof window === "undefined") return;
    const SR: any =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input is not supported in this browser");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec: SpeechRecognitionLike = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput((prev) => (prev ? prev + " " : "") + transcript.trim());
    };
    rec.onerror = (err: any) => {
      toast.error(
        err?.error === "not-allowed"
          ? "Microphone permission denied"
          : "Voice input error"
      );
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  // ── Session persistence updates ──────────────────────────────────────────
  const handleRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    try {
      // Keep backend session title updated in background
      chatService.updateSession(id, { title: trimmed }).catch(() => {});

      const updated = localHistory.map((s) => {
        if (s.id === id) {
          return { ...s, title: trimmed, updatedAt: new Date().toISOString() };
        }
        return s;
      });
      setLocalHistory(updated);
      saveToLocalStorage(updated);
      toast.success("Conversation renamed");
    } catch {
      toast.error("Failed to rename");
    }
    setRenamingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      // Keep backend synchronized in background
      chatService.deleteSession(id).catch(() => {});

      const updated = localHistory.filter((s) => s.id !== id);
      setLocalHistory(updated);
      saveToLocalStorage(updated);
      if (activeId === id) {
        setActiveId(updated.length ? updated[0].id : null);
      }
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const handlePin = async (session: LocalConversation) => {
    try {
      // Keep backend synchronized in background
      chatService
        .updateSession(session.id, { isPinned: !session.pinned })
        .catch(() => {});

      const updated = localHistory.map((s) => {
        if (s.id === session.id) {
          return { ...s, pinned: !s.pinned, updatedAt: new Date().toISOString() };
        }
        return s;
      });
      setLocalHistory(updated);
      saveToLocalStorage(updated);
      toast.success(session.pinned ? "Unpinned" : "Pinned");
    } catch {
      toast.error("Failed to update pin state");
    }
  };

  const handleCopyMessage = async (content: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(msgId);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Copy failed");
    }
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  // ── Format time ago ──────────────────────────────────────────────────────
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Now";
      if (mins < 60) return `${mins}m`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h`;
      return d.toLocaleDateString([], { month: "short", day: "2-digit" });
    } catch {
      return "";
    }
  };

  const handleClearHistory = () => {
    if (!confirm("Clear all conversations from local storage? This cannot be undone.")) return;
    setLocalHistory([]);
    localStorage.removeItem("studyglow.chat.history");
    setActiveId(null);
    toast.success("History cleared");
  };

  // ── Sidebar session item ─────────────────────────────────────────────────
  const SessionItem = ({ c }: { c: LocalConversation }) => {
    const isSelected = activeId === c.id;
    const isRenaming = renamingId === c.id;

    return (
      <div
        onClick={() => {
          if (!isRenaming) {
            setActiveId(c.id);
            setShowSidebar(false);
          }
        }}
        className={cn(
          "w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group flex items-start gap-2.5 border cursor-pointer relative",
          isSelected
            ? "bg-primary/8 border-primary/20 shadow-sm"
            : "border-transparent hover:bg-muted/60 hover:border-border/30 text-muted-foreground hover:text-foreground"
        )}
      >
        <MessageSquare
          className={cn(
            "h-4 w-4 mt-0.5 shrink-0 transition-colors",
            isSelected ? "text-primary" : "opacity-50 group-hover:opacity-80"
          )}
        />
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename(c.id);
                if (e.key === "Escape") setRenamingId(null);
              }}
              onBlur={() => handleRename(c.id)}
              className="h-6 text-xs px-1.5 py-0 bg-background border-primary/30"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <div className="truncate text-xs font-medium flex items-center gap-1 pr-6">
                {c.pinned && <Pin className="h-2.5 w-2.5 text-primary shrink-0" />}
                {c.title}
              </div>
              <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                {formatTime(c.updatedAt)}
              </div>
            </>
          )}
        </div>

        {/* Hover actions */}
        {!isRenaming && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 absolute right-1.5 top-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-md hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                setRenamingId(c.id);
                setRenameValue(c.title);
              }}
              title="Rename"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-md hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                handlePin(c);
              }}
              title={c.pinned ? "Unpin" : "Pin"}
            >
              {c.pinned ? (
                <PinOff className="h-3 w-3" />
              ) : (
                <Pin className="h-3 w-3" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-md hover:bg-rose-500/10 hover:text-rose-500"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(c.id);
              }}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-8rem)] -m-4 lg:-m-8 flex overflow-hidden">
      {/* ═══════════ MOBILE SIDEBAR OVERLAY ═══════════ */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══════════ SIDEBAR ═══════════ */}
      <aside
        className={cn(
          "flex flex-col w-80 border-r border-border/40 bg-card/60 backdrop-blur-xl z-50 transition-all duration-300",
          "fixed inset-y-0 left-0 md:relative md:translate-x-0",
          showSidebar ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 space-y-3 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 grid place-items-center text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-sm font-extrabold text-foreground tracking-tight">
                AI Chat
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg md:hidden"
              onClick={() => setShowSidebar(false)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={newChat}
            className="w-full gradient-primary-bg text-white border-0 hover:opacity-90 shadow-lg shadow-primary/10 font-bold text-xs h-10 gap-2 transition-all duration-200"
          >
            <Plus className="h-4 w-4" /> New Conversation
          </Button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 text-xs h-9 bg-background/30 border-border/30"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Session List */}
        <ScrollArea className="flex-1 p-2">
          {localHistory.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="h-10 w-10 rounded-xl bg-muted/40 grid place-items-center mx-auto text-muted-foreground/50 mb-3">
                <MessageSquare className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">
                No conversations yet
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Start a new chat to begin
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Pinned Section */}
              {filteredPinned.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/60 px-3 pt-2 pb-1">
                    <Pin className="h-2.5 w-2.5" /> Pinned
                  </div>
                  {filteredPinned.map((c) => (
                    <SessionItem key={c.id} c={c} />
                  ))}
                  <div className="h-px bg-border/20 mx-3 my-2" />
                </>
              )}

              {/* Recent Section */}
              {unpinnedSessions.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/60 px-3 pt-1 pb-1">
                    <HistoryIcon className="h-2.5 w-2.5" /> Recent
                  </div>
                  {unpinnedSessions.map((c) => (
                    <SessionItem key={c.id} c={c} />
                  ))}
                </>
              )}

              {filteredSessions.length === 0 && sidebarSearch && (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No matching conversations
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {localHistory.length > 0 && (
          <div className="p-3 border-t border-border/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="w-full text-xs text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 h-8 font-semibold"
            >
              Clear Chat History
            </Button>
          </div>
        )}
      </aside>

      {/* ═══════════ MAIN CHAT AREA ═══════════ */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/30 relative">
        {/* Chat Header */}
        <div className="px-4 lg:px-6 py-3 border-b border-border/30 flex items-center gap-3 bg-background/60 backdrop-blur-md z-10">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg md:hidden shrink-0"
            onClick={() => setShowSidebar(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="h-8 w-8 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-foreground truncate">
              {activeConv?.title ?? "New conversation"}
            </h2>
            <p className="text-[10px] text-muted-foreground/70">
              {messages.length > 0
                ? `${messages.length} message${messages.length === 1 ? "" : "s"}`
                : "Start chatting with StudyGlow AI"}
            </p>
          </div>
          {activeConv && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg"
                onClick={() => handlePin(activeConv)}
                title={activeConv.pinned ? "Unpin" : "Pin"}
              >
                {activeConv.pinned ? (
                  <PinOff className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500"
                onClick={() => handleDelete(activeConv.id)}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* ═══════════ MESSAGES AREA ═══════════ */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar-thin relative"
        >
          <div className="p-4 lg:p-8 space-y-6 w-full max-w-4xl mx-auto">
            {messages.length === 0 && !sending ? (
              /* ═══════════ PREMIUM EMPTY STATE ═══════════ */
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {/* Logo */}
                  <div className="relative mx-auto w-fit">
                    <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 grid place-items-center text-primary mx-auto shadow-xl shadow-primary/5">
                      <Sparkles className="h-9 w-9" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-emerald-500 grid place-items-center text-white shadow-lg">
                      <Zap className="h-3 w-3" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-foreground tracking-tight">
                      StudyGlow AI
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      Your intelligent study companion. Ask questions, generate
                      quizzes, summarize documents, or get personalized study
                      guidance.
                    </p>
                  </div>

                  {/* Suggested Prompts Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto w-full pt-4">
                    {SUGGESTED_PROMPTS.map((p) => (
                      <button
                        key={p.text}
                        onClick={() => {
                          setInput(p.text);
                          inputRef.current?.focus();
                        }}
                        className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-card/20 hover:bg-card/50 hover:border-primary/30 hover:shadow-md transition-all duration-200 text-left group"
                      >
                        <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0 group-hover:bg-primary/15 transition-colors">
                          <p.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {p.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {p.text}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              /* ═══════════ MESSAGE LIST ═══════════ */
              <>
                {messages.map((m, idx) => {
                  const isUser = m.role === "user";
                  const msgId = `msg-${idx}-${m.timestamp}`;
                  return (
                    <motion.div
                      key={msgId}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={cn(
                        "flex gap-3",
                        isUser ? "justify-end" : "justify-start"
                      )}
                    >
                      {/* AI Avatar */}
                      {!isUser && (
                        <div className="shrink-0 mt-1">
                          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 grid place-items-center text-primary shadow-sm">
                            <Bot className="h-4 w-4" />
                          </div>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div
                        className={cn(
                          "max-w-[80%] lg:max-w-[70%] group/msg relative",
                          isUser ? "order-1" : "order-2"
                        )}
                      >
                        <Card
                          className={cn(
                            "p-4 shadow-sm max-w-full overflow-hidden transition-shadow hover:shadow-md",
                            isUser
                              ? "gradient-primary-bg text-white border-0 rounded-2xl rounded-tr-md"
                              : "bg-card/60 backdrop-blur-sm rounded-2xl rounded-tl-md border border-border/30"
                          )}
                        >
                          {isUser ? (
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">
                              {m.content}
                            </div>
                          ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent prose-p:leading-relaxed prose-headings:font-bold">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm as any]}
                                components={{
                                  code(props) {
                                    const {
                                      className,
                                      children,
                                      ...rest
                                    } = props as {
                                      className?: string;
                                      children?: React.ReactNode;
                                    };
                                    const match = /language-(\w+)/.exec(
                                      className || ""
                                    );
                                    const text = String(
                                      children ?? ""
                                    ).replace(/\n$/, "");
                                    if (match) {
                                      return (
                                        <div className="relative group/code-block my-3">
                                          <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e2e] rounded-t-lg border-b border-white/5">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                              {match[1]}
                                            </span>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 px-2 text-[10px] text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                              onClick={async () => {
                                                await navigator.clipboard.writeText(
                                                  text
                                                );
                                                setCopiedId(
                                                  msgId + text.slice(0, 10)
                                                );
                                                toast.success("Code copied");
                                                setTimeout(
                                                  () => setCopiedId(null),
                                                  2000
                                                );
                                              }}
                                            >
                                              {copiedId ===
                                              msgId + text.slice(0, 10) ? (
                                                <>
                                                  <Check className="h-3 w-3 mr-1 text-emerald-400" />{" "}
                                                  Copied
                                                </>
                                              ) : (
                                                <>
                                                  <Copy className="h-3 w-3 mr-1" />{" "}
                                                  Copy
                                                </>
                                              )}
                                            </Button>
                                          </div>
                                          <SyntaxHighlighter
                                            style={oneDark as never}
                                            language={match[1]}
                                            PreTag="div"
                                            customStyle={{
                                              borderRadius: "0 0 0.5rem 0.5rem",
                                              fontSize: "0.8rem",
                                              margin: 0,
                                            }}
                                          >
                                            {text}
                                          </SyntaxHighlighter>
                                        </div>
                                      );
                                    }
                                    return (
                                      <code
                                        className={cn(
                                          "bg-muted/60 px-1.5 py-0.5 rounded-md text-xs font-mono",
                                          className
                                        )}
                                        {...rest}
                                      >
                                        {children}
                                      </code>
                                    );
                                  },
                                  p: ({ children }) => (
                                    <p className="text-sm leading-relaxed mb-3 last:mb-0">
                                      {children}
                                    </p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-disc pl-4 space-y-1 text-sm mb-3">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal pl-4 space-y-1 text-sm mb-3">
                                      {children}
                                    </ol>
                                  ),
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-3 border-primary/40 pl-3 italic text-muted-foreground my-3 bg-primary/5 py-2 pr-2 rounded-r-lg text-sm">
                                      {children}
                                    </blockquote>
                                  ),
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto my-3 rounded-lg border border-border/30">
                                      <table className="w-full text-left text-xs">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  th: ({ children }) => (
                                    <th className="bg-muted/40 p-2 font-bold border-b border-border/30 text-foreground text-xs">
                                      {children}
                                    </th>
                                  ),
                                  td: ({ children }) => (
                                    <td className="p-2 border-b border-border/15 text-xs">
                                      {children}
                                    </td>
                                  ),
                                  img: ({ src, alt }) => (
                                    <div className="my-3 rounded-xl overflow-hidden border border-border/30 shadow-sm">
                                      <img
                                        src={src}
                                        alt={alt || ""}
                                        className="w-full max-h-80 object-contain bg-muted/20"
                                        loading="lazy"
                                      />
                                      {alt && (
                                        <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-muted/20 border-t border-border/20">
                                          {alt}
                                        </div>
                                      )}
                                    </div>
                                  ),
                                }}
                              >
                                {m.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </Card>

                        {/* Message actions (AI messages only) */}
                        {!isUser && (
                          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                handleCopyMessage(m.content, msgId)
                              }
                            >
                              {copiedId === msgId ? (
                                <Check className="h-3 w-3 mr-1 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3 mr-1" />
                              )}
                              {copiedId === msgId ? "Copied" : "Copy"}
                            </Button>
                            <span className="text-[9px] text-muted-foreground/50">
                              {formatTime(m.timestamp)}
                            </span>
                          </div>
                        )}

                        {/* User message timestamp */}
                        {isUser && (
                          <div className="text-right mt-1">
                            <span className="text-[9px] text-muted-foreground/50">
                              {formatTime(m.timestamp)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* User Avatar */}
                      {isUser && (
                        <div className="shrink-0 mt-1 order-2">
                          <Avatar className="h-8 w-8 shadow-sm border border-primary/20">
                            <AvatarFallback className="gradient-primary-bg text-white text-[10px] font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* ═══════════ TYPING INDICATOR ═══════════ */}
                {sending && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 grid place-items-center text-primary shadow-sm">
                        <Bot className="h-4 w-4 animate-pulse" />
                      </div>
                    </div>
                    <Card className="p-4 bg-card/60 backdrop-blur-sm rounded-2xl rounded-tl-md border border-border/30 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <span
                            className="h-2 w-2 rounded-full bg-primary animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-2 w-2 rounded-full bg-primary/70 animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-2 w-2 rounded-full bg-primary/40 animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          StudyGlow AI is thinking...
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* ═══════════ FOLLOW-UP CHIPS ═══════════ */}
                {messages.length > 0 &&
                  !sending &&
                  messages[messages.length - 1]?.role === "assistant" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-wrap gap-2 pl-11"
                    >
                      {FOLLOW_UP_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => {
                            setInput(chip);
                            inputRef.current?.focus();
                          }}
                          className="text-[11px] px-3.5 py-1.5 rounded-full border border-border/40 bg-card/30 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-200 font-medium text-muted-foreground"
                        >
                          {chip}
                        </button>
                      ))}
                    </motion.div>
                  )}
              </>
            )}
          </div>
        </div>

        {/* ═══════════ SCROLL TO BOTTOM FAB ═══════════ */}
        <AnimatePresence>
          {showScrollDown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10"
            >
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-full shadow-lg bg-background/90 backdrop-blur-sm border-border/40"
                onClick={scrollToBottom}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════ STICKY INPUT BAR ═══════════ */}
        <div className="border-t border-border/30 p-4 lg:p-6 max-w-4xl mx-auto w-full bg-background/60 backdrop-blur-md">
          {/* Suggested prompts (only on empty chat) */}
          {messages.length === 0 && !sending && (
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTED_PROMPTS.map((q) => (
                <button
                  key={q.text}
                  onClick={() => {
                    setInput(q.text);
                    inputRef.current?.focus();
                  }}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-border/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-200 font-medium text-muted-foreground"
                >
                  {q.text}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end glass rounded-2xl p-2 border border-border/30 shadow-sm">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={openFilePicker}
              disabled={uploading || sending}
              title="Upload PDF, DOCX, TXT or image"
              className="h-9 w-9 rounded-lg shrink-0"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask anything about your notes…"
              className="border-0 bg-transparent focus-visible:ring-0 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMic}
              disabled={sending}
              title={listening ? "Stop listening" : "Voice input"}
              className={cn(
                "h-9 w-9 rounded-lg shrink-0 transition-colors",
                listening && "text-rose-500 bg-rose-500/10"
              )}
            >
              {listening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              onClick={send}
              disabled={sending || !input.trim()}
              className="gradient-primary-bg text-white border-0 h-9 w-9 rounded-lg shrink-0 shadow-md shadow-primary/15 hover:shadow-primary/25 transition-all"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-center text-[9px] text-muted-foreground/50 mt-2">
            StudyGlow AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}