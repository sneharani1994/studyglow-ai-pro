import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Paperclip, Mic, Plus, Sparkles, FileText } from "lucide-react";
import { chatHistory, demoConversation, suggestedQuestions } from "@/lib/mock-data";

export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

function ChatPage() {
  const [input, setInput] = useState("");
  return (
    <div className="h-[calc(100vh-8rem)] -m-4 lg:-m-8 flex">
      <aside className="hidden md:flex flex-col w-72 border-r p-3 gap-2 bg-card/40">
        <Button className="gradient-primary-bg text-white border-0 hover:opacity-90"><Plus className="h-4 w-4 mr-2" /> New chat</Button>
        <div className="text-xs font-semibold text-muted-foreground px-2 mt-3">Recent</div>
        {chatHistory.map((c) => (
          <button key={c.id} className="text-left px-3 py-2 rounded-lg hover:bg-muted text-sm">
            <div className="truncate">{c.title}</div>
            <div className="text-xs text-muted-foreground">{c.time}</div>
          </button>
        ))}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 lg:px-8 py-4 border-b flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">TCP Handshake explainer</span>
          <Badge variant="secondary" className="ml-auto">
            <FileText className="h-3 w-3 mr-1" /> Networks-Lecture.pptx
          </Badge>
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {demoConversation.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={"flex gap-3 max-w-[85%] " + (m.role === "user" ? "flex-row-reverse" : "")}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={m.role === "user" ? "gradient-primary-bg text-white text-xs" : "bg-muted text-xs"}>
                    {m.role === "user" ? "AK" : "AI"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Card className={m.role === "user" ? "gradient-primary-bg text-white border-0 p-4" : "p-4"}>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  </Card>
                  {m.role === "ai" && m.sources?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.sources.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs"><FileText className="h-3 w-3 mr-1" />{s}</Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t p-4 lg:p-6 max-w-4xl mx-auto w-full">
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestedQuestions.map((q) => (
              <button key={q} className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors">{q}</button>
            ))}
          </div>
          <div className="flex gap-2 items-end glass rounded-2xl p-2">
            <Button variant="ghost" size="icon"><Paperclip className="h-4 w-4" /></Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your notes…"
              className="border-0 bg-transparent focus-visible:ring-0"
            />
            <Button variant="ghost" size="icon"><Mic className="h-4 w-4" /></Button>
            <Button size="icon" className="gradient-primary-bg text-white border-0"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}