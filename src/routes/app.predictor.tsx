import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { Sparkles, Loader2 } from "lucide-react";
import { aiService } from "@/lib/api";
import { AIResponse } from "@/components/ai-response";

export const Route = createFileRoute("/app/predictor")({
  component: PredictorPage,
});

function PredictorPage() {
  const [subject, setSubject] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);

  const predict = async () => {
    const s = subject.trim();
    if (!s) { setError("Enter a subject to predict for"); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await aiService.examPredictor(s, syllabus.trim() || undefined);
      setResult(res.prediction);
    } catch (e: any) {
      setError(e?.message || "AI service is temporarily busy. Please try again.");
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

      <AIResponse
        content={result}
        loading={busy}
        error={error}
        onRetry={predict}
        onRegenerate={result ? predict : undefined}
        title={subject ? `Predicted focus · ${subject}` : undefined}
        pdfFileName={`exam-predictor-${subject || "report"}`}
        emptyState={
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Enter a subject and click <b>Predict Questions</b> to generate a personalised report.
          </Card>
        }
      />
    </div>
  );
}