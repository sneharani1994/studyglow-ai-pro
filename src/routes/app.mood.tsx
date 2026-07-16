import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Flame,
  Search,
  Trash2,
  Copy,
  Download,
  FileText,
  Check,
  Sparkles,
  CalendarDays,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  BookOpen,
  Brain,
  Heart,
  Coffee,
  Zap,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { aiService } from "@/lib/api";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/mood")({ component: MoodPage });

// ── Original mood constants (preserved exactly) ────────────────────────────
type Action = { label: string; to: any };
const moods = [
  {
    emoji: "😊",
    label: "Motivated",
    score: 92,
    color: "emerald",
    advice: "Tackle your hardest topic now — momentum is high!",
    actions: [
      { label: "Take a hard quiz", to: "/app/quizzes" },
      { label: "Start a mock interview", to: "/app/interview" },
      { label: "Predict exam questions", to: "/app/predictor" },
    ] as Action[],
  },
  {
    emoji: "😐",
    label: "Neutral",
    score: 68,
    color: "amber",
    advice: "Warm up with light flashcards, then ease into deeper work.",
    actions: [
      { label: "Review flashcards", to: "/app/flashcards" },
      { label: "Quick revision", to: "/app/revision" },
      { label: "Ask the AI tutor", to: "/app/tutor" },
    ] as Action[],
  },
  {
    emoji: "😴",
    label: "Tired",
    score: 35,
    color: "violet",
    advice: "Take it easy. A short summary or 10 min of revision is enough.",
    actions: [
      { label: "Read a summary", to: "/app/summaries" },
      { label: "Review weak topics", to: "/app/weak-topics" },
      { label: "Plan tomorrow", to: "/app/planner" },
    ] as Action[],
  },
];

const moodColorMap: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  Motivated: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    ring: "ring-emerald-500/20",
  },
  Neutral: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
    ring: "ring-amber-500/20",
  },
  Tired: {
    bg: "bg-violet-500/10",
    text: "text-violet-500",
    border: "border-violet-500/20",
    ring: "ring-violet-500/20",
  },
};

// ── Constants ──────────────────────────────────────────────────────────────
const LOGS_KEY = "studyglow.mood.logs";
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Types ──────────────────────────────────────────────────────────────────
interface MoodLog {
  id: string;
  timestamp: string;
  moodLabel: string;
  emoji: string;
  score: number;
  note: string;
  advice: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const toDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

// ── Main Component ─────────────────────────────────────────────────────────
function MoodPage() {
  const [selectedMood, setSelectedMood] = useState(moods[0]);
  const [note, setNote] = useState("");
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMood, setFilterMood] = useState<string>("all");

  // Calendar state
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  // AI Insights state
  const [aiInsight, setAiInsight] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  // Copy state
  const [copied, setCopied] = useState(false);

  // Load logs on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOGS_KEY);
      if (stored) {
        setLogs(JSON.parse(stored));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Save logs to localStorage helper
  const saveLogs = useCallback((newLogs: MoodLog[]) => {
    setLogs(newLogs);
    try {
      localStorage.setItem(LOGS_KEY, JSON.stringify(newLogs));
    } catch {
      /* ignore */
    }
  }, []);

  // Log today's mood
  const logMood = () => {
    const now = new Date();
    const dateKey = toDateKey(now);

    // Prevent duplicate entries for the same date
    const filtered = logs.filter((l) => toDateKey(new Date(l.timestamp)) !== dateKey);

    const newLog: MoodLog = {
      id: Date.now().toString() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: now.toISOString(),
      moodLabel: selectedMood.label,
      emoji: selectedMood.emoji,
      score: selectedMood.score,
      note: note.trim(),
      advice: selectedMood.advice,
    };

    const updated = [newLog, ...filtered].slice(0, 30);
    saveLogs(updated);
    setNote("");
    toast.success(`Mood logged: ${selectedMood.emoji} ${selectedMood.label}`);
  };

  // Delete single log
  const deleteLog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = logs.filter((l) => l.id !== id);
    saveLogs(updated);
    toast.success("Mood log deleted");
  };

  // Clear all logs
  const clearAllLogs = () => {
    saveLogs([]);
    toast.success("All mood logs cleared");
  };

  // Restore a log (set selected mood to that entry's mood)
  const restoreLog = (log: MoodLog) => {
    const found = moods.find((m) => m.label === log.moodLabel);
    if (found) setSelectedMood(found);
    setNote(log.note);
    toast.success(`Restored: ${log.emoji} ${log.moodLabel}`);
  };

