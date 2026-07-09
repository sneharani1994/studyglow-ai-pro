import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { AIResponse } from "@/components/ai-response";
import { aiService } from "@/lib/api";
import { useAppRefresh } from "@/lib/events";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import jsPDF from "jspdf";
import {
  History,
  Search,
  Loader2,
  Copy,
  Download,
  Trash2,
  Play,
  Sparkles,
  Calendar,
  Filter,
  Check,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileText,
  X,
  ChevronRight,
  Map,
  Brain,
  AlertCircle,
  Trophy,
  RefreshCw,
  FolderSync,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/history")({ component: HistoryPage });

interface HistoryEntry {
  id: string;
  feature_type: string;
  prompt: string;
  response: string;
  created_at: string;
}

const featureConfig: Record<
  string,
  { label: string; bg: string; text: string; icon: any }
> = {
  summarize: { label: "Summary", bg: "bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/5", text: "text-blue-500 dark:text-blue-400", icon: FileText },
  explain: { label: "Explainer", bg: "bg-purple-500/10 border-purple-500/20 dark:bg-purple-500/5", text: "text-purple-500 dark:text-purple-400", icon: BookOpen },
  generateQuiz: { label: "Quiz Gen", bg: "bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/5", text: "text-emerald-500 dark:text-emerald-400", icon: CheckCircle2 },
  generateFlashcards: { label: "Flashcards", bg: "bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/5", text: "text-amber-500 dark:text-amber-400", icon: Brain },
  roadmap: { label: "Roadmap", bg: "bg-pink-500/10 border-pink-500/20 dark:bg-pink-500/5", text: "text-pink-500 dark:text-pink-400", icon: Map },
  plannerGenerator: { label: "Planner", bg: "bg-violet-500/10 border-violet-500/20 dark:bg-violet-500/5", text: "text-violet-500 dark:text-violet-400", icon: Calendar },
  homeworkSolver: { label: "Homework", bg: "bg-orange-500/10 border-orange-500/20 dark:bg-orange-500/5", text: "text-orange-500 dark:text-orange-400", icon: Sparkles },
  doubtSolver: { label: "Doubt Solver", bg: "bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/5", text: "text-rose-500 dark:text-rose-400", icon: AlertCircle },
  examPredictor: { label: "Exam Predict", bg: "bg-lime-500/10 border-lime-500/20 dark:bg-lime-500/5", text: "text-lime-500 dark:text-lime-400", icon: Trophy },
  essay: { label: "Essay Helper", bg: "bg-cyan-500/10 border-cyan-500/20 dark:bg-cyan-500/5", text: "text-cyan-500 dark:text-cyan-400", icon: FileText },
  grammar: { label: "Grammar", bg: "bg-yellow-500/10 border-yellow-500/20 dark:bg-yellow-500/5", text: "text-yellow-500 dark:text-yellow-400", icon: Check },
  codeExplanation: { label: "Code Explain", bg: "bg-indigo-500/10 border-indigo-500/20 dark:bg-indigo-500/5", text: "text-indigo-500 dark:text-indigo-400", icon: Sparkles },
  codingAssistant: { label: "Code Assist", bg: "bg-teal-500/10 border-teal-500/20 dark:bg-teal-500/5", text: "text-teal-500 dark:text-teal-400", icon: Sparkles },
};

function getFeatureInfo(type: string) {
  return (
    featureConfig[type] || {
      label: type,
      bg: "bg-muted/15 border-border/30",
      text: "text-muted-foreground",
      icon: Sparkles,
    }
  );
}

function HistoryPage() {
  const [rawEntries, setRawEntries] = useState<HistoryEntry[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("studygpt.history.deletedIds");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<string>("all");
  const [groupingMode, setGroupingMode] = useState<"timeline" | "feature">("timeline");
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  // Replay dialog states
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayText, setReplayText] = useState("");
  const [replayIndex, setReplayIndex] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);

  // Pagination / Infinite Scroll states
  const [visibleCount, setVisibleCount] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    aiService
      .history()
      .then((res) => {
        setRawEntries(res.history || []);
      })
      .catch(() => {
        setRawEntries([]);
        toast.error("Could not load generation history");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);
  useAppRefresh(load);

  // Persist local deletion
  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = [...deletedIds, id];
    setDeletedIds(next);
    try {
      localStorage.setItem("studygpt.history.deletedIds", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    toast.success("Entry removed from local history");
    if (selected?.id === id) {
      setSelected(null);
    }
  };

  // Bulk deletion / Clear history
  const handleClearAll = () => {
    if (!window.confirm("Are you sure you want to clear your local history view?")) return;
    const allIds = filtered.map((e) => e.id);
    const next = [...deletedIds, ...allIds];
    setDeletedIds(next);
    try {
      localStorage.setItem("studygpt.history.deletedIds", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setSelected(null);
    toast.success("History cleared");
  };

  // Filter entries
  const filtered = useMemo(() => {
    return rawEntries
      .filter((e) => !deletedIds.includes(e.id))
      .filter((e) => {
        const matchesQ =
          !q.trim() ||
          e.feature_type.toLowerCase().includes(q.toLowerCase()) ||
          e.prompt.toLowerCase().includes(q.toLowerCase()) ||
          e.response.toLowerCase().includes(q.toLowerCase());
        const matchesFeature =
          selectedFeature === "all" || e.feature_type === selectedFeature;
        return matchesQ && matchesFeature;
      });
  }, [rawEntries, deletedIds, q, selectedFeature]);

  // Unique list of features for filter selector
  const availableFeatures = useMemo(() => {
    const set = new Set(rawEntries.filter((e) => !deletedIds.includes(e.id)).map((e) => e.feature_type));
    return Array.from(set);
  }, [rawEntries, deletedIds]);

  // Paginated subset of filtered items
  const paginatedEntries = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  // Setup infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || filtered.length <= visibleCount) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 12, filtered.length));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [filtered.length, visibleCount]);

  // Grouped timeline view
  const timelineGroups = useMemo(() => {
    const groups: Record<string, HistoryEntry[]> = {
      Today: [],
      Yesterday: [],
      "Last 7 Days": [],
      Older: [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    paginatedEntries.forEach((entry) => {
      const date = new Date(entry.created_at);
      if (date >= today) {
        groups["Today"].push(entry);
      } else if (date >= yesterday) {
        groups["Yesterday"].push(entry);
      } else if (date >= sevenDaysAgo) {
        groups["Last 7 Days"].push(entry);
      } else {
        groups["Older"].push(entry);
      }
    });

    // Remove empty categories
    return Object.fromEntries(
      Object.entries(groups).filter(([_, list]) => list.length > 0)
    );
  }, [paginatedEntries]);

  // Grouped feature view
  const featureGroups = useMemo(() => {
    const groups: Record<string, HistoryEntry[]> = {};
    paginatedEntries.forEach((entry) => {
      const label = getFeatureInfo(entry.feature_type).label;
      if (!groups[label]) groups[label] = [];
      groups[label].push(entry);
    });
    return groups;
  }, [paginatedEntries]);

  // Replay live stream simulation
  const startReplay = (entry: HistoryEntry) => {
    setSelected(entry);
    setReplayText("");
    setReplayIndex(0);
    setReplayOpen(true);
    setIsReplaying(true);
  };

  useEffect(() => {
    if (!replayOpen || !selected || !isReplaying) return;

    if (replayIndex < selected.response.length) {
      const timer = setTimeout(() => {
        // Stream text char by char, speeds up for long outputs
        const increment = selected.response.length > 500 ? 5 : 2;
        setReplayText((prev) => prev + selected.response.slice(replayIndex, replayIndex + increment));
        setReplayIndex((prev) => prev + increment);
      }, 15);
      return () => clearTimeout(timer);
    } else {
      setIsReplaying(false);
    }
  }, [replayOpen, selected, replayIndex, isReplaying]);

  // Bulk Export MD
  const handleBulkExportMD = () => {
    if (filtered.length === 0) {
      toast.error("No entries to export");
      return;
    }
    const md = filtered
      .map(
        (e) =>
          `# ${getFeatureInfo(e.feature_type).label} Generation\n` +
          `**Date**: ${new Date(e.created_at).toLocaleString()}\n` +
          `**Prompt**:\n> ${e.prompt}\n\n` +
          `**Response**:\n${e.response}\n\n` +
          `---\n`
      )
      .join("\n");

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `studygpt-history-${selectedFeature}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported filtered history as Markdown");
  };

  // Copy helper
  const handleCopyText = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Copy failed"));
  };

  // Export PDF helper
  const handleExportPDF = (entry: HistoryEntry) => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`AI History Replay: ${getFeatureInfo(entry.feature_type).label}`, margin, y);
      y += 26;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date(entry.created_at).toLocaleString()}`, margin, y);
      y += 24;

      doc.setFont("helvetica", "bold");
      doc.text("Prompt Input:", margin, y);
      y += 14;

      doc.setFont("helvetica", "normal");
      const promptLines = doc.splitTextToSize(entry.prompt, width);
      for (const line of promptLines) {
        if (y > pageHeight) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 14;
      }
      y += 15;

      doc.setFont("helvetica", "bold");
      doc.text("AI Response:", margin, y);
      y += 16;

      doc.setFont("helvetica", "normal");
      // Strip md
      const cleanResponse = entry.response
        .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?|```/g, ""))
        .replace(/[*_`>#]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

      const responseLines = doc.splitTextToSize(cleanResponse, width);
      for (const line of responseLines) {
        if (y > pageHeight) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 14;
      }

      doc.save(`ai-history-${entry.id}.pdf`);
      toast.success("PDF document downloaded");
    } catch {
      toast.error("Could not generate PDF");
    }
  };

  return (
    <div className="relative">
      <PageHeader
        title="AI History"
        description="Search, replay, and manage every AI generation and learning landmark in your vault."
        action={
          filtered.length > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleBulkExportMD} className="text-xs">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export Group (.md)
              </Button>
              <Button size="sm" variant="destructive" onClick={handleClearAll} className="text-xs">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear View
              </Button>
            </div>
          )
        }
      />

      <div className="grid lg:grid-cols-[400px_1fr] gap-6 items-start">
        {/* ═══════════ LEFT LIST / CONFIG PANEL ═══════════ */}
        <Card className="glass border-border/40 p-4 flex flex-col gap-4 max-h-[82vh]">
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search prompt, responses..."
                className="pl-9 bg-background/50"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Feature Filtering + Grouping options */}
            <div className="flex gap-2">
              <div className="flex-1">
                <select
                  value={selectedFeature}
                  onChange={(e) => setSelectedFeature(e.target.value)}
                  className="w-full h-8 text-xs bg-background/50 border border-border/40 rounded-lg px-2 text-foreground focus:outline-none"
                >
                  <option value="all">All Features</option>
                  {availableFeatures.map((feat) => (
                    <option key={feat} value={feat}>
                      {getFeatureInfo(feat).label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex border border-border/40 rounded-lg overflow-hidden shrink-0">
                <Button
                  size="sm"
                  variant={groupingMode === "timeline" ? "secondary" : "ghost"}
                  onClick={() => setGroupingMode("timeline")}
                  className="h-8 rounded-none px-2 text-xs border-r border-border/30"
                >
                  Timeline
                </Button>
                <Button
                  size="sm"
                  variant={groupingMode === "feature" ? "secondary" : "ghost"}
                  onClick={() => setGroupingMode("feature")}
                  className="h-8 rounded-none px-2 text-xs"
                >
                  Feature
                </Button>
              </div>
            </div>
          </div>

          {/* List display */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[60vh] timeline-scroll custom-scrollbar">
            {loading ? (
              /* Skeletons block */
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="p-3 border-border/30 glass relative space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4.5 w-20 rounded" />
                      <Skeleton className="h-3 w-12 rounded" />
                    </div>
                    <Skeleton className="h-4 w-5/6 rounded" />
                    <Skeleton className="h-3 w-2/3 rounded" />
                  </Card>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              /* Empty state */
              <div className="text-center py-12 px-4 border border-dashed border-border/40 rounded-xl bg-muted/10 animate-card-enter">
                <History className="h-10 w-10 mx-auto mb-3 opacity-30 text-primary" />
                <h4 className="font-semibold text-sm mb-1">No matches found</h4>
                <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                  Try clearing search parameters or filters to review older AI actions.
                </p>
              </div>
            ) : groupingMode === "timeline" ? (
              /* Timeline Mode Display */
              Object.entries(timelineGroups).map(([groupName, items]) => (
                <div key={groupName} className="space-y-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
                    <Calendar className="h-3 w-3" />
                    {groupName}
                    <span className="text-[9px] lowercase font-normal opacity-70">
                      ({items.length} generations)
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-3 border-l-2 border-border/30 ml-2.5">
                    {items.map((entry) => {
                      const fInfo = getFeatureInfo(entry.feature_type);
                      const isSelected = selected?.id === entry.id;
                      return (
                        <div key={entry.id} className="relative group/card">
                          <button
                            onClick={() => { setSelected(entry); setReplayOpen(false); }}
                            className={cn(
                              "w-full text-left p-3 rounded-xl border transition-all duration-300 relative glass hover:shadow-sm",
                              isSelected
                                ? "border-primary/40 bg-gradient-to-r from-primary/10 to-transparent"
                                : "border-border/30 hover:border-border/60"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <Badge
                                variant="outline"
                                className={cn("text-[9px] h-4.5 px-1.5 font-medium border", fInfo.bg, fInfo.text)}
                              >
                                <fInfo.icon className="h-2.5 w-2.5 mr-1" />
                                {fInfo.label}
                              </Badge>
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(entry.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-foreground line-clamp-1">
                              {entry.prompt}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                              {entry.response}
                            </p>
                          </button>

                          {/* Quick floating action buttons */}
                          <div className="absolute right-2 top-2 hidden group-hover/card:flex gap-1 bg-background/90 dark:bg-card/90 rounded px-1 py-0.5 border border-border/30 shadow-sm z-20">
                            <button
                              onClick={(e) => { e.stopPropagation(); startReplay(entry); }}
                              title="Replay generation"
                              className="p-1 hover:text-primary transition-colors text-muted-foreground"
                            >
                              <Play className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(entry.id, e)}
                              title="Remove locally"
                              className="p-1 hover:text-destructive transition-colors text-muted-foreground"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              /* Feature Mode Display */
              Object.entries(featureGroups).map(([groupName, items]) => (
                <div key={groupName} className="space-y-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
                    <Sparkles className="h-3 w-3 text-primary/80" />
                    {groupName}
                    <span className="text-[9px] lowercase font-normal opacity-70">
                      ({items.length})
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-3 border-l-2 border-border/30 ml-2.5">
                    {items.map((entry) => {
                      const isSelected = selected?.id === entry.id;
                      return (
                        <div key={entry.id} className="relative group/card">
                          <button
                            onClick={() => { setSelected(entry); setReplayOpen(false); }}
                            className={cn(
                              "w-full text-left p-3 rounded-xl border transition-all duration-300 relative glass hover:shadow-sm",
                              isSelected
                                ? "border-primary/40 bg-gradient-to-r from-primary/10 to-transparent"
                                : "border-border/30 hover:border-border/60"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[9px] font-medium text-muted-foreground">
                                {new Date(entry.created_at).toLocaleDateString()}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(entry.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-foreground line-clamp-1">
                              {entry.prompt}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                              {entry.response}
                            </p>
                          </button>

                          {/* Quick floating action buttons */}
                          <div className="absolute right-2 top-2 hidden group-hover/card:flex gap-1 bg-background/90 dark:bg-card/90 rounded px-1 py-0.5 border border-border/30 shadow-sm z-20">
                            <button
                              onClick={(e) => { e.stopPropagation(); startReplay(entry); }}
                              title="Replay generation"
                              className="p-1 hover:text-primary transition-colors text-muted-foreground"
                            >
                              <Play className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(entry.id, e)}
                              title="Remove locally"
                              className="p-1 hover:text-destructive transition-colors text-muted-foreground"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Load more trigger target */}
            {filtered.length > visibleCount && (
              <div ref={loadMoreRef} className="py-4 text-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + 12, filtered.length))}
                  className="text-xs h-7 border-border/40 gap-1.5"
                >
                  <FolderSync className="h-3.5 w-3.5 animate-spin" />
                  Load more entries...
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* ═══════════ RIGHT DETAIL VIEW PANEL ═══════════ */}
        <div className="space-y-4">
          {selected ? (
            <div className="space-y-4 animate-card-enter">
              {/* Detailed Summary Header Card */}
              <Card className="glass border-border/40 p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl gradient-primary-bg flex items-center justify-center text-white shrink-0">
                      {(() => {
                        const icon = getFeatureInfo(selected.feature_type).icon;
                        const Comp = icon;
                        return <Comp className="h-5 w-5" />;
                      })()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">
                        {getFeatureInfo(selected.feature_type).label} Generation
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(selected.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startReplay(selected)}
                      className="h-8 text-xs border-border/40 hover:bg-primary/10 hover:text-primary gap-1"
                    >
                      <Play className="h-3.5 w-3.5" /> Replay
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportPDF(selected)}
                      className="h-8 text-xs border-border/40 gap-1"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(selected.id)}
                      className="h-8 w-8 p-0 border-border/40 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Prompt block */}
                <div className="bg-muted/30 border border-border/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2 border-b border-border/20 pb-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      User Prompt Input
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopyText(selected.prompt)}
                      className="h-5 w-5 hover:bg-muted"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed select-text">
                    {selected.prompt}
                  </p>
                </div>
              </Card>

              {/* Render AI Markdown Response */}
              <AIResponse
                content={selected.response}
                title={`${getFeatureInfo(selected.feature_type).label} · Generation Output`}
                pdfFileName={`history-${selected.feature_type}-${selected.id}`}
              />
            </div>
          ) : (
            /* Selected Empty view state */
            <Card className="glass border-border/40 p-16 text-center max-w-2xl mx-auto flex flex-col items-center justify-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-glow">
                <History className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base">Select a historical artifact</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Browse or filter through the timeline to load previous AI prompts, responses, roadmap outlines, or solve history.
                </p>
              </div>
              {filtered.length > 0 && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected(filtered[0])}
                    className="text-xs"
                  >
                    Load Latest Generation <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* ═══════════ TYPING REPLAY SIMULATION DIALOG ═══════════ */}
      <Dialog open={replayOpen} onOpenChange={setReplayOpen}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="border-b border-border/40 pb-3 shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Play className="h-4.5 w-4.5 text-primary animate-pulse" /> Replay Generation:{" "}
                {selected ? getFeatureInfo(selected.feature_type).label : ""}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {isReplaying ? "Streaming response..." : "Done"}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 py-4 border border-border/30 rounded-xl bg-muted/10 p-5 mt-2 font-mono text-xs select-text leading-relaxed whitespace-pre-wrap timeline-scroll custom-scrollbar">
            {replayText}
            {isReplaying && (
              <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse">|</span>
            )}
          </div>
          <DialogFooter className="border-t border-border/40 pt-3 shrink-0 flex flex-row items-center justify-between">
            <div className="text-[10px] text-muted-foreground">
              {isReplaying ? "Simulating AI model streaming..." : "Generation simulation ended."}
            </div>
            <div className="flex gap-2">
              {isReplaying && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selected) {
                      setReplayText(selected.response);
                      setReplayIndex(selected.response.length);
                    }
                    setIsReplaying(false);
                  }}
                  className="text-xs h-8"
                >
                  Skip Animation
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setReplayOpen(false)} className="text-xs h-8">
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}