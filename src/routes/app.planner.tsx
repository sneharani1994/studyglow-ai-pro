import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Sparkles, Trash2, Plus, Loader2, Map, Check } from "lucide-react";
import { plannerService, aiService, type PlannerTask } from "@/lib/api";
import { toast } from "sonner";
import { emitAppRefresh } from "@/lib/events";
import { AIResponse } from "@/components/ai-response";

export const Route = createFileRoute("/app/planner")({ component: PlannerPage });

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
const priorityBadge: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  medium: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
};

type WeekPlan = {
  week: number;
  tasks: Array<{
    title: string;
    description: string;
    duration_minutes: number;
    priority: string;
  }>;
};

const PLAN_KEY = "studygpt.planner.weeks";
const ROADMAP_KEY = "studygpt.planner.roadmap";

function PlannerPage() {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const [weekPlans, setWeekPlans] = useState<WeekPlan[]>([]);
  const [activeWeek, setActiveWeek] = useState(1);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const [roadmapGoal, setRoadmapGoal] = useState("");
  const [roadmapWeeks, setRoadmapWeeks] = useState(4);
  const [roadmap, setRoadmap] = useState<string>("");
  const [roadmapBusy, setRoadmapBusy] = useState(false);

  const load = () =>
    plannerService.list().then(setTasks).catch(() => setTasks([])).finally(() => setLoading(false));

  useEffect(() => {
    load();
    try {
      const raw = window.localStorage.getItem(PLAN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.focus) setFocus(parsed.focus);
        if (parsed?.hoursPerDay) setHoursPerDay(parsed.hoursPerDay);
        if (Array.isArray(parsed?.weeks)) setWeekPlans(parsed.weeks);
        if (parsed?.completed) setCompleted(parsed.completed);
      }
      const rm = window.localStorage.getItem(ROADMAP_KEY);
      if (rm) {
        const p = JSON.parse(rm);
        setRoadmapGoal(p.goal || "");
        setRoadmapWeeks(p.weeks || 4);
        setRoadmap(p.content || "");
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PLAN_KEY, JSON.stringify({ focus, hoursPerDay, weeks: weekPlans, completed }));
    } catch { /* ignore */ }
  }, [focus, hoursPerDay, weekPlans, completed]);

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

  const generateWeeks = async () => {
    const f = focus.trim();
    if (!f) { toast.error("Enter a focus area first"); return; }
    setBusy(true);
    try {
      const built: WeekPlan[] = [];
      for (let w = 1; w <= 4; w++) {
        const prompt = `Week ${w} of a 4-week study plan for: ${f}. Focus this week on ${w === 1 ? "foundations" : w === 2 ? "core concepts" : w === 3 ? "advanced topics and practice" : "revision, mock tests, and mastery"}. Return actionable study tasks.`;
        const res = await aiService.plannerGenerator(prompt, hoursPerDay);
        built.push({ week: w, tasks: res.plannerTasks });
      }
      setWeekPlans(built);
      setActiveWeek(1);
      // Also push week 1 tasks to backend planner for persistence
      const w1 = built[0];
      for (const t of w1.tasks) {
        await plannerService.create({
          title: `[W1] ${t.title}`,
          description: t.description,
          priority: (t.priority as any) || "medium",
        });
      }
      await load();
      toast.success("4-week study plan generated");
      emitAppRefresh({ source: "planner" });
    } catch (e: any) {
      toast.error(e?.message || "Could not generate plan");
    } finally { setBusy(false); }
  };

  const toggleDone = (weekIdx: number, taskIdx: number) => {
    const key = `w${weekIdx}-t${taskIdx}`;
    setCompleted((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const generateRoadmap = async () => {
    const g = roadmapGoal.trim();
    if (!g) { toast.error("Enter a learning goal"); return; }
    setRoadmapBusy(true);
    try {
      const res = await aiService.roadmap(g, roadmapWeeks);
      const rm = res.roadmap;
      const md = [
        `# ${rm.title}`,
        "",
        rm.description,
        "",
        ...rm.steps.map((s) => `## ${s.phase}\n\n${s.topics.map((t) => `- ${t}`).join("\n")}`),
      ].join("\n");
      setRoadmap(md);
      try {
        window.localStorage.setItem(ROADMAP_KEY, JSON.stringify({ goal: g, weeks: roadmapWeeks, content: md }));
      } catch { /* ignore */ }
      toast.success("Roadmap generated");
      emitAppRefresh({ source: "planner" });
    } catch (e: any) {
      toast.error(e?.message || "Could not generate roadmap");
    } finally { setRoadmapBusy(false); }
  };

  // Group backend tasks by weekday of due_date.
  const byDay: PlannerTask[][] = Array.from({ length: 7 }, () => []);
  const anytime: PlannerTask[] = [];
  for (const t of tasks) {
    if (!t.due_date) { anytime.push(t); continue; }
    const d = new Date(t.due_date);
    const idx = (d.getDay() + 6) % 7;
    byDay[idx].push(t);
  }

  const currentWeek = weekPlans.find((w) => w.week === activeWeek);
  const currentWeekIdx = weekPlans.findIndex((w) => w.week === activeWeek);
  const totalWeekTasks = currentWeek?.tasks.length ?? 0;
  const doneInWeek = currentWeek
    ? currentWeek.tasks.filter((_, i) => completed[`w${currentWeekIdx}-t${i}`]).length
    : 0;
  const weekPct = totalWeekTasks ? Math.round((doneInWeek / totalWeekTasks) * 100) : 0;

  return (
    <div>
      <PageHeader title="AI Study Planner" description="A structured 4-week plan built from your goals, with a roadmap and daily tasks." />

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
        <Button onClick={generateWeeks} disabled={busy}
          className="self-end gradient-primary-bg text-white border-0 hover:opacity-90">
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate 4-week plan
        </Button>
      </Card>

      {weekPlans.length > 0 && (
        <Card className="p-5 mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {weekPlans.map((w) => (
              <Button key={w.week} size="sm"
                variant={activeWeek === w.week ? "default" : "outline"}
                className={activeWeek === w.week ? "gradient-primary-bg text-white border-0" : ""}
                onClick={() => setActiveWeek(w.week)}>
                Week {w.week}
              </Button>
            ))}
            <div className="ml-auto text-xs text-muted-foreground self-center">
              {doneInWeek}/{totalWeekTasks} done · {weekPct}%
            </div>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-4">
            <div className="h-full gradient-primary-bg transition-all" style={{ width: `${weekPct}%` }} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {currentWeek?.tasks.map((t, i) => {
              const key = `w${currentWeekIdx}-t${i}`;
              const done = !!completed[key];
              return (
                <div key={key} className={`p-4 rounded-lg border flex items-start gap-3 ${done ? "opacity-60 bg-muted/40" : ""}`}>
                  <button
                    onClick={() => toggleDone(currentWeekIdx, i)}
                    className={`mt-0.5 h-5 w-5 rounded border grid place-items-center shrink-0 ${done ? "gradient-primary-bg border-0 text-white" : "border-muted-foreground/30"}`}
                    aria-label="Toggle complete"
                  >
                    {done && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${done ? "line-through" : ""}`}>Day {i + 1}: {t.title}</div>
                    {t.description && <div className="text-xs text-muted-foreground mt-1">{t.description}</div>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className={`text-xs ${priorityBadge[t.priority] || ""}`}>{t.priority}</Badge>
                      <Badge variant="outline" className="text-xs">{t.duration_minutes || 60} min</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Map className="h-4 w-4 text-primary" />
          <div className="font-semibold">Learning Roadmap</div>
        </div>
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end mb-4">
          <div>
            <Label className="text-xs">Learning goal</Label>
            <Input value={roadmapGoal} onChange={(e) => setRoadmapGoal(e.target.value)}
              placeholder="e.g. Become job-ready in Data Science" />
          </div>
          <div>
            <Label className="text-xs">Weeks</Label>
            <Input type="number" min={1} max={52} value={roadmapWeeks}
              onChange={(e) => setRoadmapWeeks(Number(e.target.value) || 4)} className="w-24" />
          </div>
          <Button onClick={generateRoadmap} disabled={roadmapBusy}
            className="gradient-primary-bg text-white border-0">
            {roadmapBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate roadmap
          </Button>
        </div>
        <AIResponse
          content={roadmap}
          loading={roadmapBusy}
          onRegenerate={roadmap ? generateRoadmap : undefined}
          title={roadmapGoal ? `Roadmap · ${roadmapGoal}` : undefined}
          pdfFileName={`roadmap-${roadmapGoal || "plan"}`}
          emptyState={
            <div className="p-6 text-center text-sm text-muted-foreground rounded-lg border border-dashed">
              Enter a goal and click <b>Generate roadmap</b> to see phases, topics and milestones.
            </div>
          }
        />
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
          No saved tasks yet. Add one above or click Generate.
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