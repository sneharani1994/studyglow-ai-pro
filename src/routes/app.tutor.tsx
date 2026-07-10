import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  GraduationCap,
  Loader2,
  Send,
  Sparkles,
  Clock,
  RotateCcw,
  Copy,
  Check,
  Download,
  Trash2,
  History,
  Search,
  BookOpen,
  ArrowRight,
  FileText,
  Lightbulb,
  ListOrdered,
  Plus,
} from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import jsPDF from "jspdf";

export const Route = createFileRoute("/app/tutor")({ component: TutorPage });

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

const levels = ["Beginner", "Student", "Advanced", "Interview"] as const;
type Level = typeof levels[number];

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  mode?: "hint" | "step" | "normal";
};

type TutorSession = {
  id: string;
  title: string;
  level: Level;
  messages: Message[];
  timestamp: string;
};

/* ═══════════════════════════════════════════════
   Constants (Prompts and mappings preserved)
   ═══════════════════════════════════════════════ */

const levelMap: Record<Level, "beginner" | "intermediate" | "advanced"> = {
  Beginner: "beginner",
  Student: "intermediate",
  Advanced: "advanced",
  Interview: "advanced",
};

const levelPrefix: Record<Level, string> = {
  Beginner:
    "Explain like I am a complete beginner. Use very simple words, everyday analogies, and short sentences. Avoid jargon.",
  Student:
    "Explain to a college student. Give a clear definition, a worked example, and a summary. Use markdown headings and bullet points.",
  Advanced:
    "Give an in-depth, technical explanation. Include underlying theory, edge cases, mathematical/formal reasoning, and references to related concepts. Use markdown.",
  Interview:
    "Answer as if this is a technical interview question. Give a crisp definition, key points the interviewer looks for, a follow-up question you might be asked next, and a model answer. Use markdown.",
};

const LEVEL_COLORS: Record<Level, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  Student: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Advanced: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Interview: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

const SUGGESTED_STARTERS = [
  "Explain quantum computing in simple terms",
  "How do SQL joins work under the hood?",
  "Tell me the difference between REST and GraphQL",
  "Explain the central limit theorem with an analogy",
];

const SUGGESTED_FOLLOWUPS = [
  "Can you explain that concept simply with a real-world analogy?",
  "Break that down into step-by-step key takeaways.",
  "What are some common mistakes students make with this?",
  "Could you quiz me on what we just discussed?",
];

const STORAGE_KEY = "studyglow.tutorSessions";
const MAX_SESSIONS = 20;

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */

function loadSessions(): TutorSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    /* corrupt data */
  }
  return [];
}

function persistSessions(sessions: TutorSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    /* quota exceeded */
  }
}

