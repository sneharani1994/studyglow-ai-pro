import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { notesService, aiService, type Note } from "@/lib/api";

export const Route = createFileRoute("/app/summaries")({
  component: SummariesPage,
});

function splitSummary(summary: string) {
  const blocks = summary.split(/\n\s*\n/).filter(Boolean);
  if (blocks.length <= 1) return [{ title: "Summary", body: summary }];
  return blocks.map((b, i) => ({ title: `Section ${i + 1}`, body: b }));
}

function SummariesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    notesService.list({ recent: true }).then((n) => {
      setNotes(n);
      if (n.length) setSelectedId(n[0].id);
    }).catch(() => setNotes([]));
  }, []);

  const selected = notes.find((n) => n.id === selectedId);

  const generate = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await aiService.summarize(selected.content || selected.title, "medium");
      setSummary(res.summary);
    } finally { setBusy(false); }
  };

  const sections = summary
    ? splitSummary(summary)
    : selected?.summary
    ? splitSummary(selected.summary)
    : [{ title: "No summary yet", body: "Pick a document and click Generate summary." }];

  return (
    <div>
      <PageHeader title="AI Summaries" description="Long PDF? Get the essence in 60 seconds." />
      <Card className="p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Select document</label>
          <Select value={selectedId ?? ""} onValueChange={(v) => { setSelectedId(v); setSummary(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {notes.length === 0
                ? <SelectItem value="none" disabled>No notes yet</SelectItem>
                : notes.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={generate} disabled={busy || !selected} className="gradient-primary-bg text-white border-0 hover:opacity-90">
          <Sparkles className="h-4 w-4 mr-2" /> {busy ? "Generating…" : "Generate summary"}
        </Button>
      </Card>
      <div className="grid lg:grid-cols-2 gap-4">
        {sections.map((s) => (
          <Card key={s.title} className="p-6">
            <h3 className="font-semibold text-lg gradient-text">{s.title}</h3>
            <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line leading-relaxed">{s.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}