  // ── Streak Calculation ───────────────────────────────────────────────────
  const streakDays = useMemo(() => {
    if (logs.length === 0) return 0;

    // Get unique date keys sorted descending
    const uniqueDates = [...new Set(logs.map((l) => toDateKey(new Date(l.timestamp))))].sort().reverse();

    let streak = 0;
    const todayKey = toDateKey(today);
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = toDateKey(yesterdayDate);

    // Streak starts only if today or yesterday is logged
    if (uniqueDates[0] !== todayKey && uniqueDates[0] !== yesterdayKey) return 0;

    // Count consecutive days backwards
    let checkDate = new Date(uniqueDates[0]);
    for (const dateKey of uniqueDates) {
      const expectedKey = toDateKey(checkDate);
      if (dateKey === expectedKey) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [logs]);

  // ── Calendar Data ────────────────────────────────────────────────────────
  // Map of dateKey -> MoodLog for current month
  const monthLogMap = useMemo(() => {
    const map = new Map<string, MoodLog>();
    for (const log of logs) {
      const d = new Date(log.timestamp);
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        const key = toDateKey(d);
        if (!map.has(key)) map.set(key, log);
      }
    }
    return map;
  }, [logs, calMonth, calYear]);

  // Weekly data (last 7 days)
  const weekData = useMemo(() => {
    const result: Array<{ day: string; dateKey: string; log: MoodLog | null }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toDateKey(d);
      const log = logs.find((l) => toDateKey(new Date(l.timestamp)) === key) || null;
      result.push({ day: DAY_NAMES[d.getDay()], dateKey: key, log });
    }
    return result;
  }, [logs]);

  // ── Chart Data ───────────────────────────────────────────────────────────
  const trendChartData = useMemo(() => {
    return [...logs]
      .slice(0, 15)
      .reverse()
      .map((l) => {
        const d = new Date(l.timestamp);
        return {
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          score: l.score,
          label: l.moodLabel,
        };
      });
  }, [logs]);

