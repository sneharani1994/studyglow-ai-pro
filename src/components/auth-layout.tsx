import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative overflow-hidden gradient-hero-bg p-12 flex-col justify-between text-white">
        <Link to="/" className="flex items-center gap-2 relative z-10">
          <div className="h-9 w-9 rounded-lg bg-white/15 backdrop-blur grid place-items-center">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl">StudyGPT</span>
        </Link>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-1/3 -left-10 w-72 h-72 rounded-full bg-fuchsia-300/30 blur-3xl" />
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold leading-tight">Learn smarter, not harder.</h2>
          <p className="mt-4 text-white/80">Join 24,000+ students who turned scattered notes into mastery with StudyGPT.</p>
          <div className="mt-8 flex -space-x-2">
            {["AK", "RM", "PS", "VP"].map((a) => (
              <div key={a} className="h-10 w-10 rounded-full bg-white/20 backdrop-blur grid place-items-center text-sm font-medium border-2 border-white/30">{a}</div>
            ))}
          </div>
        </div>
        <div className="text-xs text-white/60 relative z-10">© 2026 StudyGPT</div>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg gradient-primary-bg grid place-items-center text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-bold text-xl">StudyGPT</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-center text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}