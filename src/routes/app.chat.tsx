import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Paperclip, Mic, Plus, Sparkles } from "lucide-react";
import { chatService, type ChatSession, type ChatMessage } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { toast } from "sonner";

const suggestedQuestions = [
  "Explain this concept simply",
  "Generate a quick quiz",
  "Summarise my last note",
  "What should I revise today?",
];

export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

function ChatPage() {
  const user = useUser();
  const initials = (user?.name ?? "ME").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    chatService.listSessions({ recent: true }).then((s) => {
      setSessions(s);
      if (s.length && !activeId) setActiveId(s[0].id);
    }).catch(() => setSessions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    chatService.listMessages(activeId).then(setMessages).catch(() => setMessages([]));
  }, [activeId]);

  const newChat = async () => {
    const s = await chatService.createSession("New chat");
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    let sid = activeId;
    setInput("");
    setSending(true);
    try {
      if (!sid) {
        const s = await chatService.createSession(text.slice(0, 60));
        sid = s.id;
        setActiveId(sid);
        setSessions((prev) => [s, ...prev]);
      }
      const { userMessage, aiMessage } = await chatService.sendMessage(sid, text);
      setMessages((prev) => [...prev, userMessage, aiMessage]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send message");
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const active = sessions.find((s) => s.id === activeId);

  return (
    <div className="h-[calc(100vh-8rem)] -m-4 lg:-m-8 flex">
      <aside className="hidden md:flex flex-col w-72 border-r p-3 gap-2 bg-card/40">
        <Button onClick={newChat} className="gradient-primary-bg text-white border-0 hover:opacity-90"><Plus className="h-4 w-4 mr-2" /> New chat</Button>
        <div className="text-xs font-semibold text-muted-foreground px-2 mt-3">Recent</div>
        {sessions.length === 0 ? (
          <div className="text-xs text-muted-foreground px-2">No conversations yet.</div>
        ) : sessions.map((c) => (
          <button key={c.id} onClick={() => setActiveId(c.id)}
            className={`text-left px-3 py-2 rounded-lg hover:bg-muted text-sm ${activeId === c.id ? "bg-muted" : ""}`}>
            <div className="truncate">{c.title}</div>
            <div className="text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleString()}</div>
          </button>
        ))}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 lg:px-8 py-4 border-b flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">{active?.title ?? "New conversation"}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-16">
              Start the conversation — ask anything about your notes.
            </div>
          ) : messages.map((m) => {
            const isUser = m.sender === "user";
            return (
              <div key={m.id} className={isUser ? "flex justify-end" : ""}>
                <div className={"flex gap-3 max-w-[85%] " + (isUser ? "flex-row-reverse" : "")}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={isUser ? "gradient-primary-bg text-white text-xs" : "bg-muted text-xs"}>
                      {isUser ? initials : "AI"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Card className={isUser ? "gradient-primary-bg text-white border-0 p-4" : "p-4"}>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    </Card>
                  </div>
                </div>
              </div>
            );
          })}
          {sending ? (
            <div className="text-xs text-muted-foreground">AI is thinking…</div>
          ) : null}
        </div>
        <div className="border-t p-4 lg:p-6 max-w-4xl mx-auto w-full">
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestedQuestions.map((q) => (
              <button key={q} onClick={() => setInput(q)} className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors">{q}</button>
            ))}
          </div>
          <div className="flex gap-2 items-end glass rounded-2xl p-2">
            <Button variant="ghost" size="icon"><Paperclip className="h-4 w-4" /></Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything about your notes…"
              className="border-0 bg-transparent focus-visible:ring-0"
            />
            <Button variant="ghost" size="icon"><Mic className="h-4 w-4" /></Button>
            <Button size="icon" onClick={send} disabled={sending || !input.trim()} className="gradient-primary-bg text-white border-0"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}