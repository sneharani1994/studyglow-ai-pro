import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, MessageSquare, Mic, FileSearch, BrainCircuit, Layers,
  Target, CalendarRange, GraduationCap, Network, Languages, Activity,
  Upload, Brain, ArrowRight, ArrowLeft, Menu, X, Check, Star,
  BookOpen, Clock, Flame, Award, Shield, Zap, Laptop, FileText,
  CheckCircle2, AlertTriangle, Play, RefreshCw, Send, ChevronRight, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyGPT — Your Personal AI Learning Companion" },
      { name: "description", content: "Upload notes, ask questions, generate quizzes, flashcards, study plans and prepare smarter with AI." },
      { property: "og:title", content: "StudyGPT — AI Learning Ecosystem" },
      { property: "og:description", content: "The all-in-one AI study platform for students. Chat, quiz, plan and master any subject." },
    ],
  }),
  component: Index,
});

// Data Configurations
const features = [
  { icon: MessageSquare, title: "AI Chat", desc: "Interact dynamically with your study files — ask queries and receive references in real-time." },
  { icon: FileSearch, title: "AI Summaries", desc: "Compress lengthy PDF, DOCX, and TXT material into actionable summaries and study lists." },
  { icon: Layers, title: "Flashcards", desc: "Instantly build customized spaced-repetition decks tuned to your weak topics." },
  { icon: BrainCircuit, title: "Quiz Generator", desc: "Generate multi-choice or short-answer practice tests from your material." },
  { icon: Mic, title: "Voice Assistant", desc: "Discuss topics out loud with hands-free auditory learning and dictation." },
  { icon: Award, title: "Interview Prep", desc: "Test yourself in real-time with simulated behavioral or technical role-play panels." },
  { icon: Target, title: "Weak Topic Detection", desc: "Locate and tag concept gaps automatically based on quiz performance." },
  { icon: Network, title: "Study Roadmaps", desc: "Synthesize structured custom study pathways to outline your progress step-by-step." },
  { icon: Upload, title: "PDF Upload", desc: "Upload and analyze scans, slides, documents, and transcripts instantly." },
  { icon: BookOpen, title: "Smart Notes", desc: "Compile annotations and markdown briefs with inline AI text completion." },
  { icon: Activity, title: "Progress Tracking", desc: "Evaluate daily habits, hours logged, and performance scores." },
  { icon: CalendarRange, title: "Revision Planner", desc: "Generate adaptive review timelines that change dynamically based on memory levels." },
];

const highlights = [
  { icon: Sparkles, title: "20+ AI Learning Tools", desc: "A comprehensive ecosystem covering summaries, quizzes, voice, maps, planners, and more." },
  { icon: FileText, title: "PDF, DOCX & TXT Support", desc: "Parse textbook chapters, lecture notes, slides, and handwritten scans smoothly." },
  { icon: MessageSquare, title: "AI Chat", desc: "Direct dialogue with multiple files simultaneously with strict contextual grounding." },
  { icon: BrainCircuit, title: "Quiz Generator", desc: "Produce realistic exam questionnaires customized by difficulty and length." },
  { icon: Layers, title: "Flashcards", desc: "Utilize active recall and automated spaced repetition grids to solidify memory retention." },
  { icon: Mic, title: "Voice Assistant", desc: "Practice auditory question-and-answer routines for hands-free studying on the go." },
  { icon: Award, title: "Interview Preparation", desc: "Build confidence with AI panel reviews, technical prompts, and instant grading." },
  { icon: Target, title: "Roadmaps", desc: "Map out complete subjects sequentially from introductory fundamentals to complex topics." },
  { icon: AlertTriangle, title: "Weak Topic Detection", desc: "Trace incorrect quiz answers directly back to textbook chapters for targeted review." },
];

const whyChooseCards = [
  { icon: Zap, title: "Learn Faster with AI", desc: "Translate complex conceptual paragraphs into visual outlines, simplified briefs, or voice guides instantly." },
  { icon: FileText, title: "Generate Smart Notes", desc: "Centralize your text files and let the AI automatically structure them into outline summaries and references." },
  { icon: BrainCircuit, title: "Practice with AI Quizzes", desc: "Generate quizzes based on exact source material rather than generic internet questions." },
  { icon: Layers, title: "Master Concepts with Flashcards", desc: "Keep facts fresh in your head with cards timed using an intelligent retention schedule." },
  { icon: Award, title: "Prepare for Technical Interviews", desc: "Rehearse coding prompts or situational questions with a constructive grading model." },
  { icon: Target, title: "Track Progress Across Subjects", desc: "Gather centralized statistics on study time, concept mastery, and areas needing extra revision." }
];

const timelineSteps = [
  { step: "1", title: "Upload Notes", desc: "Drag and drop PDFs, textbook chapters, slide presentations, or documents." },
  { step: "2", title: "Generate Summary", desc: "Let the AI parse the content and summarize core definitions and formulas." },
  { step: "3", title: "Study Notes", desc: "Review key arguments with structured markdown outlines and citations." },
  { step: "4", title: "Flashcards", desc: "Convert challenging concepts into active recall study cards instantly." },
  { step: "5", title: "Quiz", desc: "Gauge your understanding with immediate questions and comprehensive explanations." },
  { step: "6", title: "AI Chat", desc: "Ask follow-up questions to resolve confusing formulas or complex diagrams." },
  { step: "7", title: "Interview Practice", desc: "Wrap up the topic by doing mock interviews to verify career readiness." }
];

