import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { ChevronLeft, ChevronRight, RotateCw, Shuffle, RefreshCw, Sparkles, Save, Trash2, Loader2 } from "lucide-react";
import { flashcardsService, aiService, type Flashcard } from "@/lib/api";
import { toast } from "sonner";
import { emitAppRefresh } from "@/lib/events";

export const Route = createFileRoute("/app/flashcards")({
  component: FlashcardsPage,
});

type Deck = Array<Pick<Flashcard, "front" | "back"> & { id?: string; saved?: boolean }>;

const DRAFT_KEY = "studygpt.flashcards.draft";

function FlashcardsPage() {
  const [saved, setSaved] = useState<Flashcard[]>([]);
  const [deck, setDeck] = useState<Deck>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [tab, setTab] = useState<"generated" | "saved">("generated");

  const activeDeck: Deck = tab === "saved"
    ? saved.map((c) => ({ id: c.id, front: c.front, back: c.back, saved: true }))
    : deck;

  const total = activeDeck.length;
  const card = activeDeck[idx];

  const loadSaved = () =>
    flashcardsService.list().then(setSaved).catch(() => setSaved([]));

  useEffect(() => {
    loadSaved().finally(() => setLoading(false));
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) setDeck(JSON.parse(raw) as Deck);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { setIdx(0); setFlipped(false); }, [tab]);
  useEffect(() => {
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(deck)); } catch { /* ignore */ }
  }, [deck]);

  const next = () => { setFlipped(false); setIdx((i) => (total ? (i + 1) % total : 0)); };
  const prev = () => { setFlipped(false); setIdx((i) => (total ? (i - 1 + total) % total : 0)); };
  const shuffle = () => {
    if (tab === "saved") { toast.info("Shuffle available on generated deck"); return; }
    setDeck((d) => [...d].sort(() => Math.random() - 0.5));
    setIdx(0); setFlipped(false);
  };
  const restart = () => { setIdx(0); setFlipped(false); };

  const generate = async () => {
    const t = topic.trim();
    if (!t) { toast.error("Enter a topic to generate flashcards"); return; }
    setBusy(true);
    try {
      const res = await aiService.generateFlashcards(t, count);
      const newDeck: Deck = res.flashcards.map((c) => ({ front: c.front, back: c.back }));
      setDeck(newDeck);
      setTab("generated");
      setIdx(0); setFlipped(false);
      toast.success(`Generated ${newDeck.length} flashcards`);
      emitAppRefresh({ source: "flashcards" });
    } catch (e: any) {
      toast.error(e?.message || "Could not generate flashcards");
    } finally { setBusy(false); }
  };

  const saveOne = async () => {
    if (!card || card.saved) return;
    try {
      const created = await flashcardsService.create({ front: card.front, back: card.back });
      setSaved((prev) => [created, ...prev]);
      setDeck((prev) => prev.map((c, i) => (i === idx ? { ...c, id: created.id, saved: true } : c)));
      toast.success("Saved");
      emitAppRefresh({ source: "flashcards" });
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
  };

  const saveAll = async () => {
    const unsaved = deck.filter((c) => !c.saved);
    if (!unsaved.length) { toast.info("All cards already saved"); return; }
    setBusy(true);
    try {
      const created: Flashcard[] = [];
      for (const c of unsaved) {
        created.push(await flashcardsService.create({ front: c.front, back: c.back }));
      }
      setSaved((prev) => [...created, ...prev]);
      setDeck((prev) => prev.map((c) => (c.saved ? c : { ...c, saved: true })));
      toast.success(`Saved ${created.length} cards`);
      emitAppRefresh({ source: "flashcards" });
    } catch (e: any) {
      toast.error(e?.message || "Save all failed");
    } finally { setBusy(false); }
  };

  const deleteSaved = async () => {
    if (!card?.id) return;
    try {
      await flashcardsService.remove(card.id);
      setSaved((prev) => prev.filter((c) => c.id !== card.id));
      setIdx(0); setFlipped(false);
      toast.success("Deleted");
      emitAppRefresh({ source: "flashcards" });
    } catch (e: any) { toast.error(e?.message || "Delete failed"); }
  };

  const progressPct = useMemo(() => (total ? Math.round(((idx + 1) / total) * 100) : 0), [idx, total]);

  return (
    <div>
      <PageHeader title="Flashcards" description="Generate, flip, shuffle, and save AI flashcards for spaced repetition." />

      <Card className="p-5 mb-6 grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div>
          <label className="text-xs font-medium mb-1.5 block">Topic</label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") generate(); }}
            placeholder="e.g. Photosynthesis, JavaScript closures, WW2 causes" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block">Cards</label>
          <Input type="number" min={3} max={20} value={count}
            onChange={(e) => setCount(Math.max(3, Math.min(20, Number(e.target.value) || 8)))} className="w-24" />
        </div>
        <Button onClick={generate} disabled={busy} className="gradient-primary-bg text-white border-0">
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate
        </Button>
      </Card>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Button size="sm" variant={tab === "generated" ? "default" : "outline"}
          className={tab === "generated" ? "gradient-primary-bg text-white border-0" : ""}
          onClick={() => setTab("generated")}>
          Generated <Badge variant="secondary" className="ml-2">{deck.length}</Badge>
        </Button>
        <Button size="sm" variant={tab === "saved" ? "default" : "outline"}
          className={tab === "saved" ? "gradient-primary-bg text-white border-0" : ""}
          onClick={() => setTab("saved")}>
          Saved <Badge variant="secondary" className="ml-2">{saved.length}</Badge>
        </Button>
        {tab === "generated" && deck.length > 0 && (
          <Button size="sm" variant="outline" onClick={saveAll} disabled={busy}>
            <Save className="h-4 w-4 mr-1" /> Save all
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : !card ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {tab === "saved"
            ? "No saved flashcards yet. Generate some and click Save."
            : "No generated deck yet. Enter a topic and click Generate."}
        </Card>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
            <span>Card {idx + 1} of {total}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-4">
            <div className="h-full gradient-primary-bg transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          <div style={{ perspective: "1000px" }}>
            <button
              onClick={() => setFlipped(!flipped)}
              className="w-full aspect-[4/3] relative transition-transform duration-500"
              style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : undefined }}
            >
              <Card className="absolute inset-0 p-10 flex flex-col items-center justify-center text-center shadow-glow glass"
                    style={{ backfaceVisibility: "hidden" }}>
                <div className="text-xs font-bold text-primary mb-3">QUESTION</div>
                <div className="text-2xl font-semibold">{card.front}</div>
                <div className="text-sm text-muted-foreground mt-6">Click to flip</div>
              </Card>
              <Card className="absolute inset-0 p-10 flex flex-col items-center justify-center text-center shadow-glow gradient-primary-bg text-white border-0"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <div className="text-xs font-bold text-white/70 mb-3">ANSWER</div>
                <div className="text-xl">{card.back}</div>
              </Card>
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-8">
            <Button variant="outline" onClick={prev}><ChevronLeft className="h-4 w-4 mr-1" /> Previous</Button>
            <Button variant="outline" onClick={() => setFlipped((f) => !f)}><RotateCw className="h-4 w-4 mr-1" /> Flip</Button>
            <Button variant="outline" onClick={shuffle}><Shuffle className="h-4 w-4 mr-1" /> Shuffle</Button>
            <Button variant="outline" onClick={restart}><RefreshCw className="h-4 w-4 mr-1" /> Restart</Button>
            {tab === "generated" ? (
              <Button onClick={saveOne} disabled={card.saved}
                className={card.saved ? "" : "gradient-primary-bg text-white border-0"}
                variant={card.saved ? "outline" : "default"}>
                <Save className="h-4 w-4 mr-1" /> {card.saved ? "Saved" : "Save"}
              </Button>
            ) : (
              <Button variant="outline" className="text-destructive" onClick={deleteSaved}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
            <Button onClick={next} className="gradient-primary-bg text-white border-0">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}