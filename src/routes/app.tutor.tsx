import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { GraduationCap, Loader2 } from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/tutor")({ component: TutorPage });

const levels = ["Beginner", "Student", "Advanced", "Interview"] as const;
type Level = typeof levels[number];
const levelMap: Record<Level, "beginner" | "intermediate" | "advanced"> = {
  Beginner: "beginner",
  Student: "intermediate",
  Advanced: "advanced",
  Interview: "advanced",
};
const levelPrefix: Record<Level, string> = {
  Beginner: "Explain like I am a complete beginner. Use very simple words, everyday analogies, and short sentences. Avoid jargon.",
  Student: "Explain to a college student. Give a clear definition, a worked example, and a summary. Use markdown headings and bullet points.",
  Advanced: "Give an in-depth, technical explanation. Include underlying theory, edge cases, mathematical/formal reasoning, and references to related concepts. Use markdown.",
  Interview: "Answer as if this is a technical interview question. Give a crisp definition, key points the interviewer looks for, a follow-up question you might be asked next, and a model answer. Use markdown.",
};

function TutorPage() {
  const [level, setLevel] = useState<Level>("Student");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [askedTopic, setAskedTopic] = useState("");

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setBusy(true);
    try {
      const prompt = `${levelPrefix[level]}\n\nQuestion: ${q}`;
      const res = await aiService.explain(prompt, levelMap[level]);
      setExplanation(res.explanation);
      setAskedTopic(q);
    } catch (e: unknown) {
      toast.error("AI service is temporarily busy. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="AI Tutor Mode" description="Your personal teacher, available 24/7." />
      <Card className="p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <Input
          placeholder="Ask any doubt…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
          className="flex-1"
        />
        <div className="flex gap-2">
          {levels.map((l) => (
            <Button key={l} size="sm" variant={level === l ? "default" : "outline"}
              className={level === l ? "gradient-primary-bg text-white border-0" : ""}
              onClick={() => setLevel(l)}>{l}</Button>
          ))}
          <Button size="sm" onClick={ask} disabled={busy || !question.trim()} className="gradient-primary-bg text-white border-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
          </Button>
        </div>
      </Card>

      {!explanation && !busy && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Ask a question to start learning.
        </Card>
      )}
      <AIResponse
        content={explanation}
        loading={busy}
        onRegenerate={explanation ? ask : undefined}
        onRetry={ask}
        title={askedTopic ? `${askedTopic} (${level})` : undefined}
        pdfFileName={`tutor-${askedTopic || "notes"}`}
      />
    </div>
  );
}