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
  ScanLine, Upload, X, Copy, Download, Loader2, Sparkles, Save, History, Trash2, FileText,
  Check, RefreshCw, ChevronRight, BrainCircuit, Layers, BookOpen, Search, Clock, ZoomIn, ZoomOut, RotateCw,
  Maximize2, Minimize2, CheckCircle2, AlertTriangle, FileCode, Info, HelpCircle, Columns
} from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

  // Image manipulation states
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Result display states
  const [viewMode, setViewMode] = useState<"raw" | "formatted">("formatted");
  const [isMonospace, setIsMonospace] = useState(false);
  const [processingTimes, setProcessingTimes] = useState<Record<string, string>>({});
  const [isTextFullscreen, setIsTextFullscreen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load history on mount & restore latest note automatically
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed: SavedNote[] = JSON.parse(stored);
        setHistory(parsed);
        if (parsed.length > 0) {
          const latest = parsed[0];
          const mockItem: UploadItem = {
            id: latest.id,
            file: new File([], latest.title),
            preview: "", 
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

  // Keyboard Shortcuts accessibility (Ctrl+C, Ctrl+S, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
        setIsTextFullscreen(false);
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          saveNote();
        }
        return;
      }
      if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
        if (activeItem && activeItem.text && window.getSelection()?.toString() === "") {
          e.preventDefault();
          copyText();
        }
      }
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveNote();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeId, uploads, history]);

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
    const startTime = Date.now();
    updateUploadItem(id, { status: "reading", progress: 0, text: "" });

    try {
      const { recognize } = await import("tesseract.js");
      const { data } = await recognize(item.file, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            const pct = Math.min(Math.round(m.progress * 100), 99);
            updateUploadItem(id, { progress: pct });
          }
        },
      });

      const cleaned = (data.text || "").trim();
      const confidence = data.confidence !== undefined ? Math.round(data.confidence) : null;
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

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
        setProcessingTimes((prev) => ({ ...prev, [id]: `${duration}s` }));
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

    const noteTitle = activeItem.file.name !== "mock" && activeItem.file.name ? activeItem.file.name : "Extracted Notes";

    const newNote: SavedNote = {
      id: activeItem.id,
      title: noteTitle,
      text: activeItem.text,
      notes: activeItem.notes,
      timestamp: new Date().toISOString(),
      confidence: activeItem.confidence,
    };

    const filteredHistory = history.filter(
      (h) => h.id !== activeItem.id && h.title !== noteTitle
    );
    const updatedHistory = [newNote, ...filteredHistory].slice(0, 20);

    saveToHistoryList(updatedHistory);
    toast.success("Note saved to history!");
  };

  // Restore note from history
  const restoreNote = (n: SavedNote) => {
    const existing = uploads.find((u) => u.id === n.id);
    if (existing) {
      setActiveId(n.id);
      return;
    }

    const restoredItem: UploadItem = {
      id: n.id,
      file: new File([], n.title),
      preview: "", 
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

  // Quality badge calculations based on confidence
  const getQualityBadge = (confidence: number | null) => {
    if (confidence === null) {
      return { label: "Unknown Quality", color: "text-muted-foreground bg-muted/40 border-border/40" };
    }
    if (confidence >= 90) {
      return { label: "Excellent Quality", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    }
    if (confidence >= 75) {
      return { label: "Good Quality", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20" };
    }
    if (confidence >= 50) {
      return { label: "Fair Quality", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    return { label: "Poor Quality", color: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20" };
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const wordCount = (text: string) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  // Suspected OCR Typo highlights and Document Formatter
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    const lines = text.split("\n");
    const formattedBlocks: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let listKey = 0;

    const flushList = () => {
      if (currentList.length > 0) {
        formattedBlocks.push(
          <ul key={`list-${listKey++}`} className="list-disc pl-6 my-3 space-y-1.5 text-sm text-muted-foreground select-text">
            {currentList}
          </ul>
        );
        currentList = [];
      }
    };

    const processTextWithErrors = (wordText: string) => {
      const words = wordText.split(/(\s+)/);
      return words.map((word, wIdx) => {
        const isSuspicious = /^[a-zA-Z]+[0-9]+[a-zA-Z]*|[0-9]+[a-zA-Z]+[0-9]*$/.test(word) || 
                             (word.length > 3 && !/^[a-zA-Z]+[.,!?;:]*$/.test(word) && /[^a-zA-Z0-9.,!?;:]/.test(word));
        
        if (isSuspicious && !word.startsWith("http")) {
          return (
            <span
              key={wIdx}
              className="bg-amber-200/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-b border-dashed border-amber-500 cursor-help px-0.5 rounded select-text"
              title="This word may be incorrectly recognized."
            >
              {word}
            </span>
          );
        }
        return <span key={wIdx} className="select-text">{word}</span>;
      });
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Empty line
      if (line === "") {
        flushList();
        formattedBlocks.push(<div key={`br-${i}`} className="h-3" />);
        continue;
      }

      // Check for headings
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      const isAllCapHeading = line.length < 80 && line.length > 2 && line === line.toUpperCase() && !/^[0-9\s.,!?;:-]+$/.test(line);
      
      if (headingMatch || isAllCapHeading) {
        flushList();
        const level = headingMatch ? headingMatch[1].length : 3;
        const headingText = headingMatch ? headingMatch[2] : line;
        
        const headingClasses = cn(
          "font-bold text-foreground mt-6 mb-3 tracking-tight select-text",
          level === 1 && "text-2xl border-b pb-1.5",
          level === 2 && "text-xl",
          level >= 3 && "text-lg"
        );

        formattedBlocks.push(
          <div key={`h-${i}`} className={headingClasses}>
            {processTextWithErrors(headingText)}
          </div>
        );
        continue;
      }

      // Check for lists
      const listMatch = line.match(/^([*\-•]|\d+\.)\s+(.*)$/);
      if (listMatch) {
        const itemContent = listMatch[2];
        currentList.push(
          <li key={`li-${i}`} className="leading-relaxed select-text">
            {processTextWithErrors(itemContent)}
          </li>
        );
        continue;
      }

      // Regular line
      flushList();
      formattedBlocks.push(
        <p key={`p-${i}`} className="text-sm text-muted-foreground leading-relaxed mb-2.5 select-text">
          {processTextWithErrors(line)}
        </p>
      );
    }
    
    flushList();
    return formattedBlocks;
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <PageHeader
        title="Document Scanner & OCR"
        description="Extract study text from whiteboard photos, lecture slides, notes sheets, and handwriting scans."
      />

      {!activeItem ? (
        /* ═══════════ EMPTY STATE PANEL ═══════════ */
        <div className="max-w-xl mx-auto py-16 px-4">
          <Card
            className={cn(
              "p-10 text-center border-2 border-dashed transition-all glass bg-card/25 shadow-card hover:bg-card/40 hover:border-primary/50",
              dragOver ? "border-primary bg-primary/5 shadow-glow" : "border-border/60"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center text-primary mx-auto mb-4 animate-float">
              <ScanLine className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-2">
              Upload handwritten notes or printed documents
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Drag & drop whiteboard captures, note pages, scans, or receipts here. Supports PNG, JPG, or JPEG images.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
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
                className="text-xs font-semibold bg-primary hover:bg-primary/90 text-white cursor-pointer"
                aria-label="Upload Handwritten Image Files"
              >
                <Upload className="h-4 w-4 mr-2" /> Select Notes Images
              </Button>
            </div>
          </Card>
          
          {history.length > 0 && (
            <div className="mt-8 text-left">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Restore from History Logs</p>
              <div className="grid gap-2">
                {history.slice(0, 3).map((h) => (
                  <button
                    key={h.id}
                    onClick={() => restoreNote(h)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/40 text-xs transition-all text-left bg-card/25 cursor-pointer"
                  >
                    <div className="truncate pr-4">
                      <p className="font-semibold truncate">{h.title}</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-0.5">Confidence: {h.confidence !== null ? `${h.confidence}%` : "—"}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ═══════════ DETAILED SPLIT LAYOUT ═══════════ */
        <div className="space-y-6">
          {/* Main Top Header Controls & Success/Loader */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 glass rounded-xl border border-border/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-lg gradient-primary-bg flex items-center justify-center text-white shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm truncate">{activeItem.file.name || "Historical Restored Document"}</h4>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Type: {activeItem.file.type || "Unknown File Type"} • Size: {activeItem.file.size ? formatBytes(activeItem.file.size) : "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {uploads.length > 1 && (
                <div className="flex gap-1 border-r border-border/40 pr-3 mr-1">
                  {uploads.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setZoom(1);
                        setRotation(0);
                        setActiveId(u.id);
                      }}
                      className={cn(
                        "h-6 w-6 rounded-md text-[10px] font-bold border transition-all cursor-pointer",
                        u.id === activeId ? "border-primary bg-primary/10 text-primary" : "border-border/30 hover:bg-muted/40"
                      )}
                    >
                      {uploads.indexOf(u) + 1}
                    </button>
                  ))}
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={removeAllUploads}
                className="h-8 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Reset Scanner
              </Button>
            </div>
          </div>

          {/* Core Panel Grid Split Layout */}
          <div className="grid lg:grid-cols-2 gap-6 items-stretch">
            
            {/* LEFT PANEL: Original Uploaded Image Preview */}
            <Card className="glass border-border/40 p-5 flex flex-col justify-between relative shadow-sm h-full">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Original Source File</span>
                  {activeItem.preview && (
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom((z) => Math.min(z + 0.25, 2))}
                        className="h-7 w-7 rounded-lg"
                        title="Zoom In"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
                        className="h-7 w-7 rounded-lg"
                        title="Zoom Out"
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="h-7 w-7 rounded-lg"
                        title="Rotate 90°"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="h-7 w-7 rounded-lg text-muted-foreground"
                        title="Fullscreen Preview Toggle"
                      >
                        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}
                </div>

                <div 
                  className={cn(
                    "bg-muted/30 border border-border/40 rounded-xl relative overflow-hidden flex items-center justify-center transition-all",
                    isFullscreen ? "fixed inset-4 z-50 bg-background/95 p-8 border-2 border-border/80 shadow-2xl" : "aspect-[4/3]"
                  )}
                >
                  {/* Floating Exit Fullscreen Button */}
                  {isFullscreen && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsFullscreen(false)}
                      className="absolute top-4 right-4 h-9 w-9 rounded-full bg-background border shadow-md z-50 cursor-pointer"
                    >
                      <X className="h-4.5 w-4.5" />
                    </Button>
                  )}

                  {activeItem.preview ? (
                    <div 
                      className="transition-transform duration-300 w-full h-full flex items-center justify-center"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      }}
                    >
                      <img
                        src={activeItem.preview}
                        alt="Scanned original preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-center p-6 text-muted-foreground text-xs italic flex flex-col gap-2 items-center">
                      <Info className="h-5 w-5 text-muted-foreground/60" />
                      Original image source unavailable for restored history items.
                    </div>
                  )}

                  {/* Animated Scanner Laser Sweep during OCR running */}
                  {activeItem.status === "reading" && (
                    <motion.div
                      className="absolute left-0 right-0 h-1 bg-primary/80 shadow-glow"
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    />
                  )}
                </div>
              </div>

              {/* Loader/Progress Steps indicator inside the preview */}
              {activeItem.status === "reading" && (
                <div className="mt-4 p-4 border border-primary/20 bg-primary/5 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-primary flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recognizing Text Layers...
                    </span>
                    <span className="text-primary">{activeItem.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-primary/10 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${activeItem.progress}%` }}
                    />
                  </div>
                  {/* Processing Steps Timeline list */}
                  <div className="grid grid-cols-5 text-[9px] font-mono text-muted-foreground uppercase text-center pt-1 border-t border-border/20">
                    <span className={cn(activeItem.progress >= 0 && "text-primary font-bold")}>Uploading</span>
                    <span className={cn(activeItem.progress >= 25 && "text-primary font-bold")}>Detecting</span>
                    <span className={cn(activeItem.progress >= 50 && "text-primary font-bold")}>Reading</span>
                    <span className={cn(activeItem.progress >= 85 && "text-primary font-bold")}>Formatting</span>
                    <span className={cn(activeItem.progress >= 99 && "text-primary font-bold")}>Done</span>
                  </div>
                </div>
              )}

              {/* Fail Display */}
              {activeItem.status === "error" && (
                <div className="mt-4 p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-500 flex gap-2 items-start text-left">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Text Extraction Failed</span>
                    <p className="mt-0.5 opacity-90">{activeItem.error || "The image context was unreadable. Check spelling gaps and try re-extracting."}</p>
                  </div>
                </div>
              )}

              {/* Success display */}
              {activeItem.status === "done" && (
                <div className="mt-4 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-600 dark:text-emerald-400 flex gap-2.5 items-start text-left">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5 text-emerald-500" />
                  <div>
                    <span className="font-bold">Text extracted successfully</span>
                    <p className="mt-0.5 opacity-95">Review the extracted text inside the right panel editor before generating notes or quizzes.</p>
                  </div>
                </div>
              )}

              {activeItem.file.size > 0 && activeItem.status !== "reading" && (
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => extractText(activeItem.id)}
                    disabled={busy}
                    className="flex-1 bg-primary hover:bg-primary/95 text-white text-xs font-semibold cursor-pointer"
                  >
                    {activeItem.status === "done" ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-Extract Image
                      </>
                    ) : (
                      <>
                        <ScanLine className="h-3.5 w-3.5 mr-1.5" /> Extract Text
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>

            {/* RIGHT PANEL: OCR Result Screen */}
            <Card 
              className={cn(
                "transition-all duration-300 flex flex-col justify-between shadow-sm",
                isTextFullscreen 
                  ? "fixed inset-4 z-50 bg-background/95 p-6 border-2 border-border/80 shadow-2xl overflow-hidden h-[calc(100vh-2rem)]" 
                  : "glass border-border/40 p-5 h-full"
              )}
            >
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                
                {/* 1. OCR Status Card */}
                {activeItem.status === "done" && (
                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Extraction State</span>
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" /> OCR Completed
                      </p>
                    </div>

                    <div className="space-y-1 sm:text-right">
                      {activeItem.confidence !== null ? (
                        <>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Confidence Score</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-emerald-500">{activeItem.confidence}%</span>
                            <div className="h-1.5 w-16 bg-muted border rounded-full overflow-hidden shrink-0">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${activeItem.confidence}%` }} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Confidence Score</span>
                          <p className="text-xs font-semibold text-muted-foreground">Confidence unavailable</p>
                        </>
                      )}
                    </div>

                    {/* Quality indicator badge */}
                    <div className="shrink-0 pt-1 sm:pt-0">
                      <Badge variant="outline" className={cn("text-[10px] font-bold", getQualityBadge(activeItem.confidence).color)}>
                        {getQualityBadge(activeItem.confidence).label}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* 2. Format / Viewer toggles & Sticky Action Toolbar */}
                <div className="sticky top-0 z-20 bg-card border-b border-border/40 pb-3 mb-2 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <ScanLine className="h-4.5 w-4.5 text-primary animate-pulse" /> OCR Results Workspace
                    </h3>
                    
                    <div className="flex items-center gap-2 text-xs">
                      {/* View Modes */}
                      <div className="flex border rounded-lg overflow-hidden bg-background/50">
                        <button
                          onClick={() => setViewMode("formatted")}
                          className={cn("px-2.5 py-1.5 text-[10px] font-bold border-r cursor-pointer transition-colors", viewMode === "formatted" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/40")}
                        >
                          Formatted Text
                        </button>
                        <button
                          onClick={() => setViewMode("raw")}
                          className={cn("px-2.5 py-1.5 text-[10px] font-bold cursor-pointer transition-colors", viewMode === "raw" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/40")}
                        >
                          Raw Editor
                        </button>
                      </div>

                      {/* Monospace Font Toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMonospace(!isMonospace)}
                        className={cn("h-8 w-8 rounded-lg transition-all", isMonospace ? "bg-primary/10 text-primary" : "text-muted-foreground")}
                        title="Toggle Monospace Font"
                      >
                        <FileCode className="h-4 w-4" />
                      </Button>

                      {/* Full Screen Reading Mode Toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsTextFullscreen(!isTextFullscreen)}
                        className={cn("h-8 w-8 rounded-lg text-muted-foreground transition-all", isTextFullscreen ? "bg-primary/10 text-primary" : "")}
                        title="Toggle Full Screen Reading Mode"
                      >
                        {isTextFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {activeItem.text && (
                    <div className="flex flex-wrap gap-1.5 justify-between items-center pt-1 border-t border-border/20">
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyText}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Copy text to clipboard (Ctrl+C)"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadTxt}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Download raw plain text file"
                        >
                          <Download className="h-3.5 w-3.5 mr-1" /> TXT
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadMarkdown}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Download structured markdown document"
                        >
                          <Download className="h-3.5 w-3.5 mr-1" /> MD
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportPdf}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Export document layout as PDF"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                        </Button>
                      </div>

                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-semibold text-primary hover:bg-primary/5 cursor-pointer"
                          title="Try another OCR configuration for better handwriting recognition."
                        >
                          Improve OCR
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={saveNote}
                          className="h-8 px-2.5 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 font-bold cursor-pointer"
                          title="Save note to history (Ctrl+S)"
                        >
                          <Save className="h-3.5 w-3.5 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Extracted text block / document previewer (Scrollable, single scrollbar) */}
                <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
                  {activeItem.status === "reading" ? (
                    <div className="space-y-3 py-4 text-left">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  ) : activeItem.text ? (
                    viewMode === "raw" ? (
                      <div className="flex-1 flex flex-col min-h-0">
                        <Textarea
                          value={activeItem.text}
                          onChange={(e) => updateUploadItem(activeItem.id, { text: e.target.value })}
                          className={cn(
                            "flex-1 text-sm leading-relaxed bg-background/40 font-medium resize-y w-full p-4 select-text font-mono border rounded-xl",
                            isMonospace ? "font-mono" : "font-sans",
                            isTextFullscreen ? "min-h-[500px]" : "min-h-[400px]"
                          )}
                          placeholder="Extracted text. Feel free to edit to correct typos..."
                        />
                        <span className="text-[10px] text-muted-foreground block text-right mt-1.5">Editable text area</span>
                      </div>
                    ) : (
                      <div 
                        className={cn(
                          "border rounded-xl p-6 bg-background/30 text-left overflow-y-auto custom-scrollbar whitespace-pre-wrap font-medium select-text flex-1",
                          isMonospace ? "font-mono" : "font-sans",
                          isTextFullscreen ? "min-h-[500px]" : "min-h-[400px]"
                        )}
                      >
                        {renderFormattedText(activeItem.text)}
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12 text-xs text-muted-foreground italic bg-muted/10 border border-dashed rounded-xl flex-1 flex items-center justify-center">
                      No text extracted. Click "Extract Text" on the left panel to begin.
                    </div>
                  )}
                </div>

                {/* 4. Side statistics/meta panel */}
                {activeItem.status === "done" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3.5 bg-muted/20 border rounded-xl text-left shrink-0">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Language</span>
                      <p className="text-xs font-semibold text-foreground">English (eng)</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">OCR Engine</span>
                      <p className="text-xs font-semibold text-foreground">Tesseract.js</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Char Count</span>
                      <p className="text-xs font-semibold text-foreground">{activeItem.text.length}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Word Count</span>
                      <p className="text-xs font-semibold text-foreground">{wordCount(activeItem.text)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Time Spent</span>
                      <p className="text-xs font-semibold text-foreground">{processingTimes[activeItem.id] || "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Total Pages</span>
                      <p className="text-xs font-semibold text-foreground">1 Page</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. AI study workflows generation */}
              {activeItem.text && (
                <div className="mt-4 border-t border-border/30 pt-3 shrink-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={generateStudyNotes}
                      disabled={notesBusy}
                      className="text-xs h-8.5 gap-1.5 cursor-pointer"
                      title="Analyze this text to structure standard AI study notes"
                    >
                      {notesBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                      Study Notes
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => executeAiAction("quiz")}
                      disabled={!!aiActionBusy}
                      className="text-xs h-8.5 gap-1.5 cursor-pointer"
                      title="Generate a 5-question multi-choice study quiz"
                    >
                      {aiActionBusy === "quiz" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />}
                      Quiz
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => executeAiAction("flashcards")}
                      disabled={!!aiActionBusy}
                      className="text-xs h-8.5 gap-1.5 cursor-pointer"
                      title="Convert text items to spaced repetition flashcards"
                    >
                      {aiActionBusy === "flashcards" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
                      Flashcards
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => executeAiAction("summarize")}
                      disabled={!!aiActionBusy}
                      className="text-xs h-8.5 gap-1.5 cursor-pointer"
                      title="Generate an AI text summary"
                    >
                      {aiActionBusy === "summarize" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
                      Summarize
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ═══════════ SAVED OCR HISTORY PANEL ═══════════ */}
          <Card className="p-5 glass border-border/40 space-y-4 max-w-4xl mx-auto">
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
                  className="h-7 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  Clear all history
                </Button>
              )}
            </div>

            <div className="relative text-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search history log by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background/50 border-border/40"
              />
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No saved OCR history found matching your search.
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
                          ? "bg-primary/10 border-primary/45 text-foreground"
                          : "border-border/40 hover:bg-muted/40 text-muted-foreground bg-card/15"
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
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity cursor-pointer"
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

          {/* AI generated study notes section */}
          {activeItem.notes && (
            <Card className="p-5 glass border-border/40 relative overflow-hidden group max-w-4xl mx-auto text-left">
              <div className="absolute top-0 right-0 h-1 w-1/3 bg-primary animate-pulse-glow" />
              <div className="flex justify-between items-center border-b border-border/40 pb-2 mb-3">
                <h4 className="font-semibold text-sm text-primary flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
                  AI Study Notes Breakdown
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyNotes}
                  className="h-6 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copiedNotes ? (
                    <Check className="h-3 w-3 text-emerald-500 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  Copy Notes
                </Button>
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {activeItem.notes}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}