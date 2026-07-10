import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Check,
  Copy,
  Download,
  Trash2,
  Briefcase,
  Award,
  Sparkles,
  ClipboardCheck,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Info,
  FileText,
  Search,
} from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/interview")({ component: InterviewPage });

// ── Constants ──────────────────────────────────────────────────────────────
const HISTORY_KEY = "studyglow.interview.history";

const predefinedRoles = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Product Manager",
  "Data Scientist",
  "UX/UI Designer",
  "DevOps Engineer",
  "System Architect",
] as const;

const experienceLevels = [
  { id: "junior", name: "Junior (0-2 years)" },
  { id: "mid", name: "Mid-Level (2-5 years)" },
  { id: "senior", name: "Senior (5-8 years)" },
  { id: "lead", name: "Lead (8+ years)" },
] as const;

const categories = [
  { id: "technical", name: "Technical & Coding" },
  { id: "behavioral", name: "Behavioral & STAR" },
  { id: "system", name: "System Design" },
  { id: "situational", name: "Situational & Scenario" },
] as const;

// ── Types ──────────────────────────────────────────────────────────────────
interface InterviewSession {
  id: string;
  role: string;
  experience: string;
  category: string;
  question: string;
  answer: string;
  feedback: string;
  timestamp: string;
  elapsedTime: number;
}

