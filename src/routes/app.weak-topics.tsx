import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PageHeader } from "@/components/page-header";
import {
  BookOpen,
  BrainCircuit,
  Layers,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  BarChart3,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Flame,
  Star,
  Trophy,
  Zap,
  Filter,
  History,
  RefreshCw,
} from "lucide-react";
import { quizzesService, aiService, type QuizAttempt } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/app/weak-topics")({
  component: WeakPage,
});

// ── Types ──────────────────────────────────────────────────────────────────
interface WeakTopic {
  topic: string;
  subject: string;
  strength: number;
  attempts: number;
  lastScore: number;
  previousStrength: number;
}

type StrengthFilter = "all" | "critical" | "weak" | "strong";

// ── Constants ──────────────────────────────────────────────────────────────
const CHART_COLORS = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  success: "#10b981",
  successLight: "#34d399",
  warning: "#f59e0b",
  danger: "#ef4444",
  dangerLight: "#f87171",
  info: "#06b6d4",
};

const PIE_PALETTE = ["#ef4444", "#f59e0b", "#10b981", "#6366f1"];

const STRENGTH_CONFIG = {
  critical: { label: "Critical", min: 0, max: 39, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", bar: "bg-red-500" },
  weak: { label: "Weak", min: 40, max: 69, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", bar: "bg-amber-500" },
  strong: { label: "Strong", min: 70, max: 100, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", bar: "bg-emerald-500" },
} as const;

const FILTER_STORAGE_KEY = "studygpt.weakTopics.filters";

// ── Helpers ────────────────────────────────────────────────────────────────
function getStrengthCategory(strength: number): "critical" | "weak" | "strong" {
  if (strength < 40) return "critical";
  if (strength < 70) return "weak";
  return "strong";
}

function getStrengthColor(strength: number): string {
  if (strength < 40) return CHART_COLORS.danger;
  if (strength < 70) return CHART_COLORS.warning;
  return CHART_COLORS.success;
}

function getPriorityLabel(strength: number): { label: string; color: string; bg: string } {
  if (strength < 25) return { label: "Urgent", color: "text-red-600", bg: "bg-red-500/15" };
  if (strength < 40) return { label: "High", color: "text-red-500", bg: "bg-red-500/10" };
  if (strength < 55) return { label: "Medium", color: "text-amber-500", bg: "bg-amber-500/10" };
  if (strength < 70) return { label: "Low", color: "text-amber-400", bg: "bg-amber-400/10" };
  return { label: "Review", color: "text-emerald-500", bg: "bg-emerald-500/10" };
}

// ── Custom Chart Tooltip ───────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border/50 rounded-xl px-3.5 py-2.5 shadow-xl text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color || CHART_COLORS.primary }}
          />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold">{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
function WeakPage() {
  const navigate = useNavigate();

  // ── Core state ──
  const [loading, setLoading] = useState(true);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  // ── Filter state (persisted) ──
  const [searchQuery, setSearchQuery] = useState("");
  const [strengthFilter, setStrengthFilter] = useState<StrengthFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  // ── AI state ──
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [aiRecommendationLoading, setAiRecommendationLoading] = useState(false);
  const [studyPlan, setStudyPlan] = useState<{ title: string; description: string; steps: Array<{ phase: string; topics: string[] }> } | null>(null);
  const [studyPlanLoading, setStudyPlanLoading] = useState(false);
  const [studyPlanOpen, setStudyPlanOpen] = useState(false);
  const [summaryDialog, setSummaryDialog] = useState<{ open: boolean; topic: string; content: string }>({ open: false, topic: "", content: "" });

  // ── Per-card loading states ──
  const [loadingActions, setLoadingActions] = useState<Record<string, string>>({});

  // ── Refs for caching ──
  const aiRecommendationCacheRef = useRef<string | null>(null);
  const studyPlanCacheRef = useRef<typeof studyPlan>(null);

  // ── Restore filters from localStorage ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.strengthFilter) setStrengthFilter(parsed.strengthFilter);
        if (parsed.subjectFilter) setSubjectFilter(parsed.subjectFilter);
        if (parsed.searchQuery) setSearchQuery(parsed.searchQuery);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // ── Persist filter state ──
  useEffect(() => {
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({ strengthFilter, subjectFilter, searchQuery })
      );
    } catch {
      /* ignore */
    }
  }, [strengthFilter, subjectFilter, searchQuery]);

  // ── Fetch data (single call, preserving existing API) ──
  useEffect(() => {
    quizzesService
      .attempts()
      .then((atts: QuizAttempt[]) => {
        setAttempts(atts);

        // Build topic strength map with trend data
        const map = new Map<
          string,
          { subject: string; total: number; scored: number; attempts: number; lastScore: number; previousTotal: number; previousScored: number }
        >();

        // Sort attempts chronologically
        const sorted = [...atts].sort(
          (a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
        );

        for (const a of sorted) {
          const title = a.quizzes?.title ?? "Quiz";
          const subject = a.quizzes?.subjects?.name ?? "General";
          const prev = map.get(title) ?? {
            subject,
            total: 0,
            scored: 0,
            attempts: 0,
            lastScore: 0,
            previousTotal: 0,
            previousScored: 0,
          };

          // Store previous values before updating
          prev.previousTotal = prev.total;
          prev.previousScored = prev.scored;

          prev.total += a.total_questions || 0;
          prev.scored += a.score || 0;
          prev.attempts += 1;
          prev.lastScore = a.total_questions
            ? Math.round((a.score / a.total_questions) * 100)
            : 0;
          map.set(title, prev);
        }

        const list = Array.from(map.entries())
          .map(([topic, v]) => ({
            topic,
            subject: v.subject,
            strength: v.total ? Math.round((v.scored / v.total) * 100) : 0,
            attempts: v.attempts,
            lastScore: v.lastScore,
            previousStrength: v.previousTotal
              ? Math.round((v.previousScored / v.previousTotal) * 100)
              : 0,
          }))
          .sort((a, b) => a.strength - b.strength);

        setWeakTopics(list);
      })
      .catch(() => {
        setWeakTopics([]);
        setAttempts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Derived computations (memoized) ──
  const subjects = useMemo(() => {
    const set = new Set(weakTopics.map((t) => t.subject));
    return Array.from(set).sort();
  }, [weakTopics]);

  const filteredTopics = useMemo(() => {
    let result = weakTopics;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.topic.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q)
      );
    }

    if (strengthFilter !== "all") {
      const cfg = STRENGTH_CONFIG[strengthFilter];
      result = result.filter(
        (t) => t.strength >= cfg.min && t.strength <= cfg.max
      );
    }

    if (subjectFilter !== "all") {
      result = result.filter((t) => t.subject === subjectFilter);
    }

    return result;
  }, [weakTopics, searchQuery, strengthFilter, subjectFilter]);

  const stats = useMemo(() => {
    const total = weakTopics.length;
    const weak = weakTopics.filter((t) => t.strength < 50).length;
    const avgMastery =
      total > 0
        ? Math.round(weakTopics.reduce((s, t) => s + t.strength, 0) / total)
        : 0;
    const trending = weakTopics.filter(
      (t) => t.previousStrength > 0 && t.strength > t.previousStrength
    ).length;
    const declining = weakTopics.filter(
      (t) => t.previousStrength > 0 && t.strength < t.previousStrength
    ).length;
    return { total, weak, avgMastery, trending, declining };
  }, [weakTopics]);

  // Strength distribution for pie chart
  const strengthDistribution = useMemo(() => {
    const critical = weakTopics.filter((t) => t.strength < 40).length;
    const weak = weakTopics.filter(
      (t) => t.strength >= 40 && t.strength < 70
    ).length;
    const strong = weakTopics.filter((t) => t.strength >= 70).length;
    return [
      { name: "Critical (<40%)", value: critical, fill: CHART_COLORS.danger },
      { name: "Weak (40-69%)", value: weak, fill: CHART_COLORS.warning },
      { name: "Strong (70-89%)", value: strong, fill: CHART_COLORS.success },
      {
        name: "Mastered (90%+)",
        value: weakTopics.filter((t) => t.strength >= 90).length,
        fill: CHART_COLORS.primary,
      },
    ].filter((d) => d.value > 0);
  }, [weakTopics]);

  // Recent attempts for history
  const recentAttempts = useMemo(() => {
    return [...attempts]
      .sort(
        (a, b) =>
          new Date(b.completed_at).getTime() -
          new Date(a.completed_at).getTime()
      )
      .slice(0, 8);
  }, [attempts]);

  // Score trend data for area chart
  const scoreTrendData = useMemo(() => {
    const sorted = [...attempts]
      .sort(
        (a, b) =>
          new Date(a.completed_at).getTime() -
          new Date(b.completed_at).getTime()
      )
      .slice(-12);
    return sorted.map((a, i) => ({
      name: `#${i + 1}`,
      score: a.total_questions
        ? Math.round((a.score / a.total_questions) * 100)
        : 0,
    }));
  }, [attempts]);

  // Chart data for horizontal bars (top 10 weakest)
  const barChartData = useMemo(() => {
    return [...weakTopics]
      .sort((a, b) => a.strength - b.strength)
      .slice(0, 10)
      .map((t) => ({
        topic: t.topic.length > 18 ? t.topic.slice(0, 18) + "…" : t.topic,
        strength: t.strength,
        fullTopic: t.topic,
      }));
  }, [weakTopics]);

  // ── AI Actions ───────────────────────────────────────────────────────────
  const setActionLoading = useCallback(
    (topic: string, action: string | null) => {
      setLoadingActions((prev) => {
        const next = { ...prev };
        if (action) next[topic] = action;
        else delete next[topic];
        return next;
      });
    },
    []
  );

  const handleGenerateQuiz = useCallback(
    async (topic: string) => {
      setActionLoading(topic, "quiz");
      try {
        await aiService.generateQuiz(topic, 5, "medium");
        navigate({ to: "/app/quizzes" });
      } catch {
        /* fail silently */
      } finally {
        setActionLoading(topic, null);
      }
    },
    [navigate, setActionLoading]
  );

  const handleGenerateFlashcards = useCallback(
    async (topic: string) => {
      setActionLoading(topic, "flashcards");
      try {
        await aiService.generateFlashcards(topic, 8);
        navigate({ to: "/app/flashcards" });
      } catch {
        /* fail silently */
      } finally {
        setActionLoading(topic, null);
      }
    },
    [navigate, setActionLoading]
  );

  const handleGenerateSummary = useCallback(
    async (topic: string) => {
      setActionLoading(topic, "summary");
      try {
        const res = await aiService.summarize(topic, "medium");
        setSummaryDialog({ open: true, topic, content: res.summary });
      } catch {
        setSummaryDialog({
          open: true,
          topic,
          content: "Unable to generate summary. Please try again later.",
        });
      } finally {
        setActionLoading(topic, null);
      }
    },
    [setActionLoading]
  );

  const handleRevision = useCallback(
    (topic: string) => {
      void topic;
      navigate({ to: "/app/revision" });
    },
    [navigate]
  );

  // ── AI Recommendations ──────────────────────────────────────────────────
  const generateRecommendation = useCallback(async () => {
    if (aiRecommendationCacheRef.current) {
      setAiRecommendation(aiRecommendationCacheRef.current);
      return;
    }
    if (weakTopics.length === 0) return;

    setAiRecommendationLoading(true);
    try {
      const weakest = weakTopics
        .filter((t) => t.strength < 70)
        .slice(0, 5)
        .map((t) => `${t.topic} (${t.strength}% mastery)`)
        .join(", ");

      const prompt = `Based on these weak study topics: ${weakest}, provide brief, actionable study recommendations. Be concise and encouraging. Focus on study strategies.`;
      const res = await aiService.explain(prompt, "intermediate");
      const text = res.explanation;
      aiRecommendationCacheRef.current = text;
      setAiRecommendation(text);
    } catch {
      setAiRecommendation(
        "Unable to generate recommendations right now. Try reviewing your weakest topics first and practicing with quizzes."
      );
    } finally {
      setAiRecommendationLoading(false);
    }
  }, [weakTopics]);

  // Auto-fetch recommendations once data loads
  useEffect(() => {
    if (!loading && weakTopics.length > 0 && weakTopics.some((t) => t.strength < 70)) {
      generateRecommendation();
    }
  }, [loading, weakTopics, generateRecommendation]);

  // ── AI Study Plan ───────────────────────────────────────────────────────
  const generateStudyPlan = useCallback(async () => {
    if (studyPlanCacheRef.current) {
      setStudyPlan(studyPlanCacheRef.current);
      setStudyPlanOpen(true);
      return;
    }
    if (weakTopics.length === 0) return;

    setStudyPlanLoading(true);
    setStudyPlanOpen(true);
    try {
      const weakest = weakTopics
        .filter((t) => t.strength < 70)
        .slice(0, 5)
        .map((t) => t.topic)
        .join(", ");

      const res = await aiService.roadmap(
        `Improve understanding of: ${weakest}`,
        2
      );
      const plan = res.roadmap;
      studyPlanCacheRef.current = plan;
      setStudyPlan(plan);
    } catch {
      setStudyPlan({
        title: "Study Plan",
        description: "Unable to generate a plan right now. Try again later.",
        steps: [],
      });
    } finally {
      setStudyPlanLoading(false);
    }
  }, [weakTopics]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <PageHeader
        title="Weak Topic Detector"
        description="AI-powered analysis of your knowledge gaps."
        action={
          !loading && weakTopics.length > 0 ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateStudyPlan}
                disabled={studyPlanLoading}
                className="gap-1.5"
              >
                {studyPlanLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Lightbulb className="h-3.5 w-3.5" />
                )}
                Study Plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  aiRecommendationCacheRef.current = null;
                  setAiRecommendation(null);
                  generateRecommendation();
                }}
                disabled={aiRecommendationLoading}
                className="gap-1.5"
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    aiRecommendationLoading && "animate-spin"
                  )}
                />
                Refresh AI
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* ═══════════ SKELETON LOADING ═══════════ */}
      {loading ? (
        <div className="space-y-6 animate-fade-in-premium">
          {/* Stat card skeletons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          {/* Toolbar skeleton */}
          <Skeleton className="h-12 rounded-xl" />
          {/* Chart skeletons */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          {/* Card skeletons */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        </div>
      ) : weakTopics.length === 0 ? (
        /* ═══════════ EMPTY STATE ═══════════ */
        <Card className="glass p-12 text-center border-border/40 animate-fade-in-premium">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Target className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="text-xl font-bold mb-2 gradient-text">
            No Quiz History Yet
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Take a few quizzes so our AI can analyze your performance and
            identify areas for improvement. Your personalized study insights
            will appear here.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/app/quizzes">
              <Button className="gap-2">
                <BrainCircuit className="h-4 w-4" />
                Start a Quiz
              </Button>
            </Link>
            <Link to="/app/flashcards">
              <Button variant="outline" className="gap-2">
                <Layers className="h-4 w-4" />
                Study Flashcards
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-6 animate-fade-in-premium">
          {/* ═══════════ STAT CARDS ═══════════ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Total Topics"
              value={stats.total.toString()}
              icon={BarChart3}
              color="from-blue-500 to-indigo-500"
              textColor="text-blue-500"
              bgColor="bg-blue-500/10"
            />
            <StatCard
              label="Weak Topics"
              value={stats.weak.toString()}
              icon={AlertTriangle}
              color="from-red-500 to-rose-500"
              textColor="text-red-500"
              bgColor="bg-red-500/10"
              subtitle={`${stats.total > 0 ? Math.round((stats.weak / stats.total) * 100) : 0}% of total`}
            />
            <StatCard
              label="Avg Mastery"
              value={`${stats.avgMastery}%`}
              icon={Target}
              color="from-emerald-500 to-teal-500"
              textColor="text-emerald-500"
              bgColor="bg-emerald-500/10"
            />
            <StatCard
              label="Improving"
              value={stats.trending.toString()}
              icon={stats.trending >= stats.declining ? TrendingUp : TrendingDown}
              color="from-purple-500 to-fuchsia-500"
              textColor={stats.trending >= stats.declining ? "text-purple-500" : "text-amber-500"}
              bgColor={stats.trending >= stats.declining ? "bg-purple-500/10" : "bg-amber-500/10"}
              subtitle={`${stats.declining} declining`}
            />
          </div>

          {/* ═══════════ AI RECOMMENDATION ═══════════ */}
          {(aiRecommendation || aiRecommendationLoading) && (
            <Card className="glass p-5 border-border/40 overflow-hidden relative">
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-10 blur-3xl bg-gradient-to-br from-purple-500 to-fuchsia-500" />
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-4.5 w-4.5 text-purple-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    AI Recommendations
                    <Badge
                      variant="outline"
                      className="text-[10px] text-purple-500 border-purple-500/30"
                    >
                      Personalized
                    </Badge>
                  </h3>
                  {aiRecommendationLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-4 w-5/6 rounded" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {aiRecommendation}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ═══════════ AI STUDY PLAN (Collapsible) ═══════════ */}
          {(studyPlan || studyPlanLoading) && (
            <Collapsible open={studyPlanOpen} onOpenChange={setStudyPlanOpen}>
              <Card className="glass border-border/40 overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Lightbulb className="h-4.5 w-4.5 text-amber-500" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-sm">
                          {studyPlan?.title || "AI Study Plan"}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {studyPlan?.description || "Generating your personalized plan…"}
                        </p>
                      </div>
                    </div>
                    {studyPlanOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-5 pb-5 border-t border-border/40">
                    {studyPlanLoading ? (
                      <div className="space-y-3 pt-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                      </div>
                    ) : studyPlan?.steps.length ? (
                      <div className="space-y-4 pt-4">
                        {studyPlan.steps.map((step, i) => (
                          <div
                            key={i}
                            className="flex gap-3 items-start"
                          >
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm">
                                {step.phase}
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {step.topics.map((t, j) => (
                                  <Badge
                                    key={j}
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pt-4">
                        No steps available.
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* ═══════════ STICKY TOOLBAR ═══════════ */}
          <div className="sticky-header-premium rounded-xl px-4 py-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search topics or subjects…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-background/50"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2 items-center shrink-0">
                <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />

                {/* Strength filter (Tabs) */}
                <Tabs
                  value={strengthFilter}
                  onValueChange={(v) =>
                    setStrengthFilter(v as StrengthFilter)
                  }
                >
                  <TabsList className="h-9">
                    <TabsTrigger value="all" className="text-xs px-2.5">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="critical" className="text-xs px-2.5">
                      Critical
                    </TabsTrigger>
                    <TabsTrigger value="weak" className="text-xs px-2.5">
                      Weak
                    </TabsTrigger>
                    <TabsTrigger value="strong" className="text-xs px-2.5">
                      Strong
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Subject filter */}
                {subjects.length > 1 && (
                  <Select
                    value={subjectFilter}
                    onValueChange={setSubjectFilter}
                  >
                    <SelectTrigger className="w-36 h-9 text-xs">
                      <SelectValue placeholder="Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Active filter count */}
            {(strengthFilter !== "all" || subjectFilter !== "all" || searchQuery.trim()) && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>
                  Showing {filteredTopics.length} of {weakTopics.length} topics
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => {
                    setSearchQuery("");
                    setStrengthFilter("all");
                    setSubjectFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>

          {/* ═══════════ PREMIUM CHARTS ═══════════ */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Mastery Bar Chart */}
            <Card className="glass p-5 border-border/40">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Topic Mastery</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Weakest topics first
                  </p>
                </div>
              </div>
              {barChartData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                  No data to display
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, barChartData.length * 36)}>
                  <BarChart
                    data={barChartData}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      dataKey="topic"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={120}
                      fontSize={11}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }}
                    />
                    <Bar dataKey="strength" radius={[0, 8, 8, 0]} name="Mastery">
                      {barChartData.map((d, i) => (
                        <Cell key={i} fill={getStrengthColor(d.strength)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Distribution + Trend Column */}
            <div className="grid gap-4">
              {/* Strength Distribution Pie */}
              <Card className="glass p-5 border-border/40">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <Target className="h-4 w-4 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">
                      Strength Distribution
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Topic breakdown by mastery level
                    </p>
                  </div>
                </div>
                {strengthDistribution.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                    No data to display
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={160}>
                      <PieChart>
                        <Pie
                          data={strengthDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={60}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {strengthDistribution.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0];
                            return (
                              <div className="bg-popover/95 backdrop-blur-md border border-border/50 rounded-xl px-3 py-2 shadow-xl text-xs">
                                <span className="font-semibold">
                                  {d.name}: {d.value as number}
                                </span>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {strengthDistribution.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ background: d.fill }}
                          />
                          <span className="text-muted-foreground truncate">
                            {d.name}
                          </span>
                          <span className="font-semibold ml-auto">
                            {d.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Score Trend Area Chart */}
              {scoreTrendData.length > 1 && (
                <Card className="glass p-5 border-border/40">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Score Trend</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Recent quiz performance
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={scoreTrendData}>
                      <defs>
                        <linearGradient
                          id="weakTopicGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={CHART_COLORS.success}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={CHART_COLORS.success}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        domain={[0, 100]}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke={CHART_COLORS.success}
                        fillOpacity={1}
                        fill="url(#weakTopicGrad)"
                        strokeWidth={2}
                        name="Score"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>
          </div>

          {/* ═══════════ TOPIC CARDS ═══════════ */}
          {filteredTopics.length === 0 ? (
            <Card className="glass p-8 text-center border-border/40">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <div className="font-semibold mb-1">No topics match</div>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search query.
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTopics.map((w, idx) => {
                const cat = getStrengthCategory(w.strength);
                const cfg = STRENGTH_CONFIG[cat];
                const priority = getPriorityLabel(w.strength);
                const trend = w.previousStrength > 0 ? w.strength - w.previousStrength : 0;
                const currentAction = loadingActions[w.topic];

                return (
                  <Card
                    key={w.topic}
                    className="glass p-5 border-border/40 hover-card-premium group overflow-hidden relative"
                    style={{
                      animationDelay: `${Math.min(idx * 50, 400)}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    {/* Glow background */}
                    <div
                      className="absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-0 group-hover:opacity-20 blur-2xl transition-opacity"
                      style={{ background: getStrengthColor(w.strength) }}
                    />

                    {/* Header: Subject + Badges */}
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium"
                      >
                        {w.subject}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        {/* Strength badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            cfg.color,
                            cfg.border,
                            cfg.bg
                          )}
                        >
                          {cfg.label}
                        </Badge>
                        {/* Priority badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            priority.color,
                            priority.bg
                          )}
                        >
                          {priority.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Topic name */}
                    <h4 className="font-semibold text-sm mt-1 mb-3 line-clamp-2">
                      {w.topic}
                    </h4>

                    {/* Mastery bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Mastery
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("font-bold", cfg.color)}>
                            {w.strength}%
                          </span>
                          {trend !== 0 && (
                            <span
                              className={cn(
                                "flex items-center text-[10px]",
                                trend > 0
                                  ? "text-emerald-500"
                                  : "text-red-500"
                              )}
                            >
                              {trend > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {Math.abs(trend)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700 ease-out",
                            cfg.bar
                          )}
                          style={{ width: `${w.strength}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {w.attempts} attempt{w.attempts !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Last: {w.lastScore}%
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1"
                        disabled={!!currentAction}
                        onClick={() => handleGenerateQuiz(w.topic)}
                      >
                        {currentAction === "quiz" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <BrainCircuit className="h-3 w-3" />
                        )}
                        Quiz
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1"
                        disabled={!!currentAction}
                        onClick={() =>
                          handleGenerateFlashcards(w.topic)
                        }
                      >
                        {currentAction === "flashcards" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Layers className="h-3 w-3" />
                        )}
                        Flashcards
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1"
                        disabled={!!currentAction}
                        onClick={() => handleGenerateSummary(w.topic)}
                      >
                        {currentAction === "summary" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <FileText className="h-3 w-3" />
                        )}
                        Summary
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1"
                        onClick={() => handleRevision(w.topic)}
                      >
                        <BookOpen className="h-3 w-3" />
                        Revise
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ═══════════ RECENT ACTIVITY ═══════════ */}
          {recentAttempts.length > 0 && (
            <Card className="glass p-5 border-border/40">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <History className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Recent Activity</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Your latest quiz attempts
                  </p>
                </div>
              </div>
              <ScrollArea className="max-h-72">
                <div className="space-y-2">
                  {recentAttempts.map((a) => {
                    const pct = a.total_questions
                      ? Math.round(
                          (a.score / a.total_questions) * 100
                        )
                      : 0;
                    const isPass = pct >= 50;
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                            isPass
                              ? "bg-emerald-500/10"
                              : "bg-red-500/10"
                          )}
                        >
                          {isPass ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {a.quizzes?.title ?? "Quiz"}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                            <span>
                              {a.quizzes?.subjects?.name ?? "General"}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(
                                a.completed_at
                              ).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={cn(
                              "text-sm font-bold",
                              isPass
                                ? "text-emerald-500"
                                : "text-red-500"
                            )}
                          >
                            {pct}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {a.score}/{a.total_questions}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════ SUMMARY DIALOG ═══════════ */}
      <Dialog
        open={summaryDialog.open}
        onOpenChange={(open) =>
          setSummaryDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Summary: {summaryDialog.topic}
            </DialogTitle>
            <DialogDescription>
              AI-generated summary to help you review this topic.
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm max-w-none mt-2 text-sm leading-relaxed whitespace-pre-wrap">
            {summaryDialog.content}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSummaryDialog((p) => ({ ...p, open: false }))
              }
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSummaryDialog((p) => ({ ...p, open: false }));
                navigate({ to: "/app/revision" });
              }}
            >
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              Open Revision Mode
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Stat Card Component (local helper) ─────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  textColor,
  bgColor,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  textColor: string;
  bgColor: string;
  subtitle?: string;
}) {
  return (
    <Card className="glass p-4 border-border/40 hover:shadow-lg transition-all duration-300 group overflow-hidden relative">
      <div
        className={cn(
          "absolute -top-4 -right-4 h-20 w-20 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity bg-gradient-to-br",
          color
        )}
      />
      <div
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center mb-2",
          bgColor
        )}
      >
        <Icon className={cn("h-4 w-4", textColor)} />
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
        {label}
      </div>
      <div className="text-xl font-bold mt-0.5 gradient-text">{value}</div>
      {subtitle && (
        <div className="text-[10px] text-muted-foreground">{subtitle}</div>
      )}
    </Card>
  );
}