  const distributionData = useMemo(() => {
    const counts: Record<string, number> = { Motivated: 0, Neutral: 0, Tired: 0 };
    for (const l of logs) {
      if (counts[l.moodLabel] !== undefined) counts[l.moodLabel]++;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [logs]);

  const distBarColors = ["#10b981", "#f59e0b", "#8b5cf6"];

  // ── AI Wellness Insights ─────────────────────────────────────────────────
  const fetchAiInsights = async () => {
    if (logs.length === 0) {
      toast.error("Log at least one mood entry first.");
      return;
    }
    setAiBusy(true);
    setAiInsight("");
    try {
      const recentLogs = logs.slice(0, 10);
      const summary = recentLogs
        .map((l) => `${new Date(l.timestamp).toLocaleDateString()}: ${l.emoji} ${l.moodLabel} (Score: ${l.score})${l.note ? ` — "${l.note}"` : ""}`)
        .join("\n");

      const prompt = `You are a student wellness coach. Analyze these recent study mood logs and provide:\n1. Overall mood trend assessment\n2. Study productivity recommendations\n3. Break schedule suggestions\n4. Warning signs of burnout (if any)\n5. Motivation tips tailored to the pattern\n\nMood Logs:\n${summary}\n\nCurrent streak: ${streakDays} consecutive study days.\n\nProvide actionable, specific advice.`;

      const res = await aiService.explain(prompt, "intermediate");
      setAiInsight(res.explanation);
      toast.success("AI wellness insights generated!");
    } catch {
      toast.error("AI service is temporarily busy. Please try again.");
    } finally {
      setAiBusy(false);
    }
  };

  // ── Exports ──────────────────────────────────────────────────────────────
  const buildTranscript = () => {
    let text = `--- MOOD & PRODUCTIVITY JOURNAL ---\nStreak: ${streakDays} days\nTotal Entries: ${logs.length}\n\n`;
    for (const l of logs) {
      text += `[${new Date(l.timestamp).toLocaleString()}] ${l.emoji} ${l.moodLabel} (Score: ${l.score})\n`;
      if (l.note) text += `  Note: ${l.note}\n`;
      text += `  Advice: ${l.advice}\n\n`;
    }
    if (aiInsight) text += `--- AI WELLNESS INSIGHTS ---\n${aiInsight}\n`;
    return text;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildTranscript());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Journal copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const downloadFile = (ext: "txt" | "md") => {
    try {
      const blob = new Blob([buildTranscript()], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mood-journal.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${ext.toUpperCase()} file downloaded`);
    } catch {
      toast.error("Download failed");
    }
  };

  const exportPdf = () => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Mood & Productivity Journal", margin, y);
      y += 25;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Streak: ${streakDays} days | Total Entries: ${logs.length}`, margin, y);
      y += 25;

      doc.setFontSize(9);
      for (const l of logs) {
        if (y > pageHeight) { doc.addPage(); y = margin; }
        doc.setFont("helvetica", "bold");
        doc.text(`${l.emoji} ${l.moodLabel} (${l.score}/100) — ${new Date(l.timestamp).toLocaleString()}`, margin, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        if (l.note) { doc.text(`Note: ${l.note}`, margin + 10, y); y += 12; }
        doc.text(`Advice: ${l.advice}`, margin + 10, y);
        y += 18;
      }

      if (aiInsight) {
        if (y + 40 > pageHeight) { doc.addPage(); y = margin; }
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("AI Wellness Insights", margin, y);
        y += 15;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const clean = aiInsight.replace(/[*_`#>]/g, "");
        const lines = doc.splitTextToSize(clean, width);
        for (const line of lines) {
          if (y > pageHeight) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += 12;
        }
      }

      doc.save("mood-journal.pdf");
      toast.success("PDF exported successfully");
    } catch {
      toast.error("PDF export failed");
    }
  };

  // ── Filtered Journal ─────────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchesMood = filterMood === "all" || l.moodLabel === filterMood;
      const matchesSearch =
        !searchQuery.trim() ||
        l.moodLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.note.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMood && matchesSearch;
    });
  }, [logs, filterMood, searchQuery]);

  // ── Today's log ──────────────────────────────────────────────────────────
  const todayLog = useMemo(() => {
    const key = toDateKey(today);
    return logs.find((l) => toDateKey(new Date(l.timestamp)) === key) || null;
  }, [logs]);

  // Month navigation
  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const monthName = new Date(calYear, calMonth).toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="relative">
      <PageHeader
        title="Mood & Productivity"
        description="Track your study energy, build streaks, and get personalized AI wellness coaching."
      />

      {/* ═══════════ TWO-COLUMN DESKTOP LAYOUT ═══════════ */}
      <div className="grid lg:grid-cols-[400px_1fr] gap-6 items-start animate-fade-in-premium">

        {/* LEFT COLUMN: Mood Selector, Streak, Calendar */}
        <div className="space-y-6">

          {/* MOOD SELECTOR CARD */}
          <Card className="p-5 glass border-border/40 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              How are you feeling?
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {moods.map((mo) => {
                const colors = moodColorMap[mo.label];
                const isActive = selectedMood.label === mo.label;
                return (
                  <button
                    key={mo.label}
                    onClick={() => setSelectedMood(mo)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-1.5",
                      isActive
                        ? `${colors.border} ${colors.bg} shadow-glow ring-2 ${colors.ring} scale-[1.02]`
                        : "border-transparent hover:border-border bg-background/20 hover:bg-background/30"
                    )}
                  >
                    <span className="text-4xl">{mo.emoji}</span>
                    <span className={cn("text-xs font-bold", isActive ? colors.text : "text-foreground")}>
                      {mo.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Score: {mo.score}</span>
                  </button>
                );
              })}
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Add a note (optional)
              </label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="How's your study session going today?"
                rows={2}
                className="bg-background/20 text-xs resize-none"
              />
            </div>

            <Button
              onClick={logMood}
              className="w-full gradient-primary-bg text-white border-0 font-bold text-xs h-10"
            >
              {todayLog ? `Update Today's Mood (${todayLog.emoji})` : "Log Today's Mood"}
            </Button>

            {/* Current Advice Preview */}
            <div className={cn("p-3 rounded-xl border text-xs", moodColorMap[selectedMood.label].bg, moodColorMap[selectedMood.label].border)}>
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className={cn("h-3.5 w-3.5", moodColorMap[selectedMood.label].text)} />
                <span className={cn("font-bold text-[10px] uppercase tracking-wider", moodColorMap[selectedMood.label].text)}>
                  AI Recommendation
                </span>
              </div>
              <p className="text-foreground font-medium leading-relaxed">{selectedMood.advice}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedMood.actions.map((a) => (
                  <Link key={a.to} to={a.to}>
                    <Button size="sm" variant="secondary" className="rounded-full h-7 text-[10px] font-semibold shadow-card px-2.5">
                      {a.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </Card>

          {/* STREAK TRACKER */}
          <Card className="p-5 glass border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 grid place-items-center text-orange-500 shrink-0">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Study Streak
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {streakDays} {streakDays === 1 ? "day" : "days"}
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold uppercase",
                  streakDays >= 7
                    ? "text-orange-500 border-orange-500/20 bg-orange-500/5"
                    : streakDays >= 3
                      ? "text-amber-500 border-amber-500/20 bg-amber-500/5"
                      : "text-muted-foreground"
                )}
              >
                {streakDays >= 7 ? "🔥 On Fire!" : streakDays >= 3 ? "⚡ Building!" : "Start logging!"}
              </Badge>
            </div>
          </Card>

          {/* WEEKLY TIMELINE */}
          <Card className="p-5 glass border-border/40 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Last 7 Days
            </h3>
            <div className="grid grid-cols-7 gap-1">
              {weekData.map((wd) => {
                const isToday = wd.dateKey === toDateKey(today);
                const colors = wd.log ? moodColorMap[wd.log.moodLabel] : null;
                return (
                  <div
                    key={wd.dateKey}
                    className={cn(
                      "flex flex-col items-center py-2 rounded-xl transition-all",
                      isToday ? "ring-2 ring-primary/30" : "",
                      colors ? colors.bg : "bg-muted/20"
                    )}
                  >
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{wd.day}</span>
                    <span className="text-xl mt-0.5">{wd.log ? wd.log.emoji : "·"}</span>
                    {wd.log && (
                      <span className={cn("text-[9px] font-bold mt-0.5", colors?.text)}>{wd.log.score}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* MONTHLY CALENDAR */}
          <Card className="p-5 glass border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Monthly View
              </h3>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-semibold text-foreground min-w-[110px] text-center">
                  {monthName}
                </span>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-[9px] font-bold text-muted-foreground uppercase py-1">
                  {d}
                </div>
              ))}

              {/* Empty cells before month start */}
              {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Day cells */}
              {Array.from({ length: getDaysInMonth(calYear, calMonth) }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const log = monthLogMap.get(dateKey);
                const isToday = dateKey === toDateKey(today);
                const colors = log ? moodColorMap[log.moodLabel] : null;

                return (
                  <div
                    key={dateKey}
                    className={cn(
                      "flex flex-col items-center justify-center aspect-square rounded-lg text-xs transition-all cursor-default",
                      isToday ? "ring-2 ring-primary/40 font-bold" : "",
                      colors ? `${colors.bg} ${colors.border} border` : "hover:bg-muted/20"
                    )}
                    title={log ? `${log.emoji} ${log.moodLabel} (${log.score})` : undefined}
                  >
                    <span className={cn("text-[10px]", log ? colors?.text : "text-muted-foreground")}>
                      {dayNum}
                    </span>
                    {log && <span className="text-[10px] leading-none">{log.emoji}</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Dashboard Stats, Charts, AI Insights, Journal */}
        <div className="space-y-6 min-w-0">

          {/* DASHBOARD STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 glass border-border/40 text-center">
              <Heart className="h-4 w-4 text-rose-500 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Current Mood</div>
              <div className="text-lg font-black text-foreground mt-0.5">
                {todayLog ? todayLog.emoji : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {todayLog ? todayLog.moodLabel : "Not logged"}
              </div>
            </Card>
            <Card className="p-4 glass border-border/40 text-center">
              <Zap className="h-4 w-4 text-amber-500 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Mood Score</div>
              <div className="text-lg font-black text-foreground mt-0.5">
                {todayLog ? todayLog.score : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {todayLog ? "/100" : "Log to track"}
              </div>
            </Card>
            <Card className="p-4 glass border-border/40 text-center">
              <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Avg Score</div>
              <div className="text-lg font-black text-foreground mt-0.5">
                {logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.score, 0) / logs.length) : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {logs.length > 0 ? `${logs.length} entries` : "No data"}
              </div>
            </Card>
            <Card className="p-4 glass border-border/40 text-center">
              <Flame className="h-4 w-4 text-orange-500 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Streak</div>
              <div className="text-lg font-black text-foreground mt-0.5">{streakDays}</div>
              <div className="text-[10px] text-muted-foreground">consecutive days</div>
            </Card>
          </div>

          {/* STICKY TOOLBAR */}
          <div className="sticky top-0 z-10 glass border-border/40 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-background/80 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm">Mood Journal</span>
              <Badge variant="outline" className="text-[10px]">{logs.length}/30</Badge>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => downloadFile("md")} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                <Download className="h-3.5 w-3.5 mr-1" />
                Markdown
              </Button>
              <Button variant="ghost" size="sm" onClick={() => downloadFile("txt")} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                <Download className="h-3.5 w-3.5 mr-1" />
                TXT
              </Button>
              <Button variant="ghost" size="sm" onClick={exportPdf} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                <FileText className="h-3.5 w-3.5 mr-1" />
                PDF
              </Button>
            </div>
          </div>

          {/* TREND CHARTS */}
          {logs.length > 1 && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Mood Trend Line */}
              <Card className="p-5 glass border-border/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Productivity Trend
                </h4>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Mood Distribution Bar */}
              <Card className="p-5 glass border-border/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Mood Distribution
                </h4>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {distributionData.map((_, i) => (
                          <Cell key={i} fill={distBarColors[i % distBarColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {/* AI WELLNESS INSIGHTS */}
          <Card className="p-5 glass border-border/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">AI Wellness Coach</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAiInsights}
                disabled={aiBusy || logs.length === 0}
                className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/5"
              >
                {aiBusy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Analyzing...
                  </>
                ) : aiInsight ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Refresh Insights
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Generate Insights
                  </>
                )}
              </Button>
            </div>

            {/* Skeleton loader */}
            {aiBusy && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}

            {/* Empty state */}
            {!aiBusy && !aiInsight && (
              <div className="text-center py-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary mx-auto mb-2">
                  <Brain className="h-5 w-5" />
                </div>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {logs.length === 0
                    ? "Log your first mood to unlock personalized AI wellness coaching."
                    : "Click \"Generate Insights\" to receive personalized study wellness advice based on your mood history."}
                </p>
              </div>
            )}

            {/* Insights content */}
            {!aiBusy && aiInsight && (
              <div className="text-xs leading-relaxed text-foreground whitespace-pre-wrap p-4 rounded-xl bg-background/25 border border-border/20">
                {aiInsight}
              </div>
            )}
          </Card>

          {/* JOURNAL / HISTORY */}
          <Card className="p-5 glass border-border/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mood Journal ({filteredLogs.length})
              </h3>
              {logs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllLogs}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search journal notes..."
                  className="pl-8 text-xs h-8 bg-background/20"
                />
              </div>
              <div className="flex rounded-lg bg-muted/30 p-0.5 border border-border/20 shrink-0">
                {["all", "Motivated", "Neutral", "Tired"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterMood(f)}
                    className={cn(
                      "text-[10px] font-semibold px-2 py-1 rounded capitalize transition-all",
                      filterMood === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f === "all" ? "All" : moods.find((m) => m.label === f)?.emoji || f}
                  </button>
                ))}
              </div>
            </div>

            {/* Journal Entries */}
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-10 w-10 rounded-xl bg-muted/20 grid place-items-center text-muted-foreground mx-auto mb-2">
                  <BookOpen className="h-5 w-5" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {logs.length === 0
                    ? "No mood entries recorded. Log your first mood to start building your journal."
                    : "No entries match your search or filter."}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-2">
                  {filteredLogs.map((l) => {
                    const colors = moodColorMap[l.moodLabel];
                    return (
                      <div
                        key={l.id}
                        onClick={() => restoreLog(l)}
                        className={cn(
                          "group flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          colors?.bg || "bg-background/10",
                          colors?.border || "border-border/20",
                          "hover:shadow-sm"
                        )}
                      >
                        <span className="text-2xl shrink-0 pt-0.5">{l.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-bold", colors?.text)}>{l.moodLabel}</span>
                            <Badge variant="outline" className="text-[9px]">Score {l.score}</Badge>
                            <span className="text-[9px] text-muted-foreground ml-auto shrink-0">
                              {new Date(l.timestamp).toLocaleDateString()} {new Date(l.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {l.note && (
                            <p className="text-[11px] text-foreground mt-1 font-medium leading-relaxed truncate">
                              {l.note}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate italic">
                            {l.advice}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => deleteLog(l.id, e)}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive hover:bg-destructive/10 transition-opacity shrink-0 mt-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}