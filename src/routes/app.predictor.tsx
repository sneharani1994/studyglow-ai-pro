import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  Trash2,
  Search,
  Calendar,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  FileText,
  Clock,
  Activity,
  History,
  Shield,
  Lightbulb,
} from "lucide-react";
import { aiService } from "@/lib/api";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import jsPDF from "jspdf";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";

export const Route = createFileRoute("/app/predictor")({
  component: PredictorPage,
});

// ── Types ──────────────────────────────────────────────────────────────────
interface SavedPrediction {
  id: string;
  subject: string;
  syllabus: string;
  prediction: string;
  timestamp: string;
  score: number | "Unavailable";
  confidence: number | "Unavailable";
}

// ── Constants ──────────────────────────────────────────────────────────────
const HISTORY_STORAGE_KEY = "studyglow.predictor.history";

// ── Parsing Utilities ──────────────────────────────────────────────────────
function parseScoreOrConfidence(text: string, regexList: RegExp[]): number | "Unavailable" {
  for (const regex of regexList) {
    const match = text.match(regex);
    if (match) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        return val;
      }
    }
  }
  return "Unavailable";
}

function extractPredictionStats(text: string) {
  const scoreRegexes = [
    /(?:predicted\s+)?score:?\s*\*?\*?(\d{1,3})/i,
    /(\d{1,3})\s*%\s*predicted/i,
    /score:?\s*(\d{1,3})/i,
    /mastery:?\s*(\d{1,3})/i,
    /grade:?\s*(\d{1,3})/i,
  ];

  const confidenceRegexes = [
    /confidence:?\s*\*?\*?(\d{1,3})/i,
    /(\d{1,3})\s*%\s*confidence/i,
    /reliability:?\s*(\d{1,3})/i,
    /accuracy:?\s*(\d{1,3})/i,
  ];

  const score = parseScoreOrConfidence(text, scoreRegexes);
  const confidence = parseScoreOrConfidence(text, confidenceRegexes);

  return { score, confidence };
}

