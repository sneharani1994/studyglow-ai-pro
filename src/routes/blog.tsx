import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — StudyGPT" },
      { name: "description", content: "Latest updates and learning tips from StudyGPT." },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="h-16 w-16 rounded-2xl gradient-primary-bg grid place-items-center text-white mb-6">
        <GraduationCap className="h-8 w-8" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Blog</h1>
      <p className="text-muted-foreground max-w-md text-center mb-8">
        We're working on insightful articles to help you study smarter. Check back soon!
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