const showcaseTabs = [
  { id: "summaries", label: "Summaries", title: "Intelligent Document Summarization", desc: "Instantly condense full textbooks or slide decks into high-impact key takeaway briefs with page citations." },
  { id: "flashcards", label: "Flashcards", title: "Spaced Repetition Decks", desc: "Convert text chapters into cards, rating your confidence level to optimize the spaced repetition frequency." },
  { id: "quiz", label: "Quiz", title: "Custom Quiz Engine", desc: "Build tailored assessments with multiple choice, true/false, or fill-in-the-blank options directly from your upload sources." },
  { id: "voice", label: "Voice", title: "Vocal Active Recall", desc: "Practice speech drills or debate complex ethical cases hands-free while cooking, walking, or resting." },
  { id: "interview", label: "Interview", title: "Career & Tech Interview Simulations", desc: "Enter specialized practice rooms where AI interviewers guide you through questions and grade your answers." },
  { id: "roadmaps", label: "Roadmaps", title: "Automated Curriculum Roadmaps", desc: "Generate a custom progressive lesson plan detailing every subtopic you need to learn to master a subject." }
];

const benefits = [
  { icon: Shield, title: "AI Powered", desc: "Utilizes advanced local prompts to deliver highly tailored study assistance." },
  { icon: Laptop, title: "Works on Desktop", desc: "Optimized for widescreen, multi-window layout with clean side-by-side study panes." },
  { icon: Activity, title: "Responsive Design", desc: "Study seamlessly from your phone, tablet, or laptop layout with adaptiveness." },
  { icon: Network, title: "Modern Dashboard", desc: "Enjoy a sleek, unified web application environment with zero cluttered elements." },
  { icon: RefreshCw, title: "Smart Revision", desc: "Tracks your topic strength to suggest revisions before memory drops." },
  { icon: BookOpen, title: "Multiple Study Modes", desc: "Choose between chat, flashcards, active writing, timelines, or practice exams." },
  { icon: Zap, title: "Fast Document Processing", desc: "Extract and structure text elements from complex uploads in seconds." },
  { icon: Award, title: "Secure Authentication", desc: "Keeps your files and personal notes safe and privately saved to your account." }
];

// Main Landing Page Component
function Index() {
  const handleScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden landing-noise">
      <BackgroundEffects />
      <Nav onScrollTo={handleScroll} />
      <Hero />
      <InteractiveDemo />
      <BentoGrid />
      <ProductHighlights onScrollTo={handleScroll} />
      <WorkflowPreview />
      <WhyChooseSection />
      <HowItWorksSection />
      <FeaturesShowcase />
      <ProductBenefitsSection />
      <CtaSection />
      <Footer onScrollTo={handleScroll} />
    </div>
  );
}

// ── Background Visual FX Component ──
const BackgroundEffects = memo(() => {
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none -z-20 overflow-hidden" aria-hidden="true">
      {/* Floating Aurora Spotlight */}
      <div 
        className="absolute w-[800px] h-[800px] rounded-full opacity-[0.08] blur-[140px] bg-gradient-to-tr from-violet-500 via-indigo-500 to-blue-500 transition-transform duration-500 ease-out animate-aurora"
        style={{
          transform: `translate(${coords.x - 400}px, ${coords.y - 400}px)`,
        }}
      />
      {/* Floating Blobs */}
      <div className="absolute top-[15%] left-[-5%] w-[450px] h-[450px] rounded-full bg-violet-600/10 blur-[130px] animate-blob-1" />
      <div className="absolute bottom-[25%] right-[-5%] w-[550px] h-[550px] rounded-full bg-blue-600/10 blur-[150px] animate-blob-2" />
      
      {/* Moving Particles */}
      <div className="absolute top-[20%] right-[20%] w-2 h-2 rounded-full bg-violet-500/40 blur-[1px] animate-particle-1" />
      <div className="absolute top-[60%] left-[10%] w-3.5 h-3.5 rounded-full bg-indigo-500/20 blur-[2px] animate-particle-2" />
      <div className="absolute bottom-[10%] right-[35%] w-2.5 h-2.5 rounded-full bg-blue-400/30 blur-[1px] animate-particle-3" />

      {/* Grid Overlay & Base Gradients */}
      <div className="absolute inset-0 landing-grid-bg opacity-[0.35] dark:opacity-[0.15]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
    </div>
  );
});
BackgroundEffects.displayName = "BackgroundEffects";

// ── Sticky Navigation Component ──
interface NavProps {
  onScrollTo: (id: string) => void;
}

