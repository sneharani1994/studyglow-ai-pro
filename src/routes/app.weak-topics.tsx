import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { BookOpen, BrainCircuit, Layers } from "lucide-react";
import { weakTopics } from "@/lib/mock-data";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";

export const Route = createFileRoute("/app/weak-topics")({
  component: WeakPage,
});

function WeakPage() {
  return (
    <div>
      <PageHeader title="Weak Topic Detector" description="The gaps AI found in your understanding." />
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
              <Button size="sm" variant="outline"><BookOpen className="h-3.5 w-3.5 mr-1" />Revise</Button>
              <Button size="sm" variant="outline"><BrainCircuit className="h-3.5 w-3.5 mr-1" />Quiz</Button>
              <Button size="sm" variant="outline"><Layers className="h-3.5 w-3.5 mr-1" />Cards</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}