function parsePredictionSections(text: string) {
  const sections: {
    strengths?: string;
    weaknesses?: string;
    focus?: string;
    strategy?: string;
    unparsed: string;
  } = { unparsed: text };

  const lines = text.split("\n");
  let currentHeader = "";
  let currentContent: string[] = [];

  const finishSection = () => {
    if (!currentHeader) return;
    const headerLower = currentHeader.toLowerCase();
    const contentStr = currentContent.join("\n").trim();
    if (!contentStr) return;

    if (
      headerLower.includes("strong") ||
      headerLower.includes("strength") ||
      headerLower.includes("mastery") ||
      headerLower.includes("what you know")
    ) {
      sections.strengths = contentStr;
    } else if (
      headerLower.includes("weak") ||
      headerLower.includes("gap") ||
      headerLower.includes("vulnerab") ||
      headerLower.includes("to improve")
    ) {
      sections.weaknesses = contentStr;
    } else if (
      headerLower.includes("focus") ||
      headerLower.includes("recommend") ||
      headerLower.includes("priority")
    ) {
      sections.focus = contentStr;
    } else if (
      headerLower.includes("strategy") ||
      headerLower.includes("revision") ||
      headerLower.includes("plan")
    ) {
      sections.strategy = contentStr;
    }
  };

  for (const line of lines) {
    const match = line.match(/^(?:#{1,6})\s+(.+)$/);
    if (match) {
      finishSection();
      currentHeader = match[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  finishSection();

  return sections;
}

function getStatusFromScore(score: number | "Unavailable") {
  if (score === "Unavailable") {
    return { label: "Unknown", color: "text-muted-foreground", bg: "bg-muted/10", border: "border-muted/20" };
  }
  if (score < 50) {
    return { label: "Critical Risk", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" };
  }
  if (score < 75) {
    return { label: "Moderate preparation", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" };
  }
  return { label: "Excellent Focus", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
}

// ── Component ──────────────────────────────────────────────────────────────
function PredictorPage() {
  const [subject, setSubject] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Prediction Info
  const [activePrediction, setActivePrediction] = useState<SavedPrediction | null>(null);

  // History state
  const [history, setHistory] = useState<SavedPrediction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [copied, setCopied] = useState(false);

  // Load history from localStorage on mount & auto-restore latest
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed: SavedPrediction[] = JSON.parse(stored);
        setHistory(parsed);
        if (parsed.length > 0) {
          setActivePrediction(parsed[0]);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Save history helper
  const saveToHistoryList = (newList: SavedPrediction[]) => {
    setHistory(newList);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newList));
    } catch {
      /* ignore */
    }
  };

  // Derive unique subject filter list from history
  const uniqueSubjects = useMemo(() => {
    const set = new Set(history.map((h) => h.subject));
    return Array.from(set).sort();
  }, [history]);

  // Filter history entries based on subject, date, search
  const filteredHistory = useMemo(() => {
    let result = history;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.subject.toLowerCase().includes(q) ||
          h.syllabus.toLowerCase().includes(q) ||
          h.prediction.toLowerCase().includes(q)
      );
    }

    if (filterSubject !== "all") {
      result = result.filter((h) => h.subject === filterSubject);
    }

    if (filterDate !== "all") {
      const now = new Date();
      result = result.filter((h) => {
        const date = new Date(h.timestamp);
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (filterDate === "today") return diffDays <= 1;
        if (filterDate === "week") return diffDays <= 7;
        if (filterDate === "month") return diffDays <= 30;
        return true;
      });
    }

    return result;
  }, [history, searchQuery, filterSubject, filterDate]);

  // Predict action
  const predict = async () => {
    const s = subject.trim();
    if (!s) {
      setError("Enter a subject to predict for");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await aiService.examPredictor(s, syllabus.trim() || undefined);
      const predictionText = res.prediction;

      const { score, confidence } = extractPredictionStats(predictionText);

      const newEntry: SavedPrediction = {
        id: Date.now().toString(),
        subject: s,
        syllabus: syllabus.trim(),
        prediction: predictionText,
        timestamp: new Date().toISOString(),
        score,
        confidence,
      };

      // Push to history list (limit max 20, prevent duplicates)
      const filteredList = history.filter(
        (h) => h.subject.toLowerCase() !== s.toLowerCase() || h.syllabus !== syllabus.trim()
      );
      const updatedList = [newEntry, ...filteredList].slice(0, 20);

      saveToHistoryList(updatedList);
      setActivePrediction(newEntry);
      toast.success("Exam prediction complete!");
    } catch (e: any) {
      setError(e?.message || "AI service is temporarily busy. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Delete single prediction
  const deletePrediction = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    saveToHistoryList(updated);
    if (activePrediction?.id === id) {
      setActivePrediction(updated.length > 0 ? updated[0] : null);
    }
    toast.success("Prediction deleted");
  };

  // Clear all predictions
  const clearAllPredictions = () => {
    saveToHistoryList([]);
    setActivePrediction(null);
    toast.success("History cleared");
  };

  // Copy plain report
  const copyReport = async () => {
    if (!activePrediction) return;
    try {
      await navigator.clipboard.writeText(activePrediction.prediction);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Report copied to clipboard");
    } catch {
      toast.error("Failed to copy report");
    }
  };

  // Download Markdown Report
  const downloadMarkdown = () => {
    if (!activePrediction) return;
    try {
      const element = document.createElement("a");
      const file = new Blob([activePrediction.prediction], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = `exam-prediction-${activePrediction.subject.replace(/\s+/g, "-").toLowerCase()}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Markdown downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  // Export PDF Report if jsPDF is available
  const exportPdf = () => {
    if (!activePrediction) return;
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      // Title header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      const titleLines = doc.splitTextToSize(`Exam Prediction Report - ${activePrediction.subject}`, width);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 20 + 10;

      // Stats
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(
        `Predicted Score: ${activePrediction.score === "Unavailable" ? "N/A" : activePrediction.score + "%"} | Confidence: ${activePrediction.confidence === "Unavailable" ? "N/A" : activePrediction.confidence + "%"}`,
        margin,
        y
      );
      y += 20;

      // Date
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date(activePrediction.timestamp).toLocaleString()}`, margin, y);
      y += 30;

      // Body text split
      doc.setFontSize(11);
      const plain = activePrediction.prediction
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

      doc.save(`exam-prediction-${activePrediction.subject.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("PDF exported successfully");
    } catch {
      toast.error("PDF export failed");
    }
  };

  // Parsed sections of the active prediction
  const parsedSections = useMemo(() => {
    if (!activePrediction) return null;
    return parsePredictionSections(activePrediction.prediction);
  }, [activePrediction]);

  // Derived trend data for Recharts (filtered for the active subject)
  const subjectTrendData = useMemo(() => {
    if (!activePrediction) return [];
    return [...history]
      .filter((h) => h.subject.toLowerCase() === activePrediction.subject.toLowerCase())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((h, i) => ({
        index: i + 1,
        date: new Date(h.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score: h.score === "Unavailable" ? 0 : h.score,
        confidence: h.confidence === "Unavailable" ? 0 : h.confidence,
      }));
  }, [history, activePrediction]);

  const hasScoreHistory = useMemo(() => {
    return subjectTrendData.length > 0 && subjectTrendData.some((d) => d.score > 0);
  }, [subjectTrendData]);

  // Derived status configurations
  const statusConfig = useMemo(() => {
    return getStatusFromScore(activePrediction?.score ?? "Unavailable");
  }, [activePrediction]);

  return (
    <div className="relative">
      <PageHeader
        title="AI Exam Predictor"
        description="Rank potential exam questions and target knowledge gaps using predictive analytics."
      />

      {/* ═══════════ TWO-COLUMN RESPONSIVE LAYOUT ═══════════ */}
      <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        
        {/* LEFT COLUMN: Controls & History */}
        <div className="space-y-6">
          <Card className="p-5 glass border-border/40 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              Generator
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Subject</label>
                <Input
                  placeholder="e.g. DBMS, Class 12 Physics, Anatomy"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-background/50 text-sm"
                  disabled={busy}
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">Syllabus (optional)</label>
                <Textarea
                  rows={4}
                  placeholder="Paste chapters, subtopics, or exam format details here to focus the AI's predictive model..."
                  value={syllabus}
                  onChange={(e) => setSyllabus(e.target.value)}
                  className="bg-background/50 text-sm resize-none"
                  disabled={busy}
                />
              </div>

              <Button
                onClick={predict}
                disabled={busy || !subject.trim()}
                className="w-full text-white border-0 bg-primary hover:bg-primary/95 transition-all mt-1"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing syllabus...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Predict Questions
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* HISTORY CONTAINER */}
          <Card className="p-5 glass border-border/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Prediction History
              </h3>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllPredictions}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Filter toolbar */}
            <div className="space-y-2 text-xs">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background/40 px-2 py-1 text-xs outline-none"
                >
                  <option value="all">All Subjects</option>
                  {uniqueSubjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background/40 px-2 py-1 text-xs outline-none"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                </select>
              </div>
            </div>

            {/* History List */}
            {filteredHistory.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No past predictions found matching filters.
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-1.5 pr-2">
                  {filteredHistory.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => setActivePrediction(h)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between group",
                        activePrediction?.id === h.id
                          ? "bg-primary/10 border-primary/40 text-foreground"
                          : "border-border/40 hover:bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground truncate">
                          {h.subject}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2 w-2" />
                            {new Date(h.timestamp).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>Score: {h.score === "Unavailable" ? "N/A" : `${h.score}%`}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePrediction(h.id);
                          }}
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Prediction Detail / Main Workspace */}
        <div className="min-w-0">
          
          {/* SKELETON LOADING STATE */}
          {busy ? (
            <div className="space-y-6">
              <Card className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-7 w-1/3" />
                  <Skeleton className="h-8 w-24" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              </Card>
              <div className="grid sm:grid-cols-2 gap-4">
                <Skeleton className="h-64 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
              </div>
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : error ? (
            /* ERROR STATE */
            <Card className="p-8 text-center border-border/40">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
              <h4 className="font-semibold text-lg text-foreground mb-1">
                Prediction model unavailable
              </h4>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                {error}
              </p>
              <Button onClick={predict} variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Retry Prediction
              </Button>
            </Card>
          ) : !activePrediction ? (
            /* EMPTY STATE */
            <Card className="p-12 text-center border-border/40 glass">
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Activity className="h-7 w-7" />
                </div>
              </div>
              <h4 className="text-lg font-bold mb-2 gradient-text">
                Generate Your First Prediction
              </h4>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Enter your subject syllabus or name, and click the predict button on the left to start analyzing historical patterns.
              </p>
            </Card>
          ) : (
            /* DETAILED WORKSPACE PANEL */
            <div className="space-y-6">
              
              {/* STICKY ACTION TOOLBAR */}
              <div className="sticky top-0 z-10 glass border-border/40 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm bg-background/80 backdrop-blur-md">
                <div className="flex items-center gap-2 min-w-0">
                  <Activity className="h-4.5 w-4.5 text-primary shrink-0" />
                  <span className="font-semibold text-sm truncate">
                    {activePrediction.subject}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyReport}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={downloadMarkdown}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Markdown
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exportPdf}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Export PDF
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePrediction(activePrediction.id)}
                    className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* ═══════════ MAIN METRICS DASHBOARD ═══════════ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                
                {/* Score Card */}
                <Card className="glass p-4 border-border/40 relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-primary/5 group-hover:scale-125 transition-transform" />
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Predicted Score
                  </div>
                  <div className="text-2xl font-bold mt-1 gradient-text">
                    {activePrediction.score === "Unavailable" ? "N/A" : `${activePrediction.score}%`}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-1">
                    Based on exam patterns
                  </div>
                </Card>

                {/* Confidence Card */}
                <Card className="glass p-4 border-border/40 relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-indigo-50/5 group-hover:scale-125 transition-transform" />
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Confidence
                  </div>
                  <div className="text-2xl font-bold mt-1 text-indigo-500">
                    {activePrediction.confidence === "Unavailable" ? "N/A" : `${activePrediction.confidence}%`}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-1">
                    Model reliability score
                  </div>
                </Card>

                {/* Status Card */}
                <Card className="glass p-4 border-border/40 relative overflow-hidden group">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2.5">
                    Prediction Status
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-2 py-0.5",
                      statusConfig.color,
                      statusConfig.bg,
                      statusConfig.border
                    )}
                  >
                    {statusConfig.label}
                  </Badge>
                  <div className="text-[9px] text-muted-foreground mt-2">
                    Prep health assessment
                  </div>
                </Card>

                {/* Generated Timestamp Card */}
                <Card className="glass p-4 border-border/40 relative overflow-hidden group">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Generated On
                  </div>
                  <div className="text-xs font-semibold mt-2.5 text-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {new Date(activePrediction.timestamp).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-1.5">
                    {new Date(activePrediction.timestamp).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </Card>
              </div>

              {/* ═══════════ SYLLABUS SUMMARY ═══════════ */}
              {activePrediction.syllabus && (
                <Card className="glass p-4 border-border/40 text-xs">
                  <span className="font-semibold text-muted-foreground block mb-1">
                    Syllabus Context Summary
                  </span>
                  <p className="text-muted-foreground leading-relaxed line-clamp-3">
                    {activePrediction.syllabus}
                  </p>
                </Card>
              )}

              {/* ═══════════ PROGRESS TREND CHARTS ═══════════ */}
              {hasScoreHistory && (
                <Card className="glass p-5 border-border/40">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4.5 w-4.5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-sm">Prediction Score Trend</h3>
                      <p className="text-[10px] text-muted-foreground">
                        Progress history across generated predictions for this subject
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={subjectTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0];
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2 shadow text-xs">
                              <span className="font-semibold">{p.name}: {p.value}%</span>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#6366f1", strokeWidth: 1 }}
                        name="Predicted Score"
                      />
                      <Line
                        type="monotone"
                        dataKey="confidence"
                        stroke="#8b5cf6"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        name="Confidence"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* ═══════════ STRENGTH & WEAKNESS SECTION ═══════════ */}
              <div className="grid md:grid-cols-2 gap-4">
                
                {/* Strong Areas Card */}
                <Card className="glass p-5 border-border/40 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-1 bg-emerald-500 w-1/3" />
                  <h4 className="font-semibold text-sm mb-3 text-emerald-500 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Strong Areas
                  </h4>
                  {parsedSections?.strengths ? (
                    <div className="prose prose-sm max-w-none text-xs text-muted-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {parsedSections.strengths}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      No specific strong areas isolated in parsing. Check standard report.
                    </div>
                  )}
                </Card>

                {/* Weak Areas Card */}
                <Card className="glass p-5 border-border/40 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-1 bg-red-400 w-1/3" />
                  <h4 className="font-semibold text-sm mb-3 text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Weak Areas / Gaps
                  </h4>
                  {parsedSections?.weaknesses ? (
                    <div className="prose prose-sm max-w-none text-xs text-muted-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {parsedSections.weaknesses}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      No specific weak areas isolated in parsing. Check standard report.
                    </div>
                  )}
                </Card>
              </div>

              {/* ═══════════ RECOMMENDATIONS & STRATEGY ═══════════ */}
              <div className="grid md:grid-cols-2 gap-4">
                
                {/* Recommended Focus */}
                <Card className="glass p-5 border-border/40 relative overflow-hidden group">
                  <h4 className="font-semibold text-sm mb-3 text-primary flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Recommended Focus
                  </h4>
                  {parsedSections?.focus ? (
                    <div className="prose prose-sm max-w-none text-xs text-muted-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {parsedSections.focus}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      No recommendation focus subheadings found. Check standard report.
                    </div>
                  )}
                </Card>

                {/* Suggested Revision Strategy */}
                <Card className="glass p-5 border-border/40 relative overflow-hidden group">
                  <h4 className="font-semibold text-sm mb-3 text-indigo-400 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Revision Strategy
                  </h4>
                  {parsedSections?.strategy ? (
                    <div className="prose prose-sm max-w-none text-xs text-muted-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {parsedSections.strategy}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      No revision strategy subheadings found. Check standard report.
                    </div>
                  )}
                </Card>
              </div>

              {/* ═══════════ COMPLETE UNPARSED REPORT ═══════════ */}
              <Card className="glass p-5 border-border/40 space-y-3">
                <h4 className="font-semibold text-sm border-b border-border/40 pb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Full Predictive Report
                </h4>
                <div className="prose prose-sm max-w-none leading-relaxed text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activePrediction.prediction}
                  </ReactMarkdown>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}