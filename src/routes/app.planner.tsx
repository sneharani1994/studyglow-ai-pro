import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { PageHeader } from "@/components/page-header";
import {
  Sparkles,
  Trash2,
  Plus,
  Loader2,
  Map,
  Check,
  Calendar,
  Clock,
  AlertCircle,
  Copy,
  Download,
  Maximize2,
  Edit2,
  CalendarDays,
  Menu,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  CheckCircle2,
  Target,
  BookOpen,
  Trophy,
  ArrowDown,
} from "lucide-react";
import {
  plannerService,
  aiService,
  type PlannerTask,
  type PlannerPriority,
  type PlannerRecurrence,
  type PlannerStatus,
} from "@/lib/api";
import { toast } from "sonner";
import { emitAppRefresh } from "@/lib/events";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/planner")({ component: PlannerPage });

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayGradients = [
  "from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300",
  "from-purple-500/10 to-fuchsia-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300",
  "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  "from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300",
  "from-rose-500/10 to-pink-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300",
  "from-cyan-500/10 to-sky-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-300",
  "from-violet-500/10 to-purple-500/10 border-violet-500/20 text-violet-700 dark:text-violet-300",
];

const priorityBadges: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
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

type RoadmapPhase = {
  phase: string;
  topics: string[];
};

type RoadmapStructured = {
  title: string;
  description: string;
  phases: RoadmapPhase[];
};

const PLAN_KEY = "studygpt.planner.weeks";
const ROADMAP_KEY = "studygpt.planner.roadmap";
const ROADMAP_COMPLETION_KEY = "studygpt.planner.roadmapCompletion";
const TAB_PERSIST_KEY = "studygpt.planner.activeTab";
const COLLAPSE_PERSIST_KEY = "studygpt.planner.collapsedWeeks";
const HIDE_COMPLETED_PERSIST_KEY = "studygpt.planner.hideCompleted";

const phaseGradients = [
  "from-blue-500/15 to-indigo-500/10 border-blue-500/25",
  "from-purple-500/15 to-fuchsia-500/10 border-purple-500/25",
  "from-emerald-500/15 to-teal-500/10 border-emerald-500/25",
  "from-amber-500/15 to-orange-500/10 border-amber-500/25",
  "from-rose-500/15 to-pink-500/10 border-rose-500/25",
  "from-cyan-500/15 to-sky-500/10 border-cyan-500/25",
  "from-violet-500/15 to-purple-500/10 border-violet-500/25",
  "from-lime-500/15 to-green-500/10 border-lime-500/25",
];

const phaseAccents = [
  "text-blue-600 dark:text-blue-400",
  "text-purple-600 dark:text-purple-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-amber-600 dark:text-amber-400",
  "text-rose-600 dark:text-rose-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-violet-600 dark:text-violet-400",
  "text-lime-600 dark:text-lime-400",
];

const phaseConnectors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-violet-500",
  "bg-lime-500",
];

