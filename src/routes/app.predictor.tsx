import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { Sparkles, Loader2, Target } from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/predictor")({
  component: PredictorPage,
});

function PredictorPage() {
  const [subject, setSubject] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const predict = async () => {
    const s = subject.trim();
    if (!s) { toast.error("Enter a subject to predict for"); return; }
    setBusy(true);
    try {
      const prompt = `Act as an experienced exam predictor for the subject "${s}".${syllabus.trim() ? `\nSyllabus / topics covered:\n${syllabus.trim()}` : ""}\n\nProduce a well-formatted markdown report with these sections:\n\n## Most likely long questions\n## Most likely short questions\n## Important theory topics\n## Frequently repeated concepts\n## Study priority ranking\n## Why these are likely (AI explanation)\n\nUse bullet points, bold key terms, and be concise.`;
      const res = await aiService.explain(prompt, "advanced");
      setResult(res.explanation);
    } catch {
      toast.error("AI service is temporarily busy. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="AI Exam Predictor" description="Likely exam questions ranked by historical probability." />
      <Card className="p-5 mb-6 space-y-3">
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Subject</label>
            <Input placeholder="e.g. Class 12 Physics, DBMS, Organic Chemistry" value={subject}
              onChange={(e) => setSubject(e.target.value)} />
          </div>
          <Button onClick={predict} disabled={busy || !subject.trim()} className="gradient-primary-bg text-white border-0">
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Predicting…</> : <><Sparkles className="h-4 w-4 mr-2" />Predict Questions</>}
          </Button>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Syllabus (optional)</label>
          <Textarea rows={4} placeholder="Paste chapters, units or topics for a more accurate prediction…"
            value={syllabus} onChange={(e) => setSyllabus(e.target.value)} />
        </div>
      </Card>

      {!result && !busy && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Enter a subject and click <b>Predict Questions</b> to generate a personalised report.
        </Card>
      )}
      {busy && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
          Analysing likely questions…
        </Card>
      )}
      {result && !busy && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Predicted focus · {subject}</h3>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-line">{result}</div>
        </Card>
      )}
    </div>
  );
}