import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Sparkles, Trash2, Plus, Loader2 } from "lucide-react";
import { plannerService, aiService, type PlannerTask } from "@/lib/api";
import { toast } from "sonner";
import { emitAppRefresh } from "@/lib/events";

export const Route = createFileRoute("/app/planner")({
  component: PlannerPage,
});

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayGradient = [
  "from-blue-500 to-indigo-500",
  "from-purple-500 to-fuchsia-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-cyan-500 to-sky-500",
  "from-violet-500 to-purple-500",
];

function PlannerPage() {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    plannerService.list().then(setTasks).catch(() => setTasks([])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const addTask = async () => {
    const t = newTitle.trim();
    if (!t) return;
    try {
      const task = await plannerService.create({ title: t, priority: "medium" });
      setTasks((prev) => [task, ...prev]);
      setNewTitle("");
      toast.success("Task added");
      emitAppRefresh({ source: "planner" });
    } catch (e: any) { toast.error(e?.message || "Could not add task"); }
  };

  const removeTask = async (id: string) => {
    try {
      await plannerService.remove(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Task deleted");
      emitAppRefresh({ source: "planner" });
    } catch (e: any) { toast.error(e?.message || "Delete failed"); }
  };

  const regenerate = async () => {
    if (!focus.trim()) { toast.error("Enter a focus area first"); return; }
    setBusy(true);
    try {
      const res = await aiService.plannerGenerator(focus.trim(), hoursPerDay);
      for (const t of res.plannerTasks) {
        await plannerService.create({
          title: t.title,
          description: t.description,
          priority: (t.priority as any) || "medium",
        });
      }
      await load();
      toast.success("Plan generated");
      emitAppRefresh({ source: "planner" });
    } catch (e: any) {
      toast.error(e?.message || "Could not generate plan");
    } finally { setBusy(false); }
  };

  // Group tasks by weekday of due_date; tasks without a date go to "Anytime".
  const byDay: PlannerTask[][] = Array.from({ length: 7 }, () => []);
  const anytime: PlannerTask[] = [];
  for (const t of tasks) {
    if (!t.due_date) { anytime.push(t); continue; }
    const d = new Date(t.due_date);
    const idx = (d.getDay() + 6) % 7; // Mon=0
    byDay[idx].push(t);
  }

  return (
    <div>
      <PageHeader title="AI Study Planner" description="A plan built from your real tasks and goals." />
      <Card className="p-5 mb-6 grid sm:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <Label className="text-xs">Focus area</Label>
          <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. Databases exam prep" />
        </div>
        <div>
          <Label className="text-xs">Study hours/day</Label>
          <Input type="number" min={1} max={12} value={hoursPerDay}
            onChange={(e) => setHoursPerDay(Number(e.target.value) || 1)} />
        </div>
        <Button onClick={regenerate} disabled={busy}
          className="self-end gradient-primary-bg text-white border-0 hover:opacity-90">
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Regenerate
        </Button>
      </Card>

      <Card className="p-5 mb-6 flex gap-2">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
          placeholder="Add a task…" />
        <Button onClick={addTask} className="gradient-primary-bg text-white border-0">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </Card>

      {loading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : tasks.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No tasks yet. Add one above or click Regenerate.
        </Card>
      ) : (
        <>
          <Card className="p-4 overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[700px]">
              {days.map((d, i) => (
                <div key={d}>
                  <div className="text-center text-sm font-semibold mb-2">{d}</div>
                  <div className="space-y-2">
                    {byDay[i].map((t) => (
                      <div key={t.id} className={`rounded-lg p-2.5 text-xs text-white bg-gradient-to-br ${dayGradient[i]}`}>
                        <div className="opacity-80">
                          {new Date(t.due_date!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="font-medium mt-0.5">{t.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {anytime.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {anytime.map((t) => (
                <Card key={t.id} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{t.title}</div>
                      {t.description ? <div className="text-xs text-muted-foreground mt-1">{t.description}</div> : null}
                      <Badge variant="secondary" className="mt-2 text-xs">{t.priority}</Badge>
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive"
                      onClick={() => removeTask(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}