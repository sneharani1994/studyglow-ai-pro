import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — StudyGPT" },
      { name: "description", content: "Join the StudyGPT team." },
    ],
  }),
  component: CareersPage,
});

function CareersPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="h-16 w-16 rounded-2xl gradient-primary-bg grid place-items-center text-white mb-6">
        <GraduationCap className="h-8 w-8" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Careers</h1>
      <p className="text-muted-foreground max-w-md text-center mb-8">
        No open positions right now, but we're always looking for passionate people. Drop us a message!
      </p>
      <Button asChild variant="outline">
        <Link to="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
      </Button>
    </div>
  );
}
