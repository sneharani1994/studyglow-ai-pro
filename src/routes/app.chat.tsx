import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Paperclip, Mic, MicOff, Plus, Sparkles, Loader2, Copy, Check, MessageSquare, History as HistoryIcon, FileText } from "lucide-react";
import { chatService, uploadsService, type ChatSession, type ChatMessage } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { toast } from "sonner";
import { emitAppRefresh } from "@/lib/events";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const suggestedQuestions = [
  "Explain this concept simply",
  "Generate a quick quiz",
  "Summarise my last note",
  "What should I revise today?",
];

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

function ChatPage() {
  const user = useUser();
  const initials = (user?.name ?? "ME").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatService.listSessions({ recent: true }).then((s) => {
      setSessions(s);
      // Restore last active session from localStorage; else default to most recent.
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_SESSION_KEY) : null;
      const match = stored && s.find((x) => x.id === stored);
      if (match) setActiveId(match.id);
      else if (s.length) setActiveId(s[0].id);
    }).catch(() => setSessions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    try { window.localStorage.setItem(ACTIVE_SESSION_KEY, activeId); } catch { /* ignore */ }
    chatService.listMessages(activeId).then(setMessages).catch(() => setMessages([]));
  }, [activeId]);

  // Auto-scroll to newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const newChat = async () => {
    const s = await chatService.createSession("New chat");
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    emitAppRefresh({ source: "chat" });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    let sid = activeId;
    setInput("");
    setSending(true);
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      session_id: sid ?? "pending",
      sender: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      if (!sid) {
        const s = await chatService.createSession(text.slice(0, 60));
        sid = s.id;
        setActiveId(sid);
        setSessions((prev) => [s, ...prev]);
      }
      const { userMessage, aiMessage } = await chatService.sendMessage(sid, text);
      setMessages((prev) => [...prev.filter((m) => m.id !== optimistic.id), userMessage, aiMessage]);
      emitAppRefresh({ source: "chat" });
    } catch (e: any) {
      toast.error(e?.message || "Failed to send message");
      setInput(text);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadsService.upload(file);
      toast.success(`Uploaded ${file.name}`);
      // Ensure we have a session, then send a message that references the file
      let sid = activeId;
      if (!sid) {
        const s = await chatService.createSession(file.name.slice(0, 60));
        sid = s.id;
        setActiveId(sid);
        setSessions((prev) => [s, ...prev]);
      }
      const contextMsg = `📎 I've uploaded a document: "${uploaded.filename}". Please use this document as context for our conversation. Ask me what I want to know about it.`;
      const { userMessage, aiMessage } = await chatService.sendMessage(sid, contextMsg);
      setMessages((prev) => [...prev, userMessage, aiMessage]);
      emitAppRefresh({ source: "uploads" });
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleMic = () => {
    if (typeof window === "undefined") return;
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
      toast.error(err?.error === "not-allowed" ? "Microphone permission denied" : "Voice input error");
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

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const active = sessions.find((s) => s.id === activeId);

  return (
    <div className="h-[calc(100vh-8rem)] -m-4 lg:-m-8 flex">
      <aside className="hidden md:flex flex-col w-72 border-r p-4 gap-3 bg-card/60 backdrop-blur-xl">
        <Button onClick={newChat} className="gradient-primary-bg text-white border-0 hover:opacity-90 shadow-glow transition-all duration-200">
          <Plus className="h-4 w-4 mr-2" /> New chat
        </Button>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2 mt-2">
          <HistoryIcon className="h-3 w-3" />
          <span>Conversations</span>
        </div>
        <div className="space-y-1 overflow-y-auto flex-1 scrollbar-thin">
          {sessions.length === 0 ? (
            <div className="text-xs text-muted-foreground/80 px-2 py-4">No conversations yet.</div>
          ) : sessions.map((c) => {
            const isSelected = activeId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/80 transition-all duration-200 text-sm group flex items-start gap-2.5 border border-transparent",
                  isSelected ? "bg-muted border-border/40 font-medium" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs">{c.title}</div>
                  <div className="text-[10px] text-muted-foreground/75 mt-0.5">
                    {new Date(c.updated_at).toLocaleDateString([], { month: "short", day: "2-digit" })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-background/50">
        <div className="px-5 py-4 border-b flex items-center gap-3 bg-card/25 backdrop-blur-sm">
          <div className="h-7 w-7 rounded-lg gradient-primary-bg/10 grid place-items-center text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm text-foreground/90">{active?.title ?? "New conversation"}</span>
        </div>
        
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 w-full max-w-4xl mx-auto scrollbar-thin">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-20 flex flex-col items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-muted/40 grid place-items-center text-muted-foreground/60">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-foreground/80">Start the conversation</p>
                <p className="text-xs text-muted-foreground/90 mt-1">Ask questions, generate quizzes, or summarize document contents.</p>
              </div>
            </div>
          ) : messages.map((m) => {
            const isUser = m.sender === "user";
            return (
              <div key={m.id} className={cn("flex gap-3 max-w-[85%] animate-fade-in", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}>
                <Avatar className="h-8 w-8 shrink-0 shadow-sm border border-border/10">
                  <AvatarFallback className={isUser ? "gradient-primary-bg text-white text-xs font-semibold" : "bg-muted text-xs font-semibold text-foreground/70"}>
                    {isUser ? initials : "AI"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <Card className={cn(
                    "p-4 shadow-card border-border/20 max-w-full overflow-hidden",
                    isUser 
                      ? "gradient-primary-bg text-white border-0 rounded-2xl rounded-tr-sm" 
                      : "bg-card rounded-2xl rounded-tl-sm border"
                  )}>
                    {isUser ? (
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code(props) {
                              const { className, children, ...rest } = props as {
                                className?: string;
                                children?: React.ReactNode;
                              };
                              const match = /language-(\w+)/.exec(className || "");
                              const text = String(children ?? "").replace(/\n$/, "");
                              if (match) {
                                return (
                                  <div className="relative group/code-block my-3">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="absolute right-2 top-2 h-7 px-2 text-[10px] text-muted-foreground opacity-0 group-hover/code-block:opacity-100 transition-opacity bg-muted/70 hover:bg-muted hover:text-foreground"
                                      onClick={async () => {
                                        await navigator.clipboard.writeText(text);
                                        setCopiedId(m.id + text.slice(0, 10));
                                        toast.success("Code copied");
                                        setTimeout(() => setCopiedId(null), 2000);
                                      }}
                                    >
                                      {copiedId === (m.id + text.slice(0, 10)) ? (
                                        <><Check className="h-3 w-3 mr-1 text-emerald-500" /> Copied</>
                                      ) : (
                                        <><Copy className="h-3 w-3 mr-1" /> Copy</>
                                      )}
                                    </Button>
                                    <SyntaxHighlighter
                                      style={oneDark as never}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{ borderRadius: "0.5rem", fontSize: "0.825rem", margin: 0 }}
                                    >
                                      {text}
                                    </SyntaxHighlighter>
                                  </div>
                                );
                              }
                              return (
                                <code className={className} {...rest}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            );
          })}
          {sending ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 px-3 py-1.5 rounded-lg w-max shadow-sm border border-border/10">
              <Loader2 className="h-3 w-3 animate-spin text-primary" /> AI is typing
              <span className="inline-flex gap-0.5">
                <span className="animate-bounce text-primary" style={{ animationDelay: "0ms" }}>.</span>
                <span className="animate-bounce text-primary" style={{ animationDelay: "150ms" }}>.</span>
                <span className="animate-bounce text-primary" style={{ animationDelay: "300ms" }}>.</span>
              </span>
            </div>
          ) : null}
        </div>
        <div className="border-t p-4 lg:p-6 max-w-4xl mx-auto w-full">
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestedQuestions.map((q) => (
              <button key={q} onClick={() => setInput(q)} className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors">{q}</button>
            ))}
          </div>
          <div className="flex gap-2 items-end glass rounded-2xl p-2">
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
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything about your notes…"
              className="border-0 bg-transparent focus-visible:ring-0"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMic}
              disabled={sending}
              title={listening ? "Stop listening" : "Voice input"}
              className={listening ? "text-destructive" : ""}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button size="icon" onClick={send} disabled={sending || !input.trim()} className="gradient-primary-bg text-white border-0"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}