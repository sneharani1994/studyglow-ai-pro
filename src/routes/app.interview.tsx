import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/interview")({ component: InterviewPage });

function InterviewPage() {
  const [role, setRole] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loadingQ, setLoadingQ] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);

  const startInterview = async () => {
    const r = role.trim();
    if (!r) return;
    setLoadingQ(true);
    setFeedback("");
    setAnswer("");
    try {
      const res = await aiService.explain(
        `Ask me one realistic, challenging interview question for a "${r}" role. Return only the question, no preamble.`,
        "advanced",
      );
      setQuestion(res.explanation.trim());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not generate question";
      toast.error(msg);
    } finally {
      setLoadingQ(false);
    }
  };

  const submitAnswer = async () => {
    const a = answer.trim();
    if (!a || !question) return;
    setLoadingEval(true);
    try {
      const res = await aiService.doubtSolver(
        `Evaluate the following interview answer. Provide a score out of 10, strengths, weaknesses, and 2 improvement tips.\n\nQuestion: ${question}\n\nAnswer: ${a}`,
        `Role: ${role}`,
      );
      setFeedback(res.resolution);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Evaluation failed";
      toast.error(msg);
    } finally {
      setLoadingEval(false);
    }
  };

  return (
    <div>
      <PageHeader title="Mock Interview" description="Practice with an AI interviewer that thinks like FAANG." />
      <Card className="p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Role / topic</label>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") startInterview(); }}
            placeholder="e.g. Frontend Engineer, Data Analyst, System Design…"
          />
        </div>
        <Button onClick={startInterview} disabled={loadingQ || !role.trim()} className="gradient-primary-bg text-white border-0">
          {loadingQ ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : question ? "Next question" : "Start interview"}
        </Button>
      </Card>

      {!question && !loadingQ && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Start an interview to receive AI-generated questions and feedback.
        </Card>
      )}

      {question && (
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12"><AvatarFallback className="gradient-primary-bg text-white">AI</AvatarFallback></Avatar>
            <div>
              <div className="font-semibold">AI Interviewer</div>
              <div className="text-xs text-muted-foreground">Conducting your mock</div>
            </div>
            {role && <Badge variant="secondary" className="ml-auto">{role}</Badge>}
          </div>
          <Card className="p-5 bg-muted/40 border-dashed">
            <div className="text-xs text-muted-foreground mb-2">Question</div>
            <div className="font-medium whitespace-pre-line">{question}</div>
          </Card>
          <Textarea
            placeholder="Type your answer…"
            rows={8}
            className="mt-4"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <Button
            onClick={submitAnswer}
            disabled={loadingEval || !answer.trim()}
            className="mt-4 w-full gradient-primary-bg text-white border-0"
          >
            {loadingEval ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Evaluating…</> : "Submit answer"}
          </Button>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-3">AI feedback</h3>
            {loadingEval && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Evaluating your answer…
              </div>
            )}
            {!loadingEval && !feedback && (
              <p className="text-sm text-muted-foreground">Submit an answer to see feedback here.</p>
            )}
            {!loadingEval && feedback && (
              <p className="text-sm whitespace-pre-line text-muted-foreground leading-relaxed">{feedback}</p>
            )}
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}