import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Copy,
  Download,
  Save,
  RotateCw,
  Trash2,
  FileText,
  UploadCloud,
  Search,
  Calendar,
  Star,
  X,
  Check,
  ArrowRight,
  Loader2,
  ChevronRight,
  FileBadge,
  Info,
  BookOpen,
  History,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  FileWarning,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { uploadsService, aiService, type UploadedFile } from "@/lib/api";
import { toast } from "sonner";
import { emitAppRefresh } from "@/lib/events";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/summaries")({
  component: SummariesPage,
});

interface SummaryHistoryEntry {
  id: string;
  title: string;
  markdown: string;
  timestamp: string;
  docId: string | null;
  isStarred?: boolean;
}

interface TOCItem {
  text: string;
  id: string;
  level: number;
}

const LOADING_STATUSES = [
  "Reading document structure...",
  "Analyzing document metadata...",
  "Extracting page contents...",
  "Synthesizing key definitions...",
  "Identifying main topics and concepts...",
  "Formatting study notes with markdown...",
  "Refining layout and formatting...",
  "Wrapping up professional summaries...",
];

export function SummariesPage() {
  const [docs, setDocs] = useState<UploadedFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and filter states
  const [docSearch, setDocSearch] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"docs" | "history">("docs");
  const [historySearch, setHistorySearch] = useState("");
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // File Upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Active section for ScrollSpy
  const [activeSection, setActiveSection] = useState<string>("");

  // History State (Persisted locally, max 20 entries)
  const [history, setHistory] = useState<SummaryHistoryEntry[]>([]);
  const [activeSummary, setActiveSummary] = useState<SummaryHistoryEntry | null>(null);

  // Ref to summary workspace scroll-container
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Load documents and history on mount
  useEffect(() => {
    uploadsService
      .list()
      .then((d) => {
        setDocs(d);
        if (d.length && !selectedId) setSelectedId(d[0].id);
      })
      .catch(() => setDocs([]));

    // Load Local History
    const cachedHistory = localStorage.getItem("studyglow.summaries.history");
    if (cachedHistory) {
      try {
        const parsed: SummaryHistoryEntry[] = JSON.parse(cachedHistory);
        setHistory(parsed);
        // Automatically restore the latest summary after refresh
        if (parsed.length > 0) {
          const latest = parsed[0];
          setActiveSummary(latest);
          setSummary(latest.markdown);
          if (latest.docId) {
            setSelectedId(latest.docId);
          }
        }
      } catch (e) {
        console.warn("Failed to load local summaries history", e);
      }
    }
  }, []);

  const selected = docs.find((d) => d.id === selectedId);

  // Cycling Loader messages
  const [loadingStatus, setLoadingStatus] = useState(LOADING_STATUSES[0]);
  useEffect(() => {
    if (!busy) return;
    let idx = 0;
    setLoadingStatus(LOADING_STATUSES[0]);
    const timer = setInterval(() => {
      idx = (idx + 1) % LOADING_STATUSES.length;
      setLoadingStatus(LOADING_STATUSES[idx]);
    }, 2500);
    return () => clearInterval(timer);
  }, [busy]);

  // Format File Size
  const formatSize = (bytes: number) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  // Format Time Ago
  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "";
    }
  };

  // File Upload Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".pdf") && !file.name.endsWith(".docx")) {
      toast.error("Unsupported file format. Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File exceeds 20MB limit.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    try {
      const interval = setInterval(() => {
        setUploadProgress((p) => (p < 85 ? p + 8 : p));
      }, 150);

      const uploaded = await uploadsService.upload(file);
      clearInterval(interval);
      setUploadProgress(100);
      toast.success("Document uploaded successfully");

      const dList = await uploadsService.list();
      setDocs(dList);
      setSelectedId(uploaded.id);
      setSummary("");
      setError(null);
      setActiveSummary(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Document Deletion
  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await uploadsService.delete(id);
      toast.success("Document deleted");
      const dList = docs.filter((d) => d.id !== id);
      setDocs(dList);
      if (selectedId === id) {
        setSelectedId(dList.length ? dList[0].id : null);
        setSummary("");
        setActiveSummary(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete document");
    }
  };

  // Generate Summary notes flow
  const handleGenerate = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const prompt = `Create professional structured study notes for the document titled "${selected.filename}". Format as markdown with these clearly labeled sections:\n\n# Title\n## Introduction\n## Key Concepts\n## Bullet Points\n## Definitions\n## Important Formulae\n## Examples\n## Quick Revision\n## Exam Tips\n## Conclusion`;
      const res = await aiService.generateStudyNotesWithDoc(selected.id, prompt, "deep dive");

      setSummary(res.studyNotes);
      emitAppRefresh({ source: "summaries" });

      // Save to local history list, enforce max 20 entries and no duplicates
      const newEntry: SummaryHistoryEntry = {
        id: Date.now().toString(),
        title: selected.filename,
        markdown: res.studyNotes,
        timestamp: new Date().toISOString(),
        docId: selected.id,
        isStarred: false,
      };

      const updatedHistory = [newEntry, ...history.filter((h) => h.docId !== selected.id)].slice(0, 20);
      setHistory(updatedHistory);
      localStorage.setItem("studyglow.summaries.history", JSON.stringify(updatedHistory));
      setActiveSummary(newEntry);
    } catch (e: any) {
      const msg = e?.message || "Could not generate summary";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // Actions for active summary
  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setIsCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      toast.error("Copy failed");
    }
  };

  const handleDownloadPDF = () => {
    if (!summary) return;
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      const docTitle = activeSummary?.title || selected?.filename || "Summary";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      const titleLines = doc.splitTextToSize(docTitle, width);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 20 + 10;

      doc.setFont("helvetica", "oblique");
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()} | StudyGlow AI Workspace`, margin, y);
      y += 20;

      doc.setDrawColor(220);
      doc.line(margin, y, margin + width, y);
      y += 20;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30);

      // Strip markdown syntax for pure text PDF output formatting
      const plain = summary
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

      doc.save(`${docTitle.replace(/\.[^/.]+$/, "")}_summary.pdf`);
      toast.success("PDF Downloaded");
    } catch (err) {
      toast.error("PDF export failed");
    }
  };

  const handleDownloadMD = () => {
    if (!summary) return;
    const docTitle = activeSummary?.title || selected?.filename || "summary";
    const blob = new Blob([summary], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle.replace(/\.[^/.]+$/, "")}_summary.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown Downloaded");
  };

  const handleToggleStar = (entry: SummaryHistoryEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = history.map((h) => {
      if (h.id === entry.id) {
        return { ...h, isStarred: !h.isStarred };
      }
      return h;
    });
    setHistory(updated);
    localStorage.setItem("studyglow.summaries.history", JSON.stringify(updated));

    if (activeSummary?.id === entry.id) {
      setActiveSummary({ ...activeSummary, isStarred: !activeSummary.isStarred });
    }
    toast.success(entry.isStarred ? "Removed from saved summaries" : "Saved to summaries");
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Remove this summary from history?")) return;
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem("studyglow.summaries.history", JSON.stringify(updated));
    if (activeSummary?.id === id) {
      setActiveSummary(null);
      setSummary("");
    }
    toast.success("Summary deleted from history");
  };

  const handleClearHistory = () => {
    if (!confirm("Clear all history? This will permanently wipe all generated summaries stored locally.")) return;
    setHistory([]);
    localStorage.removeItem("studyglow.summaries.history");
    setActiveSummary(null);
    setSummary("");
    toast.success("History cleared");
  };

  const handleRestoreHistory = (h: SummaryHistoryEntry) => {
    setActiveSummary(h);
    setSummary(h.markdown);
    setError(null);
    if (h.docId) {
      setSelectedId(h.docId);
    } else {
      setSelectedId(null);
    }
  };

  const handleDeleteActiveSummary = () => {
    if (!activeSummary) {
      setSummary("");
      return;
    }
    handleDeleteHistoryItem(activeSummary.id, { stopPropagation: () => {} } as any);
  };

  // Calculations for metadata stats
  const wordCount = useMemo(() => {
    if (!summary) return 0;
    return summary.trim().split(/\s+/).filter(Boolean).length;
  }, [summary]);

  const readingTime = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  // Extract headings for dynamic TOC
  const tocItems = useMemo(() => {
    if (!summary) return [];
    const lines = summary.split("\n");
    const items: TOCItem[] = [];
    lines.forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].replace(/[*_`]/g, "").trim();
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        if (text && id) {
          items.push({ text, id, level });
        }
      }
    });
    return items;
  }, [summary]);

  // Scroll Spy for TOC active highlighting
  useEffect(() => {
    if (!summary || tocItems.length === 0) return;
    const headingElements = tocItems.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140; // sticky header offset
      let currentActive = "";
      for (const el of headingElements) {
        if (el.offsetTop <= scrollPosition) {
          currentActive = el.id;
        } else {
          break;
        }
      }
      setActiveSection(currentActive || (tocItems[0]?.id ?? ""));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [summary, tocItems]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -120; // sticky header padding
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveSection(id);
    }
  };

  // Filtered documents list
  const filteredDocs = useMemo(() => {
    return docs.filter((d) => d.filename.toLowerCase().includes(docSearch.toLowerCase()));
  }, [docs, docSearch]);

  // Filtered history list
  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      const matchesSearch =
        h.title.toLowerCase().includes(historySearch.toLowerCase()) ||
        h.markdown.toLowerCase().includes(historySearch.toLowerCase());
      const matchesStarred = !showStarredOnly || h.isStarred;
      return matchesSearch && matchesStarred;
    });
  }, [history, historySearch, showStarredOnly]);

  // Get File Type Icon
  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileBadge className="h-4 w-4 text-rose-500" />;
    if (ext === "xlsx" || ext === "xls" || ext === "csv") return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
    if (ext === "txt") return <FileText className="h-4 w-4 text-blue-500" />;
    return <FileText className="h-4 w-4 text-violet-500" />;
  };

  // Helper function to extract string values from react-markdown children safely
  const getHeadingText = (node: any): string => {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(getHeadingText).join("");
    if (node && node.props && node.props.children) return getHeadingText(node.props.children);
    return "";
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      <PageHeader title="StudyGlow AI Summaries" description="Transform lengthy textbooks, PDFs, and documents into study-ready summaries." />

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        {/* ── LEFT COLUMN: CONTROL SIDEBAR ── */}
        <div className="lg:col-span-1 space-y-6">
          {/* TAB NAVIGATOR */}
          <div className="glass rounded-2xl p-4 border border-border/40 space-y-4 shadow-sm bg-card/10">
            <div className="flex bg-muted/40 p-1 rounded-xl border border-border/20">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 text-xs gap-2 h-9 font-semibold rounded-lg transition-all duration-300",
                  sidebarTab === "docs" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSidebarTab("docs")}
              >
                <FileText className="h-4 w-4" /> Documents
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 text-xs gap-2 h-9 font-semibold rounded-lg transition-all duration-300",
                  sidebarTab === "history" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSidebarTab("history")}
              >
                <History className="h-4 w-4" /> History
                {history.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[9px] bg-primary/10 text-primary border-primary/20">
                    {history.length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* TAB CONTENTS */}
            <AnimatePresence mode="wait">
              {sidebarTab === "docs" ? (
                <motion.div
                  key="docs-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Premium Upload Panel */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "relative rounded-xl border-2 border-dashed p-6 transition-all duration-300 text-center cursor-pointer",
                      isDragging
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-border/60 hover:border-primary/50 hover:bg-card/25"
                    )}
                  >
                    <input
                      type="file"
                      id="doc-upload"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleFileChange}
                      accept=".pdf,.txt,.docx,.doc"
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <div className="space-y-3 py-2">
                        <Loader2 className="h-7 w-7 animate-spin mx-auto text-primary" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground">Uploading document...</p>
                          <p className="text-[10px] text-muted-foreground">{uploadProgress}% complete</p>
                        </div>
                        <Progress value={uploadProgress} className="h-1 max-w-[150px] mx-auto" />
                      </div>
                    ) : (
                      <div className="space-y-2 py-1">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary animate-pulse">
                          <UploadCloud className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Drag & drop document</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">PDF, TXT, DOCX up to 20MB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Selector with search */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search uploaded documents..."
                        className="pl-9 text-xs h-9 bg-background/30"
                        value={docSearch}
                        onChange={(e) => setDocSearch(e.target.value)}
                      />
                    </div>

                    <ScrollArea className="h-[250px] pr-2">
                      {filteredDocs.length === 0 ? (
                        <div className="text-center py-8 text-xs text-muted-foreground">
                          {docSearch ? "No matching documents" : "No documents uploaded yet"}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {filteredDocs.map((d) => (
                            <div
                              key={d.id}
                              onClick={() => {
                                setSelectedId(d.id);
                                setError(null);
                              }}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 cursor-pointer hover:bg-card/30 group",
                                selectedId === d.id
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border/30 bg-background/20"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div
                                  className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                    selectedId === d.id ? "bg-primary/20" : "bg-muted/40"
                                  )}
                                >
                                  {getFileIcon(d.filename)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate text-foreground group-hover:text-primary transition-colors">
                                    {d.filename}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                    <span>{formatSize(d.file_size)}</span>
                                    <span>•</span>
                                    <span>{formatTimeAgo(d.created_at)}</span>
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500 transition-all shrink-0 ml-1"
                                onClick={(e) => handleDeleteDoc(d.id, e)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={busy || !selected}
                    className="w-full gradient-primary-bg text-white border-0 font-bold text-xs h-10 shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:opacity-95 transition-all duration-300"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {busy ? "Analyzing Document..." : "Generate AI Summary"}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="history-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search local history..."
                          className="pl-9 text-xs h-9 bg-background/30"
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant={showStarredOnly ? "default" : "outline"}
                        className="h-9 px-2.5 gap-1 shrink-0"
                        onClick={() => setShowStarredOnly(!showStarredOnly)}
                      >
                        <Star className={cn("h-3.5 w-3.5", showStarredOnly && "fill-current")} />
                        <span className="text-[10px] hidden md:inline">Saved</span>
                      </Button>
                    </div>

                    <ScrollArea className="h-[320px] pr-2">
                      {filteredHistory.length === 0 ? (
                        <div className="text-center py-10 text-xs text-muted-foreground">
                          {historySearch || showStarredOnly ? "No matching history items" : "No summary history yet"}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredHistory.map((h) => (
                            <div
                              key={h.id}
                              onClick={() => handleRestoreHistory(h)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 cursor-pointer hover:bg-card/30 group",
                                activeSummary?.id === h.id
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border/30 bg-background/20"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <FileText className={cn("h-4 w-4 shrink-0", activeSummary?.id === h.id ? "text-primary" : "text-muted-foreground")} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate text-foreground group-hover:text-primary transition-colors">
                                    {h.title}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                    <span>{formatTimeAgo(h.timestamp)}</span>
                                    <span>•</span>
                                    <span>{h.markdown.split(/\s+/).filter(Boolean).length} words</span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0 ml-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500"
                                  onClick={(e) => handleToggleStar(h, e)}
                                >
                                  <Star className={cn("h-3.5 w-3.5", h.isStarred && "fill-amber-500 text-amber-500")} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                                  onClick={(e) => handleDeleteHistoryItem(h.id, e)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>

                    {history.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 h-8 font-semibold mt-2"
                        onClick={handleClearHistory}
                      >
                        Clear Summary History
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── MIDDLE COLUMN: WORKSPACE CONTENT ── */}
        <div className={cn("lg:col-span-2 space-y-6", tocItems.length > 0 ? "xl:col-span-2" : "xl:col-span-3")}>
          {busy ? (
            /* Premium Loading Skeleton */
            <Card className="p-8 border border-border/40 shadow-xl space-y-6 bg-card/10 backdrop-blur-md overflow-hidden relative min-h-[500px] flex flex-col justify-center">
              <div className="absolute top-0 left-0 right-0 h-1 bg-muted overflow-hidden">
                <div className="h-full bg-primary animate-pulse w-2/3 rounded-full" />
              </div>
              <div className="text-center space-y-4 max-w-md mx-auto py-12">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-spin relative">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground animate-pulse">StudyGlow AI Summarizer</h3>
                  <p className="text-sm font-medium text-muted-foreground h-5">{loadingStatus}</p>
                </div>
              </div>
              <div className="space-y-4 opacity-50 px-6 max-w-2xl mx-auto w-full">
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
                <div className="pt-4 space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                </div>
              </div>
            </Card>
          ) : error ? (
            /* Friendly Error State */
            <Card className="p-10 border border-rose-500/20 shadow-xl bg-card/5 backdrop-blur-md text-center space-y-6">
              <div className="h-14 w-14 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto text-rose-500">
                <FileWarning className="h-7 w-7" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-foreground">Generation Failed</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <div className="flex justify-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setError(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleGenerate} className="gradient-primary-bg text-white border-0">
                  <RotateCw className="h-3.5 w-3.5 mr-2" /> Retry
                </Button>
              </div>
            </Card>
          ) : summary ? (
            /* Main Summary Workspace Card */
            <Card className="border border-border/40 shadow-xl bg-card/10 backdrop-blur-md overflow-hidden" ref={workspaceRef}>
              {/* STICKY ACTION TOOLBAR */}
              <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border/40 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold truncate text-foreground" title={activeSummary?.title || selected?.filename || "Summary"}>
                      {activeSummary?.title || selected?.filename || "Summary"}
                    </h2>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded-lg shrink-0 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                      onClick={() => activeSummary && handleToggleStar(activeSummary)}
                    >
                      <Star className={cn("h-4 w-4", activeSummary?.isStarred && "fill-amber-500 text-amber-500")} />
                    </Button>
                  </div>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-semibold mt-1">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {readingTime} min read
                    </span>
                    <span>•</span>
                    <span>{wordCount.toLocaleString()} words</span>
                    {activeSummary?.timestamp && (
                      <>
                        <span>•</span>
                        <span>Saved {formatTimeAgo(activeSummary.timestamp)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-1.5">
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold px-2.5" onClick={handleCopy}>
                    {isCopied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {isCopied ? "Copied" : "Copy"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold px-2.5" onClick={handleDownloadMD}>
                    <FileCode className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                    MD
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold px-2.5" onClick={handleDownloadPDF}>
                    <FileBadge className="h-3.5 w-3.5 mr-1.5 text-rose-500" />
                    PDF
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold px-2.5" onClick={handleGenerate}>
                    <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                    Regen
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500"
                    onClick={handleDeleteActiveSummary}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* RENDERED MARKDOWN CONTENT */}
              <div className="p-8 md:p-10 font-sans prose prose-sm dark:prose-invert max-w-none prose-headings:font-extrabold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-p:text-muted-foreground/90 prose-li:text-muted-foreground/90 prose-strong:text-foreground animate-in fade-in duration-300">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => headingRenderer(1, children),
                    h2: ({ children }) => headingRenderer(2, children),
                    h3: ({ children }) => headingRenderer(3, children),
                    p: ({ children }) => <p className="text-sm leading-relaxed text-muted-foreground mb-4">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1.5 text-sm text-muted-foreground">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-sm text-muted-foreground">{children}</ol>,
                    li: ({ children }) => <li className="text-sm leading-relaxed pl-1">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary/45 pl-4 italic text-muted-foreground my-4 bg-primary/5 py-2.5 pr-3 rounded-r-lg">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-5 rounded-xl border border-border/40">
                        <table className="w-full text-left text-xs border-collapse">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => <th className="bg-muted/40 p-2.5 font-bold border-b border-border/40 text-foreground">{children}</th>,
                    td: ({ children }) => <td className="p-2.5 border-b border-border/20 text-muted-foreground">{children}</td>,
                  }}
                >
                  {summary}
                </ReactMarkdown>
              </div>
            </Card>
          ) : (
            /* Premium Empty State */
            <Card className="p-12 border border-border/40 shadow-xl bg-card/10 backdrop-blur-md text-center py-20 flex flex-col items-center justify-center min-h-[500px]">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 animate-bounce">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-xl font-extrabold text-foreground">AI Summaries Workspace</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Select a document from the left, or upload a new file, to extract the essential concepts, definitions, and exam preparation tips in a detailed structured format.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-xl w-full mt-10 text-left">
                <div className="p-4 rounded-xl border border-border/30 bg-background/20 space-y-1">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Step 1</div>
                  <h4 className="text-xs font-bold text-foreground">Upload file</h4>
                  <p className="text-[10px] text-muted-foreground">Drag PDFs or TXT documents into the select area.</p>
                </div>
                <div className="p-4 rounded-xl border border-border/30 bg-background/20 space-y-1">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Step 2</div>
                  <h4 className="text-xs font-bold text-foreground">Select item</h4>
                  <p className="text-[10px] text-muted-foreground">Pick the uploaded file from the selector list.</p>
                </div>
                <div className="p-4 rounded-xl border border-border/30 bg-background/20 space-y-1">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Step 3</div>
                  <h4 className="text-xs font-bold text-foreground">Generate</h4>
                  <p className="text-[10px] text-muted-foreground">Generate structured markdown study notes.</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ── RIGHT COLUMN: TABLE OF CONTENTS (TOC) ── */}
        {summary && tocItems.length > 0 && (
          <div className="hidden xl:block xl:col-span-1 sticky top-24 self-start">
            <Card className="p-5 border border-border/40 bg-card/10 backdrop-blur-md shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Table of Contents</h3>
              </div>

              <ScrollArea className="h-[400px] -mr-2 pr-2">
                <div className="space-y-1">
                  {tocItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToHeading(item.id)}
                      className={cn(
                        "w-full text-left text-xs font-semibold py-1.5 px-2 rounded-lg transition-all border border-transparent duration-300 block truncate cursor-pointer",
                        item.level === 1 ? "pl-2 font-bold" : item.level === 2 ? "pl-5" : "pl-8",
                        activeSection === item.id
                          ? "bg-primary/10 border-primary/20 text-primary font-bold animate-in fade-in"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        )}
      </div>
    </div>
  );

  // Dynamic heading renderer with proper anchor IDs
  function headingRenderer(level: number, children: React.ReactNode) {
    const text = getHeadingText(children);
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (level === 1) {
      return (
        <h1 id={id} className="text-2xl font-black text-foreground mt-8 mb-4 scroll-mt-28 tracking-tight border-b pb-2 border-border/40">
          {children}
        </h1>
      );
    }
    if (level === 2) {
      return (
        <h2 id={id} className="text-xl font-extrabold text-foreground mt-6 mb-3 scroll-mt-28 tracking-tight border-b pb-1 border-border/20">
          {children}
        </h2>
      );
    }
    return (
      <h3 id={id} className="text-lg font-bold text-foreground mt-4 mb-2 scroll-mt-28 tracking-tight">
        {children}
      </h3>
    );
  }
}