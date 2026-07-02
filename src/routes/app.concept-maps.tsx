import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { Loader2, Network } from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/concept-maps")({ component: ConceptMapPage });

type Branch = { name: string; children: string[] };

function ConceptMapPage() {
  const [topic, setTopic] = useState("");
  const [root, setRoot] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    const t = topic.trim();
    if (!t) return;
    setBusy(true);
    try {
      const res = await aiService.explain(
        `Build a concept map for "${t}". Return STRICT JSON only, no prose, in the shape:
{"root":"<topic>","branches":[{"name":"<sub-topic>","children":["<leaf>","<leaf>"]}]}
Include 3-5 branches, each with 2-4 children.`,
        "intermediate",
      );
      // extract JSON block
      const match = res.explanation.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse concept map");
      const parsed = JSON.parse(match[0]) as { root: string; branches: Branch[] };
      setRoot(parsed.root || t);
      setBranches(Array.isArray(parsed.branches) ? parsed.branches.slice(0, 6) : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not generate concept map";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Concept Maps" description="See how every idea connects." />
      <Card className="p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Topic</label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") generate(); }}
            placeholder="Enter a topic to map…"
          />
        </div>
        <Button onClick={generate} disabled={busy || !topic.trim()} className="gradient-primary-bg text-white border-0">
          {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : "Generate map"}
        </Button>
      </Card>
      {!branches.length && !busy && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Network className="h-8 w-8 mx-auto mb-3 text-primary" />
          Enter a topic to generate a concept map.
        </Card>
      )}
      {branches.length > 0 && (
      <Card className="p-10 overflow-x-auto">
        <div className="min-w-[700px] flex flex-col items-center gap-8">
          <div className="rounded-2xl gradient-primary-bg text-white px-8 py-4 font-bold text-lg shadow-glow">{root}</div>
          <div className="grid gap-6 w-full" style={{ gridTemplateColumns: `repeat(${branches.length}, minmax(0, 1fr))` }}>
            {branches.map((b) => (
              <div key={b.name} className="flex flex-col items-center gap-3">
                <div className="h-px w-px relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-px h-8 bg-border" />
                </div>
                <div className="rounded-xl glass px-4 py-2 font-semibold text-sm">{b.name}</div>
                <div className="space-y-2 w-full">
                  {b.children.map((c) => (
                    <div key={c} className="rounded-lg border bg-card px-3 py-2 text-xs text-center hover:shadow-card transition-all hover:-translate-y-0.5 cursor-pointer">
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      )}
    </div>
  );
}