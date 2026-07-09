import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import {
  FileText, MessageSquare, Clock, BrainCircuit, Flame, Sparkles, ArrowRight, CheckCircle2, Circle,
} from "lucide-react";
import { useUser } from "@/lib/auth";
import {
  dashboardService, plannerService, quizzesService, aiService,
  type DashboardStats, type PlannerTask, type QuizAttempt,
} from "@/lib/api";
import { useAppRefresh } from "@/lib/events";

const EXAM_GRADIENTS = [
  "from-blue-500 to-indigo-500",
  "from-purple-500 to-pink-500",
  "from-fuchsia-500 to-rose-500",
  "from-emerald-500 to-teal-500",
];

const ICONS: Record<string, typeof FileText> = {
  FileText, MessageSquare, Clock, BrainCircuit, Flame, Sparkles,
};

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const user = useUser();
  const firstName = (user?.name ?? "there").split(" ")[0];
  const [data, setData] = useState<DashboardStats | null>(null);
  const [todaysTasks, setTodaysTasks] = useState<PlannerTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<PlannerTask[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [aiHistory, setAiHistory] = useState<Array<{ id: string; feature_type: string; prompt: string }>>([]);
  const [loading, setLoading] = useState(true);

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

  // Derive weak topics from low-scoring quiz attempts.
  const weakTopics = (() => {
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
  })();

  const stats = [
    { label: "Documents", value: data?.recentNotes.length ?? 0, change: "", icon: "FileText" },
    { label: "AI Sessions", value: data?.aiUsageCount ?? 0, change: "", icon: "Sparkles" },
    { label: "Study Hours", value: data?.profile.totalStudyHours ?? 0, change: "", icon: "Clock" },
    { label: "Quizzes Taken", value: data?.quizStatistics.totalAttempts ?? 0, change: `${data?.quizStatistics.averageScorePercentage ?? 0}% avg`, icon: "BrainCircuit" },
    { label: "Learning Streak", value: `${data?.profile.studyStreak ?? 0} days`, change: "🔥", icon: "Flame" },
    { label: "Flashcards", value: data?.flashcardsCount ?? 0, change: "", icon: "MessageSquare" },
  ];

  const recentActivity = [
    ...(data?.recentNotes ?? []).map((n) => ({
      id: `note-${n.id}`,
      action: "Updated note",
      target: n.title,
      time: new Date(n.updated_at).toLocaleDateString(),
    })),
    ...(data?.recentChats ?? []).map((c) => ({
      id: `chat-${c.id}`,
      action: "Asked AI",
      target: c.title,
      time: new Date(c.updated_at).toLocaleDateString(),
    })),
  ].slice(0, 5);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName} 👋`}
        description="Here's what's on your plate today."
        action={
          <Link to="/app/chat">
            <Button className="gradient-primary-bg text-white border-0 hover:opacity-90">
              <Sparkles className="h-4 w-4 mr-2" /> Ask AI
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {loading ? Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl bg-muted/40" />
        )) : stats.map((s) => {
          const Icon = ICONS[s.icon] ?? Sparkles;
          const isStreak = s.icon === "Flame";
          return (
            <Card key={s.label} className="p-5 glass border-border/40 hover:border-border/80 hover:shadow-glow transition-all duration-300 hover:-translate-y-0.5 group">
              <div className="flex items-center justify-between">
                <div className={`h-9 w-9 rounded-lg ${isStreak
                  ? "bg-rose-500/10 text-rose-500"
                  : "bg-primary/10 text-primary"
                  }`}>
                  <Icon className={`h-4.5 w-4.5 ${isStreak ? "animate-pulse" : ""}`} />
                </div>
                {s.change ? (
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0.5 font-semibold ${isStreak
                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    : "bg-primary/10 text-primary border-primary/20"
                    }`}>
                    {s.change}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-4 text-2xl font-bold tracking-tight text-foreground/95">{s.value}</div>
              <div className="text-xs text-muted-foreground/80 mt-0.5 font-medium">{s.label}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 border-border/40 glass">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-base text-foreground/90">Today's study plan</h3>
              <p className="text-xs text-muted-foreground/80 mt-0.5">Tasks scheduled for today</p>
            </div>
            <Link to="/app/planner">
              <Button variant="ghost" size="sm" className="text-xs text-primary hover:bg-primary/5">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-14 w-full rounded-lg bg-muted/40" />
                <Skeleton className="h-14 w-full rounded-lg bg-muted/40" />
                <Skeleton className="h-14 w-full rounded-lg bg-muted/40" />
              </>
            ) : todaysTasks.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-10 border border-dashed rounded-lg bg-muted/10">
                No tasks for today. Open the planner to add one.
              </div>
            ) : todaysTasks.map((t) => {
              const done = t.status === "completed";
              const priorityColor = t.priority === "high" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                t.priority === "medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
              return (
                <div key={t.id} className={`flex items-center gap-3 p-3.5 rounded-xl border border-border/10 transition-all duration-200 ${done
                  ? "bg-muted/20 opacity-60"
                  : "bg-card hover:bg-muted/20 shadow-sm border-border/30"
                  }`}>
                  <div className="shrink-0">
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/10" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold truncate ${done ? "line-through text-muted-foreground" : "text-foreground"
                      }`} >
                      {t.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground/75 mt-0.5 flex items-center gap-2">
                      {t.due_date ? <span>{new Date(t.due_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span> : null}
                      {t.due_date && <span>·</span>}
                      <span>{t.priority} priority</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 ${priorityColor}`}>
                    {t.priority}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 border-border/40 glass">
          <div className="mb-5">
            <h3 className="font-bold text-base text-foreground/90">Upcoming Exams</h3>
            <p className="text-xs text-muted-foreground/80 mt-0.5">Prepare ahead of time</p>
          </div>
          <div className="space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-20 w-full rounded-xl bg-muted/40" />
                <Skeleton className="h-20 w-full rounded-xl bg-muted/40" />
              </>
            ) : upcomingTasks.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-10 border border-dashed rounded-lg bg-muted/10">
                No upcoming exams. <Link to="/app/planner" className="text-primary underline">Add one</Link>.
              </div>
            ) : upcomingTasks.map((t, i) => {
              const due = new Date(t.due_date!);
              const days = Math.max(0, Math.ceil((due.getTime() - Date.now()) / 86400000));
              return (
                <div key={t.id} className="relative rounded-xl overflow-hidden shadow-sm bg-gradient-soft border border-border/40 p-4 pl-5">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 gradient-primary-bg" />
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {due.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}
                  </div>
                  <div className="font-bold text-xs mt-1 text-foreground/90 leading-tight">{t.title}</div>
                  <div className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold mt-2.5 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                    <Clock className="h-3 w-3" /> {days} day{days === 1 ? "" : "s"} left
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2 border-border/40 glass">
          <div className="mb-5">
            <h3 className="font-bold text-base text-foreground/90">Recent activity</h3>
            <p className="text-xs text-muted-foreground/80 mt-0.5 font-normal">Tracking your progress log</p>
          </div>
          <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/40">
            {loading ? (
              <>
                <Skeleton className="h-10 w-full bg-muted/40" />
                <Skeleton className="h-10 w-full bg-muted/40" />
                <Skeleton className="h-10 w-full bg-muted/40" />
              </>
            ) : recentActivity.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4">No recent activity yet.</div>
            ) : recentActivity.map((a) => (
              <div key={a.id} className="relative flex items-start gap-3 text-xs leading-relaxed group">
                <span className="absolute -left-[18.5px] top-1.5 h-2 w-2 rounded-full border bg-background border-primary transition-transform duration-300 group-hover:scale-125" />
                <div className="flex-1 min-w-0">
                  <span className="text-muted-foreground/90">{a.action}</span>{" "}
                  <span className="font-semibold text-foreground/80 truncate inline-block max-w-[200px] align-bottom">{a.target}</span>
                </div>
                <span className="text-[10px] text-muted-foreground/75 font-normal shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border-border/40 glass">
          <div className="mb-5">
            <h3 className="font-bold text-base text-foreground/90">Weak topics</h3>
            <p className="text-xs text-muted-foreground/80 mt-0.5">Focus areas based on quiz accuracy</p>
          </div>
          <div className="space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-10 w-full bg-muted/40" />
                <Skeleton className="h-10 w-full bg-muted/40" />
                <Skeleton className="h-10 w-full bg-muted/40" />
              </>
            ) : weakTopics.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-10 border border-dashed rounded-lg bg-muted/10">
                No quiz history yet. <Link to="/app/quizzes" className="text-primary underline">Take a quiz</Link>.
              </div>
            ) : weakTopics.map((w) => (
              <div key={w.topic}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-foreground/80">{w.topic}</span>
                  <span className="text-muted-foreground text-[10px] font-bold">{w.strength}% strength</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden border border-border/10 p-0.5">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500" style={{ width: `${w.strength}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-3 gradient-soft-bg border-0">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-lg">Recent AI activity</h3>
          </div>
          {loading ? (
            <div className="grid md:grid-cols-3 gap-4">
              <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
            </div>
          ) : aiHistory.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No AI activity yet. <Link to="/app/chat" className="text-primary underline">Ask your first question</Link>.
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {aiHistory.map((r) => (
                <div key={r.id} className="rounded-xl bg-card p-4 shadow-card">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{r.feature_type.replace(/_/g, " ")}</div>
                  <div className="font-medium mt-1 line-clamp-2">{r.prompt}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}