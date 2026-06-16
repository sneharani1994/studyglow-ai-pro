import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { flashcards } from "@/lib/mock-data";

export const Route = createFileRoute("/app/flashcards")({
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = flashcards[idx];
  const next = () => { setFlipped(false); setIdx((i) => (i + 1) % flashcards.length); };
  const prev = () => { setFlipped(false); setIdx((i) => (i - 1 + flashcards.length) % flashcards.length); };

  return (
    <div>
      <PageHeader title="Flashcards" description={`Card ${idx + 1} of ${flashcards.length}`} />
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
              <div className="text-2xl font-semibold">{card.q}</div>
              <div className="text-sm text-muted-foreground mt-6">Click to flip</div>
            </Card>
            <Card className="absolute inset-0 p-10 flex flex-col items-center justify-center text-center shadow-glow gradient-primary-bg text-white border-0"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <div className="text-xs font-bold text-white/70 mb-3">ANSWER</div>
              <div className="text-xl">{card.a}</div>
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