import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, MessageSquare, Mic, FileSearch, BrainCircuit, Layers,
  Target, CalendarRange, GraduationCap, Network, Languages, Activity,
  Upload, Brain, MessagesSquare, Rocket, Check, Star, ArrowRight, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { ThemeToggle } from "@/components/theme-toggle";
import { testimonials, pricingPlans, faqs } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

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

const features = [
  { icon: MessageSquare, title: "AI Chat", desc: "Ask anything about your notes — get instant, cited answers.", to: "/app/chat" },
  { icon: Mic, title: "Voice Assistant", desc: "Hands-free learning. Speak, listen, understand.", to: "/app/voice" },
  { icon: FileSearch, title: "Notes Summarization", desc: "Turn 50-page PDFs into 5-minute reads.", to: "/app/summaries" },
  { icon: BrainCircuit, title: "Quiz Generator", desc: "Custom MCQs from your own material in seconds.", to: "/app/quizzes" },
  { icon: Layers, title: "Flashcards", desc: "AI-built spaced repetition decks that stick.", to: "/app/flashcards" },
  { icon: Sparkles, title: "Exam Predictor", desc: "Likely questions ranked by historical probability.", to: "/app/predictor" },
  { icon: CalendarRange, title: "Study Planner", desc: "Personalized weekly plans that adapt to you.", to: "/app/planner" },
  { icon: GraduationCap, title: "Tutor Mode", desc: "Beginner to interview — explained at your level.", to: "/app/tutor" },
  { icon: Network, title: "Concept Maps", desc: "See how every idea connects, visually.", to: "/app/concept-maps" },
  { icon: Target, title: "Weak Topic Detection", desc: "Find the gaps before exams do.", to: "/app/weak-topics" },
  { icon: Languages, title: "Multi-language", desc: "Learn in English, Hindi, Gujarati and more.", to: "/app/languages" },
  { icon: Activity, title: "Mood & Productivity", desc: "AI adapts to how you feel today.", to: "/app/mood" },
];

const steps = [
  { icon: Upload, title: "Upload your notes", desc: "PDFs, slides, images, handwritten — drop them in." },
  { icon: Brain, title: "AI reads & understands", desc: "Your content becomes a private knowledge base." },
  { icon: MessagesSquare, title: "Ask questions naturally", desc: "Get answers with sources from your material." },
  { icon: Rocket, title: "Learn 3x faster", desc: "Quiz, revise, predict, and ace your exams." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <FAQ />
      <Footer />
    </div>
  );
}

