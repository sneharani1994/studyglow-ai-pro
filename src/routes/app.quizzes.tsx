import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { PageHeader } from "@/components/page-header";
import {
  Clock,
  Sparkles,
  RotateCcw,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Trophy,
  History,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ArrowUpDown,
  BookOpen,
  Loader2,
} from "lucide-react";
import {
  quizzesService,
  aiService,
  uploadsService,
  type Quiz,
  type QuizQuestion,
  type QuizAttempt,
  type QuizAttemptResult,
  type UploadedFile,
} from "@/lib/api";
import { toast } from "sonner";
import { emitAppRefresh } from "@/lib/events";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/quizzes")({
  component: QuizzesPage,
});

const PERSIST_STATE_KEY = "studygpt.quizzes.persistedState";

interface PersistedState {
  active: { quiz: Quiz; questions: QuizQuestion[] } | null;
  answers: Record<string, number>;
  result: QuizAttemptResult | null;
  currentIdx: number;
  topic: string;
  count: number;
  difficulty: "easy" | "medium" | "hard";
  selectedPdfId: string;
}

function QuizzesPage() {
  // Config & Generator parameters
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState<number>(5);
  const [topic, setTopic] = useState("");
  const [selectedPdfId, setSelectedPdfId] = useState<string>("none");

  // Quiz state
  const [active, setActive] = useState<{ quiz: Quiz; questions: QuizQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  // History & Uploaded documents data
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [documents, setDocuments] = useState<UploadedFile[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historySort, setHistorySort] = useState<"newest" | "oldest">("newest");

  // Page States
  const [busy, setBusy] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Question container ref for smooth transitions/scrolling
  const questionContainerRef = useRef<HTMLDivElement>(null);

  // Individual Question state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Reset or load question state when question index, active quiz, or answers change
  useEffect(() => {
    if (!active) {
      setSelectedOption(null);
      setSubmitted(false);
      setShowExplanation(false);
      return;
    }
    const currentQuestionId = active.questions[currentIdx]?.id;
    if (!currentQuestionId) return;

    const savedAns = answers[currentQuestionId];
    if (result !== null || savedAns !== undefined) {
      setSelectedOption(savedAns ?? null);
      setSubmitted(true);
      setShowExplanation(true);
    } else {
      setSelectedOption(null);
      setSubmitted(false);
      setShowExplanation(false);
    }
  }, [currentIdx, active, result, answers]);

  // 1. Initial Data Loading & State Restoring
  useEffect(() => {
    // Load documents
    uploadsService
      .list()
      .then((res) => {
        // Filter to text/pdf files
        const filtered = res.filter(
          (f) =>
            f.file_type.includes("pdf") ||
            f.file_type.includes("text") ||
            f.file_type.includes("txt")
        );
        setDocuments(filtered);
      })
      .catch(() => setDocuments([]))
      .finally(() => setDocLoading(false));

    // Load attempts history
    quizzesService
      .attempts()
      .then(setAttempts)
      .catch(() => setAttempts([]))
      .finally(() => setHistoryLoading(false));

    // Restore state from LocalStorage
    try {
      const saved = localStorage.getItem(PERSIST_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PersistedState;
        if (parsed.active) setActive(parsed.active);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.result) setResult(parsed.result);
        if (parsed.currentIdx !== undefined) setCurrentIdx(parsed.currentIdx);
        if (parsed.topic) setTopic(parsed.topic);
        if (parsed.count) setCount(parsed.count);
        if (parsed.difficulty) setDifficulty(parsed.difficulty);
        if (parsed.selectedPdfId) setSelectedPdfId(parsed.selectedPdfId);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 2. Persist state to localstorage on changes
  useEffect(() => {
    try {
      const state: PersistedState = {
        active,
        answers,
        result,
        currentIdx,
        topic,
        count,
        difficulty,
        selectedPdfId,
      };
      localStorage.setItem(PERSIST_STATE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [active, answers, result, currentIdx, topic, count, difficulty, selectedPdfId]);

  // Derived Values
  const currentQuestion = active?.questions[currentIdx] || null;
  const isLastQuestion = active ? currentIdx === active.questions.length - 1 : false;

  // Live Score Calculator
  const liveScore = useMemo(() => {
    if (!active) return { correct: 0, wrong: 0, answered: 0 };
    let correct = 0;
    let wrong = 0;
    let answered = 0;

    active.questions.forEach((q) => {
      const userChoice = answers[q.id];
      if (userChoice !== undefined) {
        answered++;
        if (userChoice === q.correct_option_index) {
          correct++;
        } else {
          wrong++;
        }
      }
    });

    return { correct, wrong, answered };
  }, [active, answers]);

  // History Attempts filter & sort
  const filteredAttempts = useMemo(() => {
    let resultList = [...attempts];

    // Filter by search
    if (historySearch.trim()) {
      const query = historySearch.toLowerCase();
      resultList = resultList.filter((a) =>
        (a.quizzes?.title ?? "Quiz").toLowerCase().includes(query)
      );
    }

    // Sort attempts
    resultList.sort((a, b) => {
      const dateA = new Date(a.completed_at).getTime();
      const dateB = new Date(b.completed_at).getTime();
      return historySort === "newest" ? dateB - dateA : dateA - dateB;
    });

    return resultList;
  }, [attempts, historySearch, historySort]);

  // Clean trigger for new generation parameters reset
  const startNewQuiz = () => {
    setActive(null);
    setAnswers({});
    setResult(null);
    setCurrentIdx(0);
    localStorage.removeItem(PERSIST_STATE_KEY);
  };

  // Submit Quiz Action
  const submit = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const r = await quizzesService.submit(active.quiz.id, answers);
      setResult(r);

      // Refresh attempts history & dashboard stats
      const updatedAttempts = await quizzesService.attempts().catch(() => attempts);
      setAttempts(updatedAttempts);

      emitAppRefresh({ source: "quizzes" });
      toast.success("Quiz submitted successfully!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit quiz scores.");
    } finally {
      setBusy(false);
    }
  };

  // Generate Quiz Action
  const generate = async () => {
    const selectedFile = documents.find((doc) => doc.id === selectedPdfId);
    const quizTopic = selectedFile
      ? `Document: ${selectedFile.filename}`
      : topic.trim();

    if (!selectedFile && !topic.trim()) {
      toast.error("Please enter a topic or select a document context");
      return;
    }

    setBusy(true);
    try {
      // Call generate API (Gemini-backed) passing documentId if chosen
      const ai = await aiService.generateQuiz(
        quizTopic,
        count,
        difficulty
      );

      // Save quiz parameters to backend
      const created = await quizzesService.create({
        title: quizTopic,
        description: selectedFile
          ? `AI-generated quiz from context of document "${selectedFile.filename}"`
          : `AI-generated ${difficulty} quiz on ${topic}`,
        difficulty,
        questions: ai.questions.map((q) => ({
          questionText: q.question_text,
          options: q.options,
          correctOptionIndex: q.correct_option_index,
          explanation: q.explanation,
        })),
      });

      setActive(created);
      setAnswers({});
      setResult(null);
      setCurrentIdx(0);
      toast.success("New quiz generated successfully!");
      emitAppRefresh({ source: "quizzes" });
    } catch (e: any) {
      toast.error(
        e?.message || "Could not generate quiz. Check connection or try another topic."
      );
    } finally {
      setBusy(false);
    }
  };

  // Answer Option Selection
  const handleAnswerSelect = (optionIdx: number) => {
    if (result || submitted || !currentQuestion) return; // Read-only if quiz submitted
    setSelectedOption(optionIdx);
  };

  // Submit Individual Question Answer
  const handleQuestionSubmit = () => {
    if (selectedOption === null || !currentQuestion || submitted || result) return;
    setSubmitted(true);
    setShowExplanation(true);

    const newAnswers = { ...answers, [currentQuestion.id]: selectedOption };
    setAnswers(newAnswers);

    // Auto-advance mechanism
    if (autoAdvance && !isLastQuestion) {
      setTimeout(() => {
        setCurrentIdx((prev) => prev + 1);
        if (questionContainerRef.current) {
          questionContainerRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 1500);
    }
  };

  // Reset/Retake current quiz attempt
  const reset = () => {
    setAnswers({});
    setResult(null);
    setCurrentIdx(0);
  };

  // Load past attempt
  const loadPastAttempt = async (attempt: QuizAttempt) => {
    setBusy(true);
    try {
      const details = await quizzesService.details(attempt.quiz_id);
      setActive(details);
      setAnswers(attempt.answers);
      setCurrentIdx(0);

      // Simulate a complete result state from attempt details
      const simulatedResult: QuizAttemptResult = {
        message: "Loaded previous attempt",
        attempt,
        score: attempt.score,
        totalQuestions: attempt.total_questions,
        percentage: Math.round((attempt.score / attempt.total_questions) * 100),
        evaluationDetails: details.questions.map((q) => {
          const userChoice = attempt.answers[q.id] ?? null;
          const isCorrect = userChoice === q.correct_option_index;
          return {
            questionId: q.id,
            questionText: q.question_text,
            userChoice,
            correctChoice: q.correct_option_index,
            isCorrect,
            explanation: q.explanation,
          };
        }),
        xpEarned: 0, // Past attempt has zero new XP
      };
      setResult(simulatedResult);
      toast.success("Previous attempt loaded successfully");
    } catch (e: any) {
      toast.error(e?.message || "Could not load the details of this quiz.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Visual glowing backgrounds */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />

      <PageHeader
        title="AI Quiz Generator"
        description="Test your learning progress with smart, contextual MCQs and earn points."
      />

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Main interactive panel */}
        <div className="space-y-6">
          {!active ? (
            /* ═══════════════════════════════════════════════
               1. Setup & Generator Card
               ═══════════════════════════════════════════════ */
            <Card className="glass p-6 md:p-8 animate-card-enter max-w-3xl mx-auto border-border/40 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl gradient-primary-bg flex items-center justify-center text-white shadow-glow">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Generate new quiz</h3>
                  <p className="text-xs text-muted-foreground">
                    Customize your study parameters to generate targeted questions.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* PDF Context Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Reference Document Context (Optional)
                  </Label>
                  {docLoading ? (
                    <Skeleton className="h-9 w-full rounded-md" />
                  ) : (
                    <Select value={selectedPdfId} onValueChange={setSelectedPdfId}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="No document selected" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          No document context (Use topic name only)
                        </SelectItem>
                        {documents.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.filename}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedPdfId !== "none" && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      Context: {documents.find((d) => d.id === selectedPdfId)?.filename}
                    </Badge>
                  )}
                </div>

                {/* Topic Input */}
                {selectedPdfId === "none" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Study Topic</Label>
                    <Input
                      id="quiz-topic-input"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. JavaScript closures, Photosynthesis, Organic Chemistry"
                      className="h-10"
                    />
                  </div>
                )}

                {/* Difficulty Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Difficulty Level</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["easy", "medium", "hard"] as const).map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant={difficulty === d ? "default" : "outline"}
                        className={cn(
                          "h-10 capitalize transition-all border border-border/40",
                          difficulty === d && "gradient-primary-bg text-white border-0 shadow-md scale-[1.02]"
                        )}
                        onClick={() => setDifficulty(d)}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Question Count Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <Label>Question Count</Label>
                    <Badge variant="secondary">{count} questions</Badge>
                  </div>
                  <div className="flex gap-4 items-center pt-2">
                    <input
                      type="range"
                      min={3}
                      max={15}
                      step={1}
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="w-full accent-primary h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Generate Action */}
                <Button
                  onClick={generate}
                  disabled={busy}
                  className="w-full h-12 mt-4 gradient-primary-bg text-white border-0 shadow-glow font-medium text-sm transition-all hover:opacity-95"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Crafting your quiz...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Quiz
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ) : (
            /* ═══════════════════════════════════════════════
               2. Active Quiz taking / Score Review State
               ═══════════════════════════════════════════════ */
            <div ref={questionContainerRef} className="space-y-6 max-w-3xl mx-auto animate-card-enter">
              {/* Active Quiz Header / Top Stats */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 glass rounded-xl border border-border/40">
                <div className="min-w-0">
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {active.quiz.difficulty} difficulty
                  </Badge>
                  <h4 className="font-semibold text-sm truncate mt-1">{active.quiz.title}</h4>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium shrink-0">
                  {/* Live Stats */}
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    {currentIdx + 1}/{active.questions.length} Questions
                  </span>

                  {!result && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
                        {liveScore.correct} ✓
                      </Badge>
                      <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5">
                        {liveScore.wrong} ✗
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold uppercase">
                  <span>Quiz Progress</span>
                  <span>
                    {Math.round(((currentIdx + (answers[currentQuestion?.id || ""] !== undefined ? 1 : 0)) / active.questions.length) * 100)}% Complete
                  </span>
                </div>
                <Progress
                  value={
                    ((currentIdx + (answers[currentQuestion?.id || ""] !== undefined ? 1 : 0)) /
                      active.questions.length) *
                    100
                  }
                  className="h-2 rounded-full"
                />
              </div>

              {/* Individual Question Card */}
              {currentQuestion && (
                <Card className="glass p-6 md:p-8 border-border/40 shadow-card relative">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      Question {currentIdx + 1}
                    </span>
                    {/* Auto-advance controls */}
                    {!result && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Label htmlFor="auto-advance" className="cursor-pointer text-[10px]">
                          Auto-advance
                        </Label>
                        <Switch
                          id="auto-advance"
                          checked={autoAdvance}
                          onCheckedChange={setAutoAdvance}
                        />
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-lg mb-6 leading-snug">
                    {currentQuestion.question_text}
                  </h3>

                  {/* MCQ Options */}
                  {(() => {
                    const hasSubmitted = submitted || !!result;
                    return (
                      <>
                        <RadioGroup
                          value={selectedOption !== null ? selectedOption.toString() : ""}
                          onValueChange={(val) => handleAnswerSelect(Number(val))}
                          className="grid gap-3"
                        >
                          {currentQuestion.options.map((opt, optionIdx) => {
                            const isSelected = selectedOption === optionIdx;
                            const isCorrectAnswer = optionIdx === currentQuestion.correct_option_index;

                            return (
                              <Label
                                key={optionIdx}
                                htmlFor={`opt-${currentIdx}-${optionIdx}`}
                                className={cn(
                                  "flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 select-none",
                                  // 1. Default (Not submitted, not selected)
                                  !hasSubmitted && !isSelected && "border-border/40 cursor-pointer hover:bg-muted/30",
                                  // 2. Selected (Not submitted, selected)
                                  !hasSubmitted && isSelected && "border-primary bg-primary/5 font-medium scale-[1.01] shadow-sm cursor-pointer",
                                  // 3. Correct (after submit only)
                                  hasSubmitted && isCorrectAnswer && "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium cursor-not-allowed",
                                  // 4. Incorrect (after submit only, selected incorrect)
                                  hasSubmitted && isSelected && !isCorrectAnswer && "border-destructive bg-destructive/10 text-destructive font-medium cursor-not-allowed",
                                  // 5. Unselected incorrect (after submit only, faded)
                                  hasSubmitted && !isSelected && !isCorrectAnswer && "opacity-60 border-border/30 cursor-not-allowed"
                                )}
                              >
                                <RadioGroupItem
                                  id={`opt-${currentIdx}-${optionIdx}`}
                                  value={optionIdx.toString()}
                                  disabled={hasSubmitted}
                                  className="shrink-0"
                                />
                                <span className="text-sm font-normal text-foreground leading-relaxed">
                                  {opt}
                                </span>
                                {hasSubmitted && isCorrectAnswer && (
                                  <CheckCircle2 className="h-4 w-4 ml-auto text-emerald-500 shrink-0" />
                                )}
                                {hasSubmitted && isSelected && !isCorrectAnswer && (
                                  <XCircle className="h-4 w-4 ml-auto text-destructive shrink-0" />
                                )}
                              </Label>
                            );
                          })}
                        </RadioGroup>

                        {/* Submit Answer Button */}
                        {!hasSubmitted && (
                          <Button
                            onClick={handleQuestionSubmit}
                            disabled={selectedOption === null}
                            className="mt-6 w-full gradient-primary-bg text-white border-0 shadow-md font-medium text-sm h-10 hover:opacity-95 cursor-pointer"
                          >
                            Submit Answer
                          </Button>
                        )}
                      </>
                    );
                  })()}

                  {/* Immediate Explanation Feedback (Only if choice is clicked or result screen is open) */}
                  {showExplanation && (
                    <div className="mt-6 border-t border-border/40 pt-5 space-y-3 animate-card-enter">
                      <div className="flex items-center gap-2">
                        {selectedOption === currentQuestion.correct_option_index ? (
                          <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
                            ✓ Correct Answer
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5">
                            ✗ Incorrect Answer
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          Correct: {currentQuestion.options[currentQuestion.correct_option_index]}
                        </span>
                      </div>
                      {currentQuestion.explanation && (
                        <div className="text-xs text-muted-foreground bg-muted/40 p-4 rounded-xl leading-relaxed flex gap-2">
                          <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-foreground/80 block mb-1">
                              Explanation
                            </span>
                            {currentQuestion.explanation}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* Lower Question Navigators */}
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  disabled={currentIdx === 0}
                  className="h-9 px-3 text-xs"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>

                <div className="flex items-center gap-1.5">
                  {active.questions.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => setCurrentIdx(dotIdx)}
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        dotIdx === currentIdx
                          ? "w-6 bg-primary"
                          : answers[active.questions[dotIdx].id] !== undefined
                            ? "w-2 bg-primary/40"
                            : "w-2 bg-muted-foreground/20"
                      )}
                      title={`Go to Question ${dotIdx + 1}`}
                    />
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIdx((i) => Math.min(active.questions.length - 1, i + 1))}
                  disabled={isLastQuestion || (!submitted && !result)}
                  className="h-9 px-3 text-xs cursor-pointer"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Submit panel */}
              {!result ? (
                <Card className="p-6 border-border/40 bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-sm">Finish and submit?</h4>
                      <p className="text-xs text-muted-foreground">
                        You have answered {liveScore.answered} of {active.questions.length} questions.
                      </p>
                    </div>
                    <Button
                      onClick={submit}
                      disabled={busy}
                      className="gradient-primary-bg text-white border-0 shadow-md font-medium text-xs h-9 hover:opacity-95"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Submitting...
                        </>
                      ) : (
                        "Submit Quiz scores"
                      )}
                    </Button>
                  </div>
                </Card>
              ) : (
                /* ═══════════════════════════════════════════════
                   3. Quiz Score Breakdown Panel
                   ═══════════════════════════════════════════════ */
                <Card className="p-6 md:p-8 gradient-soft-bg border-0 relative overflow-hidden animate-card-enter shadow-glow">
                  {/* Confetti-style gradient circle */}
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/10 translate-x-12 -translate-y-12 blur-2xl" />

                  <div className="text-center relative">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                      <Trophy className="h-8 w-8 animate-float" />
                    </div>

                    <h3 className="text-2xl font-bold gradient-text">Quiz Completed!</h3>
                    <p className="text-xs text-muted-foreground mt-1 mb-6">
                      Great effort! Review your metrics and explanations below.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-xl mx-auto mb-8">
                      <Card className="p-4 bg-background/60 backdrop-blur border-border/20 shadow-sm text-center">
                        <div className="text-3xl font-extrabold text-primary">
                          {result.score}/{result.totalQuestions}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
                          Final Score
                        </div>
                      </Card>

                      <Card className="p-4 bg-background/60 backdrop-blur border-border/20 shadow-sm text-center">
                        <div className="text-3xl font-extrabold text-foreground">
                          {result.percentage}%
                        </div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
                          Accuracy
                        </div>
                      </Card>

                      <Card className="p-4 bg-background/60 backdrop-blur border-border/20 shadow-sm text-center">
                        <div className="text-3xl font-extrabold text-emerald-500">
                          +{result.xpEarned}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
                          XP Earned
                        </div>
                      </Card>

                      <Card className="p-4 bg-background/60 backdrop-blur border-border/20 shadow-sm text-center">
                        <div className="text-3xl font-extrabold text-amber-500">
                          {result.evaluationDetails.filter((d) => d.isCorrect).length}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
                          Correct Answers
                        </div>
                      </Card>
                    </div>

                    <div className="flex flex-wrap gap-3 justify-center">
                      <Button onClick={reset} variant="outline" className="h-10 border-border/50 text-xs">
                        <RotateCcw className="h-4 w-4 mr-2" /> Retake Quiz
                      </Button>
                      <Button
                        onClick={startNewQuiz}
                        className="gradient-primary-bg text-white border-0 font-semibold shadow-md h-10 text-xs hover:opacity-95"
                      >
                        <Sparkles className="h-4 w-4 mr-2" /> Start New Quiz
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Quiz Attempts / History Sidebar */}
        <aside className="lg:sticky lg:top-4 space-y-4">
          <Card className="glass p-4 border-border/40 shadow-sm flex flex-col max-h-[600px]">
            <div className="flex items-center gap-2 mb-4 border-b border-border/30 pb-3">
              <div className="h-7 w-7 rounded-lg gradient-primary-bg flex items-center justify-center text-white">
                <History className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Quiz History</span>
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search history..."
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground/80">
                  {filteredAttempts.length} Records
                </span>
                <button
                  onClick={() =>
                    setHistorySort((prev) => (prev === "newest" ? "oldest" : "newest"))
                  }
                  className="flex items-center gap-1 hover:text-foreground text-[10px] transition-colors"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  Sort: {historySort}
                </button>
              </div>
            </div>

            {/* Attempts list */}
            {historyLoading ? (
              <div className="space-y-2 py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredAttempts.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground/80">
                No past quiz attempts found.
              </div>
            ) : (
              <ScrollArea className="flex-1 -mr-2 pr-2">
                <div className="space-y-2">
                  {filteredAttempts.map((att) => {
                    const title = att.quizzes?.title ?? "AI Quiz";
                    const isSelected = active?.quiz.id === att.quiz_id;

                    return (
                      <button
                        key={att.id}
                        onClick={() => loadPastAttempt(att)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border border-transparent transition-all text-xs group relative hover:bg-muted/40",
                          isSelected
                            ? "bg-primary/5 border-primary/30"
                            : "bg-muted/20 border-border/10 hover:border-border/30"
                        )}
                      >
                        <div className="font-semibold truncate pr-8 group-hover:text-primary transition-colors">
                          {title}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-muted-foreground/85 text-[10px]">
                          <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 h-4">
                            {att.quizzes?.difficulty ?? "easy"}
                          </Badge>
                          <span>{att.total_questions} questions</span>
                        </div>
                        <div className="absolute right-3 top-3 text-[10px] font-bold text-primary">
                          {att.score}/{att.total_questions}
                        </div>
                        <div className="text-[9px] text-muted-foreground/60 mt-1">
                          {new Date(att.completed_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}