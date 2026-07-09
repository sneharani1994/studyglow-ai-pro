import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sparkles, Copy, Download, Save, RotateCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { uploadsService, aiService, type UploadedFile } from "@/lib/api";
import { toast } from "sonner";
import { AIResponse } from "@/components/ai-response";
import { emitAppRefresh } from "@/lib/events";
import { SummaryCard } from "@/components/summary-card";
import { useLocalHistory } from "@/hooks/useLocalHistory";


export const Route = createFileRoute("/app/summaries")({
  component: SummariesPage,
});

function SummariesPage() {
  const [docs, setDocs] = useState<UploadedFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local history hook (max 10 entries)
  const { history, addEntry, clearHistory } = useLocalHistory();

  useEffect(() => {
    uploadsService.list().then((d) => {
      setDocs(d);
      if (d.length) setSelectedId(d[0].id);
    }).catch(() => setDocs([]));
  }, []);

  const selected = docs.find((d) => d.id === selectedId);

  const handleGenerate = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const prompt = `Create professional structured study notes for the document titled "${selected.filename}". Format as markdown with these clearly labeled sections:\n\n# Title\n## Introduction\n## Key Concepts\n## Bullet Points\n## Definitions\n## Important Formulae\n## Examples\n## Quick Revision\n## Exam Tips\n## Conclusion`;
      const res = await aiService.generateStudyNotesWithDoc(selected.id, prompt, "deep dive");
      setSummary(res.studyNotes);
      emitAppRefresh({ source: "summaries" });
      // Save to history
      addEntry({ id: Date.now().toString(), title: selected.filename, markdown: res.studyNotes, timestamp: new Date().toISOString() });
    } catch (e: any) {
      const msg = e?.message || "Could not generate summary";
      setError(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(summary); toast.success("Copied to clipboard"); }
    catch (e) { toast.error("Copy failed"); }
  };

  const downloadFile = (data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    // Simple placeholder: download markdown as .pdf (rename extension)
    downloadFile(summary, `${selected?.filename ?? "summary"}.pdf`, "application/pdf");
  };

  const handleDownloadMD = () => {
    downloadFile(summary, `${selected?.filename ?? "summary"}.md`, "text/markdown");
  };

  const handleSave = () => {
    toast.success("Saved locally (future implementation)");
  };

  return (
    <div>
      <PageHeader title="AI Summaries" description="Long PDF? Get the essence in 60 seconds." />
      <Card className="p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Select document</label>
          <Select value={selectedId ?? ""} onValueChange={(v) => { setSelectedId(v); setSummary(""); setError(null); }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a document" />
            </SelectTrigger>
            <SelectContent>
              {docs.length === 0
                ? <SelectItem value="none" disabled>No documents uploaded yet</SelectItem>
                : docs.map((d) => <SelectItem key={d.id} value={d.id}>{d.filename}</SelectItem>) }
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGenerate} disabled={busy || !selected} className="gradient-primary-bg text-white border-0 hover:opacity-90">
          <Sparkles className="h-4 w-4 mr-2" /> {busy ? "Generating…" : "Generate summary"}
        </Button>
      </Card>
      {summary && selected && (
        <SummaryCard
          title={selected.filename}
          markdown={summary}
          onRegenerate={handleGenerate}
          onCopy={handleCopy}
          onDownloadPDF={handleDownloadPDF}
          onDownloadMD={handleDownloadMD}
          onSave={handleSave}
        />
      )}
      {/* History Panel */}
      {history.length > 0 && (
        <Card className="mt-6 p-4 bg-white/5 backdrop-blur-md border border-white/20">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">History</h3>
            <Button variant="ghost" size="sm" onClick={clearHistory}>Clear</Button>
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {history.map((h) => (
              <li key={h.id} className="cursor-pointer hover:underline" onClick={() => { setSummary(h.markdown); setSelectedId(null); }}>
                {h.title} <span className="text-xs text-muted-foreground">{new Date(h.timestamp).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}