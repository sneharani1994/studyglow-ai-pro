import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Network,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  Download,
  Bookmark,
  Trash2,
  RefreshCw,
  History,
  Search,
  LayoutGrid,
  Sparkles,
  Clock,
  RotateCcw,
  Plus,
  FileText,
} from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

export const Route = createFileRoute("/app/concept-maps")({
  component: ConceptMapPage,
});

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

type Branch = { name: string; children: string[] };

type ConceptMapEntry = {
  id: string;
  topic: string;
  root: string;
  branches: Branch[];
  timestamp: string;
  saved: boolean;
};

/* ═══════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════ */

const STORAGE_KEY = "studyglow.conceptMaps";
const MAX_HISTORY = 20;

const SUGGESTED_TOPICS = [
  "Human Circulatory System",
  "React Component Lifecycle",
  "Photosynthesis Process",
  "Database Normalization Forms",
];

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */

function loadHistory(): ConceptMapEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ConceptMapEntry[];
      return parsed.map((e) => ({ ...e, saved: e.saved ?? false }));
    }
  } catch {
    /* corrupt data */
  }
  return [];
}

function persistHistory(entries: ConceptMapEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota exceeded */
  }
}

/* ═══════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════ */

function ConceptMapPage() {
  /* ── Preserved state parameters ── */
  const [topic, setTopic] = useState("");
  const [root, setRoot] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [busy, setBusy] = useState(false);

  /* ── Modernized UI State ── */
  const [history, setHistory] = useState<ConceptMapEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"graph" | "cards">("graph");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedBranches, setCollapsedBranches] = useState<Set<string>>(
    new Set(),
  );
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* ── Zoom and Pan State ── */
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const generatingRef = useRef(false);

  /* ── Load history on mount, open latest ── */
  useEffect(() => {
    const stored = loadHistory();
    setHistory(stored);
    if (stored.length > 0) {
      const latest = stored[0];
      setActiveId(latest.id);
      setRoot(latest.root);
      setBranches(latest.branches);
      setTopic(latest.topic);
    }
  }, []);

  /* ── Derived active map ── */
  const activeEntry = useMemo(
    () => history.find((e) => e.id === activeId) ?? null,
    [history, activeId],
  );

  /* ── Filter history items ── */
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (e) =>
        e.topic.toLowerCase().includes(q) ||
        e.root.toLowerCase().includes(q) ||
        e.branches.some((b) => b.name.toLowerCase().includes(q)),
    );
  }, [history, searchQuery]);

  /* ═══════════════════════════════════════════════
     Graph Handlers (Pan & Zoom)
     ═══════════════════════════════════════════════ */

  const zoomIn = () => setZoom((z) => Math.min(1.5, z + 0.1));
  const zoomOut = () => setZoom((z) => Math.max(0.5, z - 0.1));
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== "graph") return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || viewMode !== "graph") return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (viewMode !== "graph") return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || viewMode !== "graph") return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.current.x,
      y: touch.clientY - dragStart.current.y,
    });
  };

  /* ═══════════════════════════════════════════════
     Branch Expand/Collapse Handlers
     ═══════════════════════════════════════════════ */

  const toggleBranchCollapse = (name: string) => {
    setCollapsedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  /* ═══════════════════════════════════════════════
     Concept Generation & Parser (Logic Preserved)
     ═══════════════════════════════════════════════ */

  const generate = async (customTopic?: string) => {
    if (generatingRef.current) return;
    const t = customTopic !== undefined ? customTopic.trim() : topic.trim();
    if (!t) return;
    setBusy(true);
    generatingRef.current = true;
    try {
      const res = await aiService.explain(
        `Build a concept map for "${t}". Return STRICT JSON only, no prose, in the shape:
{"root":"<topic>","branches":[{"name":"<sub-topic>","children":["<leaf>","<leaf>"]}]}
Include 3-5 branches, each with 2-4 children.`,
        "intermediate",
      );
      // extract JSON block
      const match = res.explanation.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse concept map");
      const parsed = JSON.parse(match[0]) as {
        root: string;
        branches: Branch[];
      };
      const parsedRoot = parsed.root || t;
      const parsedBranches = Array.isArray(parsed.branches)
        ? parsed.branches.slice(0, 6)
        : [];

      setRoot(parsedRoot);
      setBranches(parsedBranches);
      if (customTopic !== undefined) {
        setTopic(t);
      }

      setCollapsedBranches(new Set());
      setActiveBranch(null);
      resetZoom();

      /* ── Add to history (prevent duplicates) ── */
      setHistory((prev) => {
        // Check duplicate by root topic & branches structure
        const duplicateIdx = prev.findIndex(
          (e) =>
            e.root.trim().toLowerCase() === parsedRoot.trim().toLowerCase() &&
            JSON.stringify(e.branches) === JSON.stringify(parsedBranches),
        );
        let updated: ConceptMapEntry[];

        if (duplicateIdx !== -1) {
          const matched = prev[duplicateIdx];
          const refreshed: ConceptMapEntry = {
            ...matched,
            timestamp: new Date().toISOString(),
          };
          updated = [refreshed, ...prev.filter((_, i) => i !== duplicateIdx)];
          setActiveId(refreshed.id);
        } else {
          const entry: ConceptMapEntry = {
            id: `map-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            topic: t,
            root: parsedRoot,
            branches: parsedBranches,
            timestamp: new Date().toISOString(),
            saved: false,
          };
          updated = [entry, ...prev].slice(0, MAX_HISTORY);
          setActiveId(entry.id);
        }
        persistHistory(updated);
        return updated;
      });
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Could not generate concept map";
      toast.error(msg);
      // Automatically fallback to cards view if graph is unavailable
      setViewMode("cards");
    } finally {
      setBusy(false);
      generatingRef.current = false;
    }
  };

  /* ═══════════════════════════════════════════════
     Toolbar Operations
     ═══════════════════════════════════════════════ */

  /* ── Copy hierarchy ── */
  const handleCopy = () => {
    if (!branches.length) return;
    let text = `# ${root}\n\n`;
    branches.forEach((b) => {
      text += `- ${b.name}\n`;
      b.children.forEach((c) => {
        text += `  - ${c}\n`;
      });
    });
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Concept map copied as markdown outline!");
    } catch {
      toast.error("Copy failed");
    }
  };

  /* ── High-Quality Canvas-Based Exports (PNG / PDF) ── */
  const exportCanvas = (format: "png" | "pdf") => {
    if (!branches.length) return;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");

      const width = Math.max(1200, branches.length * 240);
      const height = 800;
      canvas.width = width;
      canvas.height = height;

      // Dark Indigo gradient background
      ctx.fillStyle = "#111827"; // matching dark theme background
      ctx.fillRect(0, 0, width, height);

      // Grid helper lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 0; j < height; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }

      // Rounded Rectangle Draw helper
      const drawCard = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        fill: string,
        stroke: string,
        text: string,
        isRoot: boolean,
      ) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();

        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = isRoot ? "bold 14px sans-serif" : "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Text wrap helper
        const maxTextWidth = w - 16;
        let words = text.split(" ");
        let line = "";
        let lines = [];
        for (let n = 0; n < words.length; n++) {
          let testLine = line + words[n] + " ";
          let metrics = ctx.measureText(testLine);
          if (metrics.width > maxTextWidth && n > 0) {
            lines.push(line);
            line = words[n] + " ";
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        let textY = y + h / 2 - (lines.length - 1) * 8;
        for (let k = 0; k < lines.length; k++) {
          ctx.fillText(lines[k].trim(), x + w / 2, textY);
          textY += 16;
        }
      };

      // Node Placement coordinates
      const rootX = width / 2;
      const rootY = 80;
      const rootW = 240;
      const rootH = 60;

      // Draw Root Card
      drawCard(
        rootX - rootW / 2,
        rootY - rootH / 2,
        rootW,
        rootH,
        12,
        "#6366f1",
        "#818cf8",
        root,
        true,
      );

      const columnWidth = width / branches.length;
      const branchY = 240;
      const branchW = 180;
      const branchH = 50;

      branches.forEach((b, bIdx) => {
        const bX = columnWidth * bIdx + columnWidth / 2;

        // Draw bezier connection curves Root -> Branch
        ctx.beginPath();
        ctx.moveTo(rootX, rootY + rootH / 2);
        ctx.bezierCurveTo(
          rootX,
          rootY + rootH / 2 + 50,
          bX,
          branchY - branchH / 2 - 50,
          bX,
          branchY - branchH / 2,
        );
        ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Branch Node Card
        drawCard(
          bX - branchW / 2,
          branchY - branchH / 2,
          branchW,
          branchH,
          8,
          "rgba(31, 41, 55, 0.75)",
          "rgba(255, 255, 255, 0.15)",
          b.name,
          false,
        );

        // Children Leafs
        const leafStartY = 360;
        const leafSpacing = 55;
        const leafW = 160;
        const leafH = 40;

        b.children.forEach((c, cIdx) => {
          const cY = leafStartY + leafSpacing * cIdx;

          // Draw linear connection line Branch -> Leaf
          ctx.beginPath();
          ctx.moveTo(bX, branchY + branchH / 2);
          ctx.lineTo(bX, cY - leafH / 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Draw Leaf Node Card
          drawCard(
            bX - leafW / 2,
            cY - leafH / 2,
            leafW,
            leafH,
            6,
            "rgba(31, 41, 55, 0.45)",
            "rgba(255, 255, 255, 0.08)",
            c,
            false,
          );
        });
      });

      if (format === "png") {
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `concept-map-${root.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
        a.click();
      } else {
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "pt",
          format: [width, height],
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", 0, 0, width, height);
        pdf.save(`concept-map-${root.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
      }
      toast.success(`${format.toUpperCase()} exported successfully!`);
    } catch {
      toast.error("Export failed");
    }
  };

  /* ── Save/bookmark map ── */
  const handleSave = () => {
    if (!activeId) return;
    const wasSaved = history.find((e) => e.id === activeId)?.saved ?? false;
    setHistory((prev) => {
      const next = prev.map((e) =>
        e.id === activeId ? { ...e, saved: !e.saved } : e,
      );
      persistHistory(next);
      return next;
    });
    toast.success(wasSaved ? "Removed bookmark" : "Bookmarked map to favorites");
  };

  /* ── Restore visual map ── */
  const handleRestore = (entry: ConceptMapEntry) => {
    setRoot(entry.root);
    setBranches(entry.branches);
    setTopic(entry.topic);
    setActiveId(entry.id);
    setCollapsedBranches(new Set());
    setActiveBranch(null);
    resetZoom();
    setHistoryOpen(false);
    toast.success(`Restored map: ${entry.root}`);
  };

  /* ── Delete visual map ── */
  const handleDeleteMap = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persistHistory(next);
      return next;
    });
    if (activeId === id) {
      setRoot("");
      setBranches([]);
      setActiveId(null);
    }
    toast.success("Concept map removed");
  };

  /* ── Clear history maps ── */
  const handleClearHistory = () => {
    setHistory([]);
    persistHistory([]);
    setRoot("");
    setBranches([]);
    setActiveId(null);
    toast.success("History cleared");
  };

  return (
    <div className="space-y-6 animate-fade-in-premium">
      {/* ── Page Header ── */}
      <PageHeader
        title="Concept Maps"
        description="See how every idea connects."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="gap-1.5 hover:border-primary/40 transition-colors text-xs"
          >
            <History className="h-4 w-4" />
            History
            {history.length > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
              >
                {history.length}
              </Badge>
            )}
          </Button>
        }
      />

      {/* ── Configuration Input Card ── */}
      <Card className="p-5 glass border-border/40 shadow-card flex flex-col sm:flex-row gap-3 items-stretch sm:items-end animate-card-enter">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block text-foreground/80">
            Topic
          </label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") generate();
            }}
            placeholder="Enter a topic to map…"
            className="bg-muted/30 border-border/40 text-xs"
            disabled={busy}
          />
        </div>
        <Button
          onClick={() => generate()}
          disabled={busy || !topic.trim()}
          className="gradient-primary-bg text-white border-0 hover:opacity-90 shadow-glow transition-all duration-200 gap-2 text-xs"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <Network className="h-4 w-4" />
              Generate map
            </>
          )}
        </Button>
      </Card>

      {/* ═══ View Modes Toggle & Output Area ═══ */}

      {busy ? (
        /* ── Loading Skeleton ── */
        <Card className="glass border-border/40 p-10 overflow-hidden relative min-h-[450px] flex flex-col items-center justify-center gap-10 animate-card-enter">
          <Skeleton className="h-12 w-64 rounded-2xl bg-muted-foreground/10" />
          <div className="flex gap-16 w-full justify-center">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-4">
                <Skeleton className="h-10 w-40 rounded-xl bg-muted-foreground/10" />
                <Skeleton className="h-8 w-32 rounded-lg bg-muted-foreground/10" />
                <Skeleton className="h-8 w-32 rounded-lg bg-muted-foreground/10" />
              </div>
            ))}
          </div>
        </Card>
      ) : branches.length > 0 ? (
        /* ── Interactive View Area ── */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* View switcher */}
            <div className="flex bg-muted/40 p-1 rounded-xl border border-border/20">
              <Button
                size="sm"
                variant={viewMode === "graph" ? "default" : "ghost"}
                onClick={() => setViewMode("graph")}
                className="text-xs px-3.5 h-8 rounded-lg"
              >
                <Network className="h-3.5 w-3.5 mr-1.5" />
                Visual Graph
              </Button>
              <Button
                size="sm"
                variant={viewMode === "cards" ? "default" : "ghost"}
                onClick={() => setViewMode("cards")}
                className="text-xs px-3.5 h-8 rounded-lg"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                Structured Cards
              </Button>
            </div>

            {/* View controls */}
            {viewMode === "graph" && (
              <div className="flex items-center gap-1.5 bg-muted/20 border border-border/30 px-2 py-1 rounded-lg">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={zoomOut}
                        className="h-7 w-7 p-0"
                      >
                        <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom Out</TooltipContent>
                  </Tooltip>
                  <span className="text-[10px] px-1 font-mono font-bold text-foreground/80">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={zoomIn}
                        className="h-7 w-7 p-0"
                      >
                        <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom In</TooltipContent>
                  </Tooltip>
                  <div className="w-px h-4 bg-border/40 mx-0.5" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={resetZoom}
                        className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        <Maximize2 className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset View</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          <Card className="glass border-border/40 overflow-hidden shadow-card hover:shadow-glow transition-all duration-300 relative flex flex-col min-h-[500px]">
            {/* Sticky Action Toolbar */}
            <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-border/40 bg-card/85 backdrop-blur-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                  <Network className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-xs truncate text-foreground/80">
                  {root}
                </span>
              </div>
              <TooltipProvider delayDuration={300}>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Copy Outlines */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopy}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy Markdown Outline</TooltipContent>
                  </Tooltip>

                  {/* Export PNG */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => exportCanvas("png")}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export PNG Image</TooltipContent>
                  </Tooltip>

                  {/* Export PDF */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => exportCanvas("pdf")}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export PDF</TooltipContent>
                  </Tooltip>

                  <div className="w-px h-5 bg-border/40 mx-0.5" />

                  {/* Bookmark Save */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSave}
                        className={cn(
                          "h-8 w-8 p-0 hover:bg-muted/60",
                          activeEntry?.saved
                            ? "text-amber-500"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Bookmark
                          className={cn(
                            "h-3.5 w-3.5",
                            activeEntry?.saved && "fill-current",
                          )}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {activeEntry?.saved ? "Remove bookmark" : "Save bookmark"}
                    </TooltipContent>
                  </Tooltip>

                  {/* Regenerate */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => generate(topic)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Regenerate</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            {/* View Panel */}
            <div className="flex-1 overflow-hidden relative">
              {viewMode === "graph" ? (
                /* ── GRAPH MODE VIEWPORT ── */
                <div
                  className={cn(
                    "w-full h-full min-h-[500px] flex items-center justify-center select-none overflow-hidden relative bg-muted/5",
                    isDragging ? "cursor-grabbing" : "cursor-grab",
                  )}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUpOrLeave}
                >
                  <div
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                      transformOrigin: "center center",
                      transition: isDragging ? "none" : "transform 0.1s ease-out",
                    }}
                    className="flex flex-col items-center gap-12 p-8 min-w-[900px]"
                  >
                    {/* Root Node */}
                    <div className="relative z-10 animate-fade-in-premium">
                      <Card className="rounded-2xl gradient-primary-bg text-white px-8 py-3.5 font-bold text-base shadow-glow border-0 select-none">
                        {root}
                      </Card>
                    </div>

                    {/* Branches Grid */}
                    <div
                      className="relative w-full grid gap-8"
                      style={{
                        gridTemplateColumns: `repeat(${branches.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {/* Connection lines from Root -> Branch */}
                      <svg className="absolute top-[-48px] left-0 w-full h-[48px] pointer-events-none overflow-visible">
                        {branches.map((_, idx) => {
                          const fromX = "50%";
                          const fromY = "0";
                          const toX = `${((idx + 0.5) / branches.length) * 100}%`;
                          const toY = "100%";
                          return (
                            <path
                              key={idx}
                              d={`M ${fromX} ${fromY} C ${fromX} 20, ${toX} 20, ${toX} ${toY}`}
                              stroke="rgba(99, 102, 241, 0.3)"
                              strokeWidth="2"
                              fill="none"
                            />
                          );
                        })}
                      </svg>

                      {branches.map((b) => {
                        const isCollapsed = collapsedBranches.has(b.name);
                        const isHighlighted = activeBranch === b.name;
                        return (
                          <div
                            key={b.name}
                            onClick={() => setActiveBranch(b.name)}
                            className={cn(
                              "flex flex-col items-center gap-4 transition-all duration-300",
                              isHighlighted ? "scale-[1.02]" : "opacity-95",
                            )}
                          >
                            {/* Branch Card */}
                            <Card
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBranchCollapse(b.name);
                              }}
                              className={cn(
                                "rounded-xl glass px-4 py-2.5 font-semibold text-xs cursor-pointer select-none transition-all duration-300 relative group/branch hover:-translate-y-0.5 leading-relaxed text-center",
                                isHighlighted
                                  ? "border-primary shadow-glow bg-primary/5"
                                  : "border-border/40 hover:border-primary/45",
                              )}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                <span>{b.name}</span>
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] scale-90 px-1 py-0 bg-muted/65 text-muted-foreground border-border/20"
                                >
                                  {b.children.length}
                                </Badge>
                              </div>
                              {/* Expand indicator bubble */}
                              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-background border border-border/40 text-[9px] font-bold grid place-items-center opacity-0 group-hover/branch:opacity-100 transition-opacity">
                                {isCollapsed ? "+" : "-"}
                              </span>
                            </Card>

                            {/* Leaves connector line & stacked list */}
                            {!isCollapsed && b.children.length > 0 && (
                              <div className="w-full flex flex-col items-center gap-2 relative animate-fade-in-premium">
                                <div className="w-px h-6 bg-border/40" />
                                {b.children.map((c) => (
                                  <div
                                    key={c}
                                    className="w-full rounded-lg border border-border/30 bg-card/65 backdrop-blur-md px-3 py-2 text-[11px] text-center hover:shadow-card hover:border-primary/30 hover:bg-muted/10 transition-all hover:-translate-y-0.5 cursor-pointer leading-relaxed text-foreground/80"
                                  >
                                    {c}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── STRUCTURED CARDS MODE (Fallback) ── */
                <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto overflow-y-auto max-h-[550px] custom-scrollbar">
                  {/* Root card */}
                  <Card className="rounded-2xl gradient-primary-bg text-white p-6 font-bold text-lg shadow-glow text-center border-0">
                    {root}
                  </Card>

                  {/* Branches layout list */}
                  <div className="space-y-4">
                    {branches.map((b) => {
                      const isCollapsed = collapsedBranches.has(b.name);
                      return (
                        <Card
                          key={b.name}
                          className="glass border border-border/40 rounded-xl overflow-hidden hover:border-primary/45 transition-colors"
                        >
                          <button
                            onClick={() => toggleBranchCollapse(b.name)}
                            className="w-full flex items-center justify-between p-4 font-bold text-sm text-left hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span>{b.name}</span>
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-2 py-0">
                                {b.children.length} items
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono font-bold">
                              {isCollapsed ? "Expand +" : "Collapse -"}
                            </span>
                          </button>

                          {!isCollapsed && b.children.length > 0 && (
                            <div className="p-4 bg-background/25 border-t border-border/30 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {b.children.map((c) => (
                                <div
                                  key={c}
                                  className="p-3 text-xs bg-card rounded-lg border border-border/30 hover:border-primary/30 transition-colors"
                                >
                                  {c}
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        /* ── Empty State ── */
        <Card className="glass border-border/40 p-12 text-center animate-card-enter">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl gradient-soft-bg grid place-items-center">
              <Network className="h-8 w-8 text-primary/65" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground/80">
                Ready to map
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                Type in any subject or topic, click generate, and see how every
                idea connects on a mind map.
              </p>
            </div>
            {history.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                className="mt-2 gap-1.5 hover:border-primary/40 transition-colors text-xs"
              >
                <History className="h-3.5 w-3.5" />
                Browse past maps
              </Button>
            ) : (
              <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-md">
                {SUGGESTED_TOPICS.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => generate(t)}
                    className="px-3 py-1.5 rounded-lg border border-border/30 hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ═══ History Sheet Drawer ═══ */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col bg-card/95 backdrop-blur-2xl"
        >
          <SheetHeader className="p-6 pb-0">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Map History
            </SheetTitle>
            <SheetDescription>
              Browse and restore previous concept maps
            </SheetDescription>
          </SheetHeader>

          {/* Search */}
          <div className="px-6 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/30 border-border/40 text-xs"
              />
            </div>
          </div>

          {/* History list container */}
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-2 space-y-2 custom-scrollbar">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted/40 grid place-items-center text-muted-foreground/50 mb-3">
                  <History className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {history.length === 0 ? "No maps yet" : "No matching maps"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {history.length === 0
                    ? "Generate a map to see it logged here."
                    : "Try a different search query."}
                </p>
              </div>
            ) : (
              filteredHistory.map((entry) => {
                const isActive = entry.id === activeId;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all duration-200 group",
                      isActive
                        ? "bg-primary/5 border-primary/30 shadow-sm"
                        : "bg-card border-border/30 hover:border-border/60 hover:bg-muted/20",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg grid place-items-center shrink-0 transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/60 text-muted-foreground",
                        )}
                      >
                        <Network className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate block text-foreground/90">
                            {entry.root}
                          </span>
                          {entry.saved && (
                            <Bookmark className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-primary/5 text-primary border-primary/15 text-[8px] scale-90 p-0 px-1.5 font-bold">
                            {entry.branches.length} branches
                          </Badge>
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground/75">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(entry.timestamp).toLocaleDateString([], {
                              month: "short",
                              day: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border/20">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRestore(entry)}
                        className="h-7 px-2.5 text-[11px] text-primary hover:bg-primary/10 gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteMap(entry.id)}
                        className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Clear history */}
          {history.length > 0 && (
            <div className="px-6 py-4 border-t border-border/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all history
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}