import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import {
  FileText, MessageSquare, Clock, BrainCircuit, Flame, Sparkles, ArrowRight, CheckCircle2, Circle,
} from "lucide-react";
import { useUser } from "@/lib/auth";
import { dashboardService, plannerService, type DashboardStats, type PlannerTask } from "@/lib/api";

// UI-only fixtures for sections the backend does not expose yet.
const upcomingExams = [
  { id: 1, subject: "Database Management", date: "Jun 22", days: 6, color: "from-blue-500 to-indigo-500" },
  { id: 2, subject: "Operating Systems", date: "Jun 28", days: 12, color: "from-purple-500 to-pink-500" },
  { id: 3, subject: "Computer Networks", date: "Jul 04", days: 18, color: "from-fuchsia-500 to-rose-500" },
];
const weakTopics = [
  { topic: "Normalization", strength: 38 },
  { topic: "Deadlock", strength: 42 },
  { topic: "Routing Algorithms", strength: 51 },
  { topic: "Process Scheduling", strength: 58 },
];
const aiRecommendations = [
  { id: 1, title: "Master Normalization in 30 min", desc: "AI-curated lesson based on your weak areas" },
  { id: 2, title: "Quiz: Process Scheduling", desc: "10 questions, medium difficulty" },
  { id: 3, title: "Watch: TCP/IP deep dive", desc: "Suggested from your saved notes" },
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

  useEffect(() => {
    dashboardService.get().then(setData).catch(() => setData(null));
    plannerService.list({ timeFrame: "daily" }).then(setTodaysTasks).catch(() => setTodaysTasks([]));
  }, []);

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
        {stats.map((s) => {
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
            {todaysTasks.length === 0 ? (
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
          <h3 className="font-semibold text-lg mb-4">Upcoming exams</h3>
          <div className="space-y-3">
            {upcomingExams.map((e) => (
              <div key={e.id} className={`rounded-lg p-4 bg-gradient-to-br ${e.color} text-white`}>
                <div className="text-xs opacity-80">{e.date}</div>
                <div className="font-semibold mt-1">{e.subject}</div>
                <div className="text-xs opacity-80 mt-1">{e.days} days left</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-lg mb-4">Recent activity</h3>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
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
            {weakTopics.slice(0, 4).map((w) => (
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
            <h3 className="font-semibold text-lg">AI recommendations for you</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {aiRecommendations.map((r) => (
              <div key={r.id} className="rounded-xl bg-card p-4 shadow-card">
                <div className="font-medium">{r.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{r.desc}</div>
                <Button variant="link" className="px-0 mt-2 h-auto text-primary">Start now →</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}