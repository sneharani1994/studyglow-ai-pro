import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/planner")({
  component: PlannerPage,
});

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const planSlots = [
  { day: 0, time: "09:00", task: "DBMS - Normalization", color: "from-blue-500 to-indigo-500" },
  { day: 0, time: "14:00", task: "OS - Deadlocks", color: "from-purple-500 to-fuchsia-500" },
  { day: 1, time: "10:00", task: "Quiz: SQL Joins", color: "from-emerald-500 to-teal-500" },
  { day: 2, time: "11:00", task: "CN - Routing", color: "from-amber-500 to-orange-500" },
  { day: 3, time: "09:00", task: "Revision: DBMS", color: "from-blue-500 to-indigo-500" },
  { day: 4, time: "15:00", task: "Mock interview", color: "from-rose-500 to-pink-500" },
  { day: 5, time: "10:00", task: "Weak topic drill", color: "from-purple-500 to-fuchsia-500" },
];

function PlannerPage() {
  return (
    <div>
      <PageHeader title="AI Study Planner" description="A weekly plan that adapts to your pace." />
      <Card className="p-5 mb-6 grid sm:grid-cols-4 gap-4">
        <div>
          <Label className="text-xs">Exam date</Label>
          <Input type="date" defaultValue="2026-07-15" />
        </div>
        <div>
          <Label className="text-xs">Subjects</Label>
          <Input defaultValue="DBMS, OS, CN" />
        </div>
        <div>
          <Label className="text-xs">Study hours/day</Label>
          <Input type="number" defaultValue="4" />
        </div>
        <Button className="self-end gradient-primary-bg text-white border-0 hover:opacity-90">
          <Sparkles className="h-4 w-4 mr-2" /> Regenerate
        </Button>
      </Card>

      <Card className="p-4 overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {days.map((d, i) => (
            <div key={d}>
              <div className="text-center text-sm font-semibold mb-2">{d}</div>
              <div className="space-y-2">
                {planSlots.filter((s) => s.day === i).map((s, j) => (
                  <div key={j} className={`rounded-lg p-2.5 text-xs text-white bg-gradient-to-br ${s.color}`}>
                    <div className="opacity-80">{s.time}</div>
                    <div className="font-medium mt-0.5">{s.task}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {[
          { label: "Priority", task: "Master Normalization", badge: "High" },
          { label: "This week", task: "Complete 3 mock tests", badge: "Goal" },
          { label: "Next milestone", task: "DBMS chapter review", badge: "Jun 22" },
        ].map((c) => (
          <Card key={c.label} className="p-5">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="font-semibold mt-1">{c.task}</div>
            <Badge variant="secondary" className="mt-2">{c.badge}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}