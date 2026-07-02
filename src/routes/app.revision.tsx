import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { StickyNote, Loader2 } from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/revision")({ component: RevisionPage });

function RevisionPage() {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    const t = topic.trim();
    if (!t) return;
    setBusy(true);
    try {
      const res = await aiService.generateStudyNotes(t, "standard");
      setNotes(res.studyNotes);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not generate revision material";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Revision Mode" description="Everything you need the night before, in one place." />
      <Card className="p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Topic to revise</label>
          <Input
            placeholder="e.g. concepts from your uploaded chapter…"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") generate(); }}
          />
        </div>
        <Button onClick={generate} disabled={busy || !topic.trim()} className="gradient-primary-bg text-white border-0">
          {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : "Generate revision"}
        </Button>
      </Card>
      {!notes && !busy && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No revision material generated. Enter a topic above to begin.
        </Card>
      )}
      {notes && !busy && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Revision notes · {topic}</h3>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{notes}</p>
        </Card>
      )}
    </div>
  );
}