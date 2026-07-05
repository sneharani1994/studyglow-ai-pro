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
          <Skeleton key={i} className="h-28 rounded-xl" />
        )) : stats.map((s) => {
          const Icon = ICONS[s.icon] ?? Sparkles;
          return (
            <Card key={s.label} className="p-5 glass hover:shadow-glow transition-all">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg gradient-primary-bg/10 grid place-items-center text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                {s.change ? <Badge variant="secondary" className="text-xs">{s.change}</Badge> : null}
              </div>
              <div className="mt-3 text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Today's study plan</h3>
            <Link to="/app/planner"><Button variant="ghost" size="sm">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : todaysTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3">No tasks for today. Open the planner to add one.</div>
            ) : todaysTasks.map((t) => {
              const done = t.status === "completed";
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  {done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  <div className="flex-1">
                    <div className={done ? "line-through text-muted-foreground" : "font-medium"}>{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.due_date ? new Date(t.due_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""} · {t.priority}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Upcoming</h3>
          <div className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : upcomingTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No upcoming exams. <Link to="/app/planner" className="text-primary underline">Add one</Link>.
              </div>
            ) : upcomingTasks.map((t, i) => {
              const due = new Date(t.due_date!);
              const days = Math.max(0, Math.ceil((due.getTime() - Date.now()) / 86400000));
              return (
                <div key={t.id} className={`rounded-lg p-4 bg-gradient-to-br ${EXAM_GRADIENTS[i % EXAM_GRADIENTS.length]} text-white`}>
                  <div className="text-xs opacity-80">{due.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}</div>
                  <div className="font-semibold mt-1">{t.title}</div>
                  <div className="text-xs opacity-80 mt-1">{days} day{days === 1 ? "" : "s"} left</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-lg mb-4">Recent activity</h3>
          <div className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-2/3" />
              </>
            ) : recentActivity.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent activity yet.</div>
            ) : recentActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="h-2 w-2 rounded-full gradient-primary-bg mt-1.5 shrink-0" />
                <div className="flex-1">
                  <span className="text-muted-foreground">{a.action}</span> <span className="font-medium">{a.target}</span>
                </div>
                <span className="text-xs text-muted-foreground">{a.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Weak topics</h3>
          <div className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </>
            ) : weakTopics.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No quiz history yet. <Link to="/app/quizzes" className="text-primary underline">Take a quiz</Link>.
              </div>
            ) : weakTopics.map((w) => (
              <div key={w.topic}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{w.topic}</span>
                  <span className="text-muted-foreground">{w.strength}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full gradient-primary-bg" style={{ width: `${w.strength}%` }} />
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