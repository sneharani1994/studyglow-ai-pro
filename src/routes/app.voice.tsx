import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, VolumeX, Trash2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { aiService } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/voice")({
  component: VoicePage,
});

type Turn = { role: "user" | "assistant"; text: string; ts: number };
const HISTORY_KEY = "studygpt.voice.history";

function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function VoicePage() {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const [interim, setInterim] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) { setSupported(false); return; }
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-50))); } catch { /* ignore */ }
  }, [history]);

  const speak = (text: string) => {
    if (!ttsOn || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1; u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  const askAI = async (question: string) => {
    setThinking(true);
    try {
      const res = await aiService.explain(question, "intermediate");
      const reply = res.explanation;
      setHistory((h) => [...h, { role: "assistant", text: reply, ts: Date.now() }]);
      speak(reply.replace(/[*_`#>]/g, "").slice(0, 800));
    } catch (e: any) {
      const msg = e?.message || "AI service is temporarily busy.";
      setHistory((h) => [...h, { role: "assistant", text: `⚠️ ${msg}`, ts: Date.now() }]);
      toast.error(msg);
    } finally { setThinking(false); }
  };

  const start = () => {
    const SR = getSpeechRecognition();
    if (!SR) { setSupported(false); return; }
    try {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = navigator.language || "en-US";
      rec.onresult = (e: any) => {
        let finalText = "";
        let interimText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t;
          else interimText += t;
        }
        if (interimText) setInterim(interimText);
        if (finalText.trim()) {
          setInterim("");
          setHistory((h) => [...h, { role: "user", text: finalText.trim(), ts: Date.now() }]);
          askAI(finalText.trim());
        }
      };
      rec.onerror = (e: any) => {
        toast.error(`Mic error: ${e?.error || "unknown"}`);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
      setInterim("");
    } catch {
      toast.error("Could not access microphone");
      setListening(false);
    }
  };

  const stop = () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  };

  return (
    <div>
      <PageHeader title="Voice Assistant" description="Hands-free learning. Speak naturally, learn instantly." />

      {!supported ? (
        <Card className="p-10 text-center glass">
          <div className="text-lg font-semibold">Voice not supported in this browser</div>
          <div className="text-sm text-muted-foreground mt-1">
            Try the latest Chrome, Edge, or Safari on desktop or Android.
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-10 text-center glass">
            <div className="flex flex-col items-center">
              <button
                onClick={listening ? stop : start}
                disabled={thinking}
                aria-label={listening ? "Stop recording" : "Start recording"}
                className={`relative h-40 w-40 rounded-full grid place-items-center text-white gradient-primary-bg shadow-glow transition ${
                  listening ? "animate-pulse" : "hover:opacity-90"
                } ${thinking ? "opacity-60" : ""}`}
              >
                {listening ? <Square className="h-14 w-14" /> : <Mic className="h-16 w-16" />}
              </button>
              <div className="mt-6 text-lg font-semibold">
                {listening ? "Listening…" : thinking ? "Thinking…" : "Tap to speak"}
              </div>
              <div className="text-sm text-muted-foreground mt-1 min-h-5">
                {interim || (listening ? "" : "Ask any study question out loud.")}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => setTtsOn((v) => !v)}>
                  {ttsOn ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
                  {ttsOn ? "Voice on" : "Voice off"}
                </Button>
                {history.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearHistory}>
                    <Trash2 className="h-4 w-4 mr-2" /> Clear
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {history.length > 0 && (
            <Card className="p-4 mt-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {history.map((t, i) => (
                <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    t.role === "user"
                      ? "gradient-primary-bg text-white"
                      : "bg-muted"
                  }`}>
                    {t.text}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> thinking…
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}