function PlannerPage() {
  // Main Data States (cached for instant load)
  const [tasks, setTasks] = useState<PlannerTask[]>(() => {
    try {
      const cached = localStorage.getItem("studygpt.planner.tasks");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [weekPlans, setWeekPlans] = useState<WeekPlan[]>([]);
  const [roadmap, setRoadmap] = useState<string>("");
  const [roadmapData, setRoadmapData] = useState<RoadmapStructured | null>(null);
  const [roadmapExpandedPhases, setRoadmapExpandedPhases] = useState<Record<number, boolean>>({});
  const [roadmapPhaseCompletion, setRoadmapPhaseCompletion] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(ROADMAP_COMPLETION_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Planner Config
  const [focus, setFocus] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [activeWeek, setActiveWeek] = useState(1);
  const [completedAIPlanTasks, setCompletedAIPlanTasks] = useState<Record<string, boolean>>({});

  // Quick Add task state
  const [newTitle, setNewTitle] = useState("");

  // Roadmap States
  const [roadmapGoal, setRoadmapGoal] = useState("");
  const [roadmapWeeks, setRoadmapWeeks] = useState(4);

  // Active Layout / UI state
  const [activeTab, setActiveTab] = useState<string>("calendar");
  const [collapsedWeeks, setCollapsedWeeks] = useState<number[]>([]);
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>(() => {
    try {
      return localStorage.getItem("studygpt.planner.priorityFilter") || "all";
    } catch {
      return "all";
    }
  });
  const [collapsedCompletedDays, setCollapsedCompletedDays] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("studygpt.planner.collapsedCompletedDays");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [roadmapFullscreen, setRoadmapFullscreen] = useState(false);

  // Touch and Mouse Drag states
  const touchDragTaskId = useRef<string | null>(null);
  const [activeTouchCol, setActiveTouchCol] = useState<string | null>(null);
  const [dragHoverCol, setDragHoverCol] = useState<string | null>(null);

  // Task Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTask, setEditorTask] = useState<PlannerTask | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorDescription, setEditorDescription] = useState("");
  const [editorPriority, setEditorPriority] = useState<PlannerPriority>("medium");
  const [editorDueDate, setEditorDueDate] = useState("");
  const [editorRecurrence, setEditorRecurrence] = useState<PlannerRecurrence>("none");
  const [editorStudyTime, setEditorStudyTime] = useState<number>(0);

  // Loaders
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [roadmapBusy, setRoadmapBusy] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);

  // 1. Calculate Week Dates
  const weekDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const todayIndex = useMemo(() => {
    const todayStr = new Date().toDateString();
    return weekDates.findIndex((d) => d.toDateString() === todayStr);
  }, [weekDates]);

  // Load initial lists & restore persisted configs
  const loadTasks = () => {
    setLoading(true);
    plannerService
      .list()
      .then((res) => {
        setTasks(res);
        try {
          localStorage.setItem("studygpt.planner.tasks", JSON.stringify(res));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        // Fall back to cache on failure, no crash
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTasks();

    // Restores configs
    try {
      const savedPlan = localStorage.getItem(PLAN_KEY);
      if (savedPlan) {
        const parsed = JSON.parse(savedPlan);
        if (parsed?.focus) setFocus(parsed.focus);
        if (parsed?.hoursPerDay) setHoursPerDay(parsed.hoursPerDay);
        if (Array.isArray(parsed?.weeks)) setWeekPlans(parsed.weeks);
        if (parsed?.completed) setCompletedAIPlanTasks(parsed.completed);
      }

      const savedRoadmap = localStorage.getItem(ROADMAP_KEY);
      if (savedRoadmap) {
        const parsed = JSON.parse(savedRoadmap);
        setRoadmapGoal(parsed.goal || "");
        setRoadmapWeeks(parsed.weeks || 4);
        setRoadmap(parsed.content || "");
        if (parsed.structured) {
          setRoadmapData(parsed.structured);
          // Auto-expand all phases on load
          const expanded: Record<number, boolean> = {};
          parsed.structured.phases?.forEach((_: RoadmapPhase, i: number) => { expanded[i] = true; });
          setRoadmapExpandedPhases(expanded);
        }
      }

      const savedTab = localStorage.getItem(TAB_PERSIST_KEY);
      if (savedTab) setActiveTab(savedTab);

      const savedCollapsed = localStorage.getItem(COLLAPSE_PERSIST_KEY);
      if (savedCollapsed) setCollapsedWeeks(JSON.parse(savedCollapsed));

      const savedHideCompleted = localStorage.getItem(HIDE_COMPLETED_PERSIST_KEY);
      if (savedHideCompleted) setHideCompletedTasks(JSON.parse(savedHideCompleted));
    } catch {
      /* ignore */
    }
  }, []);

  // Sync state to localstorage
  useEffect(() => {
    try {
      localStorage.setItem(
        PLAN_KEY,
        JSON.stringify({ focus, hoursPerDay, weeks: weekPlans, completed: completedAIPlanTasks })
      );
    } catch {
      /* ignore */
    }
  }, [focus, hoursPerDay, weekPlans, completedAIPlanTasks]);

  useEffect(() => {
    localStorage.setItem(TAB_PERSIST_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_PERSIST_KEY, JSON.stringify(collapsedWeeks));
  }, [collapsedWeeks]);

  useEffect(() => {
    localStorage.setItem(HIDE_COMPLETED_PERSIST_KEY, JSON.stringify(hideCompletedTasks));
  }, [hideCompletedTasks]);

  useEffect(() => {
    localStorage.setItem("studygpt.planner.priorityFilter", priorityFilter);
  }, [priorityFilter]);

  useEffect(() => {
    localStorage.setItem("studygpt.planner.collapsedCompletedDays", JSON.stringify(collapsedCompletedDays));
  }, [collapsedCompletedDays]);

  // Touch handlers for mobile drag and drop
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchDragTaskId.current = id;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragTaskId.current) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const colDropzone = elem?.closest("[data-dropzone]");
    if (colDropzone) {
      const colId = colDropzone.getAttribute("data-dropzone");
      if (colId) {
        setActiveTouchCol(colId);
      }
    } else {
      setActiveTouchCol(null);
    }
  };

  const handleTouchEnd = () => {
    if (touchDragTaskId.current && activeTouchCol !== null) {
      handleMoveTask(touchDragTaskId.current, activeTouchCol);
    }
    touchDragTaskId.current = null;
    setActiveTouchCol(null);
  };

  useEffect(() => {
    try {
      localStorage.setItem("studygpt.planner.tasks", JSON.stringify(tasks));
    } catch {
      /* ignore */
    }
  }, [tasks]);

  // Group backend tasks by weekday or anytime
  const groupedTasks = useMemo(() => {
    const columns: Record<string, PlannerTask[]> = {
      anytime: [],
      ...daysOfWeek.reduce((acc, _, i) => {
        acc[i.toString()] = [];
        return acc;
      }, {} as Record<string, PlannerTask[]>),
    };

    tasks.forEach((t) => {
      // If completed tasks are hidden, filter them out
      if (hideCompletedTasks && t.status === "completed") return;

      // Filter by priority
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return;

      if (!t.due_date) {
        columns.anytime.push(t);
        return;
      }

      const dueDate = new Date(t.due_date);
      const dueDateStr = dueDate.toDateString();

      // Check if it belongs to current week date
      const matchedIdx = weekDates.findIndex((d) => d.toDateString() === dueDateStr);
      if (matchedIdx !== -1) {
        columns[matchedIdx.toString()].push(t);
      } else {
        // Overdue or other week, group in Anytime for visibility
        columns.anytime.push(t);
      }
    });

    // Sort column tasks by priority/date
    Object.keys(columns).forEach((key) => {
      columns[key].sort((a, b) => {
        if (a.status === "completed" && b.status !== "completed") return 1;
        if (a.status !== "completed" && b.status === "completed") return -1;
        const priorities = { high: 0, medium: 1, low: 2 };
        return priorities[a.priority] - priorities[b.priority];
      });
    });

    return columns;
  }, [tasks, weekDates, hideCompletedTasks, priorityFilter]);

  // Overdue Check helper
  const isOverdue = (task: PlannerTask) => {
    if (task.status === "completed" || !task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate.getTime() < today.getTime();
  };

  // Add Quick Task
  const handleQuickAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const task = await plannerService.create({
        title,
        priority: "medium",
        status: "todo",
      });
      setTasks((prev) => [task, ...prev]);
      setNewTitle("");
      toast.success("Task added successfully");
      emitAppRefresh({ source: "planner" });
    } catch (e: any) {
      toast.error(e?.message || "Could not add task");
    }
  };

  // Delete Task
  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    const originalTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await plannerService.remove(id);
      toast.success("Task deleted");
      emitAppRefresh({ source: "planner" });
    } catch (e: any) {
      setTasks(originalTasks);
      toast.error(e?.message || "Delete failed");
    }
  };

  // Toggle Complete checkbox on calendar tasks
  const handleToggleComplete = async (task: PlannerTask) => {
    const targetStatus: PlannerStatus = task.status === "completed" ? "todo" : "completed";
    const originalTasks = [...tasks];

    // Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: targetStatus } : t))
    );

    try {
      await plannerService.update(task.id, { status: targetStatus });
      toast.success(
        targetStatus === "completed" ? "Task completed! Great job." : "Task marked as todo"
      );
      emitAppRefresh({ source: "planner" });
    } catch (e: any) {
      setTasks(originalTasks);
      toast.error(e?.message || "Could not update task status");
    }
  };

  // Move task (optimistic scheduler with failure revert)
  const handleMoveTask = async (taskId: string, targetDayIdx: string | "anytime") => {
    const originalTasks = [...tasks];
    const taskIdx = tasks.findIndex((t) => t.id === taskId);
    if (taskIdx === -1) return;

    const task = tasks[taskIdx];
    let newDueDate: string | null = null;

    if (targetDayIdx !== "anytime") {
      const dayDate = weekDates[Number(targetDayIdx)];
      const updatedDate = new Date(dayDate);
      if (task.due_date) {
        const prev = new Date(task.due_date);
        updatedDate.setHours(prev.getHours(), prev.getMinutes(), prev.getSeconds());
      } else {
        updatedDate.setHours(9, 0, 0, 0); // 9 AM Default
      }
      newDueDate = updatedDate.toISOString();
    }

    // Check if the change is a duplicate (same column/day)
    const isSameDate =
      (!task.due_date && !newDueDate) ||
      (task.due_date &&
        newDueDate &&
        new Date(task.due_date).toDateString() === new Date(newDueDate).toDateString());

    if (isSameDate) {
      return;
    }

    // Optimistic local state update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, due_date: newDueDate } : t))
    );

    try {
      await plannerService.update(taskId, { dueDate: newDueDate });
      toast.success(
        targetDayIdx === "anytime"
          ? "Rescheduled to unscheduled tasks"
          : `Moved to ${daysOfWeek[Number(targetDayIdx)]}`
      );
      emitAppRefresh({ source: "planner" });
    } catch (e: any) {
      setTasks(originalTasks);
      toast.error(e?.message || "Rescheduling failed. Reverting.");
    }
  };

  // HTML5 Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetCol: string | "anytime") => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) {
      handleMoveTask(id, targetCol);
    }
  };

  // Generate 4-week Plan
  const generateAIPlan = async () => {
    const f = focus.trim();
    if (!f) {
      toast.error("Please enter a focus area first");
      return;
    }
    setBusy(true);
    try {
      const built: WeekPlan[] = [];
      for (let w = 1; w <= 4; w++) {
        const prompt = `Week ${w} of a 4-week study plan for: ${f}. Focus this week on ${
          w === 1
            ? "foundations"
            : w === 2
            ? "core concepts"
            : w === 3
            ? "advanced topics and practice"
            : "revision, mock tests, and mastery"
        }. Return actionable study tasks.`;
        const res = await aiService.plannerGenerator(prompt, hoursPerDay);
        built.push({ week: w, tasks: res.plannerTasks });
      }
      setWeekPlans(built);
      setActiveWeek(1);

      // Create Week 1 tasks on the planner server automatically
      const w1 = built[0];
      for (const t of w1.tasks) {
        await plannerService.create({
          title: `[W1] ${t.title}`,
          description: `[${t.duration_minutes || 60} min] ${t.description}`,
          priority: (t.priority as any) || "medium",
        });
      }
      loadTasks();
      toast.success("4-week study plan generated & Week 1 schedules saved!");
      emitAppRefresh({ source: "planner" });
    } catch (e: any) {
      toast.error(e?.message || "Could not generate plan");
    } finally {
      setBusy(false);
    }
  };

  // AI syllabus task toggles
  const handleToggleAITask = (weekIdx: number, taskIdx: number) => {
    const key = `w${weekIdx}-t${taskIdx}`;
    setCompletedAIPlanTasks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Roadmap Generator
  const generateRoadmap = async () => {
    const g = roadmapGoal.trim();
    if (!g) {
      toast.error("Enter a learning goal first");
      return;
    }
    setRoadmapBusy(true);
    try {
      const res = await aiService.roadmap(g, roadmapWeeks);
      const rm = res.roadmap;
      const md = [
        `# ${rm.title}`,
        "",
        `**Overview**: ${rm.description}`,
        "",
        ...rm.steps.map(
          (s) => `### Phase: ${s.phase}\n\n${s.topics.map((t) => `- ${t}`).join("\n")}\n`
        ),
      ].join("\n");

      const structured: RoadmapStructured = {
        title: rm.title,
        description: rm.description,
        phases: rm.steps.map((s) => ({ phase: s.phase, topics: s.topics })),
      };

      setRoadmap(md);
      setRoadmapData(structured);

      // Auto-expand all phases
      const expanded: Record<number, boolean> = {};
      structured.phases.forEach((_, i) => { expanded[i] = true; });
      setRoadmapExpandedPhases(expanded);

      try {
        localStorage.setItem(
          ROADMAP_KEY,
          JSON.stringify({ goal: g, weeks: roadmapWeeks, content: md, structured })
        );
      } catch {
        /* ignore */
      }
      toast.success("Milestone roadmap generated");
      emitAppRefresh({ source: "planner" });
    } catch (e: any) {
      toast.error(e?.message || "Could not generate roadmap");
    } finally {
      setRoadmapBusy(false);
    }
  };

  // Toggle roadmap topic completion
  const toggleRoadmapTopic = (phaseIdx: number, topicIdx: number) => {
    const key = `p${phaseIdx}-t${topicIdx}`;
    setRoadmapPhaseCompletion((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(ROADMAP_COMPLETION_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  // Toggle expand/collapse phase
  const toggleRoadmapPhaseExpand = (phaseIdx: number) => {
    setRoadmapExpandedPhases((prev) => ({ ...prev, [phaseIdx]: !prev[phaseIdx] }));
  };

  // Calculate phase progress
  const getPhaseProgress = (phaseIdx: number, topicCount: number) => {
    let completed = 0;
    for (let t = 0; t < topicCount; t++) {
      if (roadmapPhaseCompletion[`p${phaseIdx}-t${t}`]) completed++;
    }
    return topicCount > 0 ? Math.round((completed / topicCount) * 100) : 0;
  };

  // Roadmap PDF export
  const handleExportPDF = () => {
    if (!roadmap) return;
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(roadmapGoal ? `Roadmap: ${roadmapGoal}` : "Study Roadmap", 20, 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const split = doc.splitTextToSize(roadmap, 170);
      let y = 30;
      split.forEach((line: string) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 6;
      });
      doc.save(`roadmap-${roadmapGoal.replace(/\s+/g, "-") || "plan"}.pdf`);
      toast.success("Roadmap exported as PDF");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  // Task Dialog Editor handlers
  const handleOpenEditor = (task: PlannerTask) => {
    // Parse duration if stored in description as [X min]
    const match = task.description.match(/^\[(\d+)\s*min\]\s*(.*)$/s);
    const duration = match ? Number(match[1]) : 0;
    const cleanDesc = match ? match[2] : task.description;

    setEditorTask(task);
    setEditorTitle(task.title);
    setEditorDescription(cleanDesc);
    setEditorPriority(task.priority);
    setEditorRecurrence(task.recurrence);
    setEditorStudyTime(duration);

    // Format ISO string into YYYY-MM-DD local format
    if (task.due_date) {
      const d = new Date(task.due_date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const date = String(d.getDate()).padStart(2, "0");
      setEditorDueDate(`${year}-${month}-${date}`);
    } else {
      setEditorDueDate("");
    }
    setEditorOpen(true);
  };

  const handleSaveTaskEditor = async () => {
    if (!editorTask) return;
    const trimmedTitle = editorTitle.trim();
    if (!trimmedTitle) {
      toast.error("Task title cannot be empty");
      return;
    }
    if (trimmedTitle.length > 100) {
      toast.error("Task title must be under 100 characters");
      return;
    }
    if (editorStudyTime < 0 || isNaN(editorStudyTime)) {
      toast.error("Study duration must be 0 or a positive number");
      return;
    }

    setEditorSaving(true);
    // Append duration meta to description
    const formattedDesc = editorStudyTime > 0
      ? `[${editorStudyTime} min] ${editorDescription.trim()}`
      : editorDescription.trim();

    // Parse YYYY-MM-DD back to ISO String
    let parsedDueDate: string | null = null;
    if (editorDueDate) {
      const parts = editorDueDate.split("-");
      const d = new Date();
      d.setFullYear(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setHours(9, 0, 0, 0); // Standardize at 9 AM
      parsedDueDate = d.toISOString();
    }

    const payload = {
      title: editorTitle.trim(),
      description: formattedDesc,
      priority: editorPriority,
      recurrence: editorRecurrence,
      dueDate: parsedDueDate,
    };

    try {
      const updated = await plannerService.update(editorTask.id, payload);
      // Immediately refresh task list locally without reload
      setTasks((prev) => prev.map((t) => (t.id === editorTask.id ? updated : t)));
      setEditorOpen(false);
      toast.success("Task updated successfully");
      emitAppRefresh({ source: "planner" });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update task");
    } finally {
      setEditorSaving(false);
    }
  };

  // Week Progress bar stats
  const selectedWeekTasks = useMemo(() => {
    const currentWeek = weekPlans.find((w) => w.week === activeWeek);
    const idx = weekPlans.findIndex((w) => w.week === activeWeek);
    if (!currentWeek) return { done: 0, total: 0, pct: 0, tasks: [] };

    const tasksList = currentWeek.tasks;
    const done = tasksList.filter((_, i) => completedAIPlanTasks[`w${idx}-t${i}`]).length;
    const total = tasksList.length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    return { done, total, pct, tasks: tasksList };
  }, [weekPlans, activeWeek, completedAIPlanTasks]);

  return (
    <div className="relative pb-8 min-h-[calc(100vh-8rem)]">
      {/* Decorative Orbs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />

      <PageHeader
        title="AI Study Planner"
        description="Structured syllabus planner, learning roadmap, and calendar task dashboard."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-3">
          <TabsList className="h-10 p-1 w-full sm:w-auto grid grid-cols-3">
            <TabsTrigger value="calendar" className="text-xs">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Weekly Calendar
            </TabsTrigger>
            <TabsTrigger value="ai-plan" className="text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> AI study plan
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="text-xs">
              <Map className="h-3.5 w-3.5 mr-1.5" /> Milestones Roadmap
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-3">
            {activeTab === "calendar" && (
              <>
                <div className="flex items-center gap-2 bg-muted/20 px-3 py-1 rounded-lg border border-border/40 text-xs">
                  <Label htmlFor="hide-complete-toggle" className="cursor-pointer font-medium text-xs">
                    Hide Completed
                  </Label>
                  <Switch
                    id="hide-complete-toggle"
                    checked={hideCompletedTasks}
                    onCheckedChange={setHideCompletedTasks}
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-muted/20 px-2.5 py-1 rounded-lg border border-border/40">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-7 text-[10px] w-28 bg-transparent border-0 focus:ring-0 shadow-none p-0 [&>span]:truncate [&>svg]:h-3 [&>svg]:w-3">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[11px]">All Priorities</SelectItem>
                      <SelectItem value="high" className="text-[11px] text-rose-500 font-semibold">High Priority</SelectItem>
                      <SelectItem value="medium" className="text-[11px] text-amber-500 font-semibold">Medium Priority</SelectItem>
                      <SelectItem value="low" className="text-[11px] text-emerald-500 font-semibold">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleQuickAdd();
                }}
                placeholder="Quick add task..."
                className="h-9 text-xs w-44"
              />
              <Button onClick={handleQuickAdd} size="sm" className="gradient-primary-bg text-white border-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
           TAB 1: Calendar View (Kanban style columns)
           ═══════════════════════════════════════════════ */}
        <TabsContent value="calendar" className="outline-none">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 animate-card-enter max-w-lg mx-auto my-8">
              <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <h4 className="font-semibold mb-1.5 text-sm">Your Weekly Schedule is Empty</h4>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                Start by creating custom study tasks, or switch to the AI Study Plan tab to generate a personalized 4-week study blueprint.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => {
                    setEditorTask(null);
                    setEditorTitle("");
                    setEditorDescription("");
                    setEditorPriority("medium");
                    setEditorDueDate("");
                    setEditorRecurrence("none");
                    setEditorStudyTime(0);
                    setEditorOpen(true);
                  }}
                  variant="default"
                  className="text-xs gradient-primary-bg border-0 text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Create Task
                </Button>
                <Button
                  onClick={() => setActiveTab("ai-plan")}
                  variant="outline"
                  className="text-xs border-border/60"
                >
                  <Sparkles className="h-4 w-4 mr-1.5 text-primary animate-pulse" /> AI Study Plan
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3 items-start overflow-x-auto pb-4">
              {/* Unscheduled Column */}
              <div
                data-dropzone="anytime"
                className={cn(
                  "glass rounded-xl p-3 border min-w-[160px] flex flex-col min-h-[400px] transition-all duration-200",
                  "border-border/30",
                  (dragHoverCol === "anytime" || activeTouchCol === "anytime") && "border-primary/80 bg-primary/10 scale-[1.01] shadow-md"
                )}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => { e.preventDefault(); setDragHoverCol("anytime"); }}
                onDragLeave={() => setDragHoverCol(null)}
                onDrop={(e) => { setDragHoverCol(null); handleDrop(e, "anytime"); }}
              >
                <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-bold text-xs">Unscheduled</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {groupedTasks.anytime.length}
                  </Badge>
                </div>

                {(() => {
                  const colTasks = groupedTasks.anytime || [];
                  const activeTasks = colTasks.filter(t => t.status !== "completed");
                  const completedTasks = colTasks.filter(t => t.status === "completed");

                  return (
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {activeTasks.length === 0 && completedTasks.length === 0 ? (
                          <div className="text-[10px] text-muted-foreground/60 text-center py-8 border border-dashed rounded-lg">
                            Drag here to unschedule
                          </div>
                        ) : (
                          activeTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onToggle={() => handleToggleComplete(task)}
                              onDelete={() => handleDeleteTask(task.id)}
                              onEdit={() => handleOpenEditor(task)}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onTouchStart={(e) => handleTouchStart(e, task.id)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              isOverdue={isOverdue(task)}
                              moveOptions={daysOfWeek}
                              onMove={(dayIdx) => handleMoveTask(task.id, dayIdx)}
                            />
                          ))
                        )}
                      </div>

                      {completedTasks.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-border/20">
                          <button
                            onClick={() => {
                              setCollapsedCompletedDays((prev) => ({
                                ...prev,
                                anytime: !prev.anytime,
                              }));
                            }}
                            className="flex items-center justify-between w-full text-[10px] font-semibold text-muted-foreground/80 hover:text-foreground transition-colors py-1 cursor-pointer"
                          >
                            <span>Completed ({completedTasks.length})</span>
                            {collapsedCompletedDays.anytime ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronUp className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {!collapsedCompletedDays.anytime && (
                            <div className="space-y-2 mt-2 animate-card-enter">
                              {completedTasks.map((task) => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  onToggle={() => handleToggleComplete(task)}
                                  onDelete={() => handleDeleteTask(task.id)}
                                  onEdit={() => handleOpenEditor(task)}
                                  onDragStart={(e) => handleDragStart(e, task.id)}
                                  onTouchStart={(e) => handleTouchStart(e, task.id)}
                                  onTouchMove={handleTouchMove}
                                  onTouchEnd={handleTouchEnd}
                                  isOverdue={isOverdue(task)}
                                  moveOptions={daysOfWeek}
                                  onMove={(dayIdx) => handleMoveTask(task.id, dayIdx)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Weekly Columns */}
              {daysOfWeek.map((day, i) => {
                const dayDate = weekDates[i];
                const isToday = i === todayIndex;
                const colTasks = groupedTasks[i.toString()] || [];
                const activeTasks = colTasks.filter(t => t.status !== "completed");
                const completedTasks = colTasks.filter(t => t.status === "completed");
                const colKey = i.toString();

                return (
                  <div
                    key={day}
                    data-dropzone={colKey}
                    className={cn(
                      "glass rounded-xl p-3 border min-w-[160px] flex flex-col min-h-[400px] transition-all duration-200",
                      isToday ? "border-primary bg-primary/5 shadow-glow" : "border-border/30",
                      (dragHoverCol === colKey || activeTouchCol === colKey) && "border-primary/80 bg-primary/10 scale-[1.01] shadow-md"
                    )}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={(e) => { e.preventDefault(); setDragHoverCol(colKey); }}
                    onDragLeave={() => setDragHoverCol(null)}
                    onDrop={(e) => { setDragHoverCol(null); handleDrop(e, colKey); }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2 border-b border-border/40 pb-2">
                      <div className="min-w-0">
                        <span className={cn("font-bold text-xs", isToday && "text-primary font-bold")}>
                          {day}
                        </span>
                        <div className="text-[9px] text-muted-foreground/80 font-mono mt-0.5">
                          {dayDate.toLocaleDateString([], { month: "short", day: "numeric" })}
                        </div>
                      </div>
                      {isToday && (
                        <Badge className="gradient-primary-bg text-white border-0 text-[8px] h-4 px-1.5">
                          Today
                        </Badge>
                      )}
                    </div>

                    {/* Column Content */}
                    <div className="flex-1 flex flex-col justify-between mt-1">
                      <div className="space-y-2">
                        {activeTasks.length === 0 && completedTasks.length === 0 ? (
                          <div className="text-[10px] text-muted-foreground/50 text-center py-10 border border-dashed rounded-lg">
                            Drop tasks here
                          </div>
                        ) : (
                          activeTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onToggle={() => handleToggleComplete(task)}
                              onDelete={() => handleDeleteTask(task.id)}
                              onEdit={() => handleOpenEditor(task)}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onTouchStart={(e) => handleTouchStart(e, task.id)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              isOverdue={isOverdue(task)}
                              moveOptions={[...daysOfWeek, "anytime"]}
                              onMove={(target) => handleMoveTask(task.id, target)}
                            />
                          ))
                        )}
                      </div>

                      {completedTasks.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-border/20">
                          <button
                            onClick={() => {
                              setCollapsedCompletedDays((prev) => ({
                                ...prev,
                                [colKey]: !prev[colKey],
                              }));
                            }}
                            className="flex items-center justify-between w-full text-[10px] font-semibold text-muted-foreground/80 hover:text-foreground transition-colors py-1 cursor-pointer"
                          >
                            <span>Completed ({completedTasks.length})</span>
                            {collapsedCompletedDays[colKey] ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronUp className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {!collapsedCompletedDays[colKey] && (
                            <div className="space-y-2 mt-2 animate-card-enter">
                              {completedTasks.map((task) => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  onToggle={() => handleToggleComplete(task)}
                                  onDelete={() => handleDeleteTask(task.id)}
                                  onEdit={() => handleOpenEditor(task)}
                                  onDragStart={(e) => handleDragStart(e, task.id)}
                                  onTouchStart={(e) => handleTouchStart(e, task.id)}
                                  onTouchMove={handleTouchMove}
                                  onTouchEnd={handleTouchEnd}
                                  isOverdue={isOverdue(task)}
                                  moveOptions={[...daysOfWeek, "anytime"]}
                                  onMove={(target) => handleMoveTask(task.id, target)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════
           TAB 2: AI Generated Study Plan
           ═══════════════════════════════════════════════ */}
        <TabsContent value="ai-plan" className="outline-none">
          <Card className="glass p-5 mb-6 border-border/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl gradient-primary-bg/10 grid place-items-center text-primary">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Generate AI syllabus plan</h3>
                <p className="text-xs text-muted-foreground">
                  Transform a learning goal into a structured 4-week daily schedule.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-[1fr_200px_auto] gap-4 items-end">
              <div>
                <Label className="text-xs font-semibold">Focus Area / Subject Name</Label>
                <Input
                  id="planner-focus-input"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="e.g. Database Normalization exam prep, Python basics"
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Target Study Hours/Day</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Math.max(1, Math.min(12, Number(e.target.value) || 2)))}
                  className="h-10"
                />
              </div>
              <Button
                onClick={generateAIPlan}
                disabled={busy}
                className="gradient-primary-bg text-white border-0 h-10 shadow-glow px-5"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing focus...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> Generate Study plan
                  </>
                )}
              </Button>
            </div>
          </Card>

          {busy ? (
            <div className="space-y-4 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="glass p-5 border-border/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </Card>
              ))}
            </div>
          ) : weekPlans.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 animate-card-enter max-w-lg mx-auto">
              <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <h4 className="font-semibold mb-1.5">No plan generated yet</h4>
              <p className="text-xs text-muted-foreground mb-5">
                Input your focus area above and generate a 4-week study blueprint.
              </p>
              <Button
                onClick={() => document.getElementById("planner-focus-input")?.focus()}
                variant="outline"
                className="text-xs"
              >
                Get Started
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {weekPlans.map((w, idx) => {
                const isCollapsed = collapsedWeeks.includes(w.week);
                const tasksList = w.tasks;
                const done = tasksList.filter((_, i) => completedAIPlanTasks[`w${idx}-t${i}`]).length;
                const total = tasksList.length;
                const pct = total ? Math.round((done / total) * 100) : 0;

                return (
                  <Card key={w.week} className="glass p-5 border-border/40 shadow-sm transition-all">
                    {/* Header */}
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                      onClick={() => {
                        setCollapsedWeeks(prev =>
                          prev.includes(w.week)
                            ? prev.filter((item) => item !== w.week)
                            : [...prev, w.week]
                        );
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg gradient-primary-bg/10 grid place-items-center text-primary font-bold text-xs shrink-0">
                          W{w.week}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">
                            Week {w.week} Study Agenda
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Focus: {w.week === 1 ? "Foundations" : w.week === 2 ? "Core Concepts" : w.week === 3 ? "Advanced Topics & Practice" : "Revision, Mock Tests & Mastery"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 ml-auto sm:ml-0">
                        <div className="text-right shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {done} / {total} Tasks Done
                          </span>
                          <div className="w-24 mt-1">
                            <Progress value={pct} className="h-1" />
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground pointer-events-none">
                          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Content */}
                    {!isCollapsed && (
                      <div className="grid gap-3 mt-4 pt-4 border-t border-border/20 animate-card-enter">
                        {tasksList.map((task, i) => {
                          const key = `w${idx}-t${i}`;
                          const isDone = !!completedAIPlanTasks[key];

                          return (
                            <Card
                              key={key}
                              className={cn(
                                "p-3.5 border-border/30 transition-all flex items-start gap-3 hover:bg-muted/5",
                                isDone ? "opacity-60 bg-muted/10" : "bg-card"
                              )}
                            >
                              <button
                                onClick={() => handleToggleAITask(idx, i)}
                                className={cn(
                                  "mt-0.5 h-4.5 w-4.5 rounded border grid place-items-center cursor-pointer shrink-0 transition-colors",
                                  isDone ? "gradient-primary-bg border-0 text-white" : "border-border hover:border-primary"
                                )}
                              >
                                {isDone && <Check className="h-3 w-3" />}
                              </button>
                              <div className="min-w-0 flex-1">
                                <h5 className={cn("font-semibold text-xs", isDone && "line-through text-muted-foreground")}>
                                  Day {i + 1}: {task.title}
                                </h5>
                                {task.description && (
                                  <p className="text-[11px] text-muted-foreground/80 mt-1 leading-normal">
                                    {task.description}
                                  </p>
                                )}
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline" className={cn("text-[9px] h-4 px-1 py-0", priorityBadges[task.priority])}>
                                    {task.priority}
                                  </Badge>
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 text-muted-foreground bg-muted/10">
                                    {task.duration_minutes || 60} mins
                                  </Badge>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════
           TAB 3: learning Roadmap preview
           ═══════════════════════════════════════════════ */}
        <TabsContent value="roadmap" className="outline-none">
          <Card className="glass p-5 mb-6 border-border/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl gradient-primary-bg/10 grid place-items-center text-primary">
                <Map className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Learning Goals Roadmap</h3>
                <p className="text-xs text-muted-foreground">
                  Map out learning pathways, timelines, and knowledge milestones.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-[1fr_120px_auto] gap-4 items-end">
              <div>
                <Label className="text-xs font-semibold">Ultimate Learning Goal</Label>
                <Input
                  id="roadmap-goal-input"
                  value={roadmapGoal}
                  onChange={(e) => setRoadmapGoal(e.target.value)}
                  placeholder="e.g. Become fullstack engineer, prepare for AWS exam"
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Weeks Span</Label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={roadmapWeeks}
                  onChange={(e) => setRoadmapWeeks(Math.max(1, Math.min(52, Number(e.target.value) || 4)))}
                  className="h-10"
                />
              </div>
              <Button
                onClick={generateRoadmap}
                disabled={roadmapBusy}
                className="gradient-primary-bg text-white border-0 h-10 px-5 shadow-glow"
              >
                {roadmapBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Plotting phases...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> Generate roadmap
                  </>
                )}
              </Button>
            </div>
          </Card>

          {roadmapBusy ? (
            /* ── Skeleton loading state ── */
            <div className="max-w-4xl mx-auto space-y-6 animate-card-enter">
              <Card className="glass border-border/40 p-6 space-y-3">
                <Skeleton className="h-6 w-2/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </Card>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="w-0.5 flex-1 mt-2" />
                  </div>
                  <Card className="glass border-border/40 p-5 flex-1 space-y-3">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-full mt-2 rounded-full" />
                  </Card>
                </div>
              ))}
            </div>
          ) : roadmapData && roadmapData.phases.length > 0 ? (
            /* ── Premium Structured Roadmap ── */
            <div className="max-w-4xl mx-auto space-y-0 animate-card-enter">
              {/* Overview Card */}
              <Card className="glass border-border/40 p-6 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl gradient-primary-bg flex items-center justify-center text-white shadow-glow">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">{roadmapData.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {roadmapData.phases.length} phases &middot; {roadmapWeeks} weeks
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(roadmap);
                        toast.success("Roadmap copied to clipboard");
                      }}
                      className="h-8 text-xs border-border/60"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportPDF}
                      className="h-8 text-xs border-border/60"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRoadmapFullscreen(!roadmapFullscreen)}
                      className="h-8 text-xs border-border/60"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {roadmapData.description}
                </p>

                {/* Overall progress */}
                {(() => {
                  const totalTopics = roadmapData.phases.reduce((s, p) => s + p.topics.length, 0);
                  const totalDone = Object.values(roadmapPhaseCompletion).filter(Boolean).length;
                  const overallPct = totalTopics > 0 ? Math.round((totalDone / totalTopics) * 100) : 0;
                  return (
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Overall Progress</span>
                        <span className="font-bold">{overallPct}%</span>
                      </div>
                      <Progress value={overallPct} className="h-2" />
                    </div>
                  );
                })()}
              </Card>

              {/* Phase Timeline Cards */}
              {roadmapData.phases.map((phase, phaseIdx) => {
                const isExpanded = roadmapExpandedPhases[phaseIdx] ?? true;
                const progress = getPhaseProgress(phaseIdx, phase.topics.length);
                const isComplete = progress === 100;
                const gradIdx = phaseIdx % phaseGradients.length;
                const isLast = phaseIdx === roadmapData.phases.length - 1;

                return (
                  <div key={phaseIdx} className="relative">
                    {/* Timeline layout */}
                    <div className="flex gap-4 md:gap-6">
                      {/* Timeline connector column */}
                      <div className="flex flex-col items-center shrink-0 relative z-10">
                        {/* Phase circle node */}
                        <button
                          onClick={() => toggleRoadmapPhaseExpand(phaseIdx)}
                          className={cn(
                            "h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all duration-300 hover:scale-110",
                            isComplete
                              ? "bg-emerald-500 shadow-emerald-500/30"
                              : `${phaseConnectors[gradIdx]} shadow-${phaseConnectors[gradIdx].replace("bg-", "")}/30`
                          )}
                        >
                          {isComplete ? (
                            <Trophy className="h-5 w-5" />
                          ) : (
                            <span>{phaseIdx + 1}</span>
                          )}
                        </button>
                        {/* Vertical connector line */}
                        {!isLast && (
                          <div className="w-0.5 flex-1 min-h-[24px] relative mt-1 mb-1">
                            <div className="absolute inset-0 bg-border/40 rounded-full" />
                            <div
                              className={cn("absolute top-0 left-0 w-full rounded-full transition-all duration-500", phaseConnectors[gradIdx])}
                              style={{ height: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Phase card */}
                      <Card
                        className={cn(
                          "flex-1 border shadow-sm transition-all duration-300 mb-4 overflow-hidden",
                          `bg-gradient-to-br ${phaseGradients[gradIdx]}`,
                          isComplete && "opacity-80"
                        )}
                      >
                        {/* Phase header */}
                        <button
                          onClick={() => toggleRoadmapPhaseExpand(phaseIdx)}
                          className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-white/5 dark:hover:bg-white/3 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("h-8 w-8 rounded-lg bg-background/60 dark:bg-background/30 flex items-center justify-center shrink-0", phaseAccents[gradIdx])}>
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className={cn("font-bold text-sm truncate", isComplete && "line-through text-muted-foreground")}>
                                {phase.phase}
                              </h4>
                              <p className="text-[11px] text-muted-foreground">
                                {phase.topics.length} topics &middot; {progress}% complete
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="hidden sm:block w-24">
                              <Progress value={progress} className="h-1.5" />
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {/* Expanded topics checklist */}
                        {isExpanded && (
                          <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-1.5 border-t border-border/20 pt-3">
                            {phase.topics.map((topic, topicIdx) => {
                              const isDone = roadmapPhaseCompletion[`p${phaseIdx}-t${topicIdx}`] ?? false;
                              return (
                                <div
                                  key={topicIdx}
                                  onClick={() => toggleRoadmapTopic(phaseIdx, topicIdx)}
                                  className={cn(
                                    "flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-200 group/topic",
                                    isDone
                                      ? "bg-emerald-500/8 dark:bg-emerald-500/5"
                                      : "hover:bg-background/40 dark:hover:bg-background/20"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "mt-0.5 h-4.5 w-4.5 rounded border grid place-items-center shrink-0 transition-all duration-200",
                                      isDone
                                        ? "gradient-primary-bg border-0 text-white scale-105"
                                        : "border-border/60 group-hover/topic:border-primary/60"
                                    )}
                                  >
                                    {isDone && <Check className="h-3 w-3" />}
                                  </div>
                                  <span
                                    className={cn(
                                      "text-xs leading-snug flex-1",
                                      isDone && "line-through text-muted-foreground"
                                    )}
                                  >
                                    {topic}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    </div>

                    {/* Arrow connector between phases */}
                    {!isLast && (
                      <div className="flex justify-start ml-[18px] md:ml-[22px] -mt-2 mb-1">
                        <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Completion celebration */}
              {(() => {
                const totalTopics = roadmapData.phases.reduce((s, p) => s + p.topics.length, 0);
                const totalDone = Object.values(roadmapPhaseCompletion).filter(Boolean).length;
                return totalTopics > 0 && totalDone === totalTopics ? (
                  <Card className="glass border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6 text-center mt-4 animate-card-enter">
                    <Trophy className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <h3 className="font-bold text-lg mb-1">Roadmap Complete! 🎉</h3>
                    <p className="text-sm text-muted-foreground">
                      You've completed all {totalTopics} topics across {roadmapData.phases.length} phases. Amazing work!
                    </p>
                  </Card>
                ) : null;
              })()}
            </div>
          ) : roadmap ? (
            /* Fallback: markdown render if structured data unavailable */
            <Card className="glass border-border/40 p-6 md:p-8 animate-card-enter relative shadow-sm max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b border-border/30 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg gradient-primary-bg flex items-center justify-center text-white">
                    <Map className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-sm truncate max-w-xs sm:max-w-md">
                    Roadmap: {roadmapGoal}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(roadmap); toast.success("Roadmap copied to clipboard"); }} className="h-8 text-xs border-border/60">
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy MD
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportPDF} className="h-8 text-xs border-border/60">
                    <Download className="h-3.5 w-3.5 mr-1" /> Export PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRoadmapFullscreen(!roadmapFullscreen)} className="h-8 text-xs border-border/60">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmap}</ReactMarkdown>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center border-dashed border-2 animate-card-enter max-w-lg mx-auto">
              <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                <Map className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <h4 className="font-semibold mb-1.5">No roadmap drafted yet</h4>
              <p className="text-xs text-muted-foreground mb-5">
                Set a goal and map out study blocks to track your educational landmarks.
              </p>
              <Button
                onClick={() => document.getElementById("roadmap-goal-input")?.focus()}
                variant="outline"
                className="text-xs animate-pulse"
              >
                Get Started
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════
         FULLSCREEN ROADMAP PREVIEW MODAL
         ═══════════════════════════════════════════════ */}
      <Dialog open={roadmapFullscreen} onOpenChange={setRoadmapFullscreen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="border-b border-border/40 pb-3 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" /> Fullscreen Roadmap Review
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 py-4">
            <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmap}</ReactMarkdown>
            </div>
          </div>
          <DialogFooter className="border-t border-border/40 pt-3 shrink-0">
            <DialogClose asChild>
              <Button variant="outline">Close Preview</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════
         PREMIUM TASK DETAILS EDITOR DIALOG
         ═══════════════════════════════════════════════ */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-4.5 w-4.5 text-primary" /> Task Configuration Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Title</Label>
              <Input
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                placeholder="e.g. Review notes"
                className="h-10"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={editorDescription}
                onChange={(e) => setEditorDescription(e.target.value)}
                placeholder="e.g. Read chapters 3 and 4 of database syllabus"
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Due Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Due Date</Label>
                <Input
                  type="date"
                  value={editorDueDate}
                  onChange={(e) => setEditorDueDate(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              {/* Estimated study time */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Study Duration (Min)</Label>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={editorStudyTime}
                  onChange={(e) => setEditorStudyTime(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select
                  value={editorPriority}
                  onValueChange={(val) => setEditorPriority(val as PlannerPriority)}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recurrence */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Recurrence</Label>
                <Select
                  value={editorRecurrence}
                  onValueChange={(val) => setEditorRecurrence(val as PlannerRecurrence)}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Once only</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="h-10 text-xs">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleSaveTaskEditor}
              disabled={editorSaving}
              className="gradient-primary-bg text-white border-0 h-10 text-xs px-5 shadow-glow"
            >
              {editorSaving ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Individual task card element ───
interface TaskCardProps {
  task: PlannerTask;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  isOverdue: boolean;
  moveOptions: string[];
  onMove: (target: string) => void;
}

function TaskCard({
  task,
  onToggle,
  onDelete,
  onEdit,
  onDragStart,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  isOverdue,
  moveOptions,
  onMove,
}: TaskCardProps) {
  const isDone = task.status === "completed";

  // Parse duration if stored in description
  const parsedMeta = useMemo(() => {
    const match = task.description.match(/^\[(\d+)\s*min\]\s*(.*)$/s);
    return {
      duration: match ? Number(match[1]) : 0,
      cleanDesc: match ? match[2] : task.description,
    };
  }, [task.description]);

  return (
    <Card
      draggable={!isDone}
      onDragStart={onDragStart}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: isDone ? "auto" : "none" }}
      className={cn(
        "p-3 border-border/30 shadow-sm relative group transition-all duration-300 flex items-start gap-2.5",
        isDone ? "opacity-55 bg-muted/20 border-transparent select-none" : "bg-card hover:shadow-md cursor-grab active:cursor-grabbing",
        isOverdue && "border-rose-400 bg-rose-50/5 dark:bg-rose-950/5 shadow-rose-100 dark:shadow-none"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={cn(
          "mt-0.5 h-4.5 w-4.5 rounded border grid place-items-center cursor-pointer shrink-0 transition-colors",
          isDone ? "gradient-primary-bg border-0 text-white" : "border-border hover:border-primary"
        )}
        aria-label="Mark task done"
      >
        {isDone && <Check className="h-3.5 w-3.5" />}
      </button>

      {/* Details info */}
      <div className="flex-1 min-w-0">
        <h5 className={cn("font-semibold text-xs leading-snug break-words", isDone && "line-through text-muted-foreground")}>
          {task.title}
        </h5>
        {parsedMeta.cleanDesc && (
          <p className="text-[10px] text-muted-foreground/80 mt-1 leading-snug line-clamp-2">
            {parsedMeta.cleanDesc}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <Badge variant="outline" className={cn("text-[8px] h-4 px-1 py-0", priorityBadges[task.priority])}>
            {task.priority}
          </Badge>
          {parsedMeta.duration > 0 && (
            <Badge variant="outline" className="text-[8px] h-4 px-1 py-0 text-muted-foreground">
              {parsedMeta.duration} min
            </Badge>
          )}
          {isOverdue && (
            <Badge variant="outline" className="text-[8px] h-4 px-1 py-0 text-rose-500 border-rose-500/20 bg-rose-500/5 font-semibold flex items-center gap-0.5 animate-pulse">
              <AlertCircle className="h-2 w-2" /> Overdue
            </Badge>
          )}
        </div>
      </div>

      {/* Floating control buttons on card hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 flex items-center gap-0.5 shrink-0 bg-background/90 dark:bg-card/90 rounded-md shadow p-0.5">
        <Button size="icon" variant="ghost" className="h-5.5 w-5.5 text-muted-foreground hover:text-foreground" onClick={onEdit}>
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-5.5 w-5.5 text-destructive hover:bg-destructive/10" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>

        {/* Quick Day Selector for mobile/touch users */}
        <Select onValueChange={onMove}>
          <SelectTrigger className="h-5.5 w-5.5 border-0 p-0 text-muted-foreground hover:text-foreground bg-transparent shadow-none hover:bg-muted focus:ring-0 [&>span]:hidden [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-100">
            <Menu className="h-3 w-3 opacity-60" />
          </SelectTrigger>
          <SelectContent>
            {moveOptions.map((opt, i) => (
              <SelectItem key={opt} value={opt === "anytime" ? "anytime" : i.toString()} className="text-[11px]">
                {opt === "anytime" ? "Unschedule" : `Schedule to ${opt}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}