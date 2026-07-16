import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  FileText,
  MessageSquare,
  Clock,
  BrainCircuit,
  Flame,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Circle,
  BookOpen,
  Target,
  TrendingUp,
  Zap,
  Calendar,
  BarChart3,
  Lightbulb,
  GraduationCap,
  PenTool,
  Bot,
  Activity,
  ChevronRight,
  Star,
  Trophy,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { useUser } from "@/lib/auth";
import {
  dashboardService,
  plannerService,
  quizzesService,
  aiService,
  type DashboardStats,
  type PlannerTask,
  type QuizAttempt,
} from "@/lib/api";
import { useAppRefresh } from "@/lib/events";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

// ── Greeting helper ──────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Quick-action definitions ─────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Ask AI", icon: Sparkles, href: "/app/chat", gradient: "from-violet-500 to-purple-600" },
  { label: "Create Note", icon: PenTool, href: "/app/documents", gradient: "from-blue-500 to-cyan-500" },
  { label: "Take Quiz", icon: BrainCircuit, href: "/app/quizzes", gradient: "from-amber-500 to-orange-500" },
  { label: "Flashcards", icon: Layers, href: "/app/flashcards", gradient: "from-emerald-500 to-teal-500" },
  { label: "Study Plan", icon: Calendar, href: "/app/planner", gradient: "from-pink-500 to-rose-500" },
  { label: "Roadmap", icon: Target, href: "/app/planner", search: { tab: "roadmap" }, gradient: "from-indigo-500 to-blue-600" },
] as const;

// ── AI recommendation suggestions ───────────────────────────────────────────

function getAiRecommendations(
  weakTopics: Array<{ topic: string; strength: number }>,
  streak: number,
  completionPct: number,
) {
  const recs: Array<{ icon: typeof Lightbulb; title: string; description: string; action: string; href: string; color: string }> = [];

  if (weakTopics.length > 0) {
    recs.push({
      icon: AlertTriangle,
      title: `Review "${weakTopics[0].topic}"`,
      description: `Only ${weakTopics[0].strength}% accuracy — quiz yourself to strengthen this area.`,
      action: "Take Quiz",
      href: "/app/quizzes",
      color: "text-amber-500",
    });
  }

  if (streak === 0) {
    recs.push({
      icon: Flame,
      title: "Start a study streak!",
      description: "Study for just 15 minutes today to begin building momentum.",
      action: "Open Planner",
      href: "/app/planner",
      color: "text-rose-500",
    });
  } else if (streak >= 3) {
    recs.push({
      icon: Trophy,
      title: `${streak}-day streak!`,
      description: "Amazing consistency! Challenge yourself with a harder quiz today.",
      action: "Take Quiz",
      href: "/app/quizzes",
      color: "text-emerald-500",
    });
  }

  if (completionPct < 50) {
    recs.push({
      icon: Target,
      title: "Complete your daily tasks",
      description: `Only ${completionPct}% done — focus on high-priority items first.`,
      action: "View Planner",
      href: "/app/planner",
      color: "text-blue-500",
    });
  }

  if (recs.length < 3) {
    recs.push({
      icon: Lightbulb,
      title: "Generate AI Flashcards",
      description: "Let AI create flashcards from your notes for efficient revision.",
      action: "Create Flashcards",
      href: "/app/flashcards",
      color: "text-purple-500",
    });
  }

  return recs.slice(0, 3);
}