function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [
    { label: "Features", href: "#features" },
    { label: "AI Tools", href: "#tools" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Contact", href: "#contact" },
  ];
  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="max-w-7xl mx-auto h-16 flex items-center gap-6 px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary-bg grid place-items-center text-white">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg">StudyGPT</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 ml-4">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild className="gradient-primary-bg text-white border-0 hover:opacity-90">
            <Link to="/signup">Get Started</Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen((o) => !o)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur px-4 py-3 space-y-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-2 flex gap-2">
            <Button variant="ghost" size="sm" asChild className="flex-1">
              <Link to="/login">Login</Link>
            </Button>
            <Button size="sm" asChild className="flex-1 gradient-primary-bg text-white border-0 hover:opacity-90">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 -left-20 w-96 h-96 rounded-full gradient-primary-bg opacity-20 blur-3xl" />
        <div className="absolute top-40 right-0 w-96 h-96 rounded-full bg-fuchsia-500 opacity-20 blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-20 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Now with Voice Assistant & Mock Interviews
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Your Personal{" "}
            <span className="gradient-text">AI Learning</span>
            <br />Companion
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload notes, ask questions, generate quizzes, flashcards, and study plans.
            Prepare smarter — not harder — with AI built for students.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild className="gradient-primary-bg text-white border-0 hover:opacity-90 shadow-glow">
              <Link to="/signup">Get Started <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#how-it-works">Watch Demo</a>
            </Button>
          </div>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-16 relative"
        >
          <div className="absolute inset-0 gradient-primary-bg blur-3xl opacity-20 -z-10" />
          <div className="glass rounded-2xl p-2 shadow-glow max-w-5xl mx-auto">
            <div className="rounded-xl bg-card overflow-hidden">
              <div className="h-9 flex items-center gap-1.5 px-4 border-b bg-muted/40">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <div className="ml-auto text-xs text-muted-foreground">studygpt.app/dashboard</div>
              </div>
              <div className="grid grid-cols-12 min-h-[360px]">
                <div className="col-span-3 border-r p-4 space-y-2 bg-muted/30">
                  {["Dashboard", "Documents", "AI Chat", "Quizzes", "Analytics"].map((l, i) => (
                    <div key={l} className={cn("text-xs px-3 py-2 rounded-lg", i === 0 ? "gradient-primary-bg text-white" : "text-muted-foreground")}>
                      {l}
                    </div>
                  ))}
                </div>
                <div className="col-span-9 p-6 text-left">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { l: "Documents", v: "47" },
                      { l: "AI Sessions", v: "219" },
                      { l: "Streak", v: "14d" },
                    ].map((s) => (
                      <div key={s.l} className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">{s.l}</div>
                        <div className="text-xl font-bold gradient-text">{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground mb-2">Today's plan</div>
                    {["Revise SQL Joins · 45m", "Quiz: Normalization · 30m", "Flashcards: TCP/IP · 20m"].map((t) => (
                      <div key={t} className="flex items-center gap-2 text-sm py-1.5">
                        <div className="h-1.5 w-1.5 rounded-full gradient-primary-bg" /> {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-24 border-t">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-14">
          <div className="text-sm font-medium text-primary mb-2">Everything you need</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">One AI for your entire syllabus</h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Twelve specialized tools, one ecosystem. Built for how students actually learn.
          </p>
        </div>
        <div id="tools" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
            >
              <Link to={f.to} className="block h-full">
                <Card className="p-6 h-full glass hover:shadow-glow transition-all hover:-translate-y-1 cursor-pointer">
                  <div className="h-11 w-11 rounded-xl gradient-primary-bg grid place-items-center text-white mb-4">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5">{f.desc}</p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 border-t gradient-soft-bg">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">How it works</h2>
          <p className="text-muted-foreground mt-4">Four steps from chaos to clarity.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.title} className="relative">
              <Card className="p-6 h-full glass">
                <div className="text-xs font-bold text-primary mb-3">STEP {i + 1}</div>
                <s.icon className="h-8 w-8 mb-4 text-primary" />
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="about" className="py-24 border-t">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Loved by ambitious learners</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <Card key={t.name} className="p-6 glass">
              <div className="flex gap-0.5 text-amber-400 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm leading-relaxed">"{t.text}"</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full gradient-primary-bg text-white grid place-items-center text-sm font-semibold">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-24 border-t gradient-soft-bg">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Simple, student-friendly pricing</h2>
          <p className="text-muted-foreground mt-4">Start free. Upgrade when you're ready to dominate.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((p) => (
            <Card
              key={p.name}
              className={cn(
                "p-7 relative",
                p.featured ? "shadow-glow border-primary/40 scale-[1.02]" : "glass",
              )}
            >
              {p.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary-bg text-white text-xs px-3 py-1 rounded-full">
                  Most popular
                </div>
              )}
              <h3 className="font-semibold text-lg">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={cn(
                  "w-full mt-7",
                  p.featured ? "gradient-primary-bg text-white border-0 hover:opacity-90" : "",
                )}
                variant={p.featured ? "default" : "outline"}
                asChild
              >
                <Link to="/signup">{p.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="py-24 border-t">
      <div className="max-w-3xl mx-auto px-4 lg:px-8">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-10">
          Questions, answered
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="border-t py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary-bg grid place-items-center text-white">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg">StudyGPT</span>
          </div>
          <p className="text-sm text-muted-foreground mt-3 max-w-sm">
            The all-in-one AI learning ecosystem. Built by students, for students.
          </p>
        </div>
        <div>
          <div className="font-semibold text-sm mb-3">Product</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
            <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a></li>
            <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-sm mb-3">Company</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#contact" className="hover:text-foreground transition-colors">Contact</a></li>
            <li><span className="opacity-50">Blog</span></li>
            <li><span className="opacity-50">Careers</span></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-10 pt-6 border-t text-xs text-muted-foreground flex justify-between">
        <span>© 2026 StudyGPT. All rights reserved.</span>
        <span>Made with ✨ for learners</span>
      </div>
    </footer>
  );
}
