import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Mic,
  Square,
  Volume2,
  VolumeX,
  Trash2,
  Loader2,
  Copy,
  Check,
  Download,
  Search,
  MessageSquare,
  Activity,
  History,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Sparkles,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { aiService } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/voice")({
  component: VoicePage,
});

// ── Types ──────────────────────────────────────────────────────────────────
type Turn = { role: "user" | "assistant"; text: string; ts: number };

// ── Constants ──────────────────────────────────────────────────────────────
const HISTORY_KEY = "studygpt.voice.history";

// ── Web Speech API Helper ──────────────────────────────────────────────────
function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// ── Main Component ─────────────────────────────────────────────────────────
function VoicePage() {
  const [supported, setSupported] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const [interim, setInterim] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [duration, setDuration] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedSession, setCopiedSession] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize Speech Recognition & Load History
  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setSupported(false);
    }
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        setHistory(JSON.parse(raw));
      }
    } catch {
      /* ignore */
    } finally {
      setInitializing(false);
    }
  }, []);

  // Persist history logs (limit to 50)
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-50)));
    } catch {
      /* ignore */
    }
  }, [history]);

  // Audio Duration Timer
  useEffect(() => {
    if (listening) {
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [listening]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, interim, thinking]);

  // Text-To-Speech Output
  const speak = (text: string) => {
    if (!ttsOn || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  };

  // call AI service using explain endpoint
  const askAI = async (question: string) => {
    setThinking(true);
    try {
      const res = await aiService.explain(question, "intermediate");
      const reply = res.explanation;
      setHistory((h) => [...h, { role: "assistant", text: reply, ts: Date.now() }]);
      speak(reply.replace(/[*_`#>]/g, "").slice(0, 800));
    } catch (e: any) {
      const msg = e?.message || "AI service is temporarily busy.";
      setHistory((h) => [...h, { role: "assistant", text: `⚠️ Error: ${msg}`, ts: Date.now() }]);
      toast.error(msg);
    } finally {
      setThinking(false);
    }
  };

  // Start Voice Recognition
  const startRecording = () => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setSupported(false);
      return;
    }
    setMicError(null);
    try {
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
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
        const errorType = e?.error || "unknown";
        if (errorType === "not-allowed" || errorType === "permission-denied") {
          setMicError("Microphone access denied. Please verify your browser permission settings.");
        } else {
          setMicError(`Microphone connection error (${errorType}). Please check your settings.`);
        }
        setListening(false);
      };

      rec.onend = () => {
        setListening(false);
      };

      rec.start();
      recognitionRef.current = rec;
      setListening(true);
      setInterim("");
    } catch {
      setMicError("Could not access microphone. Ensure it is connected and enabled.");
      setListening(false);
    }
  };

  // Stop Voice Recognition
  const stopRecording = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  };

  // Clear Session History
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    toast.success("Conversation history cleared");
  };

  // Delete Individual Turn
  const deleteTurn = (index: number) => {
    const updated = history.filter((_, i) => i !== index);
    setHistory(updated);
    toast.success("Turn deleted");
  };

  // Copy Single Message
  const copyMessage = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
      toast.success("Message copied");
    } catch {
      toast.error("Failed to copy message");
    }
  };

  // Copy Full Session
  const copyFullSession = async () => {
    if (history.length === 0) return;
    try {
      const fullText = history
        .map((t) => `${t.role === "user" ? "User" : "AI Assistant"}: ${t.text}`)
        .join("\n\n");
      await navigator.clipboard.writeText(fullText);
      setCopiedSession(true);
      setTimeout(() => setCopiedSession(false), 1500);
      toast.success("Full conversation copied");
    } catch {
      toast.error("Failed to copy session");
    }
  };

  // Export Full Session as Markdown File
  const downloadMarkdown = () => {
    if (history.length === 0) return;
    try {
      const fullText = history
        .map((t) => `### ${t.role === "user" ? "🎤 User" : "✨ AI Assistant"}\n\n${t.text}\n`)
        .join("\n---\n\n");
      const element = document.createElement("a");
      const file = new Blob([fullText], { type: "text/markdown" });
      element.href = URL.createObjectURL(file);
      element.download = `voice-assistant-session-${Date.now()}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Markdown downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  // Export Full Session as Plain Text File
  const downloadText = () => {
    if (history.length === 0) return;
    try {
      const fullText = history
        .map((t) => `${t.role === "user" ? "USER" : "AI RESPONSE"} [${new Date(t.ts).toLocaleTimeString()}]:\n${t.text}\n`)
        .join("\n");
      const element = document.createElement("a");
      const file = new Blob([fullText], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = `voice-assistant-session-${Date.now()}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Text downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  // Export Full Session as PDF using jsPDF
  const exportPdf = () => {
    if (history.length === 0) return;
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("StudyGlow AI Voice Transcript", margin, y);
      y += 30;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
      y += 30;

      for (const t of history) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const speaker = t.role === "user" ? "USER" : "AI ASSISTANT";
        doc.text(`${speaker} [${new Date(t.ts).toLocaleTimeString()}]:`, margin, y);
        y += 15;

        doc.setFont("helvetica", "normal");
        const plainText = t.text
          .replace(/```[\s\S]*?```/g, "[Code Block]")
          .replace(/[*_`>#]/g, "");

        const lines = doc.splitTextToSize(plainText, width);
        for (const line of lines) {
          if (y > pageHeight) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 14;
        }
        y += 18;
      }

      doc.save(`voice-transcript-${Date.now()}.pdf`);
      toast.success("PDF exported successfully");
    } catch {
      toast.error("PDF export failed");
    }
  };

  // Format Duration into mm:ss
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  // Filter history turns based on search keyword
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter((t) => t.text.toLowerCase().includes(q));
  }, [history, searchQuery]);

  return (
    <div className="relative">
      <PageHeader
        title="Voice Assistant"
        description="Hands-free study helper. Speak naturally to query notes, ask questions, or clarify concepts."
      />

      {/* ═══════════ SKELETON INITIALIZING STATE ═══════════ */}
      {initializing ? (
        <div className="space-y-6 animate-fade-in-premium">
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      ) : !supported ? (
        /* ═══════════ BROWSER NOT SUPPORTED fallbacks ═══════════ */
        <Card className="p-10 text-center border-border/40 glass max-w-2xl mx-auto animate-fade-in-premium">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="h-7 w-7" />
            </div>
          </div>
          <h3 className="text-lg font-bold mb-2 text-foreground">
            Voice Assistant Unsupported
          </h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Your browser does not support the Web Speech API required for real-time speech recognition.
            Please access this page using desktop/Android versions of Google Chrome, Microsoft Edge, or Apple Safari.
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href="https://www.google.com/chrome/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" className="gap-1.5">
                Download Chrome
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload Page
            </Button>
          </div>
        </Card>
      ) : (
        /* ═══════════ TWO-COLUMN DESKTOP WORKSPACE ═══════════ */
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
          
          {/* LEFT COLUMN: Voice activation, animations & Active turn display */}
          <div className="space-y-6">
            <Card className="p-8 text-center glass border-border/40 overflow-hidden relative flex flex-col items-center min-h-[380px] justify-between">
              
              {/* Mic state status indicators */}
              <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-background/50 border border-border/40">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    listening
                      ? "bg-red-500 animate-ping"
                      : thinking
                        ? "bg-primary animate-pulse"
                        : "bg-muted"
                  )}
                />
                <span className="text-muted-foreground">
                  {listening
                    ? `Recording • ${formatDuration(duration)}`
                    : thinking
                      ? "Processing Query..."
                      : "Microphone Standby"}
                </span>
              </div>

              {/* MIC BUTTON & PULSE / WAVEFORM ANIMATIONS */}
              <div className="relative my-6 flex flex-col items-center justify-center min-h-[160px]">
                
                {/* Glow rings */}
                {listening && (
                  <>
                    <div className="absolute inset-0 h-40 w-40 rounded-full border-2 border-red-500/20 animate-ping" style={{ animationDuration: "2s" }} />
                    <div className="absolute inset-0 h-40 w-40 rounded-full border-2 border-red-500/10 animate-ping" style={{ animationDuration: "3s" }} />
                  </>
                )}

                <button
                  onClick={listening ? stopRecording : startRecording}
                  disabled={thinking}
                  aria-label={listening ? "Stop recording" : "Start recording"}
                  className={cn(
                    "relative h-32 w-32 rounded-full grid place-items-center text-white transition-all shadow-glow hover-card-premium",
                    listening
                      ? "bg-red-500 hover:bg-red-600 scale-105"
                      : "bg-primary hover:opacity-90",
                    thinking && "opacity-60 cursor-not-allowed scale-95"
                  )}
                >
                  {listening ? (
                    <Square className="h-10 w-10 animate-pulse" />
                  ) : thinking ? (
                    <Loader2 className="h-12 w-12 animate-spin" />
                  ) : (
                    <Mic className="h-12 w-12" />
                  )}
                </button>
              </div>

              {/* Bouncing Audio Waveform (CSS Bouncing Bars) */}
              {listening && (
                <div className="flex items-end justify-center gap-1.5 h-10 mb-4 animate-fade-in-premium">
                  {Array.from({ length: 22 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-red-500 to-purple-500 rounded-full animate-bounce"
                      style={{
                        height: `${Math.random() * 80 + 20}%`,
                        animationDuration: `${Math.random() * 0.5 + 0.4}s`,
                        animationDelay: `${i * 0.04}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Microphone Error Block */}
              {micError && (
                <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 px-4 py-2.5 rounded-lg border border-red-500/20 max-w-md mx-auto mb-4 animate-fade-in-premium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-left font-medium">{micError}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startRecording}
                    className="h-7 text-xs text-red-500 px-2 ml-auto shrink-0 hover:bg-red-500/20"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {/* Bottom Instructions / Info */}
              <div className="w-full">
                <div className="text-lg font-bold">
                  {listening
                    ? "Go ahead, I'm listening..."
                    : thinking
                      ? "Thinking..."
                      : "Tap to ask a question"}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
                  {listening
                    ? "Say something like 'Explain photosynthesis' or 'What is a binary search tree?'"
                    : "Hands-free assistant automatically reads AI replies aloud."}
                </p>

                {/* Control switches */}
                <div className="flex gap-2 justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTtsOn((v) => !v)}
                    className="h-8 text-xs gap-1.5"
                  >
                    {ttsOn ? (
                      <>
                        <Volume2 className="h-3.5 w-3.5 text-primary" />
                        Speech Aloud On
                      </>
                    ) : (
                      <>
                        <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                        Speech Aloud Off
                      </>
                    )}
                  </Button>
                  {history.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearHistory}
                      className="h-8 text-xs gap-1.5 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* LIVE & INTERIM TRANSLATION DISPLAY */}
            {(listening || interim) && (
              <Card className="p-5 glass border-border/40 space-y-2.5 animate-fade-in-premium">
                <h4 className="font-semibold text-xs text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                  Live Transcription
                </h4>
                <div className="bg-background/40 p-3 rounded-lg border border-border/20 text-sm min-h-12 flex items-center">
                  {interim ? (
                    <p className="text-foreground font-medium animate-pulse">
                      {interim}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic text-xs">
                      Speaking capture active... Start talking.
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN: Conversation History Panel */}
          <div className="min-w-0">
            <Card className="glass border-border/40 overflow-hidden flex flex-col min-h-[520px] max-h-[750px]">
              
              {/* Toolbar & controls */}
              <div className="p-4 border-b border-border/40 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    <History className="h-4.5 w-4.5 text-primary" />
                    Conversation History
                  </h3>
                  {history.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={copyFullSession}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Copy Entire Session"
                      >
                        {copiedSession ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={downloadMarkdown}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Download Markdown"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={exportPdf}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Download PDF"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Filter and search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search past turns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8.5 h-8 text-xs bg-background/50"
                  />
                </div>
              </div>

              {/* Scrollable conversation history */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-background/10">
                {filteredHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-sm text-muted-foreground">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="font-semibold text-xs">No entries found</p>
                    <p className="text-[11px] text-muted-foreground max-w-[200px] mt-1">
                      {history.length === 0
                        ? "Say your first question or command out loud."
                        : "No entries match search query."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredHistory.map((t, idx) => {
                      const isUser = t.role === "user";
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "flex gap-2.5 max-w-[85%] animate-fade-in-premium group",
                            isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                          )}
                        >
                          {/* Message bubble */}
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed border relative",
                              isUser
                                ? "gradient-primary-bg text-white border-primary/20 rounded-tr-none"
                                : "bg-card border-border/40 text-foreground rounded-tl-none"
                            )}
                          >
                            {isUser ? (
                              <p className="whitespace-pre-wrap">{t.text}</p>
                            ) : (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {t.text}
                                </ReactMarkdown>
                              </div>
                            )}

                            {/* Message actions overlay */}
                            <div
                              className={cn(
                                "flex gap-1.5 mt-1.5 pt-1.5 border-t border-border/10 justify-end opacity-0 group-hover:opacity-100 transition-opacity text-[10px]",
                                isUser ? "text-white/60" : "text-muted-foreground"
                              )}
                            >
                              <button
                                onClick={() => copyMessage(t.text, idx)}
                                className="hover:underline flex items-center gap-0.5"
                              >
                                {copiedIndex === idx ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-500" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    Copy
                                  </>
                                )}
                              </button>
                              <span>|</span>
                              <button
                                onClick={() => deleteTurn(idx)}
                                className="hover:underline hover:text-destructive flex items-center gap-0.5"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Thinking animation state */}
                    {thinking && (
                      <div className="flex gap-2.5 mr-auto max-w-[85%] animate-pulse">
                        <div className="bg-card border border-border/40 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          <span>AI generating response...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}