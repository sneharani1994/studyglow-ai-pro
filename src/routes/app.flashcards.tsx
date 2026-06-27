import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { flashcardsService, type Flashcard } from "@/lib/api";

export const Route = createFileRoute("/app/flashcards")({
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    flashcardsService.list().then((c) => { setCards(c); }).catch(() => setCards([])).finally(() => setLoading(false));
  }, []);

  const total = cards.length;
  const card = cards[idx];
  const next = () => { setFlipped(false); setIdx((i) => (total ? (i + 1) % total : 0)); };
  const prev = () => { setFlipped(false); setIdx((i) => (total ? (i - 1 + total) % total : 0)); };

  if (loading) {
    return (
      <div>
        <PageHeader title="Flashcards" description="Loading…" />
      </div>
    );
  }

  if (!card) {
    return (
      <div>
        <PageHeader title="Flashcards" description="No flashcards yet — create some from the AI tools." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Flashcards" description={`Card ${idx + 1} of ${total}`} />
      <div className="max-w-2xl mx-auto">
        <div className="perspective-1000" style={{ perspective: "1000px" }}>
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
        <div className="flex justify-center gap-3 mt-8">
          <Button variant="outline" onClick={prev}><ChevronLeft className="h-4 w-4 mr-1" /> Previous</Button>
          <Button variant="outline" onClick={() => setFlipped(!flipped)}><RotateCw className="h-4 w-4 mr-1" /> Flip</Button>
          <Button onClick={next} className="gradient-primary-bg text-white border-0">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
      </div>
    </div>
  );
}