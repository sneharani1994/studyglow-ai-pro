import { createFileRoute } from "@tanstack/react-router";
import { AIResponse } from "@/components/ai-response";
import { useEffect, useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Languages,
  Volume2,
  BookOpen,
  Sparkles,
  MessageSquare,
  Search,
  History as HistoryIcon,
  Trash2,
  Check,
  Play,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Trophy,
  Info,
  Copy,
  Download,
  RefreshCw,
  FileText,
  VolumeX,
} from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/languages")({ component: LanguagesPage });

// ── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "studygpt.lang";
const PROGRESS_KEY = "studyglow.languages.progress";
const HISTORY_KEY = "studyglow.languages.history";

const langs = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "pa", name: "Punjabi" },
  { code: "ur", name: "Urdu" },
  { code: "or", name: "Odia" },
  { code: "as", name: "Assamese" },
] as const;

const langLocales: Record<string, string> = {
  en: "en-US",
  hi: "hi-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  ur: "ur-PK",
  or: "or-IN",
  as: "as-IN",
};

const VOCAB_TOPICS = [
  "Greetings & Basics",
  "Travel & Directions",
  "Food & Dining",
  "Daily Routines",
  "Shopping & Money",
  "Family & Relationships",
  "Emergency & Health",
];

const GRAMMAR_TOPICS: Record<string, string[]> = {
  beginner: [
    "Pronouns & Subject Verb Agreement",
    "Basic Greetings & Sentence Structure",
    "Noun Plurals & Gender Rules",
    "Simple Question Words & Answers",
  ],
  intermediate: [
    "Past & Future Tense Conjugation",
    "Possessives & Adjectives",
    "Making Polite Requests",
    "Comparisons & Quantity Indicators",
  ],
  advanced: [
    "Passive & Active Voice Transition",
    "Subjunctive & Conditional Moods",
    "Common Idioms & Colloquialisms",
    "Complex Connectors & Conjunctions",
  ],
};

// ── Types ──────────────────────────────────────────────────────────────────
interface HistoryEntry {
  id: string;
  type: "tutor" | "vocab" | "grammar" | "chat";
  title: string;
  langCode: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  timestamp: string;
  data: any;
}

interface UserProgress {
  totalXp: number;
  masteredVocab: string[];
  completedGrammar: string[];
  conversationTurns: number;
}

