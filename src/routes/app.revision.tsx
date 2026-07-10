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
  StickyNote,
  Loader2,
  FileText,
  Upload,
  Moon,
  Hash,
  BookOpen,
  HelpCircle,
  Copy,
  Check,
  Download,
  Bookmark,
  Trash2,
  RefreshCw,
  History,
  Search,
  Sparkles,
  Clock,
  RotateCcw,
} from "lucide-react";
import { aiService, uploadsService, type UploadedFile } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import jsPDF from "jspdf";

export const Route = createFileRoute("/app/revision")({
  component: RevisionPage,
});

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

type Mode = "notes" | "onepage" | "night" | "formulas" | "definitions" | "faq";

type RevisionHistoryEntry = {
  id: string;
  title: string;
  mode: Mode;
  topic: string;
  docId: string | null;
  docName: string | null;
  markdown: string;
  timestamp: string;
  saved: boolean;
};

/* ═══════════════════════════════════════════════
   Constants  (prompts are unchanged)
   ═══════════════════════════════════════════════ */

const MODES: { key: Mode; label: string; prompt: (topic: string) => string }[] = [
  { key: "notes", label: "Revision Notes", prompt: (t) => `Create detailed revision notes for: ${t}. Use headings, bullet points and highlight key terms in bold.` },
  { key: "onepage", label: "One Page Summary", prompt: (t) => `Summarise the following into a single page cheat-sheet with clear sections and short bullets:\n\n${t}` },
  { key: "night", label: "Night Before Exam", prompt: (t) => `Give a "night before the exam" recap for: ${t}. Focus only on the highest-yield facts, formulas and pitfalls a student must not forget.` },
  { key: "formulas", label: "Important Formulas", prompt: (t) => `List every important formula relevant to: ${t}. For each formula give: the formula in plain text, what each symbol means, and when to use it.` },
  { key: "definitions", label: "Important Definitions", prompt: (t) => `List the most important definitions for: ${t}. Format as "Term — definition" bullets, one per line.` },
  { key: "faq", label: "Frequently Asked Qs", prompt: (t) => `Generate 8-12 frequently asked exam questions on: ${t}, each with a concise model answer.` },
];

const MODE_ICONS: Record<Mode, typeof StickyNote> = {
  notes: StickyNote,
  onepage: FileText,
  night: Moon,
  formulas: Hash,
  definitions: BookOpen,
  faq: HelpCircle,
};

const HISTORY_KEY = "studyglow.revisionHistory";
const MAX_HISTORY = 20;

/* ═══════════════════════════════════════════════
   Helpers  (module-level, no side-effects)
   ═══════════════════════════════════════════════ */

function loadHistory(): RevisionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RevisionHistoryEntry[];
      return parsed.map((e) => ({ ...e, saved: e.saved ?? false }));
    }
  } catch {
    /* corrupt data — start fresh */
  }
  return [];
}

function persistHistory(entries: RevisionHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    /* quota exceeded — silently drop */
  }
}