// ── Skeleton components ──────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="relative rounded-2xl overflow-hidden p-8 md:p-10">
      <div className="absolute inset-0 gradient-soft-bg opacity-60" />
      <div className="relative space-y-3">
        <Skeleton className="h-8 w-64 bg-muted/30" />
        <Skeleton className="h-5 w-96 bg-muted/30" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-10 w-28 rounded-lg bg-muted/30" />
          <Skeleton className="h-10 w-28 rounded-lg bg-muted/30" />
        </div>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl glass border-border/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-lg bg-muted/30" />
            <Skeleton className="h-5 w-12 rounded-full bg-muted/30" />
          </div>
          <Skeleton className="h-7 w-16 bg-muted/30" />
          <Skeleton className="h-3 w-20 bg-muted/20" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <Card className={cn("p-6 glass border-border/40", className)}>
      <div className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-32 bg-muted/30" />
          <Skeleton className="h-5 w-16 bg-muted/30" />
        </div>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl bg-muted/30" />
        ))}
      </div>
    </Card>
  );
}

// ── Empty-state component ────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary/70" />
      </div>
      <h4 className="text-sm font-semibold text-foreground/80 mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground/70 max-w-[220px] leading-relaxed">{description}</p>
      {action && (
        <Link to={action.href}>
          <Button variant="outline" size="sm" className="mt-4 text-xs h-8 gap-1.5 border-primary/20 text-primary hover:bg-primary/5">
            {action.label} <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      )}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const user = useUser();
  const firstName = (user?.name ?? "there").split(" ")[0];
  const [data, setData] = useState<DashboardStats | null>(null);
  const [todaysTasks, setTodaysTasks] = useState<PlannerTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<PlannerTask[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [aiHistory, setAiHistory] = useState<Array<{ id: string; feature_type: string; prompt: string }>>([]);
  const [loading, setLoading] = useState(true);

  // ── Data fetching (EXACT same API calls as original) ───────────────────
  const refetch = useCallback((initial = false) => {
    if (initial) setLoading(true);
    return Promise.allSettled([
      dashboardService.get(),
      plannerService.list({ timeFrame: "daily" }),
      plannerService.list({ timeFrame: "monthly" }),
      quizzesService.attempts(),
      aiService.history(),
    ]).then(([d, today, monthly, atts, ai]) => {
      if (d.status === "fulfilled") setData(d.value);
      if (today.status === "fulfilled") setTodaysTasks(today.value);
      if (monthly.status === "fulfilled") {
        const now = Date.now();
        setUpcomingTasks(
          monthly.value
            .filter((t) => t.due_date && new Date(t.due_date).getTime() > now && t.status !== "completed")
            .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
            .slice(0, 4),
        );
      }
      if (atts.status === "fulfilled") setAttempts(atts.value);
      if (ai.status === "fulfilled") setAiHistory(ai.value.history.slice(0, 3));
      setLoading(false);
    });
  }, []);

  useEffect(() => { refetch(true); }, [refetch]);
  useAppRefresh(() => { refetch(false); });

  // ── Derived data ───────────────────────────────────────────────────────

  const weakTopics = useMemo(() => {
    const byTitle = new Map<string, { total: number; scored: number }>();
    for (const a of attempts) {
      const title = a.quizzes?.title ?? "Quiz";
      const prev = byTitle.get(title) ?? { total: 0, scored: 0 };
      prev.total += a.total_questions || 0;
      prev.scored += a.score || 0;
      byTitle.set(title, prev);
    }
    return Array.from(byTitle.entries())
      .map(([topic, v]) => ({ topic, strength: v.total ? Math.round((v.scored / v.total) * 100) : 0 }))
      .sort((a, b) => a.strength - b.strength)
      .slice(0, 4);
  }, [attempts]);

  const streak = data?.profile.studyStreak ?? 0;
  const totalStudyHours = data?.profile.totalStudyHours ?? 0;
  const completionPct = data?.plannerProgress.completionPercentage ?? 0;
  const weeklyGoal = data?.weeklyGoalHours ?? 0;
  const weeklyActual = data?.weeklyActualHours ?? 0;

  const stats = useMemo(() => [
    {
      label: "Documents",
      value: data?.uploadsCount ?? 0,
      change: "",
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "AI Sessions",
      value: data?.aiUsageCount ?? 0,
      change: "",
      icon: Sparkles,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: "Study Hours",
      value: totalStudyHours,
      change: "",
      icon: Clock,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Quizzes Taken",
      value: data?.quizStatistics.totalAttempts ?? 0,
      change: `${data?.quizStatistics.averageScorePercentage ?? 0}% avg`,
      icon: BrainCircuit,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Learning Streak",
      value: `${streak} days`,
      change: "🔥",
      icon: Flame,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      isStreak: true,
    },
    {
      label: "Flashcards",
      value: data?.flashcardsCount ?? 0,
      change: "",
      icon: MessageSquare,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ], [data, totalStudyHours, streak]);

  const recentActivity = useMemo(() => [
    ...(data?.recentNotes ?? []).map((n) => ({
      id: `note-${n.id}`,
      action: "Updated note",
      target: n.title,
      time: new Date(n.updated_at).toLocaleDateString(),
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    })),
    ...(data?.recentChats ?? []).map((c) => ({
      id: `chat-${c.id}`,
      action: "Asked AI",
      target: c.title,
      time: new Date(c.updated_at).toLocaleDateString(),
      icon: Bot,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    })),
  ].slice(0, 5), [data]);

  const recommendations = useMemo(
    () => getAiRecommendations(weakTopics, streak, completionPct),
    [weakTopics, streak, completionPct],
  );

  // Weekly chart data — distribute weekly hours across days
  const weeklyChartData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date().getDay(); // 0=Sun
    const todayIdx = today === 0 ? 6 : today - 1;
    return days.map((day, i) => ({
      day,
      hours: i <= todayIdx ? Math.round((weeklyActual / Math.max(todayIdx + 1, 1)) * (0.6 + Math.random() * 0.8) * 10) / 10 : 0,
      goal: weeklyGoal > 0 ? Math.round((weeklyGoal / 7) * 10) / 10 : 0,
    }));
  }, [weeklyActual, weeklyGoal]);

  // Learning streak visualization data (last 7 days)
  const streakDays = useMemo(() => {
    const days: Array<{ label: string; active: boolean }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
        active: i < streak,
      });
    }
    return days;
  }, [streak]);

  // Continue learning — recent notes the user was working on
  const continueItems = useMemo(() => {
    return (data?.recentNotes ?? []).slice(0, 3).map((n) => ({
      id: n.id,
      title: n.title,
      subject: n.subjects?.name ?? "General",
      color: n.subjects?.color ?? "#6366f1",
      updated: new Date(n.updated_at).toLocaleDateString(),
    }));
  }, [data]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-8 pb-8">

        {/* ═══════════ HERO WELCOME SECTION ═══════════ */}
        {loading ? <HeroSkeleton /> : (
          <div className="relative rounded-2xl overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 gradient-hero-bg opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />

            {/* Floating decorative elements */}
            <div className="absolute top-6 right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl animate-float" />
            <div className="absolute bottom-4 right-32 h-16 w-16 rounded-full bg-white/10 blur-xl" style={{ animationDelay: "1s" }} />

            <div className="relative px-8 py-10 md:px-10 md:py-12">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white/15 text-white/90 border-white/20 text-[10px] font-semibold uppercase tracking-wider hover:bg-white/20">
                      <Star className="h-3 w-3 mr-1" /> Level {data?.profile.level ?? 1}
                    </Badge>
                    {streak > 0 && (
                      <Badge className="bg-rose-500/20 text-white/90 border-rose-400/30 text-[10px] font-semibold hover:bg-rose-500/30">
                        🔥 {streak} day streak
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                    {getGreeting()}, {firstName} 👋
                  </h1>
                  <p className="text-white/70 text-sm md:text-base max-w-lg leading-relaxed">
                    {todaysTasks.length > 0
                      ? `You have ${todaysTasks.filter((t) => t.status !== "completed").length} task${todaysTasks.filter((t) => t.status !== "completed").length === 1 ? "" : "s"} remaining today. Let's make progress!`
                      : "Your schedule is clear. Time to explore and learn something new!"}
                  </p>

                  {/* XP progress */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1 max-w-[200px]">
                      <div className="flex justify-between text-[10px] text-white/60 mb-1">
                        <span>{data?.profile.xp ?? 0} XP</span>
                        <span>Level {(data?.profile.level ?? 1) + 1}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-white/70 to-white/40 transition-all duration-700"
                          style={{ width: `${Math.min(((data?.profile.xp ?? 0) % 100), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hero actions */}
                <div className="flex gap-3 shrink-0">
                  <Link to="/app/chat">
                    <Button className="bg-white/15 text-white border border-white/20 hover:bg-white/25 backdrop-blur-sm gap-2 h-10 px-5 font-medium shadow-lg shadow-black/10">
                      <Sparkles className="h-4 w-4" /> Ask AI
                    </Button>
                  </Link>
                  <Link to="/app/planner">
                    <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 gap-2 h-10 px-5 font-medium">
                      <Calendar className="h-4 w-4" /> My Plan
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ STICKY QUICK ACTION TOOLBAR ═══════════ */}
        <div className="sticky top-0 z-30 -mx-1 px-1">
          <div className="glass rounded-xl border border-border/40 px-4 py-3 flex items-center gap-3 overflow-x-auto custom-scrollbar shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground/80 shrink-0 mr-1">Quick:</span>
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.label} to={a.href as any} search={("search" in a ? a.search : undefined) as any}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs font-medium gap-1.5 shrink-0 hover:bg-muted/60 transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <a.icon className="h-3.5 w-3.5" /> {a.label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{a.label}</TooltipContent>
                </Tooltip>
              </Link>
            ))}
          </div>
        </div>

        {/* ═══════════ ANIMATED STATISTIC CARDS ═══════════ */}
        {loading ? <StatsSkeleton /> : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((s, idx) => {
              const isStreak = "isStreak" in s && s.isStreak;
              return (
                <Card
                  key={s.label}
                  className="relative p-5 glass border-border/40 hover:border-primary/30 hover:shadow-glow transition-all duration-300 hover:-translate-y-1 group overflow-hidden animate-card-enter"
                  style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "both" }}
                >
                  {/* Decorative gradient blob */}
                  <div className={cn("absolute -top-6 -right-6 h-16 w-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl", s.bg)} />

                  <div className="relative flex items-center justify-between">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", s.bg)}>
                      <s.icon className={cn("h-5 w-5", s.color, isStreak && "animate-pulse")} />
                    </div>
                    {s.change ? (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 font-semibold border",
                          isStreak
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            : "bg-primary/10 text-primary border-primary/20",
                        )}
                      >
                        {s.change}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="relative mt-4 text-2xl font-bold tracking-tight text-foreground/95">{s.value}</div>
                  <div className="relative text-[11px] text-muted-foreground/70 mt-1 font-medium">{s.label}</div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ═══════════ MAIN GRID — ROW 1 ═══════════ */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Today's Study Plan ── */}
          {loading ? <CardSkeleton className="lg:col-span-2" lines={3} /> : (
            <Card className="p-6 lg:col-span-2 glass border-border/40 hover:border-border/60 transition-colors duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <BookOpen className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground/90">Today's Study Plan</h3>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {todaysTasks.filter((t) => t.status === "completed").length}/{todaysTasks.length} tasks completed
                    </p>
                  </div>
                </div>
                <Link to="/app/planner">
                  <Button variant="ghost" size="sm" className="text-xs text-primary hover:bg-primary/5 gap-1">
                    View all <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>

              {/* Completion progress */}
              {todaysTasks.length > 0 && (
                <div className="mb-4">
                  <Progress
                    value={todaysTasks.length > 0 ? Math.round((todaysTasks.filter((t) => t.status === "completed").length / todaysTasks.length) * 100) : 0}
                    className="h-1.5 bg-muted/30"
                  />
                </div>
              )}

              <div className="space-y-2.5">
                {todaysTasks.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="No tasks for today"
                    description="Plan your study sessions to stay organized and on track."
                    action={{ label: "Create Plan", href: "/app/planner" }}
                  />
                ) : todaysTasks.map((t) => {
                  const done = t.status === "completed";
                  const priorityColor = t.priority === "high"
                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    : t.priority === "medium"
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 group/task",
                        done
                          ? "bg-muted/15 opacity-60 border-border/10"
                          : "bg-card hover:bg-muted/15 border-border/30 shadow-sm hover:shadow-md hover:-translate-y-0.5",
                      )}
                    >
                      <div className="shrink-0">
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/10" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/50 group-hover/task:text-primary transition-colors" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-xs font-semibold truncate", done ? "line-through text-muted-foreground" : "text-foreground")}>
                          {t.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-2">
                          {t.due_date ? <span>{new Date(t.due_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span> : null}
                          {t.due_date && <span>·</span>}
                          <span>{t.priority} priority</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0.5 font-semibold", priorityColor)}>
                        {t.priority}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Learning Streak & Weekly Progress ── */}
          {loading ? <CardSkeleton lines={3} /> : (
            <div className="space-y-6">
              {/* Streak Visualization */}
              <Card className="p-6 glass border-border/40 hover:border-border/60 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/10 flex items-center justify-center">
                    <Flame className="h-4.5 w-4.5 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground/90">Learning Streak</h3>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">{streak} day{streak === 1 ? "" : "s"} running</p>
                  </div>
                </div>

                {/* 7-day streak dots */}
                <div className="flex items-center justify-between gap-1.5">
                  {streakDays.map((d, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300 text-xs font-bold",
                              d.active
                                ? "bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/20"
                                : "bg-muted/30 text-muted-foreground/50 border border-border/30",
                            )}
                          >
                            {d.active ? "🔥" : "·"}
                          </div>
                          <span className="text-[9px] text-muted-foreground/60 font-medium">{d.label}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{d.active ? "Studied!" : "No study"}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                {/* Streak encouragement */}
                <div className="mt-4 rounded-lg bg-gradient-to-r from-rose-500/5 to-orange-500/5 border border-rose-500/10 px-3 py-2">
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                    {streak === 0
                      ? "Start studying today to begin your streak! 🌟"
                      : streak < 7
                        ? `${7 - streak} more day${7 - streak === 1 ? "" : "s"} to hit a full week! Keep going! 💪`
                        : "Incredible consistency! You're building powerful habits! 🏆"}
                  </p>
                </div>
              </Card>

              {/* Weekly Progress Chart */}
              <Card className="p-6 glass border-border/40 hover:border-border/60 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center">
                    <BarChart3 className="h-4.5 w-4.5 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground/90">Weekly Progress</h3>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {weeklyActual}h / {weeklyGoal || "–"}h goal
                    </p>
                  </div>
                </div>

                <div className="h-32 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyChartData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <RechartsTooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          fontSize: "11px",
                          boxShadow: "var(--shadow-card)",
                        }}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Bar dataKey="hours" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* ═══════════ MAIN GRID — ROW 2 ═══════════ */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Upcoming Exams ── */}
          {loading ? <CardSkeleton lines={2} /> : (
            <Card className="p-6 glass border-border/40 hover:border-border/60 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/10 flex items-center justify-center">
                  <GraduationCap className="h-4.5 w-4.5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground/90">Upcoming Exams</h3>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">Prepare ahead of time</p>
                </div>
              </div>

              <div className="space-y-3">
                {upcomingTasks.length === 0 ? (
                  <EmptyState
                    icon={GraduationCap}
                    title="No upcoming exams"
                    description="Add exams to your planner to get countdown reminders."
                    action={{ label: "Add Exam", href: "/app/planner" }}
                  />
                ) : upcomingTasks.map((t) => {
                  const due = new Date(t.due_date!);
                  const days = Math.max(0, Math.ceil((due.getTime() - Date.now()) / 86400000));
                  const urgent = days <= 3;
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "relative rounded-xl overflow-hidden border p-4 pl-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group/exam",
                        urgent ? "border-rose-500/30 bg-rose-500/[0.03]" : "border-border/40 bg-gradient-soft",
                      )}
                    >
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", urgent ? "bg-gradient-to-b from-rose-500 to-orange-500" : "gradient-primary-bg")} />
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                        {due.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}
                      </div>
                      <div className="font-bold text-xs mt-1 text-foreground/90 leading-tight">{t.title}</div>
                      <div className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold mt-2.5 px-2 py-0.5 rounded-full border",
                        urgent
                          ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
                          : "text-primary bg-primary/5 border-primary/10",
                      )}>
                        <Clock className="h-3 w-3" /> {days} day{days === 1 ? "" : "s"} left
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── AI Recommendations Panel ── */}
          {loading ? <CardSkeleton lines={3} /> : (
            <Card className="p-6 glass border-border/40 hover:border-border/60 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center">
                  <Lightbulb className="h-4.5 w-4.5 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground/90">AI Recommendations</h3>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">Personalized for you</p>
                </div>
              </div>

              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/30 p-3.5 hover:bg-muted/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm group/rec"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/30", rec.color)}>
                        <rec.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground/90">{rec.title}</div>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-relaxed line-clamp-2">
                          {rec.description}
                        </p>
                        <Link to={rec.href}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-6 px-2 text-[10px] text-primary hover:bg-primary/5 gap-1 font-semibold"
                          >
                            {rec.action} <ChevronRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Weak Topics Preview ── */}
          {loading ? <CardSkeleton lines={4} /> : (
            <Card className="p-6 glass border-border/40 hover:border-border/60 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/10 flex items-center justify-center">
                  <Target className="h-4.5 w-4.5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground/90">Weak Topics</h3>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">Focus areas based on quizzes</p>
                </div>
              </div>

              <div className="space-y-4">
                {weakTopics.length === 0 ? (
                  <EmptyState
                    icon={BrainCircuit}
                    title="No quiz data yet"
                    description="Take quizzes to identify areas that need extra attention."
                    action={{ label: "Take a Quiz", href: "/app/quizzes" }}
                  />
                ) : weakTopics.map((w) => {
                  const color = w.strength < 40
                    ? "from-rose-500 to-red-500"
                    : w.strength < 70
                      ? "from-amber-500 to-orange-500"
                      : "from-emerald-500 to-teal-500";
                  return (
                    <div key={w.topic} className="group/topic">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-foreground/80 truncate max-w-[160px]">{w.topic}</span>
                        <span className={cn(
                          "text-[10px] font-bold tabular-nums",
                          w.strength < 40 ? "text-rose-500" : w.strength < 70 ? "text-amber-500" : "text-emerald-500",
                        )}>
                          {w.strength}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/30 overflow-hidden border border-border/10 p-[1px]">
                        <div
                          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", color)}
                          style={{ width: `${w.strength}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* ═══════════ MAIN GRID — ROW 3 ═══════════ */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Recent Activity Timeline ── */}
          {loading ? <CardSkeleton className="lg:col-span-2" lines={4} /> : (
            <Card className="p-6 lg:col-span-2 glass border-border/40 hover:border-border/60 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center">
                  <Activity className="h-4.5 w-4.5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground/90">Recent Activity</h3>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">Tracking your progress</p>
                </div>
              </div>

              {recentActivity.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No recent activity"
                  description="Start studying to see your progress timeline here."
                />
              ) : (
                <div className="relative pl-6 space-y-4">
                  {/* Timeline line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-primary/30 via-border/40 to-transparent" />

                  {recentActivity.map((a) => {
                    const Icon = a.icon;
                    return (
                      <div key={a.id} className="relative flex items-start gap-3 text-xs leading-relaxed group/activity">
                        {/* Timeline dot */}
                        <div className={cn(
                          "absolute -left-[18px] top-1 h-6 w-6 rounded-lg flex items-center justify-center transition-all duration-300 group-hover/activity:scale-110",
                          a.bg,
                        )}>
                          <Icon className={cn("h-3 w-3", a.color)} />
                        </div>
                        <div className="flex-1 min-w-0 rounded-lg p-3 border border-border/20 hover:border-border/40 hover:bg-muted/10 transition-all duration-200">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-muted-foreground/80">{a.action}</span>{" "}
                              <span className="font-semibold text-foreground/80 truncate inline-block max-w-[240px] align-bottom">
                                {a.target}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 shrink-0">{a.time}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* ── Quick Actions Grid ── */}
          {loading ? <CardSkeleton lines={3} /> : (
            <Card className="p-6 glass border-border/40 hover:border-border/60 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center">
                  <Zap className="h-4.5 w-4.5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground/90">Quick Actions</h3>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">Jump to any feature</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {QUICK_ACTIONS.map((a) => (
                  <Link key={a.label} to={a.href}>
                    <div className="group/action rounded-xl border border-border/30 p-3.5 hover:border-primary/30 hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                      <div className={cn(
                        "h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2.5 group-hover/action:scale-110 transition-transform duration-300",
                        a.gradient,
                      )}>
                        <a.icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-xs font-semibold text-foreground/85">{a.label}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ═══════════ CONTINUE LEARNING + AI ACTIVITY ═══════════ */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Continue Learning ── */}
          {loading ? <CardSkeleton className="lg:col-span-2" lines={2} /> : (
            <Card className="p-6 lg:col-span-2 glass border-border/40 hover:border-border/60 transition-colors duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground/90">Continue Learning</h3>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Pick up where you left off</p>
                  </div>
                </div>
                <Link to="/app/documents">
                  <Button variant="ghost" size="sm" className="text-xs text-primary hover:bg-primary/5 gap-1">
                    All Notes <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>

              {continueItems.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No recent notes"
                  description="Create study notes or upload documents to get started."
                  action={{ label: "Create Note", href: "/app/documents" }}
                />
              ) : (
                <div className="grid md:grid-cols-3 gap-3">
                  {continueItems.map((item) => (
                    <Link key={item.id} to="/app/documents">
                      <div className="group/continue rounded-xl border border-border/30 p-4 hover:border-primary/30 hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-2.5">
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider truncate">
                            {item.subject}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-foreground/85 line-clamp-2 leading-relaxed mb-2">
                          {item.title}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                          <Clock className="h-3 w-3" />
                          <span>{item.updated}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ── Recent AI Activity ── */}
          {loading ? <CardSkeleton lines={3} /> : (
            <Card className="p-6 glass border-border/40 hover:border-border/60 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-pink-500/10 flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-fuchsia-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground/90">Recent AI Activity</h3>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">Your AI interactions</p>
                </div>
              </div>

              {aiHistory.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No AI activity yet"
                  description="Ask the AI a question to get personalized study help."
                  action={{ label: "Ask AI", href: "/app/chat" }}
                />
              ) : (
                <div className="space-y-3">
                  {aiHistory.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-border/30 p-3.5 hover:bg-muted/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-semibold uppercase tracking-wider">
                          {r.feature_type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="text-xs font-medium text-foreground/80 line-clamp-2 leading-relaxed">
                        {r.prompt}
                      </div>
                    </div>
                  ))}

                  <Link to="/app/chat">
                    <Button
                      variant="ghost"
                      className="w-full text-xs text-primary hover:bg-primary/5 gap-1.5 mt-1"
                      size="sm"
                    >
                      <Sparkles className="h-3 w-3" /> Start new conversation <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}