function triggerDownload(data: string, filename: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════ */

function TutorPage() {
  /* ── Preserved state parameters ── */
  const [level, setLevel] = useState<Level>("Student");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);

  /* ── Extended state ── */
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hintMode, setHintMode] = useState(false);
  const [stepMode, setStepMode] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  /* ── Refs ── */
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const generatingRef = useRef(false);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Load sessions on mount ── */
  useEffect(() => {
    const stored = loadSessions();
    setSessions(stored);
    if (stored.length > 0) {
      setActiveSessionId(stored[0].id);
      setLevel(stored[0].level);
    }
  }, []);

  /* ── Auto-scroll to end of chat thread ── */
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, busy]);

  /* ── Filter sessions for history panel ── */
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [sessions, searchQuery]);

  /* ═══════════════════════════════════════════════
     Handlers
     ═══════════════════════════════════════════════ */

  /* ── Dispatch prompt explanation with multi-turn history ── */
  const ask = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText.trim() : question.trim();
    if (!textToSend || busy || generatingRef.current) return;

    if (customText === undefined) {
      setQuestion("");
    }
    setBusy(true);
    generatingRef.current = true;

    // Clear any existing stream timer in progress
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }

    let currentSessionId = activeSessionId;
    let currentSession = sessions.find((s) => s.id === currentSessionId) ?? null;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: textToSend,
      mode: hintMode ? "hint" : stepMode ? "step" : "normal",
    };

    let nextMessages = currentSession
      ? [...currentSession.messages, userMsg]
      : [userMsg];

    if (!currentSession) {
      // Create new session
      const newSession: TutorSession = {
        id: `sess-${Date.now()}`,
        title: textToSend.slice(0, 50) || "Tutor session",
        level,
        messages: nextMessages,
        timestamp: new Date().toISOString(),
      };
      currentSessionId = newSession.id;
      currentSession = newSession;
      setSessions((prev) => {
        const next = [newSession, ...prev].slice(0, MAX_SESSIONS);
        persistSessions(next);
        return next;
      });
      setActiveSessionId(newSession.id);
    } else {
      // Update existing session, promote to top of list
      setSessions((prev) => {
        const rest = prev.filter((s) => s.id !== currentSessionId);
        const updated: TutorSession = {
          ...currentSession!,
          messages: nextMessages,
          level,
          timestamp: new Date().toISOString(),
        };
        const next = [updated, ...rest];
        persistSessions(next);
        return next;
      });
    }

    try {
      // Compile contextual conversational prompt to existing service call
      let prompt = `${levelPrefix[level]}\n\n`;
      if (userMsg.mode === "hint") {
        prompt +=
          "Provide ONLY a helpful hint or clue to guide the student, do not solve the problem completely.\n\n";
      } else if (userMsg.mode === "step") {
        prompt +=
          "Provide a step-by-step explanation breaking down the logic clearly.\n\n";
      }

      // Prepend previous turn history for contextual continuity
      prompt += "Tutor session history:\n";
      const historyTurns = nextMessages.slice(0, -1);
      historyTurns.forEach((m) => {
        const roleName = m.role === "user" ? "Student" : "Tutor";
        prompt += `${roleName}: ${m.content}\n`;
      });
      prompt += `Student: ${textToSend}\n\nTutor:`;

      // Call API
      const res = await aiService.explain(prompt, levelMap[level]);
      const tutorText = res.explanation || "";

      const aiMsgId = `msg-${Date.now()}-ai`;
      const aiMsg: Message = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      // Add empty assistant response to state
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: [...s.messages, aiMsg],
            };
          }
          return s;
        }),
      );

      // Simulate streaming UI (word-by-word)
      const words = tutorText.split(" ");
      let currentString = "";
      let wordIdx = 0;

      streamIntervalRef.current = setInterval(() => {
        if (wordIdx < words.length) {
          currentString += (wordIdx === 0 ? "" : " ") + words[wordIdx];
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === currentSessionId) {
                return {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId ? { ...m, content: currentString } : m
                  ),
                };
              }
              return s;
            }),
          );
          wordIdx++;
        } else {
          if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
          setSessions((prev) => {
            const next = prev.map((s) => {
              if (s.id === currentSessionId) {
                return {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId ? { ...m, isStreaming: false } : m
                  ),
                };
              }
              return s;
            });
            persistSessions(next);
            return next;
          });
          setBusy(false);
          generatingRef.current = false;
        }
      }, 25);
    } catch {
      toast.error("AI service is temporarily busy. Please try again.");
      setBusy(false);
      generatingRef.current = false;
    }
  };

  /* ── Copy message text ── */
  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 1500);
      toast.success("Message copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  /* ── Export single message PDF ── */
  const handleExportPDF = (text: string) => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("AI Tutor Explanation", margin, y);
      y += 30;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const plain = text
        .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?|```/g, ""))
        .replace(/[*_`>#]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
      const lines = doc.splitTextToSize(plain, width);
      for (const line of lines) {
        if (y > pageHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 15;
      }
      doc.save(`tutor-explanation.pdf`);
      toast.success("PDF exported successfully");
    } catch {
      toast.error("PDF export failed");
    }
  };

  /* ── Export single message Markdown ── */
  const handleExportMD = (text: string) => {
    triggerDownload(text, "tutor-explanation.md", "text/markdown");
    toast.success("Markdown downloaded");
  };

  /* ── Create New Session ── */
  const handleNewSession = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }
    setActiveSessionId(null);
    setQuestion("");
    toast.success("Ready for a new topic!");
  };

  /* ── Delete current session/revision (clears view, preserves history) ── */
  const handleDeleteDisplay = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }
    setActiveSessionId(null);
    setQuestion("");
    toast.success("Conversation cleared from view");
  };

  /* ── Delete a session from history ── */
  const handleDeleteSession = (id: string) => {
    if (streamIntervalRef.current && activeSessionId === id) {
      clearInterval(streamIntervalRef.current);
    }
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistSessions(next);
      return next;
    });
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
    toast.success("Session deleted");
  };

  /* ── Restore a history session ── */
  const handleRestoreSession = (session: TutorSession) => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }
    setActiveSessionId(session.id);
    setLevel(session.level);
    setHistoryOpen(false);
    toast.success(`Resumed: ${session.title}`);
  };

  /* ── Clear all history ── */
  const handleClearHistory = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }
    setSessions([]);
    persistSessions([]);
    setActiveSessionId(null);
    toast.success("All conversations cleared");
  };

  /* ── Clean up stream timers on unmount ── */
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-premium">
      {/* ── Page Header ── */}
      <PageHeader
        title="AI Tutor Mode"
        description="Your personal teacher, available 24/7."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewSession}
              className="gap-1.5 hover:border-primary/40 transition-colors text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New session
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="gap-1.5 hover:border-primary/40 transition-colors text-xs"
            >
              <History className="h-3.5 w-3.5" />
              History
              {sessions.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
                >
                  {sessions.length}
                </Badge>
              )}
            </Button>
          </div>
        }
      />

      {/* ── Level Selector Card ── */}
      <Card className="p-4 glass border-border/40 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-card-enter">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Tutor Difficulty
          </span>
          <span className="text-xs text-muted-foreground/80 mt-0.5 block">
            Select the explanation style that matches your goal.
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {levels.map((l) => (
            <Button
              key={l}
              size="sm"
              variant={level === l ? "default" : "outline"}
              className={cn(
                "transition-all duration-200 text-xs px-3",
                level === l
                  ? "gradient-primary-bg text-white border-0 shadow-glow"
                  : "hover:border-primary/40",
              )}
              onClick={() => setLevel(l)}
            >
              {l}
            </Button>
          ))}
        </div>
      </Card>

      {/* ═══ Main Tutor Thread area ═══ */}
      <Card className="glass border-border/40 shadow-card flex flex-col h-[calc(100vh-21rem)] min-h-[350px] overflow-hidden animate-card-enter">
        {/* Thread Header */}
        <div className="px-5 py-3 border-b border-border/40 bg-card/65 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg gradient-primary-bg/10 grid place-items-center text-primary shrink-0">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-semibold text-xs truncate text-foreground/80">
              {activeSession
                ? activeSession.title
                : "Ask a doubt to start learning"}
            </span>
            {activeSession && (
              <Badge className={cn("text-[9px] uppercase font-bold ml-2", LEVEL_COLORS[activeSession.level])} variant="outline">
                {activeSession.level}
              </Badge>
            )}
          </div>
          {activeSession && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDeleteDisplay}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear view</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Scrollable Conversation Viewport */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 custom-scrollbar bg-background/30">
          {!activeSession || activeSession.messages.length === 0 ? (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center py-12 text-center h-full max-w-lg mx-auto">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center text-primary mb-4 animate-bounce">
                <GraduationCap className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-base text-foreground/90">
                AI Tutor Session
              </h3>
              <p className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed">
                Type in any question, concept, or doubt. Toggle Hint mode or
                Step-by-step explanations for customized guidance.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full">
                {SUGGESTED_STARTERS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => ask(s)}
                    className="text-left p-3 text-xs rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-between group"
                  >
                    <span>{s}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all text-primary" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Conversation Message list ── */
            <div className="space-y-6">
              {activeSession.messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex gap-3 max-w-[85%] animate-fade-in",
                      isUser ? "ml-auto flex-row-reverse" : "mr-auto",
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0 shadow-sm border border-border/10">
                      <AvatarFallback
                        className={
                          isUser
                            ? "gradient-primary-bg text-white text-xs font-semibold"
                            : "bg-muted text-xs font-semibold text-foreground/70"
                        }
                      >
                        {isUser ? "ME" : "AI"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-1 max-w-full">
                      <div className="flex items-center gap-1.5 px-1 justify-end flex-row-reverse">
                        {m.mode && m.mode !== "normal" && (
                          <Badge className="text-[9px] scale-90 border-primary/20 bg-primary/5 text-primary">
                            {m.mode === "hint" ? "Hint Mode" : "Step breakdown"}
                          </Badge>
                        )}
                      </div>

                      <Card
                        className={cn(
                          "p-4 border-border/20 max-w-full overflow-hidden shadow-card group/bubble",
                          isUser
                            ? "gradient-primary-bg text-white border-transparent rounded-2xl rounded-tr-sm"
                            : "bg-card rounded-2xl rounded-tl-sm border relative",
                        )}
                      >
                        {isUser ? (
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {m.content}
                          </div>
                        ) : (
                          <div>
                            {/* Message Markdown content */}
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  code(props) {
                                    const { className, children } = props as {
                                      className?: string;
                                      children?: React.ReactNode;
                                    };
                                    const match = /language-(\w+)/.exec(className || "");
                                    const text = String(children ?? "").replace(/\n$/, "");
                                    if (match) {
                                      return (
                                        <SyntaxHighlighter
                                          style={oneDark as never}
                                          language={match[1]}
                                          PreTag="div"
                                          customStyle={{
                                            borderRadius: "0.5rem",
                                            fontSize: "0.85rem",
                                            margin: 0,
                                          }}
                                        >
                                          {text}
                                        </SyntaxHighlighter>
                                      );
                                    }
                                    return <code className={className}>{children}</code>;
                                  },
                                }}
                              >
                                {m.content}
                              </ReactMarkdown>
                            </div>

                            {/* Assistant message action toolbar */}
                            {!m.isStreaming && (
                              <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-border/25 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                                <TooltipProvider delayDuration={200}>
                                  {/* Copy */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          handleCopy(m.id, m.content)
                                        }
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                      >
                                        {copiedMsgId === m.id ? (
                                          <Check className="h-3 w-3 text-emerald-500" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-[10px] py-1 px-2">
                                      Copy explanation
                                    </TooltipContent>
                                  </Tooltip>

                                  {/* Export PDF */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          handleExportPDF(m.content)
                                        }
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-[10px] py-1 px-2">
                                      Export PDF
                                    </TooltipContent>
                                  </Tooltip>

                                  {/* Export MD */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          handleExportMD(m.content)
                                        }
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                      >
                                        <FileText className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-[10px] py-1 px-2">
                                      Download Markdown
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator skeleton */}
              {busy &&
                activeSession.messages[activeSession.messages.length - 1]
                  ?.role === "user" && (
                  <div className="flex gap-3 max-w-[85%] animate-fade-in mr-auto">
                    <Avatar className="h-8 w-8 shrink-0 shadow-sm border border-border/10">
                      <AvatarFallback className="bg-muted text-xs font-semibold text-foreground/70">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <Card className="p-4 border-border/20 rounded-2xl rounded-tl-sm border bg-card/60 backdrop-blur-md space-y-2 w-64 shadow-card">
                      <Skeleton className="h-3 w-5/6 bg-muted-foreground/15" />
                      <Skeleton className="h-3 w-4/5 bg-muted-foreground/15" />
                      <Skeleton className="h-3 w-2/3 bg-muted-foreground/15" />
                    </Card>
                  </div>
                )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Suggested follow-ups */}
        {activeSession &&
          activeSession.messages.length > 0 &&
          !busy &&
          activeSession.messages[activeSession.messages.length - 1]?.role ===
            "assistant" && (
            <div className="px-5 py-2 overflow-x-auto flex gap-1.5 bg-background/25 shrink-0 border-t border-border/30 scrollbar-none">
              {SUGGESTED_FOLLOWUPS.map((f, idx) => (
                <button
                  key={idx}
                  onClick={() => ask(f)}
                  className="text-left px-2.5 py-1.5 text-[10px] rounded-lg border border-border/30 hover:border-primary/45 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground whitespace-nowrap cursor-pointer"
                >
                  {f}
                </button>
              ))}
            </div>
          )}

        {/* Input area */}
        <div className="p-4 border-t border-border/40 bg-card/85 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={hintMode ? "default" : "outline"}
              onClick={() => {
                setHintMode(!hintMode);
                if (stepMode) setStepMode(false);
              }}
              className={cn(
                "h-7 text-[10px] px-2.5 rounded-lg gap-1 transition-all",
                hintMode
                  ? "gradient-primary-bg text-white border-0 shadow-glow"
                  : "hover:border-primary/40",
              )}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Hint Mode
            </Button>
            <Button
              size="sm"
              variant={stepMode ? "default" : "outline"}
              onClick={() => {
                setStepMode(!stepMode);
                if (hintMode) setHintMode(false);
              }}
              className={cn(
                "h-7 text-[10px] px-2.5 rounded-lg gap-1 transition-all",
                stepMode
                  ? "gradient-primary-bg text-white border-0 shadow-glow"
                  : "hover:border-primary/40",
              )}
            >
              <ListOrdered className="h-3.5 w-3.5" />
              Step-by-step
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder={
                hintMode
                  ? "Ask for a hint on a question…"
                  : "Ask any doubt, concept description, or problem…"
              }
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask();
              }}
              className="flex-1 bg-muted/20 border-border/40 text-xs"
              disabled={busy}
            />
            <Button
              onClick={() => ask()}
              disabled={busy || !question.trim()}
              className="gradient-primary-bg text-white border-0 hover:opacity-90 shadow-glow h-9 w-9 p-0 rounded-lg flex items-center justify-center"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* ═══ History Sheet ═══ */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col bg-card/95 backdrop-blur-2xl"
        >
          <SheetHeader className="p-6 pb-0">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Tutor History
            </SheetTitle>
            <SheetDescription>
              Browse and resume previous conversation threads
            </SheetDescription>
          </SheetHeader>

          {/* Search bar */}
          <div className="px-6 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/30 border-border/40 text-xs"
              />
            </div>
          </div>

          {/* History sessions list */}
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-2 space-y-2 custom-scrollbar">
            {filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted/40 grid place-items-center text-muted-foreground/50 mb-3">
                  <History className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {sessions.length === 0
                    ? "No sessions yet"
                    : "No matching sessions"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {sessions.length === 0
                    ? "Start a session to see it logged here."
                    : "Try a different search term."}
                </p>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <div
                    key={session.id}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all duration-200 group",
                      isActive
                        ? "bg-primary/5 border-primary/30 shadow-sm"
                        : "bg-card border-border/30 hover:border-border/60 hover:bg-muted/20",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg grid place-items-center shrink-0 transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/60 text-muted-foreground",
                        )}
                      >
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold truncate block text-foreground/90">
                          {session.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={cn("text-[8px] scale-90 p-0 px-1.5 border-transparent", LEVEL_COLORS[session.level])}>
                            {session.level}
                          </Badge>
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground/75">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(session.timestamp).toLocaleDateString(
                              [],
                              {
                                month: "short",
                                day: "2-digit",
                              },
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border/20">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRestoreSession(session)}
                        className="h-7 px-2.5 text-[11px] text-primary hover:bg-primary/10 gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSession(session.id)}
                        className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Clear history */}
          {sessions.length > 0 && (
            <div className="px-6 py-4 border-t border-border/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all history
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}