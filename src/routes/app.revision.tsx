import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { StickyNote, Loader2, FileText, Upload } from "lucide-react";
import { aiService, uploadsService, type UploadedFile } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/revision")({ component: RevisionPage });

type Mode = "notes" | "onepage" | "night" | "formulas" | "definitions" | "faq";

const MODES: { key: Mode; label: string; prompt: (topic: string) => string }[] = [
  { key: "notes",       label: "Revision Notes",         prompt: (t) => `Create detailed revision notes for: ${t}. Use headings, bullet points and highlight key terms in bold.` },
  { key: "onepage",     label: "One Page Summary",       prompt: (t) => `Summarise the following into a single page cheat-sheet with clear sections and short bullets:\n\n${t}` },
  { key: "night",       label: "Night Before Exam",      prompt: (t) => `Give a "night before the exam" recap for: ${t}. Focus only on the highest-yield facts, formulas and pitfalls a student must not forget.` },
  { key: "formulas",    label: "Important Formulas",     prompt: (t) => `List every important formula relevant to: ${t}. For each formula give: the formula in plain text, what each symbol means, and when to use it.` },
  { key: "definitions", label: "Important Definitions",  prompt: (t) => `List the most important definitions for: ${t}. Format as "Term — definition" bullets, one per line.` },
  { key: "faq",         label: "Frequently Asked Qs",    prompt: (t) => `Generate 8-12 frequently asked exam questions on: ${t}, each with a concise model answer.` },
];

function RevisionPage() {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("notes");
  const [docs, setDocs] = useState<UploadedFile[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<UploadedFile | null>(null);

  useEffect(() => {
    uploadsService.list()
      .then((list) => setDocs(list))
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false));
  }, []);

  const generate = async () => {
    const base = selectedDoc ? `the uploaded document "${selectedDoc.filename}"${topic.trim() ? ` focusing on ${topic.trim()}` : ""}` : topic.trim();
    if (!base) { toast.error("Pick a document or enter a topic to revise"); return; }
    setBusy(true);
    try {
      const chosen = MODES.find((m) => m.key === mode)!;
      const res = await aiService.explain(chosen.prompt(base), "advanced");
      setNotes(res.explanation);
    } catch (e: unknown) {
      toast.error("AI service is temporarily busy. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const heading = selectedDoc ? selectedDoc.filename : topic || "Revision";

  return (
    <div>
      <PageHeader title="Revision Mode" description="Everything you need the night before, in one place." />

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Your uploaded documents</h3>
          <Link to="/app/documents">
            <Button size="sm" variant="outline"><Upload className="h-3.5 w-3.5 mr-1" />Upload</Button>
          </Link>
        </div>
        {docsLoading ? (
          <div className="text-sm text-muted-foreground">Loading documents…</div>
        ) : docs.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No documents yet — upload one to base your revision on your own material, or just type a topic below.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {docs.map((d) => (
              <Button key={d.id} size="sm"
                variant={selectedDoc?.id === d.id ? "default" : "outline"}
                className={selectedDoc?.id === d.id ? "gradient-primary-bg text-white border-0" : ""}
                onClick={() => setSelectedDoc(selectedDoc?.id === d.id ? null : d)}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />{d.filename}
              </Button>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">
            {selectedDoc ? "Optional focus within the document" : "Topic to revise"}
          </label>
          <Input
            placeholder={selectedDoc ? "e.g. Chapter 3, integration by parts…" : "e.g. Thermodynamics, SQL joins…"}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") generate(); }}
          />
        </div>
        <Button onClick={generate} disabled={busy || (!topic.trim() && !selectedDoc)} className="gradient-primary-bg text-white border-0">
          {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : "Generate revision"}
        </Button>
      </Card>

      <Card className="p-4 mb-6 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Button key={m.key} size="sm"
            variant={mode === m.key ? "default" : "outline"}
            className={mode === m.key ? "gradient-primary-bg text-white border-0" : ""}
            onClick={() => setMode(m.key)}>{m.label}</Button>
        ))}
      </Card>

      {!notes && !busy && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Pick a document or topic, choose a revision format, then click <b>Generate revision</b>.
        </Card>
      )}
      <AIResponse
        content={notes}
        loading={busy}
        onRegenerate={notes ? generate : undefined}
        onRetry={generate}
        title={heading ? `${MODES.find((m) => m.key === mode)?.label} · ${heading}` : undefined}
        pdfFileName={`revision-${heading || mode}`}
      />
    </div>
  );
}