const Nav = memo(({ onScrollTo }: NavProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Features", target: "features" },
    { label: "AI Tools", target: "highlights" },
    { label: "How It Works", target: "how-it-works" },
    { label: "Contact", target: "contact" }
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "glass-premium border-b" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2 group" aria-label="StudyGPT Home">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 grid place-items-center text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform duration-300">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80">
            StudyGPT
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <button
              key={l.label}
              onClick={() => onScrollTo(l.target)}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors relative py-2 group cursor-pointer border-0 bg-transparent"
            >
              {l.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex text-sm font-medium" aria-label="Login to account">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-violet-600/10 border-0 transition-all duration-300 shadow-glow" aria-label="Get Started Free">
            <Link to="/signup">Get Started Free</Link>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden cursor-pointer" 
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t bg-background/95 backdrop-blur-md px-6 py-4 space-y-4"
          >
            {navLinks.map((l) => (
              <button
                key={l.label}
                onClick={() => {
                  setMobileOpen(false);
                  onScrollTo(l.target);
                }}
                className="block text-left w-full text-base font-semibold text-muted-foreground hover:text-primary transition-colors py-1 cursor-pointer border-0 bg-transparent"
              >
                {l.label}
              </button>
            ))}
            <div className="pt-4 flex gap-3 border-t">
              <Button variant="ghost" asChild className="flex-1" aria-label="Login">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0" aria-label="Get Started Free">
                <Link to="/signup">Get Started Free</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
});
Nav.displayName = "Nav";

// ── Hero Section Component ──
const Hero = memo(() => {
  const chips = [
    "AI Powered",
    "PDF Support",
    "Quiz Generator",
    "Flashcards",
    "Voice Assistant",
    "Interview Prep"
  ];

  return (
    <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 px-4 lg:px-8 max-w-7xl mx-auto text-center">
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full px-4 py-1.5 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Production-Grade Study Suite
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] max-w-3xl mx-auto font-sans">
          Your Personal
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500 animate-aurora">
            AI Learning
          </span>
          <br />
          Companion
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Upload notes, generate summaries, create quizzes, practice interviews, build flashcards, and master every subject with AI.
        </p>

        <div className="flex justify-center">
          <Button size="lg" asChild className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-500/20 font-semibold px-8 py-6 rounded-xl text-base transition-all duration-300" aria-label="Get Started Free">
            <Link to="/signup" className="flex items-center gap-2">
              Get Started Free <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Feature Chips */}
        <div className="pt-8 flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {chips.map((chip, idx) => (
            <div key={idx} className="flex items-center gap-1.5 bg-muted/40 border border-border/50 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground hover:border-violet-500/30 transition-all duration-300">
              <Check className="h-3.5 w-3.5 text-violet-500" aria-hidden="true" />
              <span>{chip}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
Hero.displayName = "Hero";

// ── Interactive Local AI Tutor Simulation Component ──
const InteractiveDemo = memo(() => {
  const [demoState, setDemoState] = useState<"idle" | "typing" | "responded" | "followup" | "quiz" | "flashcard">("idle");
  const [displayText, setDisplayText] = useState("");
  const typingTimer = useRef<number | null>(null);

  const mockAnswer = `Binary Search is an O(log n) efficiency algorithm that finds target values in sorted arrays. 

Instead of checking item-by-item, it splits the array in half:
1. Compares target with the middle element.
2. If match found, returns index.
3. If target is lower, discards the upper half.
4. If target is higher, discards the lower half.
Repeats until resolved.`;

  const handleStartSim = () => {
    if (typingTimer.current) clearInterval(typingTimer.current);
    setDemoState("typing");
    setDisplayText("");
    
    let index = 0;
    typingTimer.current = window.setInterval(() => {
      if (index < mockAnswer.length) {
        setDisplayText((prev) => prev + mockAnswer.charAt(index));
        index++;
      } else {
        if (typingTimer.current) clearInterval(typingTimer.current);
        setDemoState("responded");
      }
    }, 12);
  };

  const handleAction = (type: "followup" | "quiz" | "flashcard") => {
    setDemoState(type);
  };

  const handleReset = () => {
    if (typingTimer.current) clearInterval(typingTimer.current);
    setDemoState("idle");
    setDisplayText("");
  };

  return (
    <section className="py-20 px-4 lg:px-8 max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Interactive AI Demo</h2>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">Experience how the AI tutor analyzes and processes study material locally.</p>
      </div>

      <div className="glass-premium rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-card/30">
        {/* Terminal Header */}
        <div className="h-10 px-4 bg-muted/40 border-b flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <span className="text-xs text-muted-foreground font-mono">tutor_simulation.sh</span>
          <div className="w-8" />
        </div>

        {/* Conversation Box */}
        <div className="p-6 space-y-4 text-left font-sans text-sm min-h-[300px] flex flex-col justify-between">
          <div className="space-y-4">
            {/* Student Request */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs" aria-hidden="true">U</div>
              <div className="bg-muted/80 rounded-2xl px-4 py-3 max-w-lg shadow-sm">
                Explain Binary Search.
              </div>
            </div>

            {/* AI Response */}
            {demoState !== "idle" && (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs" aria-hidden="true">AI</div>
                <div className="glass-premium border rounded-2xl p-4 max-w-xl relative bg-background/50 shadow-md">
                  <pre className="font-sans whitespace-pre-wrap leading-relaxed text-sm">
                    {displayText}
                    {demoState === "typing" && <span className="inline-block w-1.5 h-4 bg-violet-500 ml-0.5 animate-pulse" />}
                  </pre>
                </div>
              </div>
            )}

            {/* Follow-up State Mockup */}
            {demoState === "followup" && (
              <div className="pl-11 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs" aria-hidden="true">U</div>
                  <div className="bg-muted/80 rounded-2xl px-4 py-2.5 max-w-lg shadow-sm">
                    Give me an example of the worst-case scenario.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs" aria-hidden="true">AI</div>
                  <div className="glass-premium border rounded-2xl p-4 max-w-xl bg-background/50 shadow-md">
                    In Binary Search, the worst case happens when the target is either not present in the array or is at the very end of the search pathway. With 1024 sorted numbers, it takes at most 10 checks to verify target existence.
                  </div>
                </div>
              </div>
            )}

            {/* Quiz Generation Mockup */}
            {demoState === "quiz" && (
              <div className="pl-11 border-l-2 border-violet-500/20 py-2 space-y-3">
                <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5" /> Generated Study Quiz
                </p>
                <div className="bg-background/80 border rounded-xl p-4 space-y-3 max-w-md shadow-sm">
                  <p className="font-semibold text-sm">Q: What is the time complexity of Binary Search in the average case?</p>
                  <div className="space-y-2">
                    <div className="border border-border/80 rounded-lg p-2.5 text-xs text-muted-foreground bg-muted/20">A) O(n)</div>
                    <div className="border border-emerald-500/30 rounded-lg p-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 flex items-center justify-between">
                      <span>B) O(log n)</span>
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="border border-border/80 rounded-lg p-2.5 text-xs text-muted-foreground bg-muted/20">C) O(n log n)</div>
                  </div>
                </div>
              </div>
            )}

            {/* Flashcard Generation Mockup */}
            {demoState === "flashcard" && (
              <div className="pl-11 border-l-2 border-indigo-500/20 py-2 space-y-3">
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Interactive Flashcard
                </p>
                <div className="bg-background/80 border rounded-xl p-5 max-w-sm shadow-md text-center space-y-4">
                  <div className="py-2 border-b border-border/60">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Front Side</span>
                    <p className="font-semibold text-sm mt-1">Does Binary Search require the dataset to be sorted?</p>
                  </div>
                  <div className="py-1">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Back Side</span>
                    <p className="text-xs text-muted-foreground mt-1">Yes. If not sorted, divide-and-conquer checks will falsely eliminate viable numbers.</p>
                  </div>
                  <div className="flex justify-center gap-1.5">
                    {["Again", "Hard", "Good", "Easy"].map((r) => (
                      <span key={r} className="px-2 py-1 rounded bg-muted text-[10px] font-semibold text-muted-foreground">{r}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controller Actions */}
          <div className="pt-6 border-t flex flex-wrap items-center justify-between gap-3 mt-4">
            {demoState === "idle" && (
              <Button onClick={handleStartSim} className="bg-primary text-white hover:opacity-90 font-medium cursor-pointer" aria-label="Trigger AI explanation simulation">
                Simulate AI Tutor Response
              </Button>
            )}

            {demoState === "typing" && (
              <span className="text-xs text-muted-foreground italic flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 animate-spin text-primary" /> Synthesizing conceptual outline...
              </span>
            )}

            {demoState !== "idle" && demoState !== "typing" && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={demoState === "quiz" ? "default" : "outline"} onClick={() => handleAction("quiz")} className="text-xs cursor-pointer" aria-label="Simulate Quiz tool">
                  Generate Quiz
                </Button>
                <Button size="sm" variant={demoState === "flashcard" ? "default" : "outline"} onClick={() => handleAction("flashcard")} className="text-xs cursor-pointer" aria-label="Simulate Flashcard tool">
                  Generate Flashcard
                </Button>
                <Button size="sm" variant={demoState === "followup" ? "default" : "outline"} onClick={() => handleAction("followup")} className="text-xs cursor-pointer" aria-label="Simulate follow up question">
                  Ask Follow-up
                </Button>
              </div>
            )}

            {demoState !== "idle" && (
              <Button size="sm" variant="ghost" onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer" aria-label="Reset simulation to default">
                Reset Demo
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});
InteractiveDemo.displayName = "InteractiveDemo";

// ── Bento Grid Section ──
interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

const FeatureCard = memo(({ icon: Icon, title, desc }: FeatureCardProps) => {
  return (
    <Card className="p-6 h-full glass hover:bg-card border border-border/40 hover:border-primary/40 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4">
      <div className="h-10 w-10 rounded-xl bg-violet-600/10 grid place-items-center text-violet-600 transition-colors">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="space-y-1.5 text-left">
        <h3 className="font-bold text-lg tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </Card>
  );
});
FeatureCard.displayName = "FeatureCard";

const BentoGrid = memo(() => {
  return (
    <section id="features" className="py-24 px-4 lg:px-8 max-w-7xl mx-auto border-t border-border/40">
      <div className="text-center mb-16 space-y-2">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Your All-In-One Study Companion</h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">Mastering your syllabus has never been easier. Reusable educational modules at your fingertips.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {features.map((f, idx) => (
          <div key={idx}>
            <FeatureCard icon={f.icon} title={f.title} desc={f.desc} />
          </div>
        ))}
      </div>
    </section>
  );
});
BentoGrid.displayName = "BentoGrid";

// ── Product Highlights Component ──
interface HighlightCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

const HighlightCard = memo(({ icon: Icon, title, desc }: HighlightCardProps) => {
  return (
    <div className="bg-muted/20 hover:bg-card/40 border border-border/60 rounded-xl p-5 hover:border-violet-500/30 hover:shadow-md transition-all duration-300 flex flex-col gap-3 text-left">
      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 grid place-items-center text-indigo-600" aria-hidden="true">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
});
HighlightCard.displayName = "HighlightCard";

interface ProductHighlightsProps {
  onScrollTo: (id: string) => void;
}

const ProductHighlights = memo(({ onScrollTo }: ProductHighlightsProps) => {
  return (
    <section id="highlights" className="py-24 px-4 lg:px-8 max-w-7xl mx-auto border-t border-border/40">
      <div className="grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5 space-y-6 text-left">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight font-sans">Product Highlights</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            StudyGPT is engineered to maximize structured studying and memory consolidation. Check out the core functionalities configured to streamline how you process concepts.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onScrollTo("features")} variant="outline" className="text-xs h-9 cursor-pointer" aria-label="Scroll to Bento Features">
              Explore All Modules
            </Button>
          </div>
        </div>

        <div className="lg:col-span-7 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {highlights.map((h, idx) => (
            <HighlightCard key={idx} icon={h.icon} title={h.title} desc={h.desc} />
          ))}
        </div>
      </div>
    </section>
  );
});
ProductHighlights.displayName = "ProductHighlights";

// ── Interactive Workflow Preview Component ──
const WorkflowPreview = memo(() => {
  const [activeStep, setActiveStep] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  const stepsList = [
    { label: "Upload", desc: "PDFs & docs parsed" },
    { label: "AI Summary", desc: "Bullet takeaways" },
    { label: "Flashcards", desc: "Active recall items" },
    { label: "Quiz", desc: "Generate MCQs" },
    { label: "AI Chat", desc: "Cited reference helper" },
    { label: "Revision", desc: "Trace weak spots" },
    { label: "Interview Prep", desc: "Roleplay feedback" }
  ];

  const handleNext = () => {
    setFlashcardFlipped(false);
    setActiveStep((prev) => (prev + 1) % stepsList.length);
  };

  const handlePrev = () => {
    setFlashcardFlipped(false);
    setActiveStep((prev) => (prev - 1 + stepsList.length) % stepsList.length);
  };

  const selectStep = (idx: number) => {
    setFlashcardFlipped(false);
    setActiveStep(idx);
  };

  return (
    <section className="py-24 px-4 lg:px-8 max-w-7xl mx-auto border-t border-border/40">
      <div className="text-center mb-16 space-y-2">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Structured StudyGPT Workflow</h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">See how study files transition seamlessly from raw uploads into customized learning drills.</p>
      </div>

      <div className="space-y-8">
        {/* Workflow Timeline Track */}
        <div className="flex flex-wrap md:flex-nowrap justify-between gap-2 overflow-x-auto pb-4 max-w-5xl mx-auto scroll-none border-b border-border/30">
          {stepsList.map((step, idx) => {
            const isActive = idx === activeStep;
            return (
              <button
                key={idx}
                onClick={() => selectStep(idx)}
                className={`flex-1 min-w-[120px] text-left p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                  isActive 
                    ? "bg-violet-500/10 border-violet-500/50 shadow-sm" 
                    : "border-transparent hover:bg-muted/30"
                }`}
                aria-label={`View step ${idx + 1}: ${step.label}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {idx + 1}
                  </span>
                  <span className={`text-xs font-bold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{step.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Mockups Container */}
        <div className="grid lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          {/* Information Column */}
          <div className="lg:col-span-4 space-y-4 text-left">
            <span className="text-[10px] font-bold text-violet-600 px-2 py-0.5 rounded-full bg-violet-600/10">
              Interactive Dashboard Mockup
            </span>
            <h3 className="text-2xl font-bold tracking-tight">
              {stepsList[activeStep].label} Panel
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {activeStep === 0 && "Load textbook chapters, articles, slide presentation decks, or images. The internal parser immediately scans and extracts terms."}
              {activeStep === 1 && "Generate customizable study sheets with bullet lists, definitions, core equations, and exact index reference page citations."}
              {activeStep === 2 && "Convert summarized facts into double-sided active recall review slots. Configure self-rating responses to adjust spaced repetition."}
              {activeStep === 3 && "Generate realistic multi-choice exams from material to identify conceptual understanding before a real test."}
              {activeStep === 4 && "Highlight confusing equations or concepts in your study sheets and start an interactive chat to request clarification."}
              {activeStep === 5 && "StudyGPT analyzes quiz results to identify weak spots and automatically traces them back to exact chapters for review."}
              {activeStep === 6 && "Prepare for career interviews. AI interviewers evaluate your responses and provide actionable tips and scores."}
            </p>

            {/* Pagination Controls */}
            <div className="flex items-center gap-3 pt-4">
              <Button size="icon" variant="outline" onClick={handlePrev} className="h-9 w-9 rounded-lg cursor-pointer" aria-label="Previous Step">
                <ArrowLeft className="h-4.5 w-4.5" />
              </Button>
              <div className="flex items-center gap-1.5">
                {stepsList.map((_, i) => (
                  <span 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === activeStep ? "w-4 bg-violet-600" : "w-1.5 bg-muted-foreground/30"}`} 
                  />
                ))}
              </div>
              <Button size="icon" variant="outline" onClick={handleNext} className="h-9 w-9 rounded-lg cursor-pointer" aria-label="Next Step">
                <ArrowRight className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>

          {/* Interactive Screen Preview Column */}
          <div className="lg:col-span-8 bg-muted/20 border border-border/80 rounded-2xl p-6 min-h-[360px] relative overflow-hidden shadow-xl flex flex-col justify-between">
            <div className="absolute top-0 right-0 -z-10 w-48 h-48 rounded-full bg-violet-500/5 blur-2xl" />
            
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Dashboard // {stepsList[activeStep].label}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-600 font-semibold">Ready</span>
            </div>

            <div className="flex-1 flex flex-col justify-center text-left">
              {/* UPLOAD MOCKUP */}
              {activeStep === 0 && (
                <div className="space-y-4">
                  <div className="border border-dashed border-border/80 rounded-xl p-6 text-center bg-card/20">
                    <Upload className="h-8 w-8 text-violet-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold">Select files to upload</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Supports PDF, DOCX, TXT (up to 50MB)</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Uploaded Documents</p>
                    <div className="flex items-center justify-between bg-card/50 border border-border/50 rounded-lg p-2.5 text-xs shadow-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-violet-500" />
                        <span className="font-medium truncate max-w-[180px]">Data_Structures_Lecture_1.pdf</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">100% Parsed</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUMMARY MOCKUP */}
              {activeStep === 1 && (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center gap-2 bg-violet-500/10 text-violet-700 dark:text-violet-300 px-3 py-1.5 rounded-lg text-xs font-bold">
                    <FileSearch className="h-4 w-4" />
                    <span>AI Generated Chapter Takeaways</span>
                  </div>
                  <div className="space-y-2.5 pl-1.5 text-xs">
                    <h4 className="font-bold text-sm text-foreground/95">1. Core Framework Syntax</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      The execution model establishes a client-broker layout where queries require token bounds to maintain latency targets.
                    </p>
                    <ul className="space-y-1.5 pl-4 list-disc text-muted-foreground">
                      <li>Linear storage complexity is maintained at <code className="px-1 py-0.5 rounded bg-muted text-[10px]">O(N)</code>.</li>
                      <li>Includes inline page markers linked back to source documents.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* FLASHCARDS MOCKUP */}
              {activeStep === 2 && (
                <div className="flex flex-col items-center justify-center py-2 space-y-4">
                  <div 
                    onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                    className="w-full max-w-sm aspect-video border rounded-xl p-5 flex flex-col justify-between text-center cursor-pointer shadow-md bg-card/30 hover:border-violet-500/50 transition-all duration-300"
                  >
                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest block">
                      {flashcardFlipped ? "Back (Click to Flip)" : "Front (Click to Flip)"}
                    </span>
                    <div className="flex-1 flex items-center justify-center p-2">
                      <p className="text-sm font-semibold leading-relaxed">
                        {flashcardFlipped 
                          ? "O(log n). The dataset size is divided in half at each successive execution step."
                          : "What is the worst-case time complexity of Binary Search?"
                        }
                      </p>
                    </div>
                    {flashcardFlipped && (
                      <div className="flex justify-center gap-1.5 pt-2 border-t">
                        {["Again", "Hard", "Good", "Easy"].map((val, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-muted text-[9px] font-semibold text-muted-foreground">{val}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Click the card surface above to reveal the definition.</p>
                </div>
              )}

              {/* QUIZ MOCKUP */}
              {activeStep === 3 && (
                <div className="space-y-3">
                  <div className="bg-card/40 border border-border/80 rounded-xl p-4 space-y-3">
                    <span className="text-[9px] font-bold text-violet-500 uppercase tracking-widest">Question 1 of 5</span>
                    <p className="text-xs font-bold">Which traversal strategy visits node values in order: Left, Root, Right?</p>
                    <div className="space-y-2">
                      <div className="border border-border/60 rounded-lg p-2 text-xs bg-muted/10 text-muted-foreground">A) Pre-order traversal</div>
                      <div className="border border-emerald-500/30 rounded-lg p-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 flex items-center justify-between">
                        <span>B) In-order traversal</span>
                        <Check className="h-4 w-4" />
                      </div>
                      <div className="border border-border/60 rounded-lg p-2 text-xs bg-muted/10 text-muted-foreground">C) Post-order traversal</div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI CHAT MOCKUP */}
              {activeStep === 4 && (
                <div className="space-y-3 max-w-xl text-xs font-sans">
                  <div className="flex items-start gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold">U</div>
                    <div className="bg-muted/80 rounded-xl p-2.5 text-muted-foreground">
                      Give me a quick code sample of Binary Search.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">AI</div>
                    <div className="bg-card/80 border border-border/60 rounded-xl p-3 flex-1 space-y-2">
                      <p className="leading-relaxed">Here is a TypeScript implementation helper:</p>
                      <pre className="p-2 rounded bg-muted font-mono text-[10px] text-violet-600 dark:text-violet-400 overflow-x-auto leading-relaxed">
{`function binarySearch(arr: number[], target: number) {
  let low = 0, high = arr.length - 1;
  // divides search range in half
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* REVISION MOCKUP */}
              {activeStep === 5 && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-card/50 border border-border/60 rounded-xl p-3 space-y-1.5">
                      <span className="text-[9px] text-muted-foreground font-semibold uppercase">Weak Subject Focus</span>
                      <p className="font-bold text-xs text-rose-500 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Graph Traversal
                      </p>
                      <p className="text-[9px] text-muted-foreground">Recent accuracy level: 42%</p>
                    </div>
                    <div className="bg-card/50 border border-border/60 rounded-xl p-3 space-y-1.5">
                      <span className="text-[9px] text-muted-foreground font-semibold uppercase">Overall Subject Mastery</span>
                      <p className="font-bold text-xs text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Data Structures
                      </p>
                      <p className="text-[9px] text-muted-foreground">Completed chapters: 6 / 8</p>
                    </div>
                  </div>
                  <div className="bg-muted/40 border border-border/50 rounded-xl p-2.5 text-xs text-muted-foreground flex justify-between items-center">
                    <span className="font-medium text-[10px]">Study Suggestion: Generate a 5-question Quiz on Graph algorithms</span>
                    <Button size="sm" className="h-6 text-[9px] px-2.5 bg-violet-600 hover:bg-violet-500 text-white cursor-pointer">Start Quiz</Button>
                  </div>
                </div>
              )}

              {/* INTERVIEW PREP MOCKUP */}
              {activeStep === 6 && (
                <div className="space-y-3 text-xs font-sans">
                  <div className="bg-card/40 border border-border/80 rounded-xl p-3.5 space-y-2">
                    <span className="text-[9px] font-bold text-violet-500 uppercase tracking-widest">Panel Prompt</span>
                    <p className="font-semibold text-xs leading-relaxed">&ldquo;Explain how arrays differ from linked lists in terms of memory layout.&rdquo;</p>
                  </div>
                  <div className="bg-muted/60 border border-border/80 rounded-lg p-2 text-muted-foreground italic text-[10px]">
                    &ldquo;Arrays store elements in contiguous blocks of memory, allowing O(1) random access, whereas Linked Lists use pointers in non-contiguous blocks...&rdquo;
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-1 text-emerald-700 dark:text-emerald-300">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[10px] uppercase">AI Critique Rating: 88/100</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 font-bold">Good Answer</span>
                    </div>
                    <p className="text-[10px] leading-relaxed">Solid description of contiguity. Include spatial locality caching advantages for a complete answer.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex justify-between items-center text-[9px] text-muted-foreground font-mono">
              <span>Step {activeStep + 1} of 7</span>
              <span>StudyGPT local workspace simulator</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
WorkflowPreview.displayName = "WorkflowPreview";

// ── Why Students Choose StudyGPT Section ──
interface WhyChooseCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

const WhyChooseCard = memo(({ icon: Icon, title, desc }: WhyChooseCardProps) => {
  return (
    <Card className="p-6 h-full glass hover:bg-card border border-border/40 hover:border-primary/40 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4">
      <div className="h-10 w-10 rounded-xl bg-indigo-600/10 grid place-items-center text-indigo-600">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="space-y-1.5 text-left">
        <h3 className="font-bold text-lg tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </Card>
  );
});
WhyChooseCard.displayName = "WhyChooseCard";

const WhyChooseSection = memo(() => {
  return (
    <section className="py-24 px-4 lg:px-8 max-w-7xl mx-auto border-t border-border/40">
      <div className="text-center mb-16 space-y-2">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-sans">Why Students Choose StudyGPT</h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">Real utilities designed to enhance focus, retrieval, and long-term retention.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {whyChooseCards.map((c, idx) => (
          <div key={idx}>
            <WhyChooseCard icon={c.icon} title={c.title} desc={c.desc} />
          </div>
        ))}
      </div>
    </section>
  );
});
WhyChooseSection.displayName = "WhyChooseSection";

// ── How It Works Section ──
interface TimelineStepProps {
  step: string;
  title: string;
  desc: string;
  isLast: boolean;
}

const TimelineStep = memo(({ step, title, desc, isLast }: TimelineStepProps) => {
  return (
    <div className="flex gap-6 relative">
      {/* Timeline Indicator Column */}
      <div className="flex flex-col items-center">
        <div className="h-10 w-10 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center border-4 border-background shadow-md">
          {step}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-violet-600 to-indigo-600/30 my-2" />
        )}
      </div>

      {/* Content Column */}
      <div className="pb-8 space-y-1 text-left">
        <h4 className="font-bold text-lg text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{desc}</p>
      </div>
    </div>
  );
});
TimelineStep.displayName = "TimelineStep";

const HowItWorksSection = memo(() => {
  return (
    <section id="how-it-works" className="py-24 px-4 lg:px-8 max-w-3xl mx-auto border-t border-border/40">
      <div className="text-center mb-16 space-y-2">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-sans">Simple Process Flow</h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base font-medium">From chaos to mastery in seven quick steps. No onboarding hoops.</p>
      </div>

      <div className="pl-4 sm:pl-10">
        {timelineSteps.map((step, idx) => (
          <TimelineStep 
            key={idx} 
            step={step.step} 
            title={step.title} 
            desc={step.desc} 
            isLast={idx === timelineSteps.length - 1} 
          />
        ))}
      </div>
    </section>
  );
});
HowItWorksSection.displayName = "HowItWorksSection";

// ── AI Features Showcase Component ──
const FeaturesShowcase = memo(() => {
  const [activeTab, setActiveTab] = useState("summaries");
  const tabData = showcaseTabs.find((t) => t.id === activeTab) || showcaseTabs[0];

  return (
    <section className="py-24 px-4 lg:px-8 max-w-5xl mx-auto border-t border-border/40">
      <div className="text-center mb-14 space-y-2">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-sans">AI Features Showcase</h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">Toggle through core study modes configured to streamline memory recall.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {showcaseTabs.map((t) => (
          <Button
            key={t.id}
            variant={activeTab === t.id ? "default" : "outline"}
            onClick={() => setActiveTab(t.id)}
            className={`h-9 px-4 rounded-full text-xs font-semibold cursor-pointer ${
              activeTab === t.id ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0" : ""
            }`}
            aria-label={`View ${t.label} module details`}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="glass-premium rounded-2xl p-6 lg:p-8 border border-border/80 shadow-xl min-h-[220px] flex flex-col justify-between text-left bg-card/25">
        <div>
          <span className="text-[10px] font-bold text-violet-600 px-2.5 py-0.5 rounded-full bg-violet-600/10">
            Highlighted Feature
          </span>
          <h3 className="text-xl font-bold mt-4 mb-2">
            {tabData.title || tabData.label}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
            {tabData.desc}
          </p>
        </div>
        <div className="mt-8 pt-4 border-t flex justify-between items-center text-xs">
          <span className="text-primary font-bold">Safe, local configuration sandbox</span>
          <ArrowRight className="h-4 w-4 text-violet-500" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
});
FeaturesShowcase.displayName = "FeaturesShowcase";

// ── Product Benefits Section ──
interface BenefitCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

const BenefitCard = memo(({ icon: Icon, title, desc }: BenefitCardProps) => {
  return (
    <div className="bg-muted/10 border border-border/50 rounded-xl p-5 hover:border-indigo-500/20 hover:shadow-sm transition-all duration-300 flex items-start gap-4 text-left">
      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0" aria-hidden="true">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="space-y-1">
        <h4 className="font-bold text-sm text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
});
BenefitCard.displayName = "BenefitCard";

const ProductBenefitsSection = memo(() => {
  return (
    <section className="py-24 px-4 lg:px-8 max-w-7xl mx-auto border-t border-border/40">
      <div className="text-center mb-16 space-y-2">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-sans">Product Benefits</h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">Real strengths developed directly for target student requirements.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {benefits.map((b, idx) => (
          <BenefitCard key={idx} icon={b.icon} title={b.title} desc={b.desc} />
        ))}
      </div>
    </section>
  );
});
ProductBenefitsSection.displayName = "ProductBenefitsSection";

// ── CTA Section Component ──
const CtaSection = memo(() => {
  return (
    <section className="py-20 px-4 lg:px-8 max-w-5xl mx-auto text-center">
      <div className="bg-gradient-to-r from-violet-600/90 to-indigo-600/90 rounded-3xl p-8 lg:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 mix-blend-multiply opacity-50 -z-10 animate-aurora" />
        <div className="absolute top-[-50%] left-[-20%] w-[350px] h-[350px] rounded-full bg-white/10 blur-[80px] -z-10" />
        
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Ready to Study Smarter?</h2>
        <p className="text-white/80 text-sm max-w-xl mx-auto leading-relaxed mb-8">
          Unlock your custom AI personal tutor. Free account. No subscription forced. Fast verification.
        </p>

        <div className="flex flex-col items-center gap-3">
          <Button asChild size="lg" className="bg-white hover:bg-white/90 text-violet-700 font-bold px-8 py-5 rounded-xl shadow-xl transition-all duration-300 cursor-pointer" aria-label="Start studying free account">
            <Link to="/signup">Get Started Free</Link>
          </Button>
          <p className="text-xs text-white/70">
            Already have an account?{" "}
            <Link to="/login" className="font-bold underline hover:text-white transition-colors">
              Login
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
});
CtaSection.displayName = "CtaSection";

// ── Footer Component ──
interface FooterProps {
  onScrollTo: (id: string) => void;
}

const Footer = memo(({ onScrollTo }: FooterProps) => {
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <footer id="contact" className="border-t border-border/60 py-16 bg-muted/20 relative">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 text-left">
        {/* Brand Column */}
        <div className="sm:col-span-2 space-y-4">
          <Link to="/" className="flex items-center gap-2 group" aria-label="StudyGPT Home link">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 grid place-items-center text-white">
              <GraduationCap className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">StudyGPT</span>
          </Link>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            Personalized active recall and visual learning ecosystem powered by AI. Designed strictly for modern student workflows.
          </p>
        </div>

        {/* Links: Product */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button onClick={() => onScrollTo("features")} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer text-left border-0 bg-transparent p-0">
                Features
              </button>
            </li>
            <li>
              <button onClick={() => onScrollTo("highlights")} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer text-left border-0 bg-transparent p-0">
                AI Tools
              </button>
            </li>
            <li>
              <button onClick={() => onScrollTo("how-it-works")} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer text-left border-0 bg-transparent p-0">
                How It Works
              </button>
            </li>
          </ul>
        </div>

        {/* Links: Resources */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resources & Legal</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
            </li>
            <li>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</a>
            </li>
            <li>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">GitHub</a>
            </li>
            <li>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">LinkedIn</a>
            </li>
          </ul>
        </div>

        {/* Newsletter Placeholder */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Join Newsletter</h4>
          <form onSubmit={handleNewsletterSubmit} className="space-y-2">
            <input 
              type="email" 
              placeholder="name@email.com" 
              className="w-full px-3 py-1.5 text-xs rounded border bg-background border-border/80 focus:border-violet-500/50 outline-none"
              aria-label="Email address for newsletter"
            />
            <Button type="submit" size="sm" className="w-full text-xs bg-violet-600 text-white hover:bg-violet-500 h-8 cursor-pointer">
              Subscribe
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-12 pt-6 border-t border-border/40 text-[10px] text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>© 2026 StudyGPT. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = "Footer";