// ── Main Component ─────────────────────────────────────────────────────────
function InterviewPage() {
  // Selectors State
  const [selectedRole, setSelectedRole] = useState<string>(predefinedRoles[0]);
  const [customRole, setCustomRole] = useState<string>("");
  const [experience, setExperience] = useState<string>("mid");
  const [category, setCategory] = useState<string>("technical");

  // Core Mock States
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");

  // Loading indicator states
  const [loadingQ, setLoadingQ] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);

  // Timer State (active session only)
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // History State
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Copy status indicators
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Compile active role name
  const activeRoleName = customRole.trim() || selectedRole;

  // Manage Stopwatch Effect
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive]);

  // Load history on mount, auto-restoring latest session
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed: InterviewSession[] = JSON.parse(stored);
        setHistory(parsed);

        // Automatically restore the latest session after refresh
        if (parsed.length > 0) {
          const latest = parsed[0];
          restoreSession(latest, false);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Update history list helper
  const updateHistoryList = (newList: InterviewSession[]) => {
    setHistory(newList);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newList));
    } catch {
      /* ignore */
    }
  };

  // Add history log (Max 20, no duplicates)
  const saveToHistory = (q: string, ans: string, fbText: string, duration: number) => {
    const newSession: InterviewSession = {
      id: Date.now().toString() + "-" + Math.random().toString(36).substring(2, 6),
      role: activeRoleName,
      experience,
      category,
      question: q,
      answer: ans,
      feedback: fbText,
      timestamp: new Date().toISOString(),
      elapsedTime: duration,
    };

    // Filter out duplicates with the same question + role
    const filtered = history.filter((h) => !(h.question === q && h.role === activeRoleName));
    const updated = [newSession, ...filtered].slice(0, 20);
    updateHistoryList(updated);
  };

  // Restore history attempt
  const restoreSession = (session: InterviewSession, showToast = true) => {
    // Select selectors
    if (predefinedRoles.includes(session.role as any)) {
      setSelectedRole(session.role);
      setCustomRole("");
    } else {
      setSelectedRole("Custom Role");
      setCustomRole(session.role);
    }
    setExperience(session.experience);
    setCategory(session.category);

    // Load content
    setQuestion(session.question);
    setAnswer(session.answer);
    setFeedback(session.feedback);
    setTime(session.elapsedTime);
    setTimerActive(false);

    if (showToast) {
      toast.success(`Restored interview session for ${session.role}`);
    }
  };

  // Delete single history log
  const deleteHistoryEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((h) => h.id !== id);
    updateHistoryList(updated);
    toast.success("Interview session deleted from history");
  };

  // Clear all history logs
  const clearAllHistory = () => {
    updateHistoryList([]);
    toast.success("Interview history cleared");
  };

  // Format seconds to MM:SS
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Generate question using original backend explain service call
  const startInterview = async () => {
    const r = activeRoleName.trim();
    if (!r) {
      toast.error("Please enter or select a job role.");
      return;
    }
    setLoadingQ(true);
    setFeedback("");
    setAnswer("");
    setTime(0);
    setTimerActive(false);
    try {
      const levelLabel = experienceLevels.find((e) => e.id === experience)?.name || experience;
      const catLabel = categories.find((c) => c.id === category)?.name || category;

      // Preserve existing explain prompt format exactly, adding category & experience level parameters
      const prompt = `Ask me one realistic, challenging ${catLabel} interview question for a ${levelLabel} "${r}" role. Return only the question, no preamble.`;
      const res = await aiService.explain(prompt, "advanced");
      setQuestion(res.explanation.trim());

      // Start the stopwatch automatically
      setTimerActive(true);
      toast.success("Interview question generated!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not generate question";
      toast.error(msg);
    } finally {
      setLoadingQ(false);
    }
  };

  // Evaluate user response using original backend solver call
  const submitAnswer = async () => {
    const a = answer.trim();
    if (!a || !question) return;

    setLoadingEval(true);
    setTimerActive(false); // Stop stopwatch
    try {
      // Preserve existing service call parameters exactly
      const res = await aiService.doubtSolver(
        `Evaluate the following interview answer. Provide a score out of 10, strengths, weaknesses, and 2 improvement tips.\n\nQuestion: ${question}\n\nAnswer: ${a}`,
        `Role: ${activeRoleName}`,
      );
      setFeedback(res.resolution);

      // Save complete session data to history logs
      saveToHistory(question, a, res.resolution, time);
      toast.success("Answer evaluated successfully!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Evaluation failed";
      toast.error(msg);
      setTimerActive(true); // resume timer if evaluation fails
    } finally {
      setLoadingEval(false);
    }
  };

  // Parse feedback text cleanly
  const evaluationDetails = useMemo(() => {
    if (!feedback) return null;

    let score = "Unavailable";
    let strengths: string | null = null;
    let weaknesses: string | null = null;
    let suggestions: string | null = null;
    let nextFocus: string | null = null;

    // Parse score matching "X/10" or "Score: X" (do not estimate)
    const scoreMatch =
      feedback.match(/(?:score|rating|points):\s*(\d+(?:\.\d+)?)\s*(?:\/\s*10|out\s+of\s+10)/i) ||
      feedback.match(/(?:score|rating|points):\s*(\d+(?:\.\d+)?)/i) ||
      feedback.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
    if (scoreMatch) {
      score = `${scoreMatch[1]}/10`;
    }

    // Strengths parser
    const strengthsMatch = feedback.match(
      /(?:strengths|positives|what\s+went\s+well):?([\s\S]*?)(?:weaknesses|areas\s+of\s+improvement|improvement\s+suggestions|suggestions|tips|next\s+focus|$)/i
    );
    if (strengthsMatch) strengths = strengthsMatch[1].trim();

    // Weaknesses parser
    const weaknessesMatch = feedback.match(
      /(?:weaknesses|areas\s+of\s+improvement|negatives|what\s+to\s+improve):?([\s\S]*?)(?:improvement\s+suggestions|suggestions|tips|next\s+focus|score|$)/i
    );
    if (weaknessesMatch) weaknesses = weaknessesMatch[1].trim();

    // Tips parser
    const suggestionsMatch = feedback.match(
      /(?:improvement\s+suggestions|suggestions|tips|improvement\s+tips|actionable\s+tips):?([\s\S]*?)(?:next\s+focus|next\s+learning\s+focus|score|$)/i
    );
    if (suggestionsMatch) suggestions = suggestionsMatch[1].trim();

    // Next steps parser
    const nextFocusMatch = feedback.match(
      /(?:next\s+focus|next\s+learning\s+focus|what\s+to\s+study\s+next|next\s+steps):?([\s\S]*?)(?:score|$)/i
    );
    if (nextFocusMatch) nextFocus = nextFocusMatch[1].trim();

    return {
      score,
      strengths,
      weaknesses,
      suggestions,
      nextFocus,
    };
  }, [feedback]);

  // Copy whole session transcripts helper
  const handleCopyTranscript = async () => {
    if (!question) return;
    try {
      const summary = `--- INTERVIEW SESSION REPORT ---
Job Role: ${activeRoleName}
Level: ${experienceLevels.find((e) => e.id === experience)?.name}
Category: ${categories.find((c) => c.id === category)?.name}
Answer Duration: ${formatTime(time)}

[QUESTION]
${question}

[USER ANSWER]
${answer || "No response provided."}

[AI FEEDBACK EVALUATION]
${feedback || "Pending evaluation."}`;

      await navigator.clipboard.writeText(summary);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 1500);
      toast.success("Interview session transcript copied!");
    } catch {
      toast.error("Failed to copy transcript");
    }
  };

  // Export report to Markdown or TXT
  const downloadTextReport = (format: "txt" | "md") => {
    if (!question) return;
    try {
      const text = `--- INTERVIEW MOCK REPORT ---
Job Role: ${activeRoleName}
Level: ${experienceLevels.find((e) => e.id === experience)?.name}
Category: ${categories.find((c) => c.id === category)?.name}
Preparation Time: ${formatTime(time)}

## Interview Question
${question}

## Candidate Response
${answer || "(No response entered)"}

## AI Evaluation & Feedback
${feedback || "Pending evaluation."}`;

      const file = new Blob([text], { type: "text/plain;charset=utf-8" });
      const element = document.createElement("a");
      element.href = URL.createObjectURL(file);
      element.download = `mock-interview-${activeRoleName.toLowerCase().replace(/\s+/g, "-")}.${format}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success(`${format.toUpperCase()} report exported successfully`);
    } catch {
      toast.error("Report download failed");
    }
  };

  // Export formatted PDF report (using existing project dependency jsPDF)
  const handleExportPdf = () => {
    if (!question) return;
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`Mock Interview Report: ${activeRoleName}`, margin, y);
      y += 25;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Level: ${experienceLevels.find((e) => e.id === experience)?.name} | Category: ${
          categories.find((c) => c.id === category)?.name
        } | Duration: ${formatTime(time)}`,
        margin,
        y
      );
      y += 25;

      // Question Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Interview Question", margin, y);
      y += 15;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const questionLines = doc.splitTextToSize(question, width);
      for (const line of questionLines) {
        if (y > pageHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 12;
      }
      y += 20;

      // Answer Section
      if (y + 40 > pageHeight) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Candidate Response", margin, y);
      y += 15;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const answerLines = doc.splitTextToSize(answer || "(No response entered)", width);
      for (const line of answerLines) {
        if (y > pageHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 12;
      }
      y += 25;

      // Evaluation Section
      if (feedback) {
        if (y + 50 > pageHeight) {
          doc.addPage();
          y = margin;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("AI Feedback & Score", margin, y);
        y += 15;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const cleanFeedback = feedback.replace(/[*_`#>]/g, "");
        const evalLines = doc.splitTextToSize(cleanFeedback, width);
        for (const line of evalLines) {
          if (y > pageHeight) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 12;
        }
      }

      doc.save(`interview-report-${activeRoleName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
      toast.success("PDF report generated successfully");
    } catch {
      toast.error("PDF export failed");
    }
  };

  // Filter history log items
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (h) =>
        h.role.toLowerCase().includes(q) ||
        h.question.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q)
    );
  }, [history, searchQuery]);

  return (
    <div className="relative">
      <PageHeader
        title="Interview Preparation"
        description="Simulate realistic, challenge-driven mock interviews with score cards and feedback tailored to your exact career level."
      />

      {/* ═══════════ TWO-COLUMN DESKTOP LAYOUT ═══════════ */}
      <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start animate-fade-in-premium">
        
        {/* LEFT COLUMN: Setup details, Timer progress, and history list */}
        <div className="space-y-6">
          
          {/* Setup Panel */}
          <Card className="p-5 glass border-border/40 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Interview Config
            </h3>

            {/* Job Role select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-primary" /> Target Job Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  if (e.target.value !== "Custom Role") setCustomRole("");
                }}
                className="w-full text-xs bg-background/30 rounded-lg p-2.5 border border-border/20 outline-none text-foreground"
              >
                {predefinedRoles.map((r) => (
                  <option key={r} value={r} className="bg-background">
                    {r}
                  </option>
                ))}
                <option value="Custom Role" className="bg-background">
                  Custom Job Role...
                </option>
              </select>

              {selectedRole === "Custom Role" && (
                <Input
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="Type custom role title..."
                  className="text-xs mt-2 bg-background/25"
                />
              )}
            </div>

            {/* Experience Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-primary" /> Experience Level
              </label>
              <div className="flex flex-wrap rounded-lg bg-muted/30 p-1 border border-border/20 gap-0.5">
                {experienceLevels.map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => setExperience(lvl.id)}
                    className={cn(
                      "flex-1 text-[10px] font-semibold py-1 rounded transition-all",
                      experience === lvl.id
                        ? "bg-background text-foreground shadow-sm font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {lvl.id.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Interview Category selector */}
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Focus Topic/Category
              </label>
              <div className="grid grid-cols-2 gap-1">
                {categories.map((c) => (
                  <Button
                    key={c.id}
                    size="sm"
                    variant={category === c.id ? "default" : "outline"}
                    className={cn(
                      "text-[10px] h-8 px-1 text-center shrink-0 truncate",
                      category === c.id ? "gradient-primary-bg text-white border-0" : "bg-background/20"
                    )}
                    onClick={() => setCategory(c.id)}
                  >
                    {c.name.split(" ")[0]} Mode
                  </Button>
                ))}
              </div>
            </div>

            {/* Trigger Button */}
            <Button
              onClick={startInterview}
              disabled={loadingQ || !activeRoleName.trim()}
              className="w-full text-xs font-bold text-white gradient-primary-bg border-0 h-10 mt-2"
            >
              {loadingQ ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Generating challenge...
                </>
              ) : question ? (
                "Next Question Challenge"
              ) : (
                "Start Mock Interview"
              )}
            </Button>
          </Card>

          {/* ACTIVE STOPWATCH COUNTER */}
          {question && (
            <Card className="p-4 glass border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary animate-pulse" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none">
                    Session Duration
                  </div>
                  <div className="text-xl font-mono font-bold text-foreground mt-1">
                    {formatTime(time)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTimerActive(!timerActive)}
                  className="h-8 w-8 rounded-full"
                >
                  {timerActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => setTime(0)} className="h-8 w-8 rounded-full">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          )}

          {/* SESSION LOGS HISTORY LIST */}
          <Card className="p-4 glass border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Attempt Logs ({history.length}/20)
              </span>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllHistory}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2"
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search past logs..."
                className="pl-8 text-xs h-8 bg-background/20"
              />
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No attempt records found.
              </div>
            ) : (
              <ScrollArea className="h-[210px]">
                <div className="space-y-1.5 pr-2">
                  {filteredHistory.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => restoreSession(s)}
                      className="group flex items-center justify-between p-2.5 rounded-lg border border-border/20 bg-background/10 hover:bg-background/25 hover:border-border/45 cursor-pointer transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] uppercase font-semibold px-1">
                            {s.category.slice(0, 5)}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">
                            {formatTime(s.elapsedTime)}
                          </span>
                        </div>
                        <div className="text-xs font-bold truncate text-foreground mt-0.5">
                          {s.role}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">
                          {s.question}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => deleteHistoryEntry(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive hover:bg-destructive/10 transition-opacity shrink-0 ml-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Chat style interface, Editor, and score reports */}
        <div className="space-y-6 min-w-0">
          
          {/* EMPTY MOCK INTERVIEW STATE */}
          {!question && !loadingQ && (
            <Card className="p-12 text-center border-border/40 glass">
              <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center text-primary mx-auto mb-3">
                <Briefcase className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-foreground">Mock Interview Workspace</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1.5">
                Configure your target career settings on the left and select "Start Mock Interview" to run an AI‑backed mock challenge.
              </p>
            </Card>
          )}

          {/* SKELETON LOADER FOR NEW QUESTION */}
          {loadingQ && (
            <Card className="p-6 glass border-border/40 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </Card>
          )}

          {/* ACTIVE INTERVIEW WORKSPACE */}
          {!loadingQ && question && (
            <div className="space-y-6">
              
              {/* STICKY WORKSPACE ACTION TOOLBAR */}
              <div className="sticky top-0 z-10 glass border-border/40 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-background/80 backdrop-blur-md shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Briefcase className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold text-sm truncate">{activeRoleName} Role</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">
                    {experience} Level
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyTranscript}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copiedTranscript ? (
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    Copy Session
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadTextReport("txt")}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    TXT
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadTextReport("md")}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Markdown
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportPdf}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    PDF Report
                  </Button>
                </div>
              </div>

              {/* Chat Panels */}
              <div className="space-y-4">
                
                {/* AI INTERVIEWER BUBBLE MESSAGE */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 border border-primary/20 shrink-0">
                    <AvatarFallback className="gradient-primary-bg text-white font-bold text-xs">AI</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">AI Interviewer Coach</span>
                      <Badge className="bg-primary/10 text-primary border-0 text-[9px]">
                        {categories.find((c) => c.id === category)?.name}
                      </Badge>
                    </div>

                    <Card className="p-4 bg-muted/40 border border-border/20 rounded-2xl rounded-tl-none text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      <div className="text-[9px] uppercase font-bold text-primary mb-1">Mock Question</div>
                      <p className="font-semibold text-sm leading-relaxed">{question}</p>
                    </Card>
                  </div>
                </div>

                {/* USER CANDIDATE EDITOR RESPONSE */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 space-y-1.5 max-w-[85%] text-right">
                    <div className="text-xs font-bold text-foreground pr-1">Your Interview Answer</div>
                    <Textarea
                      placeholder="Formulate and type your answer here..."
                      rows={6}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      disabled={loadingEval}
                      className="bg-background/25 rounded-2xl text-xs leading-relaxed text-left border-border/30 resize-none shadow-inner"
                    />

                    <div className="flex gap-2 justify-end pt-1">
                      <Button
                        onClick={submitAnswer}
                        disabled={loadingEval || !answer.trim()}
                        className="text-xs font-semibold text-white gradient-primary-bg border-0 h-9 px-4 rounded-xl"
                      >
                        {loadingEval ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                            Evaluating candidate...
                          </>
                        ) : (
                          "Submit Answer for Review"
                        )}
                      </Button>
                    </div>
                  </div>
                  <Avatar className="h-10 w-10 border border-border/40 shrink-0">
                    <AvatarFallback className="bg-muted text-foreground text-xs font-bold">ME</AvatarFallback>
                  </Avatar>
                </div>

              </div>

              {/* EVALUATION FEEDBACK REPORT DASHBOARD */}
              {loadingEval && (
                <Card className="p-8 text-center border-border/40 glass">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                  <div className="text-xs text-muted-foreground">AI Reviewer is analyzing your response...</div>
                </Card>
              )}

              {!loadingEval && feedback && evaluationDetails && (
                <div className="space-y-4 animate-fade-in-premium">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">
                    AI Performance Evaluation Report
                  </h3>

                  <div className="grid md:grid-cols-[180px_1fr] gap-4 items-start">
                    
                    {/* Numeric Score indicator */}
                    <Card className="p-5 glass border-border/40 text-center flex flex-col justify-center items-center h-full">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Performance Rating
                      </div>
                      
                      {evaluationDetails.score !== "Unavailable" ? (
                        <div className="relative h-24 w-24 flex items-center justify-center">
                          <svg className="absolute w-full h-full transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              className="stroke-muted"
                              strokeWidth="8"
                              fill="transparent"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              className="stroke-primary transition-all duration-1000"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={`${2 * Math.PI * 38}`}
                              strokeDashoffset={`${
                                2 * Math.PI * 38 * (1 - parseFloat(evaluationDetails.score) / 10)
                              }`}
                            />
                          </svg>
                          <div className="text-center">
                            <span className="text-2xl font-black text-foreground">
                              {evaluationDetails.score.split("/")[0]}
                            </span>
                            <span className="text-xs text-muted-foreground block leading-none">/10</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-20 w-20 rounded-full border-4 border-dashed border-muted-foreground/30 grid place-items-center mb-1">
                          <span className="text-xs text-muted-foreground font-semibold">N/A</span>
                        </div>
                      )}

                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-3 text-[10px] uppercase font-bold",
                          evaluationDetails.score === "Unavailable"
                            ? "text-muted-foreground"
                            : parseFloat(evaluationDetails.score) >= 7.5
                              ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                              : parseFloat(evaluationDetails.score) >= 5
                                ? "text-yellow-500 border-yellow-500/20 bg-yellow-500/5"
                                : "text-destructive border-destructive/20 bg-destructive/5"
                        )}
                      >
                        {evaluationDetails.score === "Unavailable"
                          ? "Rating Pending"
                          : parseFloat(evaluationDetails.score) >= 7.5
                            ? "Excellent Prep"
                            : parseFloat(evaluationDetails.score) >= 5
                              ? "Needs Work"
                              : "Critical Practice"}
                      </Badge>
                    </Card>

                    {/* Parsed sections */}
                    <div className="space-y-4">
                      
                      {/* Raw text if everything failed to parse */}
                      {!evaluationDetails.strengths &&
                      !evaluationDetails.weaknesses &&
                      !evaluationDetails.suggestions ? (
                        <Card className="p-5 bg-background/25 border-border/20 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                          {feedback}
                        </Card>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          
                          {/* Strengths card */}
                          {evaluationDetails.strengths && (
                            <Card className="p-4 bg-emerald-500/5 border-emerald-500/25 border">
                              <h4 className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 uppercase tracking-wide mb-1.5">
                                <Check className="h-4 w-4" /> Positives & Strengths
                              </h4>
                              <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                                {evaluationDetails.strengths}
                              </p>
                            </Card>
                          )}

                          {/* Weaknesses card */}
                          {evaluationDetails.weaknesses && (
                            <Card className="p-4 bg-yellow-500/5 border-yellow-500/25 border">
                              <h4 className="text-xs font-bold text-yellow-600 flex items-center gap-1.5 uppercase tracking-wide mb-1.5">
                                <Info className="h-4 w-4" /> Areas for Growth
                              </h4>
                              <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                                {evaluationDetails.weaknesses}
                              </p>
                            </Card>
                          )}

                          {/* Improvement Suggestions card */}
                          {evaluationDetails.suggestions && (
                            <Card className="p-4 bg-primary/5 border-primary/25 border md:col-span-2">
                              <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide mb-1.5">
                                <Sparkles className="h-4 w-4" /> Actionable Advice Tips
                              </h4>
                              <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                                {evaluationDetails.suggestions}
                              </p>
                            </Card>
                          )}

                          {/* Next Focus card */}
                          {evaluationDetails.nextFocus && (
                            <Card className="p-4 bg-muted/40 border-border/25 border md:col-span-2">
                              <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide mb-1.5">
                                <BookOpen className="h-4 w-4" /> Next Study Focus
                              </h4>
                              <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                                {evaluationDetails.nextFocus}
                              </p>
                            </Card>
                          )}

                        </div>
                      )}

                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}