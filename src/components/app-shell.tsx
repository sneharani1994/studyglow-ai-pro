import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, MessageSquare, Mic, FileSearch, BrainCircuit,
  Layers, CalendarRange, Sparkles, Target, GraduationCap, Network,
  UserCheck, RotateCcw, ScanLine, Languages, SmilePlus, BarChart3,
  Settings, Bell, Search, Menu, GraduationCap as Logo, LogOut,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { initials, logout as logoutUser, useUser } from "@/lib/auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/documents", label: "Documents", icon: FileText },
  { to: "/app/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/app/voice", label: "Voice Assistant", icon: Mic },
  { to: "/app/summaries", label: "Summaries", icon: FileSearch },
  { to: "/app/quizzes", label: "Quizzes", icon: BrainCircuit },
  { to: "/app/flashcards", label: "Flashcards", icon: Layers },
  { to: "/app/planner", label: "Study Planner", icon: CalendarRange },
  { to: "/app/predictor", label: "Exam Predictor", icon: Sparkles },
  { to: "/app/weak-topics", label: "Weak Topics", icon: Target },
  { to: "/app/tutor", label: "Tutor Mode", icon: GraduationCap },
  { to: "/app/concept-maps", label: "Concept Maps", icon: Network },
  { to: "/app/interview", label: "Interview Mode", icon: UserCheck },
  { to: "/app/revision", label: "Revision Mode", icon: RotateCcw },
  { to: "/app/handwritten", label: "Handwritten OCR", icon: ScanLine },
  { to: "/app/languages", label: "Languages", icon: Languages },
  { to: "/app/mood", label: "Mood Tracker", icon: SmilePlus },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useUser();
  const navigate = useNavigate();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !user) navigate({ to: "/login" });
  }, [hydrated, user, navigate]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 border-r bg-card/60 backdrop-blur-xl transition-transform",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b">
          <div className="h-8 w-8 rounded-lg gradient-primary-bg grid place-items-center text-white">
            <Logo className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg">StudyGPT</span>
        </div>
        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100vh-4rem)] scrollbar-thin">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "gradient-primary-bg text-white shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 border-b bg-background/70 backdrop-blur-xl flex items-center gap-3 px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search documents, topics, chats…" className="pl-9 bg-muted/50 border-0" />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-2 outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="gradient-primary-bg text-white text-xs">
                      {initials(user?.name ?? "U")}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium truncate">{user?.name ?? "Guest"}</div>
                  <div className="text-xs text-muted-foreground truncate font-normal">{user?.email ?? ""}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await logoutUser(); navigate({ to: "/login" }); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}