import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, MessageSquare, Mic, FileSearch, BrainCircuit, Layers,
  Target, CalendarRange, GraduationCap, Network, Languages, Activity,
  Upload, Brain, MessagesSquare, ArrowRight, Menu, X, Check, Star,
  Play, BookOpen, Clock, Flame, Award, Shield, Zap
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

// Reusable data arrays mapped locally to minimize JSX duplication
const features = [
  { icon: MessageSquare, title: "AI Chat", desc: "Ask anything about your notes — get instant, cited answers.", to: "/app/chat" },
  { icon: Mic, title: "Voice Assistant", desc: "Hands-free learning. Speak, listen, understand.", to: "/app/voice" },
  { icon: FileSearch, title: "OCR Summaries", desc: "Turn 50-page PDFs into 5-minute reads instantly.", to: "/app/summaries" },
  { icon: BrainCircuit, title: "Quiz Generator", desc: "Custom MCQs from your own material in seconds.", to: "/app/quizzes" },
  { icon: Layers, title: "Flashcards", desc: "AI-built spaced repetition decks that stick.", to: "/app/flashcards" },
  { icon: Sparkles, title: "Exam Predictor", desc: "Likely questions ranked by historical probability.", to: "/app/predictor" },
  { icon: CalendarRange, title: "Study Planner", desc: "Personalized weekly plans that adapt to you.", to: "/app/planner" },
  { icon: GraduationCap, title: "Tutor Mode", desc: "Beginner to interview — explained at your level.", to: "/app/tutor" },
  { icon: Network, title: "Concept Maps", desc: "See how every idea connects, visually.", to: "/app/concept-maps" },
  { icon: Target, title: "Weak Topics", desc: "Find the gaps before exams do.", to: "/app/weak-topics" },
  { icon: Languages, title: "Multi-language", desc: "Learn in English, Hindi, Gujarati and more.", to: "/app/languages" },
  { icon: Activity, title: "Mood & Productivity", desc: "AI adapts to how you feel today.", to: "/app/mood" },
];

const steps = [
  { icon: Upload, title: "Upload Notes", desc: "PDFs, slides, images, handwritten — drop them in." },
  { icon: Brain, title: "AI Reads Notes", desc: "Your content becomes a private knowledge base." },
  { icon: FileSearch, title: "Summary", desc: "Get high-level takeaways instantly." },
  { icon: BrainCircuit, title: "Quiz", desc: "Test yourself on key concepts." },
  { icon: Layers, title: "Practice", desc: "Reinforce with AI flashcards & repetition." },
  { icon: Activity, title: "Track Progress", desc: "Review dashboard analytics & stats." },
  { icon: GraduationCap, title: "Ace Exams", desc: "Walk in prepared and ace every paper." }
];

const showcaseFeatures = [
  { id: "chat", title: "AI Chat", desc: "Simulate a live tutorial with your notes. Ask follow-up questions, request real-world examples, or clarify complex equations in plain English.", highlight: "Instant citation from uploaded PDFs" },
  { id: "quizzes", title: "Quiz Generator", desc: "Generate customizable multiple-choice, true/false, or short answer questions automatically parsed directly from your textbooks or slides.", highlight: "Adaptive difficulty levels" },
  { id: "flashcards", title: "Flashcards", desc: "Turn core concepts into digital revision decks leveraging spaced repetition models for maximized long-term retention.", highlight: "Active recall tracking" },
  { id: "voice", title: "Voice Assistant", desc: "Engage in vocal debate, dictate audio summaries, or listen to audio lessons on-the-go with real-time feedback.", highlight: "Natural conversational flow" }
];

const testimonials = [
  { name: "Sophia Martinez", role: "Stanford University", quote: "StudyGPT saved me hours of summarizing lectures. The flashcards mode is incredible!", avatar: "S" },
  { name: "Alex Chen", role: "MIT", quote: "The mock interview module prepared me perfectly for my tech internship. Highly recommended.", avatar: "A" },
  { name: "Jessica Taylor", role: "Georgetown Law", quote: "Being able to upload thick case studies and get immediate summaries is a total game changer.", avatar: "J" },
  { name: "Rohan Patel", role: "Georgia Tech", quote: "Concept maps let me visualize complex systems. It's like having a personal tutor on call 24/7.", avatar: "R" }
];

