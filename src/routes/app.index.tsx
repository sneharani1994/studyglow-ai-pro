import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import {
  FileText, MessageSquare, Clock, BrainCircuit, Flame, Sparkles, ArrowRight, CheckCircle2, Circle,
} from "lucide-react";
import { stats, recentActivity, upcomingExams, todaysPlan, weakTopics, aiRecommendations } from "@/lib/mock-data";
import { useUser } from "@/lib/auth";

const ICONS: Record<string, typeof FileText> = {
  FileText, MessageSquare, Clock, BrainCircuit, Flame, Sparkles,
};

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const user = useUser();
  const firstName = (user?.name ?? "there").split(" ")[0];
  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName} 👋`}
        description="Here's what's on your plate today."
        action={
          <Button className="gradient-primary-bg text-white border-0 hover:opacity-90">
            <Sparkles className="h-4 w-4 mr-2" /> Ask AI
          </Button>
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
                <Badge variant="secondary" className="text-xs">{s.change}</Badge>
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
            <Button variant="ghost" size="sm">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
          </div>
          <div className="space-y-2">
            {todaysPlan.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                {t.done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                <div className="flex-1">
                  <div className={t.done ? "line-through text-muted-foreground" : "font-medium"}>{t.task}</div>
                  <div className="text-xs text-muted-foreground">{t.time} · {t.duration}</div>
                </div>
              </div>
            ))}
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
            {recentActivity.map((a) => (
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