import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { AIResponse } from "@/components/ai-response";
import { aiService } from "@/lib/api";
import { History, Search, Loader2 } from "lucide-react";
import { useAppRefresh } from "@/lib/events";

export const Route = createFileRoute("/app/history")({ component: HistoryPage });

interface HistoryEntry {
  id: string;
  feature_type: string;
  prompt: string;
  response: string;
  created_at: string;
}

function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  const load = () => {
    setLoading(true);
    aiService.history()
      .then((res) => setEntries(res.history || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useAppRefresh(load);

  const filtered = entries.filter((e) =>
    !q.trim() ||
    e.feature_type.toLowerCase().includes(q.toLowerCase()) ||
    e.prompt.toLowerCase().includes(q.toLowerCase()) ||
    e.response.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader title="AI History" description="Every AI generation across chat, summaries, quizzes, planner, roadmap and more." />
      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <Card className="p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search history…" className="pl-9" />
          </div>
          <div className="text-xs text-muted-foreground mb-2">{filtered.length} entries</div>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <History className="h-6 w-6 mx-auto mb-2 opacity-40" />
                No history yet. Use any AI feature to build it up.
              </div>
            ) : filtered.map((e) => (
              <button key={e.id} onClick={() => setSelected(e)}
                className={`w-full text-left p-3 rounded-lg hover:bg-muted transition-colors ${selected?.id === e.id ? "bg-muted" : ""}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">{e.feature_type}</Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-sm truncate">{e.prompt}</div>
              </button>
            ))}
          </div>
        </Card>
        <div>
          {selected ? (
            <>
              <Card className="p-4 mb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="secondary">{selected.feature_type}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleString()}</span>
                </div>
                <div className="text-sm font-medium">Prompt</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{selected.prompt}</div>
              </Card>
              <AIResponse
                content={selected.response}
                title={`${selected.feature_type} · replay`}
                pdfFileName={`history-${selected.feature_type}`}
              />
              <div className="mt-3">
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </>
          ) : (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              Select an entry to view its full response.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}