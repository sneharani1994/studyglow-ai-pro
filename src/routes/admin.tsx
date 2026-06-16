import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, FileText, BarChart3, FileBarChart, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — StudyGPT" }] }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/documents", label: "Documents", icon: FileText },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex flex-col w-64 border-r bg-card/40 sticky top-0 h-screen">
        <div className="h-16 flex items-center gap-2 px-5 border-b">
          <div className="h-8 w-8 rounded-lg gradient-primary-bg grid place-items-center text-white">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="font-bold">StudyGPT <span className="text-xs text-muted-foreground">Admin</span></span>
        </div>
        <nav className="p-3 space-y-0.5">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                active ? "gradient-primary-bg text-white shadow-glow" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 border-b bg-background/70 backdrop-blur-xl flex items-center gap-3 px-6">
          <div className="font-semibold">Admin Dashboard</div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Avatar className="h-8 w-8"><AvatarFallback className="gradient-primary-bg text-white text-xs">AD</AvatarFallback></Avatar>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}