const stats = [
  { label: "AI Tools", value: "20+" },
  { label: "Questions Generated", value: "100K+" },
  { label: "Flashcards Reviewed", value: "50K+" },
  { label: "Active Learners", value: "10K+" },
  { label: "Satisfaction Rate", value: "99%" }
];

const comparisons = [
  { feature: "AI Study Assistant", studygpt: true, traditional: false },
  { feature: "Instant MCQ & Quiz Generator", studygpt: true, traditional: false },
  { feature: "Vocal Active Recall Practice", studygpt: true, traditional: false },
  { feature: "Visual Spaced Repetition", studygpt: true, traditional: false },
  { feature: "Simulated Interview Feedback", studygpt: true, traditional: false },
  { feature: "Interactive Connected Map Builder", studygpt: true, traditional: false },
  { feature: "Performance-Based Topic Mapping", studygpt: true, traditional: false }
];

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "AI Tools", href: "#tools" },
    { label: "Pricing (Soon)", href: "#" }
  ],
  resources: [
    { label: "Contact", href: "#contact" },
    { label: "GitHub", href: "https://github.com" },
    { label: "LinkedIn", href: "https://linkedin.com" }
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" }
  ]
};

// Main Entry Component
function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden landing-noise">
      <BackgroundEffects />
      <Nav />
      <Hero />
      <LiveDemo />
      <BentoGrid />
      <DashboardPreview />
      <HowItWorksSection />
      <ShowcaseSection />
      <TestimonialsAndStats />
      <ComparisonSection />
      <CtaSection />
      <Footer />
    </div>
  );
}

// Background Visual FX Component
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
    <div className="absolute inset-0 pointer-events-none -z-20 overflow-hidden">
      <div 
        className="absolute w-[800px] h-[800px] rounded-full opacity-[0.08] blur-[140px] bg-gradient-to-tr from-violet-500 via-indigo-500 to-blue-500 transition-transform duration-500 ease-out animate-aurora"
        style={{
          transform: `translate(${coords.x - 400}px, ${coords.y - 400}px)`,
        }}
      />
      <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[130px] animate-blob-1" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[150px] animate-blob-2" />
      <div className="absolute inset-0 landing-grid-bg opacity-[0.4] dark:opacity-[0.15]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
    </div>
  );
});
BackgroundEffects.displayName = "BackgroundEffects";

