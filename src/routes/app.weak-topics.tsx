import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { BookOpen, BrainCircuit, Layers } from "lucide-react";
import { quizzesService, type QuizAttempt } from "@/lib/api";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";

export const Route = createFileRoute("/app/weak-topics")({
  component: WeakPage,
});

interface WeakTopic { topic: string; subject: string; strength: number; }

function WeakPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);

  useEffect(() => {
    quizzesService.attempts().then((atts: QuizAttempt[]) => {
      const map = new Map<string, { subject: string; total: number; scored: number }>();
      for (const a of atts) {
        const title = a.quizzes?.title ?? "Quiz";
        const subject = a.quizzes?.subjects?.name ?? "General";
        const prev = map.get(title) ?? { subject, total: 0, scored: 0 };
        prev.total += a.total_questions || 0;
        prev.scored += a.score || 0;
        map.set(title, prev);
      }
      const list = Array.from(map.entries()).map(([topic, v]) => ({
        topic, subject: v.subject,
        strength: v.total ? Math.round((v.scored / v.total) * 100) : 0,
      })).sort((a, b) => a.strength - b.strength);
      setWeakTopics(list);
    }).catch(() => setWeakTopics([])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Weak Topic Detector" description="The gaps AI found in your understanding." />
      {loading ? (
        <Card className="p-6 mb-6"><Skeleton className="h-64 w-full" /></Card>
      ) : weakTopics.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-lg font-semibold mb-2">No quiz history yet</div>
          <div className="text-sm text-muted-foreground mb-4">Take a quiz so we can spot your weak topics.</div>
          <Link to="/app/quizzes"><Button>Go to Quizzes</Button></Link>
        </Card>
      ) : (
      <>
      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-4">Topic strength</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={weakTopics} layout="vertical" margin={{ left: 80 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis dataKey="topic" type="category" tickLine={false} axisLine={false} width={120} />
            <Tooltip cursor={{ fill: "rgba(120,120,255,0.05)" }} />
            <Bar dataKey="strength" radius={[0, 8, 8, 0]}>
              {weakTopics.map((w, i) => (
                <Cell key={i} fill={w.strength < 50 ? "#ef4444" : w.strength < 70 ? "#f59e0b" : "#10b981"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {weakTopics.map((w) => (
          <Card key={w.topic} className="p-5">
            <div className="text-xs text-muted-foreground">{w.subject}</div>
            <div className="font-semibold mt-1">{w.topic}</div>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${w.strength < 50 ? "bg-red-500" : w.strength < 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${w.strength}%` }} />
            </div>
            <div className="text-xs mt-1 text-muted-foreground">{w.strength}% mastery</div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => navigate({ to: "/app/revision" })}>
                <BookOpen className="h-3.5 w-3.5 mr-1" />Revise
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate({ to: "/app/quizzes" })}>
                <BrainCircuit className="h-3.5 w-3.5 mr-1" />Quiz
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate({ to: "/app/flashcards" })}>
                <Layers className="h-3.5 w-3.5 mr-1" />Cards
              </Button>
            </div>
          </Card>
        ))}
      </div>
      </>
      )}
    </div>
  );
}