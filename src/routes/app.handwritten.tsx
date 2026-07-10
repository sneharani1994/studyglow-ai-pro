import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ScanLine,
  Upload,
  X,
  Copy,
  Download,
  Loader2,
  Sparkles,
  Save,
  History,
  Trash2,
  FileText,
  Check,
  RefreshCw,
  Plus,
  ChevronRight,
  BrainCircuit,
  Layers,
  BookOpen,
  Search,
  Clock,
} from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/handwritten")({
  component: HandwrittenPage,
});

// ── Types ──────────────────────────────────────────────────────────────────
interface UploadItem {
  id: string;
  file: File;
  preview: string;
  text: string;
  notes: string;
  progress: number;
  confidence: number | null;
  status: "idle" | "reading" | "done" | "error";
  error?: string;
}

interface SavedNote {
  id: string;
  title: string;
  text: string;
  notes: string;
  timestamp: string;
  confidence: number | null;
}

// ── Constants ──────────────────────────────────────────────────────────────
const HISTORY_STORAGE_KEY = "studyglow.handwritten.history";

// ── Main Component ─────────────────────────────────────────────────────────
function HandwrittenPage() {
  const navigate = useNavigate();

  // Core uploads state
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Core history state
  const [history, setHistory] = useState<SavedNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedNotes, setCopiedNotes] = useState(false);

  // Loading states for active OCR and AI actions
  const [busy, setBusy] = useState(false);
  const [notesBusy, setNotesBusy] = useState(false);
  const [aiActionBusy, setAiActionBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load history on mount & restore latest note automatically
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed: SavedNote[] = JSON.parse(stored);
        setHistory(parsed);
        // Automatically restore the latest note on refresh
        if (parsed.length > 0) {
          const latest = parsed[0];
          // Create a mock upload item from latest saved note so it shows in workspace
          const mockItem: UploadItem = {
            id: latest.id,
            file: new File([], latest.title),
            preview: "", // no preview image available for historical notes
            text: latest.text,
            notes: latest.notes,
            progress: 100,
            confidence: latest.confidence,
            status: "done",
          };
          setUploads([mockItem]);
          setActiveId(latest.id);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Save history helper
  const saveToHistoryList = (newList: SavedNote[]) => {
    setHistory(newList);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newList));
    } catch {
      /* ignore */
    }
  };

  // Find currently active upload item
  const activeItem = useMemo(() => {
    return uploads.find((u) => u.id === activeId) || null;
  }, [uploads, activeId]);

  // Update properties of a specific upload item
  const updateUploadItem = (id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  // Handle file input selection
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: UploadItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} is not an image file`);
        continue;
      }

      // Check for duplicates
      if (uploads.some((u) => u.file.name === f.name && u.file.size === f.size)) {
        continue;
      }

      const id = Date.now().toString() + "-" + Math.random().toString(36).substring(2, 6);
      newItems.push({
        id,
        file: f,
        preview: URL.createObjectURL(f),
        text: "",
        notes: "",
        progress: 0,
        confidence: null,
        status: "idle",
      });
    }

    if (newItems.length > 0) {
      setUploads((prev) => [...prev, ...newItems]);
      if (!activeId) {
        setActiveId(newItems[0].id);
      }
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [uploads, activeId]);

  // Clear single upload item
  const removeUpload = (id: string) => {
    const item = uploads.find((u) => u.id === id);
    if (item?.preview) URL.revokeObjectURL(item.preview);

    const filtered = uploads.filter((u) => u.id !== id);
    setUploads(filtered);

    if (activeId === id) {
      setActiveId(filtered.length > 0 ? filtered[0].id : null);
    }
  };

  // Clear all uploaded files
  const removeAllUploads = () => {
    uploads.forEach((u) => {
      if (u.preview) URL.revokeObjectURL(u.preview);
    });
    setUploads([]);
    setActiveId(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Run Tesseract OCR (preserving existing dynamic import workflow)
  const extractText = async (id: string) => {
    const item = uploads.find((u) => u.id === id);
    if (!item || item.file.size === 0) return;

    setBusy(true);
    updateUploadItem(id, { status: "reading", progress: 0, text: "" });

    try {
      const { recognize } = await import("tesseract.js");
      const { data } = await recognize(item.file, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            const pct = Math.round(m.progress * 100);
            updateUploadItem(id, { progress: pct });
          }
        },
      });

      const cleaned = (data.text || "").trim();
      const confidence = data.confidence !== undefined ? Math.round(data.confidence) : null;

      if (!cleaned) {
        toast.error("Couldn't extract text. Check the image clarity.");
        updateUploadItem(id, { status: "error", error: "No text found" });
      } else {
        updateUploadItem(id, {
          status: "done",
          text: cleaned,
          confidence,
          progress: 100,
        });
        toast.success("Text extracted successfully!");
      }
    } catch (err: any) {
      toast.error("OCR process failed");
      updateUploadItem(id, { status: "error", error: err?.message || "OCR failed" });
    } finally {
      setBusy(false);
    }
  };

  // Run AI Study Notes generation on extracted text
  const generateStudyNotes = async () => {
    if (!activeItem || !activeItem.text.trim()) return;
    setNotesBusy(true);
    try {
      const res = await aiService.generateStudyNotes(activeItem.text.slice(0, 4000), "standard");
      updateUploadItem(activeItem.id, { notes: res.studyNotes });
      toast.success("AI study notes generated!");
    } catch {
      toast.error("AI service is temporarily busy. Please try again.");
    } finally {
      setNotesBusy(false);
    }
  };

  // Save prediction / note to local history list
  const saveNote = () => {
    if (!activeItem || !activeItem.text.trim()) return;

    const noteTitle = activeItem.file.name !== "mock" ? activeItem.file.name : "Extracted Notes";

    const newNote: SavedNote = {
      id: activeItem.id,
      title: noteTitle,
      text: activeItem.text,
      notes: activeItem.notes,
      timestamp: new Date().toISOString(),
      confidence: activeItem.confidence,
    };

    // Filter out duplicates
    const filteredHistory = history.filter(
      (h) => h.id !== activeItem.id && h.title !== noteTitle
    );
    const updatedHistory = [newNote, ...filteredHistory].slice(0, 20);

    saveToHistoryList(updatedHistory);
    toast.success("Note saved to history!");
  };

  // Restore note from history
  const restoreNote = (n: SavedNote) => {
    // Check if it already exists in workspace
    const existing = uploads.find((u) => u.id === n.id);
    if (existing) {
      setActiveId(n.id);
      return;
    }

    const restoredItem: UploadItem = {
      id: n.id,
      file: new File([], n.title),
      preview: "", // no preview image available
      text: n.text,
      notes: n.notes,
      progress: 100,
      confidence: n.confidence,
      status: "done",
    };

    setUploads((prev) => [restoredItem, ...prev]);
    setActiveId(n.id);
    toast.success(`Restored: ${n.title}`);
  };

  // Delete note from history
  const deleteNote = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    saveToHistoryList(updated);
    toast.success("Note deleted from history");
  };

  // Clear all notes history
  const clearHistory = () => {
    saveToHistoryList([]);
    toast.success("History cleared");
  };

  // Copy Extracted Text
  const copyText = async () => {
    if (!activeItem || !activeItem.text) return;
    try {
      await navigator.clipboard.writeText(activeItem.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Extracted text copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  // Copy AI Study Notes
  const copyNotes = async () => {
    if (!activeItem || !activeItem.notes) return;
    try {
      await navigator.clipboard.writeText(activeItem.notes);
      setCopiedNotes(true);
      setTimeout(() => setCopiedNotes(false), 1500);
      toast.success("AI study notes copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  // Download Extracted Text as TXT
  const downloadTxt = () => {
    if (!activeItem) return;
    try {
      const content = activeItem.notes
        ? `--- EXTRACTED TEXT ---\n\n${activeItem.text}\n\n--- AI STUDY NOTES ---\n\n${activeItem.notes}`
        : activeItem.text;

      const element = document.createElement("a");
      const file = new Blob([content], { type: "text/plain;charset=utf-8" });
      element.href = URL.createObjectURL(file);
      element.download = `${activeItem.file.name.split(".")[0] || "extracted-notes"}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("TXT file downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  // Download Extracted Text as Markdown
  const downloadMarkdown = () => {
    if (!activeItem) return;
    try {
      const markdownContent = `### Extracted OCR Text\n\n\`\`\`\n${activeItem.text}\n\`\`\`\n\n${
        activeItem.notes ? `### AI Study Notes\n\n${activeItem.notes}` : ""
      }`;

      const element = document.createElement("a");
      const file = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
      element.href = URL.createObjectURL(file);
      element.download = `${activeItem.file.name.split(".")[0] || "extracted-notes"}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Markdown file downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  // Export PDF with jsPDF if available
  const exportPdf = () => {
    if (!activeItem) return;
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`Handwritten Notes OCR: ${activeItem.file.name}`, margin, y);
      y += 25;

      if (activeItem.confidence !== null) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`OCR Confidence: ${activeItem.confidence}%`, margin, y);
        y += 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Extracted Raw Text", margin, y);
      y += 15;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const rawLines = doc.splitTextToSize(activeItem.text, width);
      for (const line of rawLines) {
        if (y > pageHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 12;
      }
      y += 25;

      if (activeItem.notes) {
        if (y + 50 > pageHeight) {
          doc.addPage();
          y = margin;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("AI Study Notes Analysis", margin, y);
        y += 15;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const cleanNotes = activeItem.notes.replace(/[*_`#>]/g, "");
        const noteLines = doc.splitTextToSize(cleanNotes, width);
        for (const line of noteLines) {
          if (y > pageHeight) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 12;
        }
      }

      doc.save(`${activeItem.file.name.split(".")[0] || "extracted-notes"}.pdf`);
      toast.success("PDF exported successfully");
    } catch {
      toast.error("PDF export failed");
    }
  };

  // Additional AI Workflows (Quiz, Flashcard, Summarize)
  const executeAiAction = async (action: "quiz" | "flashcards" | "summarize") => {
    if (!activeItem || !activeItem.text.trim()) return;
    setAiActionBusy(action);
    try {
      const textSnippet = activeItem.text.slice(0, 3000);
      if (action === "quiz") {
        await aiService.generateQuiz(textSnippet, 5, "medium");
        navigate({ to: "/app/quizzes" });
      } else if (action === "flashcards") {
        await aiService.generateFlashcards(textSnippet, 8);
        navigate({ to: "/app/flashcards" });
      } else if (action === "summarize") {
        const res = await aiService.summarize(textSnippet, "medium");
        updateUploadItem(activeItem.id, { notes: res.summary });
        toast.success("Summary generated!");
      }
    } catch {
      toast.error("Downstream AI request failed. Please try again.");
    } finally {
      setAiActionBusy(null);
    }
  };

  // Filter history logs based on search
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (h) => h.title.toLowerCase().includes(q) || h.text.toLowerCase().includes(q)
    );
  }, [history, searchQuery]);

  return (
    <div className="relative">
      <PageHeader
        title="Handwritten Notes"
        description="Convert handwritten whiteboard snaps or notebook images into structured, study-ready notes."
      />

      {/* ═══════════ TWO-COLUMN RESPONSIVE LAYOUT ═══════════ */}
      <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start animate-fade-in-premium">
        
        {/* LEFT COLUMN: Uploads grid, preview & OCR trigger */}
        <div className="space-y-6">
          <Card
            className={cn(
              "p-6 text-center border-2 border-dashed transition-all glass",
              dragOver ? "border-primary bg-primary/5 shadow-glow" : "border-border/60"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary mx-auto mb-3">
              <ScanLine className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">
              Drop handwritten images here
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Supports PNG, JPG, or JPEG formats. Multi-file uploads supported.
            </p>
            <div className="mt-4">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Button
                onClick={() => inputRef.current?.click()}
                size="sm"
                className="text-xs bg-primary text-white"
              >
                <Upload className="h-3.5 w-3.5 mr-2" />
                Select Images
              </Button>
            </div>
          </Card>

          {/* ACTIVE UPLOADS LIST GALLERY */}
          {uploads.length > 0 && (
            <Card className="p-4 glass border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Uploaded Gallery ({uploads.length})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeAllUploads}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                >
                  Clear all
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {uploads.map((u) => {
                  const isActive = activeId === u.id;
                  const isMock = u.preview === "";

                  return (
                    <div
                      key={u.id}
                      onClick={() => setActiveId(u.id)}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border cursor-pointer group transition-all",
                        isActive
                          ? "border-primary ring-2 ring-primary/20 scale-95"
                          : "border-border/40 hover:border-muted-foreground/60"
                      )}
                    >
                      {isMock ? (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                      ) : (
                        <img
                          src={u.preview}
                          alt="thumbnail"
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Status indicator overlay */}
                      {u.status === "reading" && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      )}
                      {u.status === "done" && (
                        <div className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                          <Check className="h-2 w-2" />
                        </div>
                      )}
                      {u.status === "error" && (
                        <div className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">
                          <X className="h-2 w-2" />
                        </div>
                      )}

                      {/* Delete item hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUpload(u.id);
                        }}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ACTIVE PREVIEW CARD */}
          {activeItem && activeItem.preview && (
            <Card className="p-4 glass border-border/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold truncate text-muted-foreground max-w-[200px]">
                  {activeItem.file.name}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    activeItem.status === "done"
                      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                      : activeItem.status === "reading"
                        ? "text-primary bg-primary/10 border-primary/20"
                        : activeItem.status === "error"
                          ? "text-red-500 bg-red-500/10 border-red-500/20"
                          : "text-muted-foreground"
                  )}
                >
                  {activeItem.status === "done"
                    ? "OCR Success"
                    : activeItem.status === "reading"
                      ? `Extracting ${activeItem.progress}%`
                      : activeItem.status === "error"
                        ? "OCR Fail"
                        : "Ready"}
                </Badge>
              </div>

              <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border/40 relative">
                <img
                  src={activeItem.preview}
                  alt="selected preview"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Progress Bar & Confidence Indicators */}
              {activeItem.status === "reading" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                    <span>Analyzing handwriting layers...</span>
                    <span>{activeItem.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-primary/15 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${activeItem.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {activeItem.status === "done" && activeItem.confidence !== null && (
                <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-background/50 border border-border/20">
                  <span className="text-muted-foreground">OCR Confidence Score:</span>
                  <span className="font-bold text-emerald-500">
                    {activeItem.confidence}%
                  </span>
                </div>
              )}

              {activeItem.status === "error" && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                  Failed: {activeItem.error || "Text unreadable"}
                </div>
              )}

              {/* Action Trigger Button */}
              <div className="flex gap-2">
                <Button
                  onClick={() => extractText(activeItem.id)}
                  disabled={busy}
                  className="flex-1 text-xs text-white"
                >
                  {activeItem.status === "reading" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Extracting...
                    </>
                  ) : activeItem.status === "done" ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Re-Extract Text
                    </>
                  ) : (
                    <>
                      <ScanLine className="h-3.5 w-3.5 mr-1.5" />
                      Extract Text
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Extracted Workspace editor, AI Notes, and History */}
        <div className="min-w-0 space-y-6">
          {!activeItem ? (
            /* EMPTY WORKSPACE STATE */
            <Card className="p-12 text-center border-border/40 glass">
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <ScanLine className="h-6 w-6" />
                </div>
              </div>
              <h4 className="text-base font-bold mb-2 text-foreground">
                Workspace Empty
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Drop handwritten images on the left to start OCR transcription. Past notes can be restored below.
              </p>
            </Card>
          ) : (
            /* ACTIVE WORKSPACE EDITOR */
            <div className="space-y-6">
              
              {/* STICKY WORKSPACE ACTION TOOLBAR */}
              <div className="sticky top-0 z-10 glass border-border/40 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-background/80 backdrop-blur-md shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4.5 w-4.5 text-primary shrink-0" />
                  <span className="font-semibold text-sm truncate">
                    {activeItem.file.name !== "mock" ? activeItem.file.name : "Restored OCR Workspace"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyText}
                    disabled={!activeItem.text}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    Copy Text
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={downloadTxt}
                    disabled={!activeItem.text}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    TXT
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={downloadMarkdown}
                    disabled={!activeItem.text}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Markdown
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exportPdf}
                    disabled={!activeItem.text}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    PDF
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={saveNote}
                    disabled={!activeItem.text}
                    className="h-8 px-2.5 text-xs text-primary hover:bg-primary/10 font-bold"
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Save Note
                  </Button>
                </div>
              </div>

              {/* EDITABLE TEXT AREA PANEL */}
              <Card className="p-5 glass border-border/40 space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <ScanLine className="h-4 w-4 text-primary" />
                    Extracted Text Editor
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    Editable OCR transcription
                  </span>
                </div>

                {activeItem.status === "reading" ? (
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : activeItem.text ? (
                  <Textarea
                    rows={12}
                    value={activeItem.text}
                    onChange={(e) => updateUploadItem(activeItem.id, { text: e.target.value })}
                    className="text-sm bg-background/40 font-mono leading-relaxed"
                    placeholder="Extracted text will show here. Feel free to edit or correct spelling gaps..."
                  />
                ) : (
                  <div className="text-center py-10 text-xs text-muted-foreground italic">
                    No text extracted yet. Click "Extract Text" on the left preview card.
                  </div>
                )}

                {/* AI integration downstreams */}
                {activeItem.text && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={generateStudyNotes}
                      disabled={notesBusy}
                      className="text-xs h-8 gap-1"
                    >
                      {notesBusy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Study Notes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => executeAiAction("quiz")}
                      disabled={!!aiActionBusy}
                      className="text-xs h-8 gap-1"
                    >
                      {aiActionBusy === "quiz" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <BrainCircuit className="h-3.5 w-3.5" />
                      )}
                      Quiz
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => executeAiAction("flashcards")}
                      disabled={!!aiActionBusy}
                      className="text-xs h-8 gap-1"
                    >
                      {aiActionBusy === "flashcards" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Layers className="h-3.5 w-3.5" />
                      )}
                      Flashcards
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => executeAiAction("summarize")}
                      disabled={!!aiActionBusy}
                      className="text-xs h-8 gap-1"
                    >
                      {aiActionBusy === "summarize" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <BookOpen className="h-3.5 w-3.5" />
                      )}
                      Summarize
                    </Button>
                  </div>
                )}
              </Card>

              {/* AI STUDY NOTES ANALYSIS DISPLAY */}
              {activeItem.notes && (
                <Card className="p-5 glass border-border/40 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-1 w-1/3 bg-primary" />
                  <div className="flex justify-between items-center border-b border-border/40 pb-2 mb-3">
                    <h4 className="font-semibold text-sm text-primary flex items-center gap-1.5">
                      <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
                      AI Analysis Study Notes
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyNotes}
                      className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      {copiedNotes ? (
                        <Check className="h-3 w-3 text-emerald-500 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copy Notes
                    </Button>
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground max-h-[300px] overflow-y-auto">
                    {activeItem.notes}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ═══════════ SAVED OCR HISTORY PANEL ═══════════ */}
          <Card className="p-5 glass border-border/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <History className="h-4.5 w-4.5 text-muted-foreground" />
                OCR History Log
              </h3>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Filter History */}
            <div className="relative text-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search history by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background/50"
              />
            </div>

            {/* Saved list */}
            {filteredHistory.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No saved OCR history found matching criteria.
              </div>
            ) : (
              <ScrollArea className="h-44">
                <div className="space-y-1.5 pr-2">
                  {filteredHistory.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => restoreNote(h)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between group",
                        activeId === h.id
                          ? "bg-primary/10 border-primary/40 text-foreground"
                          : "border-border/40 hover:bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground truncate">
                          {h.title}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(h.timestamp).toLocaleDateString()}
                          </span>
                          {h.confidence !== null && (
                            <>
                              <span>•</span>
                              <span>OCR: {h.confidence}%</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(h.id);
                          }}
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}