import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { uploadsService, aiService, type UploadedFile } from "@/lib/api";
import { toast } from "sonner";
import { AIResponse } from "@/components/ai-response";
import { emitAppRefresh } from "@/lib/events";

export const Route = createFileRoute("/app/summaries")({
  component: SummariesPage,
});

function SummariesPage() {
  const [docs, setDocs] = useState<UploadedFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    uploadsService.list().then((d) => {
      setDocs(d);
      if (d.length) setSelectedId(d[0].id);
    }).catch(() => setDocs([]));
  }, []);

  const selected = docs.find((d) => d.id === selectedId);

  const generate = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      // Rich structured "professional notes" prompt via generateStudyNotes → markdown.
      const prompt = `Create professional structured study notes for the document titled "${selected.filename}". Format as markdown with these clearly labeled sections:

# Title
## Introduction
## Key Concepts
## Bullet Points
## Definitions
## Important Formulae
## Examples
## Quick Revision
## Exam Tips
## Conclusion`;
      const res = await aiService.generateStudyNotes(prompt, "deep dive");
      setSummary(res.studyNotes);
      emitAppRefresh({ source: "summaries" });
    } catch (e: any) {
      const msg = e?.message || "Could not generate summary";
      setError(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="AI Summaries" description="Long PDF? Get the essence in 60 seconds." />
      <Card className="p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Select document</label>
          <Select value={selectedId ?? ""} onValueChange={(v) => { setSelectedId(v); setSummary(""); setError(null); }}>
            <SelectTrigger><SelectValue placeholder="Choose a document" /></SelectTrigger>
            <SelectContent>
              {docs.length === 0
                ? <SelectItem value="none" disabled>No documents uploaded yet</SelectItem>
                : docs.map((d) => <SelectItem key={d.id} value={d.id}>{d.filename}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={generate} disabled={busy || !selected} className="gradient-primary-bg text-white border-0 hover:opacity-90">
          <Sparkles className="h-4 w-4 mr-2" /> {busy ? "Generating…" : "Generate summary"}
        </Button>
      </Card>
      <AIResponse
        content={summary}
        loading={busy}
        error={error}
        onRegenerate={generate}
        onRetry={generate}
        title={selected?.filename ?? "Summary"}
        pdfFileName={`${selected?.filename ?? "summary"}-notes`}
        emptyState={
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Pick a document and click Generate summary.
          </Card>
        }
      />
    </div>
  );
}