// Sticky Navbar Component
const Nav = memo(() => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
          {[
            { label: "Features", href: "#features" },
            { label: "AI Tools", href: "#tools" },
            { label: "How it Works", href: "#how-it-works" },
            { label: "Contact", href: "#contact" }
          ].map((l) => (
            <a 
              key={l.label} 
              href={l.href} 
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors relative py-2 group"
            >
              {l.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex text-sm font-medium" aria-label="Login to account">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-violet-600/10 border-0 transition-all duration-300" aria-label="Get Started Free">
            <Link to="/signup">Get Started</Link>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
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
            {[
              { label: "Features", href: "#features" },
              { label: "AI Tools", href: "#tools" },
              { label: "How it Works", href: "#how-it-works" },
              { label: "Contact", href: "#contact" }
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block text-base font-semibold text-muted-foreground hover:text-primary transition-colors py-1"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-4 flex gap-3 border-t">
              <Button variant="ghost" asChild className="flex-1" aria-label="Login">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0" aria-label="Get Started">
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
});
Nav.displayName = "Nav";

// Hero Section Component
const Hero = memo(() => {
  return (
    <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 px-4 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      <div className="grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-8 text-left">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full px-4 py-1.5 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Next-Gen Learning Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            Your Personal
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500 animate-aurora">
              AI Learning
            </span>
            <br />
            Companion
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Upload notes, ask questions, generate quizzes, flashcards, summaries, concept maps, interview prep, and master any subject in minutes.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button size="lg" asChild className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-500/20 font-medium px-8 transition-all duration-300" aria-label="Start studying for free">
              <Link to="/signup" className="flex items-center gap-2">
                Get Started Free <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="border-border hover:bg-accent/40" aria-label="Watch demo video">
              <a href="#demo" className="flex items-center gap-2">
                <Play className="h-4 w-4 text-violet-500" aria-hidden="true" /> Watch Demo
              </a>
            </Button>
          </div>

          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border/60">
            {[
              { icon: Shield, text: "AI-Powered" },
              { icon: Zap, text: "Instant Result" },
              { icon: BookOpen, text: "Smart Revision" },
              { icon: Award, text: "For Top Grades" }
            ].map((badge, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <badge.icon className="h-4 w-4 text-violet-500" aria-hidden="true" />
                <span>{badge.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 relative w-full flex justify-center lg:justify-end">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 rounded-3xl blur-3xl -z-10" />
            
            <div className="space-y-4">
              <div className="glass-premium rounded-2xl p-5 shadow-xl border border-border/80 relative hover:translate-y-[-4px] transition-transform duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 grid place-items-center text-violet-600">
                    <MessageSquare className="h-4.5 w-4.5" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">AI Chat Companion</h4>
                    <p className="text-[10px] text-muted-foreground">Ask anything about your notes</p>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-2.5 text-xs text-muted-foreground italic">
                  &ldquo;Summarize chapter 4 and list the main formula variables.&rdquo;
                </div>
              </div>

              <div className="glass-premium rounded-2xl p-5 shadow-xl border border-border/80 relative hover:translate-y-[-4px] transition-transform duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 grid place-items-center text-indigo-600">
                      <BrainCircuit className="h-4.5 w-4.5" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">AI Quiz Generator</h4>
                      <p className="text-[10px] text-muted-foreground">Mock exam generator</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">98% Match</span>
                </div>
                <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t">
                  <span className="text-muted-foreground">15 questions generated</span>
                  <Button size="sm" className="h-7 text-[10px] px-3 bg-violet-600 text-white hover:bg-violet-500" aria-label="Start interactive quiz">Start Practice</Button>
                </div>
              </div>

              <div className="glass-premium rounded-2xl p-5 shadow-xl border border-border/80 relative hover:translate-y-[-4px] transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-pink-500/10 grid place-items-center text-pink-600">
                      <Layers className="h-4.5 w-4.5" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Flashcard Hub</h4>
                      <p className="text-[10px] text-muted-foreground">Spaced repetition revision</p>
                    </div>
                  </div>
                  <Flame className="h-5 w-5 text-amber-500" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
Hero.displayName = "Hero";

// Live AI Typing Demo Component
const LiveDemo = memo(() => {
  const [phase, setPhase] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const typingTimer = useRef<number | null>(null);

  const mockResponse = "Binary Search works on sorted arrays. It divides the array in half repeatedly. If the target value is less than the middle element, it searches the lower half; if greater, the upper half. Time complexity is O(log n).";

  useEffect(() => {
    if (phase === 1) {
      let index = 0;
      setDisplayText("");
      const startTyping = () => {
        typingTimer.current = window.setInterval(() => {
          if (index < mockResponse.length) {
            setDisplayText((prev) => prev + mockResponse.charAt(index));
            index++;
          } else {
            if (typingTimer.current) clearInterval(typingTimer.current);
            setPhase(2);
          }
        }, 15);
      };
      const delay = setTimeout(startTyping, 1000);
      return () => {
        clearTimeout(delay);
        if (typingTimer.current) clearInterval(typingTimer.current);
      };
    }
  }, [phase]);

  return (
    <section id="demo" className="py-20 px-4 lg:px-8 max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Experience Live AI Study</h2>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">Watch StudyGPT dissect complex concepts instantly without hitting any external APIs.</p>
      </div>

      <div className="glass-premium rounded-2xl border border-border/80 overflow-hidden shadow-2xl">
        <div className="h-10 px-4 bg-muted/40 border-b flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">study-ai-demo.sh</span>
          <div className="w-8" />
        </div>

        <div className="p-6 space-y-4 text-left font-sans text-sm">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs">U</div>
            <div className="bg-muted rounded-2xl p-4 max-w-lg">
              Explain Binary Search in simple terms.
            </div>
          </div>

          {phase === 0 && (
            <div className="flex justify-center py-4">
              <Button onClick={() => setPhase(1)} className="bg-primary text-white hover:opacity-90" aria-label="Trigger interactive simulation">
                Simulate AI Tutor Response
              </Button>
            </div>
          )}

          {phase >= 1 && (
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">AI</div>
              <div className="glass-premium border rounded-2xl p-4 max-w-xl relative">
                <p className="leading-relaxed">
                  {displayText}
                  {phase === 1 && <span className="inline-block w-1.5 h-4 bg-violet-500 ml-0.5 animate-pulse" />}
                </p>
              </div>
            </div>
          )}

          {phase === 2 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 pt-4 pl-11"
            >
              {["Generate Quiz", "Create Flashcards", "Summarize Notes", "Start Mock Interview"].map((t) => (
                <Button key={t} size="sm" variant="outline" className="text-xs border-violet-500/20 hover:border-violet-500 text-primary bg-background/50 hover:bg-violet-500/5" aria-label={`Simulate action ${t}`}>
                  {t}
                </Button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
});
LiveDemo.displayName = "LiveDemo";

// Bento Grid Section
const BentoGrid = memo(() => {
  return (
    <section id="features" className="py-24 px-4 lg:px-8 max-w-7xl mx-auto border-t border-border/40">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Your All-In-One Study Companion</h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Mastering your syllabus has never been easier. Twelve customizable educational modules at your fingertips.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {features.map((f, idx) => (
          <Link key={f.title} to={f.to} className="block group">
            <Card className="p-6 h-full glass hover:bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-violet-500/5 hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600/10 to-indigo-600/10 group-hover:from-violet-600 group-hover:to-indigo-600 grid place-items-center text-violet-600 group-hover:text-white transition-all duration-300 mb-4">
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-lg mb-1.5 tracking-tight group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
              <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-4 flex items-center gap-1">
                Open App <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
});
BentoGrid.displayName = "BentoGrid";

// Visual Dashboard Mockup
const DashboardPreview = memo(() => {
  return (
    <section id="tools" className="py-24 px-4 lg:px-8 max-w-7xl mx-auto border-t border-border/40">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Track Your Learning Progress</h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Get deep metrics about your active sessions, note reviews, and topic retention graphs.</p>
      </div>

      <div className="glass-premium rounded-3xl p-6 lg:p-10 border border-border/80 shadow-2xl relative">
        <div className="absolute top-0 right-0 -z-10 w-72 h-72 rounded-full bg-violet-600/5 blur-3xl" />
        
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-2xl font-bold tracking-tight">Real-Time Insights</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              StudyGPT continuously analyzes your learning metrics internally. You don't need configuration files or complex dashboards — everything syncs locally with your browser session.
            </p>

            <div className="space-y-4">
              {[
                { label: "Study Streak", val: "14 Days", icon: Flame, color: "text-amber-500" },
                { label: "AI Study Sessions", val: "219 Completed", icon: Award, color: "text-violet-500" },
                { label: "Syllabus Mastery", val: "88%", icon: BookOpen, color: "text-indigo-500" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-muted/30 rounded-xl p-3">
                  <div className="h-8 w-8 rounded-lg bg-background grid place-items-center">
                    <item.icon className={`h-4.5 w-4.5 ${item.color}`} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-bold">{item.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 bg-muted/30 border border-border/60 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-sm font-bold">Weekly Performance Review</h4>
                <p className="text-[10px] text-muted-foreground">Active retrieval metrics</p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-violet-600/10 text-violet-600 dark:text-violet-400 font-semibold">Live Simulation</span>
            </div>

            <div className="h-48 flex items-end justify-between gap-2.5 pt-4 border-b border-border/60">
              {[
                { day: "Mon", val: 40, active: false },
                { day: "Tue", val: 55, active: false },
                { day: "Wed", val: 85, active: true },
                { day: "Thu", val: 60, active: false },
                { day: "Fri", val: 75, active: false },
                { day: "Sat", val: 95, active: true },
                { day: "Sun", val: 50, active: false }
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative rounded-t-md overflow-hidden bg-muted/60 transition-all duration-300 group-hover:scale-x-105" style={{ height: `${bar.val}%` }}>
                    <div className={`absolute inset-0 transition-colors duration-300 ${bar.active ? "bg-gradient-to-t from-violet-600 to-indigo-600" : "bg-muted-foreground/30"}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold">{bar.day}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gradient-to-t from-violet-600 to-indigo-600" /> Active study hours
              </div>
              <span>Updated 5m ago</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
DashboardPreview.displayName = "DashboardPreview";

// How It Works Steps Component
const HowItWorksSection = memo(() => {
  return (
    <section id="how-it-works" className="py-24 px-4 lg:px-8 max-w-7xl mx-auto border-t border-border/40">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Simple Process Flow</h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">From chaos to mastery in four quick steps. No onboarding hoops.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 relative">
        <div className="hidden md:block absolute top-12 left-1/8 right-1/8 h-0.5 bg-gradient-to-r from-violet-600/10 via-indigo-600/30 to-blue-600/10 -z-10" />

        {steps.slice(0, 4).map((s, idx) => (
          <div key={idx} className="relative group">
            <Card className="p-6 h-full glass border border-border/60 hover:border-primary/20 transition-all duration-300 relative">
              <div className="h-12 w-12 rounded-xl bg-violet-600/5 group-hover:bg-violet-600 text-violet-600 group-hover:text-white grid place-items-center transition-all duration-300 mb-6">
                <s.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="text-[10px] font-bold text-violet-600 block mb-2">STEP {idx + 1}</span>
              <h3 className="font-bold text-base mb-1">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
});
HowItWorksSection.displayName = "HowItWorksSection";

// Interactive Features Carousel / Spotlight
const ShowcaseSection = memo(() => {
  const [activeTab, setActiveTab] = useState("chat");
  const activeFeature = showcaseFeatures.find((f) => f.id === activeTab) || showcaseFeatures[0];

  return (
    <section className="py-24 px-4 lg:px-8 max-w-5xl mx-auto border-t border-border/40">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Core Module Showcase</h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Click through our four core components to see detailed features and capabilities.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {showcaseFeatures.map((f) => (
          <Button
            key={f.id}
            variant={activeTab === f.id ? "default" : "outline"}
            onClick={() => setActiveTab(f.id)}
            className={`h-9 px-4 rounded-full text-xs font-semibold ${activeTab === f.id ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0" : ""}`}
            aria-label={`Select showcase module ${f.title}`}
          >
            {f.title}
          </Button>
        ))}
      </div>

      <div className="glass-premium rounded-2xl p-6 lg:p-8 border border-border/80 shadow-xl min-h-[220px] flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-bold text-violet-600 px-2 py-0.5 rounded-full bg-violet-600/10">Highlighted Feature</span>
          <h3 className="text-xl font-bold mt-3 mb-2">{activeFeature.title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{activeFeature.desc}</p>
        </div>
        <div className="mt-6 pt-4 border-t flex justify-between items-center text-xs">
          <span className="text-primary font-bold">{activeFeature.highlight}</span>
          <ArrowRight className="h-4 w-4 text-violet-500" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
});
ShowcaseSection.displayName = "ShowcaseSection";

// Testimonials & Stats Carousel Component
const TestimonialsAndStats = memo(() => {
  return (
    <section className="py-24 px-4 lg:px-8 max-w-7xl mx-auto border-t border-border/40">
      <div className="grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Trusted by Students Everywhere</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            See how top-performing students utilize StudyGPT internally to organize case documents, structure memory queues, and prep for complex exams.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((s, idx) => (
              <div key={idx} className="bg-muted/30 border border-border/60 rounded-xl p-4">
                <p className="text-3xl font-extrabold tracking-tight text-violet-600 dark:text-violet-400">{s.value}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
          {testimonials.map((t, idx) => (
            <Card key={idx} className="p-6 glass hover:bg-card border border-border/60 flex flex-col justify-between h-full">
              <div>
                <div className="flex gap-0.5 text-amber-500 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4.5 w-4.5 fill-current" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t">
                <div className="h-9 w-9 rounded-full bg-violet-600/10 text-violet-600 flex items-center justify-center font-bold text-sm">
                  {t.avatar}
                </div>
                <div>
                  <h4 className="text-xs font-bold">{t.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
});
TestimonialsAndStats.displayName = "TestimonialsAndStats";

// Comparison Grid Section
const ComparisonSection = memo(() => {
  return (
    <section className="py-24 px-4 lg:px-8 max-w-3xl mx-auto border-t border-border/40">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">StudyGPT vs Traditional Study</h2>
        <p className="text-muted-foreground mt-3">Why thousands of students are shifting away from static summary decks.</p>
      </div>

      <div className="glass-premium rounded-2xl border border-border/80 overflow-hidden shadow-xl">
        <div className="grid grid-cols-12 bg-muted/40 p-4 border-b text-xs font-bold tracking-wider uppercase text-muted-foreground">
          <div className="col-span-6 text-left">Educational Aspect</div>
          <div className="col-span-3 text-center text-primary">StudyGPT</div>
          <div className="col-span-3 text-center">Traditional</div>
        </div>

        <div className="divide-y divide-border/60">
          {comparisons.map((row, idx) => (
            <div key={idx} className="grid grid-cols-12 p-4 text-xs sm:text-sm items-center hover:bg-muted/20 transition-colors">
              <div className="col-span-6 font-medium text-left">{row.feature}</div>
              <div className="col-span-3 flex justify-center">
                <Check className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              </div>
              <div className="col-span-3 flex justify-center">
                <X className="h-4.5 w-4.5 text-muted-foreground/30" aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
ComparisonSection.displayName = "ComparisonSection";

// CTA Section
const CtaSection = memo(() => {
  return (
    <section className="py-20 px-4 lg:px-8 max-w-5xl mx-auto text-center">
      <div className="bg-gradient-to-r from-violet-600/90 to-indigo-600/90 rounded-3xl p-8 lg:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 mix-blend-multiply opacity-50 -z-10" />
        <div className="absolute top-[-50%] left-[-20%] w-[350px] h-[350px] rounded-full bg-white/10 blur-[80px] -z-10" />
        
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Ready to Transform Your Learning?</h2>
        <p className="text-white/80 text-sm max-w-xl mx-auto leading-relaxed mb-8">
          Unlock your custom AI personal tutor. Free account. No subscription forced. Fast verification.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-white hover:bg-white/90 text-violet-700 font-bold px-8 shadow-xl" aria-label="Start your free account">
            <Link to="/signup">Start Studying Free</Link>
          </Button>
          <Button variant="ghost" size="lg" className="text-white hover:bg-white/10" aria-label="Explore tools list page">
            <a href="#tools">Explore Modules</a>
          </Button>
        </div>
      </div>
    </section>
  );
});
CtaSection.displayName = "CtaSection";

// Footer Component
const Footer = memo(() => {
  return (
    <footer id="contact" className="border-t border-border/60 py-16 bg-muted/20 relative">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
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

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Product</h4>
          <ul className="space-y-2 text-xs">
            {footerLinks.product.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="text-muted-foreground hover:text-primary transition-colors">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Resources</h4>
          <ul className="space-y-2 text-xs">
            {footerLinks.resources.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="text-muted-foreground hover:text-primary transition-colors">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-12 pt-6 border-t border-border/40 text-[10px] text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>© 2026 StudyGPT. All rights reserved.</span>
        <div className="flex gap-4">
          {footerLinks.legal.map((l) => (
            <a key={l.label} href={l.href} className="hover:text-primary transition-colors">{l.label}</a>
          ))}
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = "Footer";
