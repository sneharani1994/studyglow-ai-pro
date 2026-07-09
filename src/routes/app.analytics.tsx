import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
  Line,
  LineChart,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  dashboardService,
  quizzesService,
  chatService,
  notesService,
  flashcardsService,
  uploadsService,
  type DashboardStats,
  type QuizAttempt,
  type ChatSession,
  type UploadedFile,
  type Flashcard,
  type Note,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Flame,
  Clock,
  Brain,
  Target,
  TrendingUp,
  BookOpen,
  FileText,
  Upload,
  MessageSquare,
  Sparkles,
  Trophy,
  CheckCircle2,
  Calendar,
  Zap,
  BarChart3,
  Award,
  Star,
} from "lucide-react";

export const Route = createFileRoute("/app/analytics")({
  component: AnalyticsPage,
});

// ── Gradient color palette ──
const chartColors = {
  primary: "#6366f1",
  primaryLight: "#818cf8",
  secondary: "#8b5cf6",
  success: "#10b981",
  successLight: "#34d399",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  muted: "#64748b",
};

const piePalette = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#f97316",
  "#84cc16",
];

// ── Custom Recharts tooltip ──
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
            style={{ background: p.color || chartColors.primary }}
          />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      dashboardService.get(),
      quizzesService.attempts(),
      chatService.listSessions(),
      uploadsService.list(),
      flashcardsService.list(),
      notesService.list(),
    ]).then(([d, a, c, u, f, n]) => {
      if (d.status === "fulfilled") setData(d.value);
      if (a.status === "fulfilled") setAttempts(a.value);
      if (c.status === "fulfilled") setChatSessions(c.value);
      if (u.status === "fulfilled") setUploads(u.value);
      if (f.status === "fulfilled") setFlashcards(f.value);
      if (n.status === "fulfilled") setNotes(n.value);
      setLoading(false);
    });
  }, []);

  // ── Derived data computations ──

  // Weekly study data (last 7 days from quiz attempts)
  const weeklyStudyData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();
    const results = days.map((name, i) => {
      const date = new Date(today);
      const currentDay = today.getDay();
      const distToMon = currentDay === 0 ? -6 : 1 - currentDay;
      date.setDate(today.getDate() + distToMon + i);
      const dateStr = date.toDateString();
      const dayAttempts = attempts.filter(
        (a) => new Date(a.completed_at).toDateString() === dateStr
      );
      return {
        name,
        quizzes: dayAttempts.length,
        score: dayAttempts.length
          ? Math.round(
              dayAttempts.reduce(
                (s, a) =>
                  s +
                  (a.total_questions
                    ? (a.score / a.total_questions) * 100
                    : 0),
                0
              ) / dayAttempts.length
            )
          : 0,
      };
    });
    return results;
  }, [attempts]);

  // Monthly study data (last 4 weeks)
  const monthlyStudyData = useMemo(() => {
    const now = new Date();
    return [4, 3, 2, 1].map((weeksAgo) => {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - weeksAgo * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const weekAttempts = attempts.filter((a) => {
        const d = new Date(a.completed_at);
        return d >= weekStart && d < weekEnd;
      });
      return {
        name: `Week ${5 - weeksAgo}`,
        quizzes: weekAttempts.length,
        avgScore: weekAttempts.length
          ? Math.round(
              weekAttempts.reduce(
                (s, a) =>
                  s +
                  (a.total_questions
                    ? (a.score / a.total_questions) * 100
                    : 0),
                0
              ) / weekAttempts.length
            )
          : 0,
      };
    });
  }, [attempts]);

  // Quiz score trend (last 10 attempts)
  const quizScoreTrend = useMemo(() => {
    const sorted = [...attempts]
      .sort(
        (a, b) =>
          new Date(a.completed_at).getTime() -
          new Date(b.completed_at).getTime()
      )
      .slice(-10);
    return sorted.map((a, i) => ({
      name: `#${i + 1}`,
      score: a.total_questions
        ? Math.round((a.score / a.total_questions) * 100)
        : 0,
      subject:
        a.quizzes?.subjects?.name || a.quizzes?.title?.slice(0, 15) || "Quiz",
    }));
  }, [attempts]);

  // Score by subject for pie chart
  const scoreBySubject = useMemo(() => {
    const map = new Map<string, { total: number; scored: number; count: number }>();
    for (const a of attempts) {
      const name =
        a.quizzes?.subjects?.name ?? a.quizzes?.title ?? "General";
      const prev = map.get(name) ?? { total: 0, scored: 0, count: 0 };
      prev.total += a.total_questions || 0;
      prev.scored += a.score || 0;
      prev.count += 1;
      map.set(name, prev);
    }
    return Array.from(map.entries()).map(([name, v]) => ({
      name: name.length > 12 ? name.slice(0, 12) + "…" : name,
      score: v.total ? Math.round((v.scored / v.total) * 100) : 0,
      attempts: v.count,
    }));
  }, [attempts]);

  // AI activity data (chats by day this week)
  const aiActivityData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();
    return days.map((name, i) => {
      const date = new Date(today);
      const currentDay = today.getDay();
      const distToMon = currentDay === 0 ? -6 : 1 - currentDay;
      date.setDate(today.getDate() + distToMon + i);
      const dateStr = date.toDateString();
      const daySessions = chatSessions.filter(
        (s) => new Date(s.created_at).toDateString() === dateStr
      );
      return { name, sessions: daySessions.length };
    });
  }, [chatSessions]);

  // Roadmap progress from localStorage
  const roadmapProgress = useMemo(() => {
    try {
      const roadmapData = localStorage.getItem("studygpt.planner.roadmap");
      const completionData = localStorage.getItem(
        "studygpt.planner.roadmapCompletion"
      );
      if (!roadmapData) return null;
      const parsed = JSON.parse(roadmapData);
      const completion = completionData ? JSON.parse(completionData) : {};
      const totalTopics =
        parsed.structured?.phases?.reduce(
          (s: number, p: { topics: string[] }) => s + p.topics.length,
          0
        ) ?? 0;
      const completedTopics = Object.values(completion).filter(Boolean).length;
      return {
        totalPhases: parsed.structured?.phases?.length ?? 0,
        totalTopics,
        completedTopics,
        percentage:
          totalTopics > 0
            ? Math.round((completedTopics / totalTopics) * 100)
            : 0,
        goal: parsed.goal || "Learning Goal",
      };
    } catch {
      return null;
    }
  }, []);

  // Flashcard stats
  const flashcardStats = useMemo(() => {
    const reviewed = flashcards.filter((f) => f.box > 1).length;
    const mastered = flashcards.filter((f) => f.box >= 4).length;
    const needsReview = flashcards.filter((f) => {
      if (!f.next_review) return false;
      return new Date(f.next_review) <= new Date();
    }).length;
    return {
      total: flashcards.length,
      reviewed,
      mastered,
      needsReview,
      masteryPct:
        flashcards.length > 0
          ? Math.round((mastered / flashcards.length) * 100)
          : 0,
    };
  }, [flashcards]);

  // Achievements
  const achievements = useMemo(() => {
    const list: Array<{
      icon: typeof Trophy;
      label: string;
      achieved: boolean;
      color: string;
    }> = [];

    const streak = data?.profile.studyStreak ?? 0;
    const quizCount = data?.quizStatistics.totalAttempts ?? 0;
    const avgScore = data?.quizStatistics.averageScorePercentage ?? 0;

    list.push({
      icon: Flame,
      label: "3-Day Streak",
      achieved: streak >= 3,
      color: "text-orange-500",
    });
    list.push({
      icon: Flame,
      label: "7-Day Streak",
      achieved: streak >= 7,
      color: "text-orange-500",
    });
    list.push({
      icon: Trophy,
      label: "First Quiz",
      achieved: quizCount >= 1,
      color: "text-amber-500",
    });
    list.push({
      icon: Star,
      label: "10 Quizzes Taken",
      achieved: quizCount >= 10,
      color: "text-yellow-500",
    });
    list.push({
      icon: Target,
      label: "80%+ Average",
      achieved: avgScore >= 80,
      color: "text-emerald-500",
    });
    list.push({
      icon: BookOpen,
      label: "10 Flashcards",
      achieved: flashcards.length >= 10,
      color: "text-blue-500",
    });
    list.push({
      icon: FileText,
      label: "5 Notes Created",
      achieved: notes.length >= 5,
      color: "text-purple-500",
    });
    list.push({
      icon: Brain,
      label: "AI Explorer",
      achieved: (data?.aiUsageCount ?? 0) >= 5,
      color: "text-indigo-500",
    });
    list.push({
      icon: Award,
      label: "Level 5+",
      achieved: (data?.profile.level ?? 0) >= 5,
      color: "text-pink-500",
    });

    return list;
  }, [data, flashcards, notes]);

  // ── Stat card config ──
  const statCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Study Streak",
        value: `${data.profile.studyStreak}`,
        unit: "days",
        icon: Flame,
        color: "from-orange-500 to-amber-500",
        textColor: "text-orange-500",
        bgColor: "bg-orange-500/10",
      },
      {
        label: "Study Hours",
        value: `${data.profile.totalStudyHours}`,
        unit: "hours",
        icon: Clock,
        color: "from-blue-500 to-indigo-500",
        textColor: "text-blue-500",
        bgColor: "bg-blue-500/10",
      },
      {
        label: "Quiz Accuracy",
        value: `${data.quizStatistics.averageScorePercentage}%`,
        unit: "",
        icon: Target,
        color: "from-emerald-500 to-teal-500",
        textColor: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
      },
      {
        label: "AI Interactions",
        value: `${data.aiUsageCount}`,
        unit: "total",
        icon: Brain,
        color: "from-purple-500 to-fuchsia-500",
        textColor: "text-purple-500",
        bgColor: "bg-purple-500/10",
      },
      {
        label: "XP Level",
        value: `Lv ${data.profile.level}`,
        unit: `${data.profile.xp} XP`,
        icon: Zap,
        color: "from-amber-500 to-yellow-500",
        textColor: "text-amber-500",
        bgColor: "bg-amber-500/10",
      },
      {
        label: "Quizzes Taken",
        value: `${data.quizStatistics.totalAttempts}`,
        unit: "total",
        icon: BarChart3,
        color: "from-rose-500 to-pink-500",
        textColor: "text-rose-500",
        bgColor: "bg-rose-500/10",
      },
    ];
  }, [data]);

  // ── Render ──
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Comprehensive insights into your learning journey."
      />

      {/* ═══════════ STAT CARDS ═══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          : statCards.map((c) => (
              <Card
                key={c.label}
                className="glass p-4 border-border/40 hover:shadow-lg transition-all duration-300 group overflow-hidden relative"
              >
                <div
                  className={cn(
                    "absolute -top-4 -right-4 h-20 w-20 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity bg-gradient-to-br",
                    c.color
                  )}
                />
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center mb-2",
                    c.bgColor
                  )}
                >
                  <c.icon className={cn("h-4 w-4", c.textColor)} />
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  {c.label}
                </div>
                <div className="text-xl font-bold mt-0.5 gradient-text">
                  {c.value}
                </div>
                {c.unit && (
                  <div className="text-[10px] text-muted-foreground">
                    {c.unit}
                  </div>
                )}
              </Card>
            ))}
      </div>

      {/* ═══════════ WEEKLY GOAL PROGRESS ═══════════ */}
      {!loading && data && (
        <Card className="glass p-5 border-border/40 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Weekly Study Goal</h3>
                <p className="text-[11px] text-muted-foreground">
                  {data.weeklyActualHours} of {data.weeklyGoalHours} hours
                  completed
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                data.weeklyActualHours >= data.weeklyGoalHours
                  ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                  : "text-muted-foreground"
              )}
            >
              {data.weeklyGoalHours > 0
                ? Math.round(
                    (data.weeklyActualHours / data.weeklyGoalHours) * 100
                  )
                : 0}
              %
            </Badge>
          </div>
          <Progress
            value={
              data.weeklyGoalHours > 0
                ? Math.min(
                    100,
                    (data.weeklyActualHours / data.weeklyGoalHours) * 100
                  )
                : 0
            }
            className="h-2.5"
          />
        </Card>
      )}

      {/* ═══════════ CHARTS ROW 1 ═══════════ */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Weekly Activity Chart */}
        <Card className="glass p-5 border-border/40">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Weekly Activity</h3>
              <p className="text-[11px] text-muted-foreground">
                Quizzes taken & avg score this week
              </p>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-52 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={weeklyStudyData} barGap={2}>
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
                  fontSize={11}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }}
                />
                <Bar
                  dataKey="quizzes"
                  fill={chartColors.primary}
                  radius={[6, 6, 0, 0]}
                  name="Quizzes"
                />
                <Bar
                  dataKey="score"
                  fill={chartColors.success}
                  radius={[6, 6, 0, 0]}
                  name="Avg Score %"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Monthly Trend Chart */}
        <Card className="glass p-5 border-border/40">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Monthly Trend</h3>
              <p className="text-[11px] text-muted-foreground">
                Last 4 weeks overview
              </p>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-52 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={monthlyStudyData}>
                <defs>
                  <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={chartColors.secondary}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={chartColors.secondary}
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
                  fontSize={11}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="avgScore"
                  stroke={chartColors.secondary}
                  fillOpacity={1}
                  fill="url(#gradArea)"
                  strokeWidth={2}
                  name="Avg Score %"
                />
                <Area
                  type="monotone"
                  dataKey="quizzes"
                  stroke={chartColors.primary}
                  fillOpacity={0.1}
                  fill={chartColors.primary}
                  strokeWidth={2}
                  name="Quizzes"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ═══════════ CHARTS ROW 2 ═══════════ */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Quiz Score Trend */}
        <Card className="glass p-5 border-border/40">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Quiz Score Trend</h3>
              <p className="text-[11px] text-muted-foreground">
                Last 10 quiz attempts
              </p>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-52 w-full rounded-lg" />
          ) : quizScoreTrend.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
              No quiz attempts yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={quizScoreTrend}>
                <defs>
                  <linearGradient
                    id="gradLine"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={chartColors.success}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor={chartColors.success}
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
                  fontSize={11}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={chartColors.success}
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: chartColors.success,
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 6 }}
                  name="Score %"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* AI Activity Chart */}
        <Card className="glass p-5 border-border/40">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-fuchsia-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Activity</h3>
              <p className="text-[11px] text-muted-foreground">
                Chat sessions this week
              </p>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-52 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={aiActivityData}>
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
                  fontSize={11}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  allowDecimals={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }}
                />
                <Bar
                  dataKey="sessions"
                  fill={chartColors.secondary}
                  radius={[6, 6, 0, 0]}
                  name="AI Sessions"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ═══════════ METRICS ROW ═══════════ */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Planner Completion */}
        <Card className="glass p-5 border-border/40">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-indigo-500" />
            </div>
            <h3 className="font-semibold text-sm">Planner</h3>
          </div>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold gradient-text">
                  {data?.plannerProgress.completedTasks ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {data?.plannerProgress.totalTasks ?? 0} tasks
                </span>
              </div>
              <Progress
                value={data?.plannerProgress.completionPercentage ?? 0}
                className="h-1.5 mb-1.5"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>
                  {data?.plannerProgress.pendingTasks ?? 0} pending
                </span>
                <span className="font-semibold">
                  {data?.plannerProgress.completionPercentage ?? 0}%
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Flashcards */}
        <Card className="glass p-5 border-border/40">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="font-semibold text-sm">Flashcards</h3>
          </div>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold gradient-text">
                  {flashcardStats.total}
                </span>
                <span className="text-xs text-muted-foreground">cards</span>
              </div>
              <Progress
                value={flashcardStats.masteryPct}
                className="h-1.5 mb-1.5"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{flashcardStats.reviewed} reviewed</span>
                <span>{flashcardStats.mastered} mastered</span>
              </div>
            </div>
          )}
        </Card>

        {/* Documents */}
        <Card className="glass p-5 border-border/40">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Upload className="h-4 w-4 text-cyan-500" />
            </div>
            <h3 className="font-semibold text-sm">Documents</h3>
          </div>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-bold gradient-text">
                  {uploads.length}
                </span>
                <span className="text-xs text-muted-foreground">uploaded</span>
              </div>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{notes.length} notes</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{chatSessions.length} chats</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Roadmap Progress */}
        <Card className="glass p-5 border-border/40">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-rose-500" />
            </div>
            <h3 className="font-semibold text-sm">Roadmap</h3>
          </div>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : roadmapProgress ? (
            <div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold gradient-text">
                  {roadmapProgress.percentage}%
                </span>
              </div>
              <Progress
                value={roadmapProgress.percentage}
                className="h-1.5 mb-1.5"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{roadmapProgress.totalPhases} phases</span>
                <span>
                  {roadmapProgress.completedTopics}/
                  {roadmapProgress.totalTopics} topics
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-3">
              No roadmap generated yet
            </div>
          )}
        </Card>
      </div>

      {/* ═══════════ BOTTOM ROW ═══════════ */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Quiz scores by subject - Pie Chart */}
        <Card className="glass p-5 border-border/40 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-pink-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Scores by Subject</h3>
              <p className="text-[11px] text-muted-foreground">
                Quiz performance breakdown
              </p>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-52 w-full rounded-lg" />
          ) : scoreBySubject.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
              No quiz history yet
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={scoreBySubject}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="attempts"
                    stroke="none"
                  >
                    {scoreBySubject.map((_, i) => (
                      <Cell
                        key={i}
                        fill={piePalette[i % piePalette.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {scoreBySubject.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{
                        background: piePalette[i % piePalette.length],
                      }}
                    />
                    <span className="text-xs truncate flex-1">{s.name}</span>
                    <span className="text-xs font-semibold">{s.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Recent Achievements */}
        <Card className="glass p-5 border-border/40 lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Achievements</h3>
              <p className="text-[11px] text-muted-foreground">
                {achievements.filter((a) => a.achieved).length} of{" "}
                {achievements.length} unlocked
              </p>
            </div>
          </div>
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {achievements.map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-300",
                    a.achieved
                      ? "bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border-amber-500/20 shadow-sm"
                      : "border-border/30 opacity-50 grayscale"
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      a.achieved ? "bg-amber-500/15" : "bg-muted/30"
                    )}
                  >
                    <a.icon
                      className={cn(
                        "h-4 w-4",
                        a.achieved ? a.color : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{a.label}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {a.achieved ? "Unlocked ✓" : "Locked"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}