function triggerDownload(data: string, filename: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fingerprint(mode: Mode, topic: string, docId: string | null): string {
  return `${mode}|${topic.trim().toLowerCase()}|${docId ?? ""}`;
}

/* ═══════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════ */

function RevisionPage() {
  /* ── Original state (preserved) ── */
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("notes");
  const [docs, setDocs] = useState<UploadedFile[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<UploadedFile | null>(null);

  /* ── New state ── */
  const [history, setHistory] = useState<RevisionHistoryEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  /* ── Refs ── */
  const generatingRef = useRef(false);
  const pendingDocIdRef = useRef<string | null>(null);

  /* ── Load documents (unchanged) ── */
  useEffect(() => {
    uploadsService
      .list()
      .then((list) => setDocs(list))
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false));
  }, []);

  /* ── Load history on mount, restore latest revision ── */
  useEffect(() => {
    const stored = loadHistory();
    setHistory(stored);
    if (stored.length > 0) {
      const latest = stored[0];
      setNotes(latest.markdown);
      setActiveEntryId(latest.id);
      setMode(latest.mode);
      setTopic(latest.topic);
      if (latest.docId) pendingDocIdRef.current = latest.docId;
    }
  }, []);

  /* ── Restore doc selection once docs finish loading ── */
  useEffect(() => {
    if (!docsLoading && pendingDocIdRef.current && docs.length > 0) {
      const doc = docs.find((d) => d.id === pendingDocIdRef.current);
      if (doc) setSelectedDoc(doc);
      pendingDocIdRef.current = null;
    }
  }, [docsLoading, docs]);

  /* ── Derived values ── */
  const activeEntry = useMemo(
    () => history.find((e) => e.id === activeEntryId) ?? null,
    [history, activeEntryId],
  );

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.topic.toLowerCase().includes(q) ||
        e.mode.toLowerCase().includes(q),
    );
  }, [history, searchQuery]);

  const heading = selectedDoc ? selectedDoc.filename : topic || "Revision";

  /* ═══════════════════════════════════════════════
     Handlers
     ═══════════════════════════════════════════════ */

  /* ── Generate (existing logic preserved, history added) ── */
  const generate = async () => {
    if (generatingRef.current) return; // prevent duplicate API calls
    const base = selectedDoc
      ? `the uploaded document "${selectedDoc.filename}"${topic.trim() ? ` focusing on ${topic.trim()}` : ""}`
      : topic.trim();
    if (!base) {
      toast.error("Pick a document or enter a topic to revise");
      return;
    }
    generatingRef.current = true;
    setBusy(true);
    try {
      const chosen = MODES.find((m) => m.key === mode)!;
      let res: any;
      if (selectedDoc) {
        // Use document-aware AI service when a document is selected
        res = await aiService.explainWithDoc(selectedDoc.id, topic, "advanced");
      } else {
        // Fallback to generic explanation using the prompt
        const prompt = chosen.prompt(base);
        res = await aiService.explain(prompt, "advanced");
      }
      const resultText: string =
        res?.explanation ||
        res?.studyNotes ||
        res?.response ||
        res?.content ||
        res?.text ||
        "";
      setNotes(resultText);

      /* ── History management (duplicate-safe) ── */
      const fp = fingerprint(mode, topic, selectedDoc?.id ?? null);
      const entryTitle = `${chosen.label} · ${heading}`;

      setHistory((prev) => {
        const idx = prev.findIndex(
          (e) => fingerprint(e.mode, e.topic, e.docId) === fp,
        );
        let updated: RevisionHistoryEntry[];

        if (idx !== -1) {
          // Duplicate → update existing entry, move to front
          const existing = prev[idx];
          const refreshed: RevisionHistoryEntry = {
            ...existing,
            markdown: resultText,
            timestamp: new Date().toISOString(),
            title: entryTitle,
          };
          updated = [refreshed, ...prev.filter((_, i) => i !== idx)];
          setActiveEntryId(refreshed.id);
        } else {
          // New entry
          const entry: RevisionHistoryEntry = {
            id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: entryTitle,
            mode,
            topic: topic.trim(),
            docId: selectedDoc?.id ?? null,
            docName: selectedDoc?.filename ?? null,
            markdown: resultText,
            timestamp: new Date().toISOString(),
            saved: false,
          };
          updated = [entry, ...prev].slice(0, MAX_HISTORY);
          setActiveEntryId(entry.id);
        }

        persistHistory(updated);
        return updated;
      });
    } catch {
      toast.error("AI service is temporarily busy. Please try again.");
    } finally {
      setBusy(false);
      generatingRef.current = false;
    }
  };

  /* ── Copy ── */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  /* ── Download PDF (uses jsPDF, same pattern as AIResponse) ── */
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;
      const pdfTitle = activeEntry?.title ?? heading;
      if (pdfTitle) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        const titleLines = doc.splitTextToSize(pdfTitle, width);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 20 + 6;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const plain = notes
        .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?|```/g, ""))
        .replace(/[*_`>#]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
      const lines = doc.splitTextToSize(plain, width);
      for (const line of lines) {
        if (y > pageHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 15;
      }
      doc.save(`revision-${heading || mode}.pdf`);
      toast.success("PDF exported");
    } catch {
      toast.error("PDF export failed");
    }
  };

  /* ── Download Markdown ── */
  const handleDownloadMD = () => {
    triggerDownload(notes, `revision-${heading || mode}.md`, "text/markdown");
    toast.success("Markdown downloaded");
  };

  /* ── Save / Bookmark toggle ── */
  const handleSave = () => {
    if (!activeEntryId) return;
    const wasSaved = history.find((e) => e.id === activeEntryId)?.saved ?? false;
    setHistory((prev) => {
      const updated = prev.map((e) =>
        e.id === activeEntryId ? { ...e, saved: !e.saved } : e,
      );
      persistHistory(updated);
      return updated;
    });
    toast.success(wasSaved ? "Removed from saved" : "Saved to bookmarks");
  };

  /* ── Delete current revision (clears display, keeps history) ── */
  const handleDeleteDisplay = () => {
    setNotes("");
    setActiveEntryId(null);
    toast.success("Revision cleared from view");
  };

  /* ── Delete a specific history entry ── */
  const handleDeleteHistoryEntry = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      persistHistory(updated);
      return updated;
    });
    if (activeEntryId === id) {
      setNotes("");
      setActiveEntryId(null);
    }
    toast.success("Removed from history");
  };

  /* ── Restore a history entry (restores form state too) ── */
  const handleRestore = (entry: RevisionHistoryEntry) => {
    setNotes(entry.markdown);
    setActiveEntryId(entry.id);
    setMode(entry.mode);
    setTopic(entry.topic);
    if (entry.docId) {
      const doc = docs.find((d) => d.id === entry.docId);
      setSelectedDoc(doc ?? null);
    } else {
      setSelectedDoc(null);
    }
    // Move to front of history
    setHistory((prev) => {
      const rest = prev.filter((e) => e.id !== entry.id);
      const updated = [entry, ...rest];
      persistHistory(updated);
      return updated;
    });
    setHistoryOpen(false);
    toast.success("Revision restored");
  };

  /* ── Clear all history ── */
  const handleClearHistory = () => {
    setHistory([]);
    persistHistory([]);
    setNotes("");
    setActiveEntryId(null);
    toast.success("History cleared");
  };

  /* ═══════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════ */

  return (
    <div className="space-y-6 animate-fade-in-premium">
      {/* ── Page Header ── */}
      <PageHeader
        title="Revision Mode"
        description="Everything you need the night before, in one place."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="gap-1.5 hover:border-primary/40 transition-colors"
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

      {/* ── Document Selection ── */}
      <Card className="p-5 glass border-border/40 shadow-card animate-card-enter">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground/90">
            Your uploaded documents
          </h3>
          <Link to="/app/documents">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs hover:border-primary/40">
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
          </Link>
        </div>
        {docsLoading ? (
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-28 rounded-md" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="text-sm text-muted-foreground/80 py-2 leading-relaxed">
            No documents yet — upload one to base your revision on your own
            material, or just type a topic below.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {docs.map((d) => (
              <Button
                key={d.id}
                size="sm"
                variant={selectedDoc?.id === d.id ? "default" : "outline"}
                className={cn(
                  "transition-all duration-200 text-xs",
                  selectedDoc?.id === d.id
                    ? "gradient-primary-bg text-white border-0 shadow-glow"
                    : "hover:border-primary/40",
                )}
                onClick={() =>
                  setSelectedDoc(selectedDoc?.id === d.id ? null : d)
                }
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                {d.filename}
              </Button>
            ))}
          </div>
        )}
      </Card>

      {/* ── Topic Input + Generate ── */}
      <Card className="p-5 glass border-border/40 shadow-card flex flex-col sm:flex-row gap-3 items-stretch sm:items-end animate-card-enter">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block text-foreground/80">
            {selectedDoc
              ? "Optional focus within the document"
              : "Topic to revise"}
          </label>
          <Input
            placeholder={
              selectedDoc
                ? "e.g. Chapter 3, integration by parts…"
                : "e.g. Thermodynamics, SQL joins…"
            }
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") generate();
            }}
            className="bg-muted/30 border-border/40"
          />
        </div>
        <Button
          onClick={generate}
          disabled={busy || (!topic.trim() && !selectedDoc)}
          className="gradient-primary-bg text-white border-0 hover:opacity-90 shadow-glow transition-all duration-200 gap-2"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate revision
            </>
          )}
        </Button>
      </Card>

      {/* ── Mode Selector ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 animate-card-enter">
        {MODES.map((m) => {
          const Icon = MODE_ICONS[m.key];
          const isActive = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer",
                isActive
                  ? "gradient-primary-bg text-white border-transparent shadow-glow scale-[1.02]"
                  : "bg-card hover:bg-muted/40 border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:-translate-y-0.5",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium leading-tight text-center">
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ═══ Output Area ═══ */}

      {busy ? (
        /* ── Skeleton Loading ── */
        <Card className="glass border-border/40 overflow-hidden animate-card-enter">
          <div className="px-5 py-3 border-b border-border/40 bg-muted/20 flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="pt-2" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <div className="pt-2" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </Card>
      ) : notes ? (
        /* ── Rendered Revision ── */
        <Card className="glass border-border/40 overflow-hidden shadow-card hover:shadow-glow transition-all duration-300 animate-card-enter">
          {/* Sticky Action Toolbar */}
          <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-border/40 bg-card/80 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-xs truncate text-foreground/80">
                {activeEntry?.title ??
                  `${MODES.find((m) => m.key === mode)?.label} · ${heading}`}
              </span>
            </div>
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-1 shrink-0">
                {/* Copy */}
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
                  <TooltipContent>
                    {copied ? "Copied!" : "Copy to clipboard"}
                  </TooltipContent>
                </Tooltip>

                {/* Export PDF */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDownloadPDF}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export PDF</TooltipContent>
                </Tooltip>

                {/* Download Markdown */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDownloadMD}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download Markdown</TooltipContent>
                </Tooltip>

                <div className="w-px h-5 bg-border/40 mx-0.5" />

                {/* Save / Bookmark */}
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
                    {activeEntry?.saved ? "Remove bookmark" : "Save revision"}
                  </TooltipContent>
                </Tooltip>

                {/* Delete (clears display, keeps history) */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDeleteDisplay}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete revision</TooltipContent>
                </Tooltip>

                {/* Regenerate */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={generate}
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

          {/* Markdown Content */}
          <div className="p-6 lg:p-8">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code(props) {
                    const { className, children } = props as {
                      className?: string;
                      children?: React.ReactNode;
                    };
                    const match = /language-(\w+)/.exec(className || "");
                    const text = String(children ?? "").replace(/\n$/, "");
                    if (match) {
                      return (
                        <SyntaxHighlighter
                          style={oneDark as never}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            borderRadius: "0.5rem",
                            fontSize: "0.85rem",
                            margin: 0,
                          }}
                        >
                          {text}
                        </SyntaxHighlighter>
                      );
                    }
                    return <code className={className}>{children}</code>;
                  },
                }}
              >
                {notes}
              </ReactMarkdown>
            </div>
          </div>
        </Card>
      ) : (
        /* ── Empty State ── */
        <Card className="glass border-border/40 p-12 text-center animate-card-enter">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl gradient-soft-bg grid place-items-center">
              <StickyNote className="h-8 w-8 text-primary/60" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground/80">
                Ready to revise
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                Pick a document or enter a topic, choose a revision format, then
                click <strong>Generate revision</strong>.
              </p>
            </div>
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                className="mt-2 gap-1.5 hover:border-primary/40 transition-colors"
              >
                <History className="h-3.5 w-3.5" />
                Browse past revisions
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ═══ History Sheet ═══ */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col bg-card/95 backdrop-blur-2xl"
        >
          <SheetHeader className="p-6 pb-0">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Revision History
            </SheetTitle>
            <SheetDescription>
              Browse, search and restore previous revisions
            </SheetDescription>
          </SheetHeader>

          {/* Search */}
          <div className="px-6 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search revisions…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/30 border-border/40"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-2 space-y-2 custom-scrollbar">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted/40 grid place-items-center text-muted-foreground/50 mb-3">
                  <History className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {history.length === 0
                    ? "No revisions yet"
                    : "No matching revisions"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {history.length === 0
                    ? "Generate your first revision to see it here."
                    : "Try a different search term."}
                </p>
              </div>
            ) : (
              filteredHistory.map((entry) => {
                const isActive = entry.id === activeEntryId;
                const ModeIcon = MODE_ICONS[entry.mode] ?? StickyNote;
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
                        <ModeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate text-foreground/90">
                            {entry.title}
                          </span>
                          {entry.saved && (
                            <Bookmark className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground/70">
                          <Clock className="h-3 w-3" />
                          {new Date(entry.timestamp).toLocaleDateString([], {
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                        onClick={() => handleDeleteHistoryEntry(entry.id)}
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

          {/* Clear all */}
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