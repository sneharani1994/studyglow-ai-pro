import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/voice")({
  component: VoicePage,
});

function VoicePage() {
  const [listening, setListening] = useState(false);
  return (
    <div>
      <PageHeader title="Voice Assistant" description="Hands-free learning. Speak naturally, learn instantly." />
      <Card className="p-10 text-center glass">
        <div className="flex flex-col items-center">
          <button
            onClick={() => setListening(!listening)}
            className={`relative h-40 w-40 rounded-full grid place-items-center text-white gradient-primary-bg shadow-glow transition-transform hover:scale-105 ${listening ? "animate-pulse-glow" : ""}`}
          >
            {listening ? <MicOff className="h-16 w-16" /> : <Mic className="h-16 w-16" />}
          </button>
          <div className="mt-6 text-lg font-semibold">{listening ? "Listening…" : "Tap to start"}</div>
          <div className="text-sm text-muted-foreground mt-1">{listening ? "Speak clearly into your mic" : "Ask anything about your notes"}</div>
          {listening && (
            <div className="flex items-end gap-1 h-10 mt-6">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-1 gradient-primary-bg rounded-full" style={{ height: `${20 + Math.sin(i) * 40 + Math.random() * 30}%` }} />
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {[
          { step: "1. Listening", text: "Microphone captures your voice" },
          { step: "2. Transcribing", text: "Speech converted to text" },
          { step: "3. Understanding", text: "AI generates the question" },
        ].map((s) => (
          <Card key={s.step} className="p-5">
            <div className="text-xs font-bold text-primary">{s.step}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.text}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Transcript</h3>
          <p className="text-sm text-muted-foreground italic">"Explain how indexing improves database performance with an example."</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-3">AI response</h3>
          <p className="text-sm">Indexing creates a quick-lookup structure (usually a B+ tree) on a column. Instead of scanning every row, the database jumps directly to matching ones — turning O(n) queries into O(log n)…</p>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <Volume2 className="h-4 w-4 text-primary" />
            <Label htmlFor="voice-toggle" className="text-sm flex-1">Read responses aloud</Label>
            <Switch id="voice-toggle" defaultChecked />
          </div>
        </Card>
      </div>
    </div>
  );
}