// ── Main Component ─────────────────────────────────────────────────────────
function LanguagesPage() {
  // Global configurations
  const [lang, setLang] = useState<(typeof langs)[number]>(() => {
    if (typeof window === "undefined") return langs[0];
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const found = langs.find((l) => l.code === saved);
      return found ?? langs[0];
    } catch {
      return langs[0];
    }
  });

  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [activeTab, setActiveTab] = useState<"tutor" | "vocab" | "grammar" | "chat">("tutor");

  // Web Speech API support check
  const [ttsSupported, setTtsSupported] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setTtsSupported("speechSynthesis" in window);
    }
  }, []);

  // Gamification & Progress State
  const [progress, setProgress] = useState<UserProgress>({
    totalXp: 0,
    masteredVocab: [],
    completedGrammar: [],
    conversationTurns: 0,
  });

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState("");

  // Loading indicator flags
  const [tutorBusy, setTutorBusy] = useState(false);
  const [vocabBusy, setVocabBusy] = useState(false);
  const [grammarBusy, setGrammarBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);

  // Tab-specific variables
  // 1. AI Tutor Tab
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [askedQ, setAskedQ] = useState("");

  // 2. Vocab Tab
  const [selectedVocabTopic, setSelectedVocabTopic] = useState(VOCAB_TOPICS[0]);
  const [customVocabTopic, setCustomVocabTopic] = useState("");
  const [vocabCards, setVocabCards] = useState<Array<{ front: string; back: string; mastered?: boolean }>>([]);
  const [vocabSearch, setVocabSearch] = useState("");
  const [vocabFilter, setVocabFilter] = useState<"all" | "learning" | "mastered">("all");
  const [activeVocabIndex, setActiveVocabIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // 3. Grammar Tab
  const [selectedGrammarIndex, setSelectedGrammarIndex] = useState(0);
  const [customGrammarTopic, setCustomGrammarTopic] = useState("");
  const [grammarExplanation, setGrammarExplanation] = useState("");
  const [grammarActiveTopic, setGrammarActiveTopic] = useState("");

  // 4. Conversation Practice Tab
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "partner" | "user"; text: string; translation?: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [showTranslations, setShowTranslations] = useState<Record<number, boolean>>({});

  // Sync selected language to local storage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang.code);
    } catch {
      /* ignore */
    }
  }, [lang]);

  // Load progress & history on mount, auto-restoring latest session
  useEffect(() => {
    try {
      const storedProgress = localStorage.getItem(PROGRESS_KEY);
      if (storedProgress) {
        setProgress(JSON.parse(storedProgress));
      }

      const storedHistory = localStorage.getItem(HISTORY_KEY);
      if (storedHistory) {
        const parsedHistory: HistoryEntry[] = JSON.parse(storedHistory);
        setHistory(parsedHistory);

        // Automatically restore the latest session after refresh
        if (parsedHistory.length > 0) {
          const latest = parsedHistory[0];
          restoreSession(latest, false);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Save progress state helper
  const updateProgress = (updater: Partial<UserProgress> | ((prev: UserProgress) => UserProgress)) => {
    setProgress((prev) => {
      const updated = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  };

  // Save history state helper
  const updateHistoryList = (newList: HistoryEntry[]) => {
    setHistory(newList);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newList));
    } catch {
      /* ignore */
    }
  };

  // Add a history item (Max 20, no duplicates)
  const saveToHistory = (type: "tutor" | "vocab" | "grammar" | "chat", title: string, data: any) => {
    const newEntry: HistoryEntry = {
      id: Date.now().toString() + "-" + Math.random().toString(36).substring(2, 6),
      type,
      title,
      langCode: lang.code,
      difficulty,
      timestamp: new Date().toISOString(),
      data,
    };

    // Filter out duplicates (by same title + type)
    const filtered = history.filter((h) => !(h.title === title && h.type === type));
    const updated = [newEntry, ...filtered].slice(0, 20);
    updateHistoryList(updated);
  };

  // Delete single history log
  const deleteHistoryEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((h) => h.id !== id);
    updateHistoryList(updated);
    toast.success("Session removed from history");
  };

  // Clear all history logs
  const clearAllHistory = () => {
    updateHistoryList([]);
    toast.success("History cleared");
  };

  // Restore history session helper
  const restoreSession = (entry: HistoryEntry, showToast = true) => {
    setActiveTab(entry.type);
    const matchingLang = langs.find((l) => l.code === entry.langCode);
    if (matchingLang) setLang(matchingLang);
    setDifficulty(entry.difficulty);

    if (entry.type === "tutor") {
      setQuestion(entry.data.question || "");
      setAskedQ(entry.data.question || "");
      setAnswer(entry.data.answer || "");
    } else if (entry.type === "vocab") {
      setVocabTopic(entry.data.topic || "");
      setVocabCards(entry.data.cards || []);
      setActiveVocabIndex(0);
      setCardFlipped(false);
    } else if (entry.type === "grammar") {
      setGrammarActiveTopic(entry.data.topic || "");
      setGrammarExplanation(entry.data.content || "");
    } else if (entry.type === "chat") {
      setChatMessages(entry.data.messages || []);
    }

    if (showToast) {
      toast.success(`Restored session: ${entry.title}`);
    }
  };

  // Web Speech Text-to-Speech helper
  const speakText = (text: string) => {
    if (!ttsSupported) {
      toast.error("Text-to-Speech is not supported in this browser.");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      // Strip markdown syntax
      const cleanText = text.replace(/[*_`#>|-]/g, "").trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const locale = langLocales[lang.code] || "en-US";
      utterance.lang = locale;

      // Find suitable voice matching the locale prefix
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((v) => v.lang.startsWith(lang.code) || v.lang === locale);
      if (voice) utterance.voice = voice;

      window.speechSynthesis.speak(utterance);
    } catch {
      toast.error("Failed playing audio pronunciation");
    }
  };

  // ── Tab 1: AI Tutor Core ───────────────────────────────────────────────────
  const askTutor = async () => {
    const q = question.trim();
    if (!q) return;
    setTutorBusy(true);
    setAnswer("");
    try {
      const difficultyPrompt =
        difficulty === "beginner"
          ? "Explain simply with translation guides, clear word layouts, and simple phrasing."
          : difficulty === "intermediate"
            ? "Explain in moderate detail, structuring with grammar hints and vocabulary translations."
            : "Explain in complete native detail using complex sentence structures and idioms.";

      const prompt = `You are a professional study tutor. Answer this question/topic in/about ${lang.name} (${lang.code}) at a ${difficulty} level. ${difficultyPrompt}\n\nQuestion: ${q}`;
      const res = await aiService.explain(prompt, difficulty);
      setAnswer(res.explanation);
      setAskedQ(q);

      // Save to history list
      saveToHistory("tutor", q, { question: q, answer: res.explanation });

      // Reward XP (+10 XP)
      updateProgress((prev) => ({ ...prev, totalXp: prev.totalXp + 10 }));
      toast.success("+10 XP Earned!");
    } catch {
      toast.error("AI Service is temporarily busy. Please try again.");
    } finally {
      setTutorBusy(false);
    }
  };

  // ── Tab 2: Vocabulary Deck Core ──────────────────────────────────────────
  const vocabTopic = customVocabTopic.trim() || selectedVocabTopic;
  const setVocabTopic = (topic: string) => {
    if (VOCAB_TOPICS.includes(topic)) {
      setSelectedVocabTopic(topic);
      setCustomVocabTopic("");
    } else {
      setCustomVocabTopic(topic);
    }
  };

  const generateVocabDeck = async () => {
    setVocabBusy(true);
    setVocabCards([]);
    setActiveVocabIndex(0);
    setCardFlipped(false);
    try {
      const prompt = `Essential vocabulary phrases related to '${vocabTopic}' in ${lang.name} (${lang.code}) suitable for a ${difficulty} student. Provide exactly 8 entries. Front should be target language, Back should be english meaning.`;
      const res = await aiService.generateFlashcards(prompt, 8);
      const formatted = res.flashcards.map((c) => ({
        front: c.front,
        back: c.back,
        mastered: false,
      }));
      setVocabCards(formatted);

      saveToHistory("vocab", `Vocab: ${vocabTopic}`, { topic: vocabTopic, cards: formatted });

      // Reward XP (+15 XP)
      updateProgress((prev) => ({ ...prev, totalXp: prev.totalXp + 15 }));
      toast.success("Vocabulary deck generated! +15 XP");
    } catch {
      toast.error("Failed to generate vocabulary cards. Try again.");
    } finally {
      setVocabBusy(false);
    }
  };

  const toggleMasterVocab = (index: number) => {
    const updated = [...vocabCards];
    const card = updated[index];
    const isMastered = !card.mastered;
    card.mastered = isMastered;
    setVocabCards(updated);

    // Save state modification
    const histIndex = history.findIndex((h) => h.type === "vocab" && h.title === `Vocab: ${vocabTopic}`);
    if (histIndex !== -1) {
      const updatedHist = [...history];
      updatedHist[histIndex].data.cards = updated;
      updateHistoryList(updatedHist);
    }

    if (isMastered) {
      updateProgress((prev) => {
        const list = prev.masteredVocab.includes(card.front)
          ? prev.masteredVocab
          : [...prev.masteredVocab, card.front];
        return {
          ...prev,
          totalXp: prev.totalXp + 15,
          masteredVocab: list,
        };
      });
      toast.success("Mastered! +15 XP");
    } else {
      updateProgress((prev) => ({
        ...prev,
        masteredVocab: prev.masteredVocab.filter((w) => w !== card.front),
      }));
    }
  };

  // Filtered vocabulary list
  const filteredVocab = useMemo(() => {
    return vocabCards.filter((card) => {
      const matchesSearch =
        card.front.toLowerCase().includes(vocabSearch.toLowerCase()) ||
        card.back.toLowerCase().includes(vocabSearch.toLowerCase());
      const isMastered = progress.masteredVocab.includes(card.front) || card.mastered;

      if (vocabFilter === "mastered") return matchesSearch && isMastered;
      if (vocabFilter === "learning") return matchesSearch && !isMastered;
      return matchesSearch;
    });
  }, [vocabCards, vocabSearch, vocabFilter, progress.masteredVocab]);

  // ── Tab 3: Grammar lessons Core ──────────────────────────────────────────
  const activeGrammarTopicsList = GRAMMAR_TOPICS[difficulty] || GRAMMAR_TOPICS.beginner;
  const grammarTopic = customGrammarTopic.trim() || activeGrammarTopicsList[selectedGrammarIndex];

  const fetchGrammarLesson = async () => {
    setGrammarBusy(true);
    setGrammarExplanation("");
    try {
      const prompt = `Act as an expert grammar instructor. Write a clear, structural study lesson on '${grammarTopic}' for learning ${lang.name} at a ${difficulty} level. Formulate with: 1. Core Rule Breakdown, 2. Examples (show native text with english translations and pronunciation guides), 3. Quick practice test exercises. Make it extremely study-friendly.`;
      const res = await aiService.explain(prompt, difficulty);
      setGrammarExplanation(res.explanation);
      setGrammarActiveTopic(grammarTopic);

      saveToHistory("grammar", `Grammar: ${grammarTopic}`, { topic: grammarTopic, content: res.explanation });

      // Reward XP & Progress (+20 XP)
      updateProgress((prev) => {
        const completed = prev.completedGrammar.includes(grammarTopic)
          ? prev.completedGrammar
          : [...prev.completedGrammar, grammarTopic];
        return {
          ...prev,
          totalXp: prev.totalXp + 20,
          completedGrammar: completed,
        };
      });
      toast.success("Grammar lesson loaded! +20 XP");
    } catch {
      toast.error("Failed fetching grammar guide. Please retry.");
    } finally {
      setGrammarBusy(false);
    }
  };

  // ── Tab 4: Conversation Partner Core ──────────────────────────────────────
  const initChat = async () => {
    setChatBusy(true);
    setChatMessages([]);
    try {
      const prompt = `You are a friendly language practice partner named StudyGlow AI Coach. Start a conversation in ${lang.name} (${lang.code}) appropriate for a ${difficulty} speaker. Generate a short welcoming greeting and ask a starting question. Output format: [Target Language Greeting] | [English translation]. Keep it brief (under 2 sentences).`;
      const res = await aiService.explain(prompt, difficulty);

      const parts = res.explanation.split("|");
      const text = parts[0].trim();
      const trans = parts[1] ? parts[1].trim() : "Translation help unavailable.";

      const initialMessage = { sender: "partner" as const, text, translation: trans };
      setChatMessages([initialMessage]);

      saveToHistory("chat", `Chat in ${lang.name}`, { messages: [initialMessage] });
    } catch {
      toast.error("Failed initiating conversation partner.");
    } finally {
      setChatBusy(false);
    }
  };

  const sendChatMessage = async () => {
    const input = chatInput.trim();
    if (!input || chatBusy) return;

    setChatInput("");
    setChatBusy(true);

    const updatedMessages = [...chatMessages, { sender: "user" as const, text: input }];
    setChatMessages(updatedMessages);

    try {
      // Build brief chat history transcript
      const transcript = updatedMessages
        .slice(-6)
        .map((m) => `${m.sender === "user" ? "Student" : "Partner"}: ${m.text}`)
        .join("\n");

      const prompt = `You are a friendly chat tutor named StudyGlow AI Coach conversing with a student in ${lang.name} at a ${difficulty} level. Here is our conversation log:\n${transcript}\n\nRespond in ${lang.name} and ask a follow-up question. Output format must strictly be: [Response in ${lang.name}] | [English translation]. Do not write anything else.`;
      const res = await aiService.explain(prompt, difficulty);

      const parts = res.explanation.split("|");
      const partnerText = parts[0].trim();
      const partnerTrans = parts[1] ? parts[1].trim() : "Translation help unavailable.";

      const finalMessages = [...updatedMessages, { sender: "partner" as const, text: partnerText, translation: partnerTrans }];
      setChatMessages(finalMessages);

      saveToHistory("chat", `Chat in ${lang.name}`, { messages: finalMessages });

      // Reward XP (+5 XP)
      updateProgress((prev) => ({
        ...prev,
        totalXp: prev.totalXp + 5,
        conversationTurns: prev.conversationTurns + 1,
      }));
    } catch {
      toast.error("Error communicating with conversation partner.");
    } finally {
      setChatBusy(false);
    }
  };

  // ── Exports Helpers ────────────────────────────────────────────────────────
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Content copied to clipboard");
    } catch {
      toast.error("Failed to copy content");
    }
  };

  const downloadTextFile = (filename: string, content: string, extension: "txt" | "md") => {
    try {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`${extension.toUpperCase()} file downloaded`);
    } catch {
      toast.error("Export download failed");
    }
  };

  // Export PDF (jsPDF is already loaded in dependencies)
  const handleExportPdf = (title: string, content: string) => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(title, margin, y);
      y += 30;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const cleanContent = content.replace(/[*_`#>]/g, "");
      const lines = doc.splitTextToSize(cleanContent, width);

      for (const line of lines) {
        if (y > pageHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 14;
      }
      doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
      toast.success("PDF exported successfully");
    } catch {
      toast.error("PDF export failed");
    }
  };

  // History filtering
  const filteredHistory = useMemo(() => {
    if (!searchHistoryQuery.trim()) return history;
    const q = searchHistoryQuery.toLowerCase();
    return history.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        (h.type === "tutor" && h.data.answer.toLowerCase().includes(q))
    );
  }, [history, searchHistoryQuery]);

  // Card perspective flipping inline style constants
  const flipCardStyle = { perspective: "1000px" };
  const flipCardInnerStyle = (flipped: boolean) => ({
    transition: "transform 0.6s",
    transformStyle: "preserve-3d" as const,
    transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
  });
  const flipCardSideStyle = { backfaceVisibility: "hidden" as const, WebkitBackfaceVisibility: "hidden" as const };
  const flipCardBackStyle = {
    transform: "rotateY(180deg)",
    backfaceVisibility: "hidden" as const,
    WebkitBackfaceVisibility: "hidden" as const,
  };

  return (
    <div className="relative">
      <PageHeader
        title="Multi-language Learning"
        description="Learn core syllabus topics and language structures in the vocabulary of your choice."
      />

      {/* WEB SPEECH FALLBACK NOTIFIER */}
      {!ttsSupported && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-500 mb-6">
          <VolumeX className="h-4.5 w-4.5 shrink-0" />
          <span>
            Audio voice playback is disabled because your browser doesn't support Web Speech Synthesis (SpeechSynthesis).
          </span>
        </div>
      )}

      {/* ═══════════ TWO-COLUMN DESKTOP LAYOUT ═══════════ */}
      <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start animate-fade-in-premium">
        
        {/* LEFT COLUMN: Controls, Dashboard stats, and History logs */}
        <div className="space-y-6">
          
          {/* LANGUAGE & DIFFICULTY PANELS */}
          <Card className="p-5 glass border-border/40 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Study settings
            </h3>

            {/* Language Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                <Languages className="h-3.5 w-3.5 text-primary" /> Target Language
              </label>
              <div className="grid grid-cols-3 gap-1">
                {langs.map((l) => (
                  <Button
                    key={l.code}
                    size="sm"
                    variant={lang.code === l.code ? "default" : "outline"}
                    className={cn(
                      "text-xs px-2 h-8",
                      lang.code === l.code ? "gradient-primary-bg text-white border-0" : "bg-background/20"
                    )}
                    onClick={() => setLang(l)}
                  >
                    {l.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Difficulty Selector */}
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-primary" /> Learning Level
              </label>
              <div className="flex rounded-lg bg-muted/30 p-1 border border-border/20">
                {(["beginner", "intermediate", "advanced"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setDifficulty(lvl)}
                    className={cn(
                      "flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all capitalize",
                      difficulty === lvl
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* DASHBOARD PROGRESS TRACKING */}
          <Card className="p-5 glass border-border/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Dashboard progress
              </h3>
              <Badge variant="outline" className="text-[10px] text-primary bg-primary/5">
                Level {(Math.floor(progress.totalXp / 100)) + 1}
              </Badge>
            </div>

            <div className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-xl p-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total XP</div>
                <div className="text-xl font-bold text-foreground">{progress.totalXp} XP</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">Vocabulary Mastered</span>
                  <span className="font-bold text-foreground">{progress.masteredVocab.length} words</span>
                </div>
                <Progress value={Math.min(100, (progress.masteredVocab.length / 30) * 100)} className="h-1.5" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">Grammar Guides Done</span>
                  <span className="font-bold text-foreground">{progress.completedGrammar.length} topics</span>
                </div>
                <Progress value={Math.min(100, (progress.completedGrammar.length / 10) * 100)} className="h-1.5" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">Conversation Practice</span>
                  <span className="font-bold text-foreground">{progress.conversationTurns} messages</span>
                </div>
                <Progress value={Math.min(100, (progress.conversationTurns / 20) * 100)} className="h-1.5" />
              </div>
            </div>
          </Card>

          {/* HISTORY LOGS SECTION */}
          <Card className="p-4 glass border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                History ({history.length}/20)
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
                value={searchHistoryQuery}
                onChange={(e) => setSearchHistoryQuery(e.target.value)}
                placeholder="Search history..."
                className="pl-8 text-xs h-8 bg-background/20"
              />
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No history entries found.
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-1.5 pr-2">
                  {filteredHistory.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => restoreSession(h)}
                      className="group flex items-center justify-between p-2 rounded-lg border border-border/20 bg-background/10 hover:bg-background/30 hover:border-border/40 cursor-pointer transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider px-1">
                            {h.type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {langs.find((l) => l.code === h.langCode)?.name}
                          </span>
                        </div>
                        <div className="text-xs font-semibold truncate text-foreground mt-0.5">
                          {h.title}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => deleteHistoryEntry(h.id, e)}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive hover:bg-destructive/10 transition-opacity shrink-0"
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

        {/* RIGHT COLUMN: Interactive Workspaces / Workspace tabs */}
        <div className="space-y-6 min-w-0">
          
          {/* WORKSPACE SECTOR TAB SELECTOR */}
          <div className="flex rounded-xl bg-muted/40 p-1 border border-border/40 glass">
            {[
              { id: "tutor", label: "AI Tutor", icon: Sparkles },
              { id: "vocab", label: "Vocabulary Deck", icon: BookOpen },
              { id: "grammar", label: "Grammar lesson", icon: GraduationCap },
              { id: "chat", label: "Conversation partner", icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === "chat" && chatMessages.length === 0) {
                      initChat();
                    }
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-lg transition-all",
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm font-bold border border-border/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/10"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: AI TUTOR WORKSPACE */}
          {activeTab === "tutor" && (
            <div className="space-y-6">
              <Card className="p-5 glass border-border/40 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Ask Your AI Language Tutor</h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                  <div className="flex-1">
                    <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">
                      Enter any text, phrase, grammar inquiry or concept to clarify:
                    </label>
                    <Input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !tutorBusy && question.trim()) askTutor();
                      }}
                      placeholder="e.g., Explain when to use subjonctif in French, or Translate 'How are you?' to Bengali..."
                      className="bg-background/20"
                    />
                  </div>
                  <Button
                    onClick={askTutor}
                    disabled={tutorBusy || !question.trim()}
                    className="gradient-primary-bg text-white border-0"
                  >
                    {tutorBusy ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      `Ask in ${lang.name}`
                    )}
                  </Button>
                </div>
              </Card>

              {/* Tutor Loading State */}
              {tutorBusy && (
                <Card className="p-8 text-center border-border/40 glass">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                  <div className="text-xs text-muted-foreground">Formulating explanation in {lang.name}...</div>
                </Card>
              )}

              {/* Tutor Result State */}
              {!tutorBusy && answer && (
                <div className="space-y-4">
                  {/* Sticky Toolbar actions */}
                  <div className="glass border-border/40 rounded-xl px-4 py-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      AI tutor Response
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakText(answer)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Volume2 className="h-3.5 w-3.5 mr-1" />
                        Speak
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(answer)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadTextFile(`tutor-explanation-${lang.code}`, answer, "md")}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Markdown
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportPdf(`AI Tutor - ${askedQ}`, answer)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="p-4 bg-background/25 border-border/20">
                      <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">Question</div>
                      <div className="text-sm font-semibold text-foreground">{askedQ}</div>
                    </Card>

                    <AIResponse
                      content={answer}
                      loading={false}
                      title={`Explanation · ${lang.name}`}
                      pdfFileName={`tutor-${lang.code}`}
                      className="gradient-soft-bg border-0"
                    />
                  </div>
                </div>
              )}

              {/* Tutor Empty State */}
              {!tutorBusy && !answer && (
                <Card className="p-12 text-center border-border/40 glass">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary mx-auto mb-3">
                    <Languages className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">AI Tutor Session</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Ask a question in the tutor settings panel above to see translation explanations tailored for {lang.name}.
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* TAB 2: VOCABULARY DECK WORKSPACE */}
          {activeTab === "vocab" && (
            <div className="space-y-6">
              <Card className="p-5 glass border-border/40 space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Generate Vocabulary cards</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Select a Core Topic</label>
                    <div className="flex flex-wrap gap-1">
                      {VOCAB_TOPICS.map((topic) => (
                        <button
                          key={topic}
                          onClick={() => setVocabTopic(topic)}
                          className={cn(
                            "text-xs px-2.5 py-1.5 rounded-lg border transition-all",
                            vocabTopic === topic
                              ? "bg-primary text-white border-0"
                              : "border-border/30 bg-background/20 hover:bg-background/40"
                          )}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Or Enter Custom Topic Theme</label>
                    <div className="flex gap-2">
                      <Input
                        value={customVocabTopic}
                        onChange={(e) => setCustomVocabTopic(e.target.value)}
                        placeholder="e.g., Technology, Weather phrases..."
                        className="bg-background/20 text-xs"
                      />
                      <Button
                        onClick={generateVocabDeck}
                        disabled={vocabBusy}
                        className="gradient-primary-bg text-white border-0 text-xs"
                      >
                        {vocabBusy ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          "Generate Deck"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Vocab Loading Skeleton */}
              {vocabBusy && (
                <Card className="p-8 text-center border-border/40 glass space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <div className="text-xs text-muted-foreground">Compiling language flashcards in {lang.name}...</div>
                  <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="aspect-square rounded-lg w-full" />
                    ))}
                  </div>
                </Card>
              )}

              {/* Vocabulary Deck Display */}
              {!vocabBusy && vocabCards.length > 0 && (
                <div className="space-y-4">
                  {/* Sticky Deck Toolbar */}
                  <div className="glass border-border/40 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 bg-background/80">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Topic: {vocabTopic}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {vocabFilter}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1.5 h-3 w-3 text-muted-foreground" />
                        <Input
                          value={vocabSearch}
                          onChange={(e) => {
                            setVocabSearch(e.target.value);
                            setActiveVocabIndex(0);
                          }}
                          placeholder="Search cards..."
                          className="pl-7 pr-2 py-0.5 text-[11px] h-6 w-36 bg-background/20"
                        />
                      </div>

                      <div className="flex rounded-lg bg-muted/40 p-0.5 border border-border/20">
                        {(["all", "learning", "mastered"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => {
                              setVocabFilter(mode);
                              setActiveVocabIndex(0);
                            }}
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded capitalize",
                              vocabFilter === mode ? "bg-background text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {filteredVocab.length === 0 ? (
                    <Card className="p-8 text-center border-border/40 glass text-xs text-muted-foreground">
                      No vocabulary cards match your search or filter settings.
                    </Card>
                  ) : (
                    <div className="grid md:grid-cols-[1fr_300px] gap-6">
                      
                      {/* Active Flashcard 3D perspective display */}
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div
                          className="w-full max-w-md aspect-[1.6] cursor-pointer"
                          style={flipCardStyle}
                          onClick={() => setCardFlipped(!cardFlipped)}
                        >
                          <div
                            className="relative w-full h-full rounded-2xl shadow-premium border border-border/40"
                            style={flipCardInnerStyle(cardFlipped)}
                          >
                            
                            {/* FRONT SIDE (Target Language Word) */}
                            <div
                              className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-primary/10 via-background/80 to-primary/5 border-2 border-primary/20 p-6 flex flex-col justify-between items-center text-center backface-hidden"
                              style={flipCardSideStyle}
                            >
                              <div className="flex justify-between items-center w-full">
                                <Badge className="bg-primary/20 text-primary border-0 text-[10px]">
                                  {lang.name}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  Click to Flip Card
                                </span>
                              </div>

                              <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-foreground tracking-wide">
                                  {filteredVocab[activeVocabIndex]?.front}
                                </h3>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full bg-primary/15 text-primary hover:bg-primary/25"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    speakText(filteredVocab[activeVocabIndex]?.front);
                                  }}
                                >
                                  <Volume2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* BACK SIDE (English Meaning / Grammar context) */}
                            <div
                              className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-emerald-500/10 via-background/90 to-emerald-500/5 border-2 border-emerald-500/20 p-6 flex flex-col justify-between items-center text-center backface-hidden"
                              style={flipCardBackStyle}
                            >
                              <div className="flex justify-between items-center w-full">
                                <Badge className="bg-emerald-500/20 text-emerald-500 border-0 text-[10px]">
                                  English Meaning
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  Click to Flip Card
                                </span>
                              </div>

                              <p className="text-sm font-semibold text-foreground leading-relaxed px-4">
                                {filteredVocab[activeVocabIndex]?.back}
                              </p>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={
                                    progress.masteredVocab.includes(filteredVocab[activeVocabIndex]?.front) ||
                                    filteredVocab[activeVocabIndex]?.mastered
                                      ? "default"
                                      : "outline"
                                  }
                                  className={cn(
                                    "h-8 text-xs font-semibold",
                                    (progress.masteredVocab.includes(filteredVocab[activeVocabIndex]?.front) ||
                                      filteredVocab[activeVocabIndex]?.mastered)
                                      ? "bg-emerald-500 text-white border-0"
                                      : "border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMasterVocab(vocabCards.findIndex((c) => c.front === filteredVocab[activeVocabIndex]?.front));
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  {progress.masteredVocab.includes(filteredVocab[activeVocabIndex]?.front) ||
                                  filteredVocab[activeVocabIndex]?.mastered
                                    ? "Mastered"
                                    : "Mark Mastered"}
                                </Button>
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* Deck Navigator */}
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activeVocabIndex === 0}
                            onClick={() => {
                              setActiveVocabIndex((i) => i - 1);
                              setCardFlipped(false);
                            }}
                            className="text-xs"
                          >
                            Prev
                          </Button>
                          <span className="text-xs font-bold text-muted-foreground">
                            {activeVocabIndex + 1} / {filteredVocab.length}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activeVocabIndex === filteredVocab.length - 1}
                            onClick={() => {
                              setActiveVocabIndex((i) => i + 1);
                              setCardFlipped(false);
                            }}
                            className="text-xs"
                          >
                            Next
                          </Button>
                        </div>
                      </div>

                      {/* Side Checklist view of entire generated cards list */}
                      <Card className="p-3 bg-background/25 border-border/20 space-y-2">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider pb-1 border-b border-border/20">
                          Deck Checklist
                        </div>
                        <ScrollArea className="h-[220px]">
                          <div className="space-y-1.5 pr-2">
                            {filteredVocab.map((card, idx) => {
                              const isM = progress.masteredVocab.includes(card.front) || card.mastered;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setActiveVocabIndex(idx);
                                    setCardFlipped(false);
                                  }}
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded-lg border text-left cursor-pointer transition-all",
                                    activeVocabIndex === idx
                                      ? "bg-primary/10 border-primary/40"
                                      : "bg-background/10 border-border/25 hover:bg-background/20"
                                  )}
                                >
                                  <div className="min-w-0 flex-1 pr-2">
                                    <div className="text-xs font-bold truncate text-foreground">{card.front}</div>
                                    <div className="text-[10px] text-muted-foreground truncate">{card.back}</div>
                                  </div>
                                  {isM ? (
                                    <Badge className="bg-emerald-500/20 text-emerald-500 border-0 p-1 rounded-full shrink-0">
                                      <Check className="h-3 w-3" />
                                    </Badge>
                                  ) : (
                                    <span className="text-[9px] text-muted-foreground font-semibold shrink-0">
                                      {idx + 1}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </Card>

                    </div>
                  )}
                </div>
              )}

              {/* Vocab Empty State */}
              {!vocabBusy && vocabCards.length === 0 && (
                <Card className="p-12 text-center border-border/40 glass">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary mx-auto mb-3">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">Vocabulary study Cards</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Select a vocabulary theme category above and generate dynamic language training flashcards.
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* TAB 3: GRAMMAR LESSON WORKSPACE */}
          {activeTab === "grammar" && (
            <div className="space-y-6">
              <Card className="p-5 glass border-border/40 space-y-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Grammar & Syntax lessons</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Select Grammar Topic ({difficulty})
                    </label>
                    <div className="flex rounded-lg bg-muted/40 p-1 border border-border/20 flex-wrap gap-1">
                      {activeGrammarTopicsList.map((t, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedGrammarIndex(idx);
                            setCustomGrammarTopic("");
                          }}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded transition-all capitalize",
                            (selectedGrammarIndex === idx && !customGrammarTopic)
                              ? "bg-background text-foreground font-semibold shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Topic {idx + 1}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs font-medium text-foreground px-1 truncate">
                      Current: {activeGrammarTopicsList[selectedGrammarIndex]}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Or Enter Custom Topic</label>
                    <div className="flex gap-2">
                      <Input
                        value={customGrammarTopic}
                        onChange={(e) => setCustomGrammarTopic(e.target.value)}
                        placeholder="e.g., Future Tense structure, Imperatives..."
                        className="bg-background/20 text-xs"
                      />
                      <Button
                        onClick={fetchGrammarLesson}
                        disabled={grammarBusy}
                        className="gradient-primary-bg text-white border-0 text-xs"
                      >
                        {grammarBusy ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Study Guide"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Grammar Loading Skeleton */}
              {grammarBusy && (
                <Card className="p-8 text-center border-border/40 glass space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <div className="text-xs text-muted-foreground">Generating lesson for '{grammarTopic}'...</div>
                  <div className="space-y-2 max-w-lg mx-auto">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                  </div>
                </Card>
              )}

              {/* Grammar Output Render */}
              {!grammarBusy && grammarExplanation && (
                <div className="space-y-4">
                  {/* Sticky Toolbar actions */}
                  <div className="glass border-border/40 rounded-xl px-4 py-2 flex items-center justify-between gap-3 bg-background/80">
                    <span className="text-xs font-bold text-foreground">
                      Lesson: {grammarActiveTopic}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakText(grammarExplanation)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Volume2 className="h-3.5 w-3.5 mr-1" />
                        Speak
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(grammarExplanation)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadTextFile(`grammar-${grammarActiveTopic}`, grammarExplanation, "md")}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Markdown
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportPdf(grammarActiveTopic, grammarExplanation)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>

                  <AIResponse
                    content={grammarExplanation}
                    loading={false}
                    title={`Grammar Lesson · ${lang.name}`}
                    pdfFileName={`grammar-${lang.code}`}
                    className="gradient-soft-bg border-0"
                  />
                </div>
              )}

              {/* Grammar Empty State */}
              {!grammarBusy && !grammarExplanation && (
                <Card className="p-12 text-center border-border/40 glass">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary mx-auto mb-3">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">Grammar Guide Workspace</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Select a structure or difficulty topic above to fetch a structured grammar tutorial with exercises.
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* TAB 4: CONVERSATION PRACTICE WORKSPACE */}
          {activeTab === "chat" && (
            <div className="space-y-6">
              <Card className="p-5 glass border-border/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h2 className="text-base font-bold text-foreground">Conversation Partner Practice</h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={initChat}
                    disabled={chatBusy}
                    className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/5"
                  >
                    Reset Partner Conversation
                  </Button>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Practice speaking in {lang.name}. Hover or click on the eye icon to see translations.
                  </span>
                </div>

                {/* Conversation Box */}
                <Card className="p-4 bg-background/25 border-border/25 h-[340px] flex flex-col justify-between">
                  <ScrollArea className="flex-1 pr-2 space-y-3">
                    {chatMessages.length === 0 && chatBusy && (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        <span className="text-xs text-muted-foreground">Connecting with study coach...</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      {chatMessages.map((msg, idx) => {
                        const isPartner = msg.sender === "partner";
                        const showT = showTranslations[idx] || false;

                        return (
                          <div
                            key={idx}
                            className={cn(
                              "flex flex-col max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed space-y-1.5 transition-all",
                              isPartner
                                ? "bg-muted/40 border border-border/10 rounded-tl-none self-start mr-auto"
                                : "gradient-primary-bg text-white rounded-tr-none self-end ml-auto text-right"
                            )}
                          >
                            <div className="font-bold uppercase tracking-wider text-[9px] opacity-75">
                              {isPartner ? "Coach" : "You"}
                            </div>

                            <div className="font-medium whitespace-pre-wrap">{msg.text}</div>

                            {/* Translation Assistance Helper */}
                            {isPartner && msg.translation && (
                              <div className="pt-1.5 border-t border-border/10">
                                <button
                                  onClick={() =>
                                    setShowTranslations((prev) => ({ ...prev, [idx]: !prev[idx] }))
                                  }
                                  className="text-[9px] underline font-bold tracking-wide hover:text-foreground text-primary transition-colors flex items-center gap-0.5"
                                >
                                  {showT ? "Hide Translation" : "Show Translation"}
                                </button>
                                {showT && (
                                  <div className="text-[10px] text-muted-foreground mt-1 italic font-medium">
                                    {msg.translation}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Speaker TTS Pronunciation button */}
                            {isPartner && (
                              <button
                                onClick={() => speakText(msg.text)}
                                className="self-end p-0.5 rounded hover:bg-background/25 transition-colors shrink-0 text-muted-foreground hover:text-foreground"
                                title="Hear Pronunciation"
                              >
                                <Volume2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {chatBusy && chatMessages.length > 0 && (
                        <div className="flex items-center gap-1.5 p-2 bg-muted/20 border rounded-lg self-start mr-auto text-xs text-muted-foreground w-max">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          Coach is typing...
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Message Input Box */}
                  <div className="flex gap-2 pt-3 border-t border-border/20 mt-3">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && chatInput.trim() && !chatBusy) sendChatMessage();
                      }}
                      placeholder={`Reply in ${lang.name}...`}
                      className="bg-background/20 text-xs"
                      disabled={chatBusy}
                    />
                    <Button
                      onClick={sendChatMessage}
                      disabled={chatBusy || !chatInput.trim()}
                      className="gradient-primary-bg text-white border-0 text-xs shrink-0"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}