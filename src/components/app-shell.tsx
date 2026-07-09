import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, MessageSquare, Mic, FileSearch, BrainCircuit,
  Layers, CalendarRange, Sparkles, Target, GraduationCap, Network,
  UserCheck, RotateCcw, ScanLine, Languages, SmilePlus, BarChart3, History,
  Settings, Bell, Search, Menu, GraduationCap as Logo, LogOut,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { initials, logout as logoutUser, useUser } from "@/lib/auth";
import { onAuthExpired } from "@/lib/api/client";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { notificationsService, type Notification } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
  { to: "/app/history", label: "AI History", icon: History },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useUser();
  const navigate = useNavigate();
  const [hydrated, setHydrated] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !user) navigate({ to: "/login" });
  }, [hydrated, user, navigate]);

  // Global: if the backend signals an expired session, redirect to /login.
  useEffect(() => {
    return onAuthExpired(() => {
      toast.error("Your session expired. Please sign in again.");
      navigate({ to: "/login" });
    });
  }, [navigate]);

  const fetchNotifs = async () => {
    try {
      setNotifsLoading(true);
      const list = await notificationsService.list();
      setNotifications(list || []);
    } catch (e) {
      console.error("Failed to load notifications", e);
    } finally {
      setNotifsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifs();
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      await notificationsService.markRead(id);
    } catch {
      fetchNotifs();
    }
  };

  const markAllRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.is_read);
      if (unread.length === 0) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await Promise.all(unread.map((n) => notificationsService.markRead(n.id)));
      toast.success("All notifications marked as read");
    } catch {
      fetchNotifs();
    }
  };

  const groupNotificationsByDate = (list: Notification[]) => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const older: Notification[] = [];

    const todayDate = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(todayDate.getDate() - 1);

    list.forEach((n) => {
      const d = new Date(n.created_at);
      if (d.toDateString() === todayDate.toDateString()) {
        today.push(n);
      } else if (d.toDateString() === yesterdayDate.toDateString()) {
        yesterday.push(n);
      } else {
        older.push(n);
      }
    });

    return { today, yesterday, older };
  };

  const getNotificationIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "achievement":
        return <Sparkles className="h-4 w-4 text-amber-500" />;
      case "reminder":
        return <CalendarRange className="h-4 w-4 text-blue-500" />;
      case "quiz":
      case "study":
        return <GraduationCap className="h-4 w-4 text-emerald-500 animate-pulse" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const renderNotifItem = (n: Notification) => {
    return (
      <button
        key={n.id}
        onClick={() => !n.is_read && markAsRead(n.id)}
        className={cn(
          "w-full text-left p-3.5 flex gap-3 transition-colors hover:bg-muted/50 relative border-b border-border/10 last:border-b-0",
          !n.is_read ? "bg-primary/5 hover:bg-primary/10" : ""
        )}
      >
        <div className={cn(
          "h-8 w-8 rounded-lg grid place-items-center shrink-0 border transition-all duration-300",
          !n.is_read ? "bg-primary/10 border-primary/20 text-primary shadow-glow" : "bg-muted border-border/40"
        )}>
          {getNotificationIcon(n.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className={cn("text-xs font-semibold truncate block", !n.is_read ? "text-foreground" : "text-muted-foreground")}>
              {n.title}
            </span>
            <span className="text-[10px] text-muted-foreground/80 whitespace-nowrap">
              {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground/90 mt-0.5 line-clamp-2 leading-relaxed">
            {n.message}
          </p>
        </div>
        {!n.is_read && (
          <span className="absolute right-3.5 bottom-3.5 h-2 w-2 rounded-full bg-primary" />
        )}
      </button>
    );
  };

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
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
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
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-muted/80">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 sm:w-96 p-0 glass shadow-glow border-border/40 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/20">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-primary hover:text-primary/80 hover:bg-primary/5 px-2 h-7">
                      Mark all read
                    </Button>
                  )}
                </div>

                <div className="max-h-[320px] overflow-y-auto scrollbar-thin divide-y divide-border/20">
                  {notifsLoading ? (
                    <div className="p-4 space-y-3">
                      <div className="flex gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-4 w-full" /></div></div>
                      <div className="flex gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/4" /><Skeleton className="h-4 w-full" /></div></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-muted/40 grid place-items-center text-muted-foreground/60">
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-medium">All caught up!</div>
                      <div className="text-[11px] text-muted-foreground/85">You have no new notifications.</div>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const { today, yesterday, older } = groupNotificationsByDate(notifications);
                        return (
                          <>
                            {today.length > 0 && (
                              <div>
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground px-4 py-1.5 font-bold bg-muted/10 border-b border-border/10">Today</div>
                                {today.map((n) => renderNotifItem(n))}
                              </div>
                            )}
                            {yesterday.length > 0 && (
                              <div>
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground px-4 py-1.5 font-bold bg-muted/10 border-b border-border/10">Yesterday</div>
                                {yesterday.map((n) => renderNotifItem(n))}
                              </div>
                            )}
                            {older.length > 0 && (
                              <div>
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground px-4 py-1.5 font-bold bg-muted/10 border-b border-border/10">Older</div>
                                {older.map((n) => renderNotifItem(n))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
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