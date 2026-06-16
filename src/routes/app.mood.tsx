import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/mood")({ component: MoodPage });

const moods = [
  { emoji: "😊", label: "Motivated", score: 92, advice: "Tackle your hardest topic now — momentum is high!", activities: ["Hard quiz (DBMS)", "Mock interview", "New chapter"] },
  { emoji: "😐", label: "Neutral", score: 68, advice: "Warm up with light flashcards, then ease into deeper work.", activities: ["Flashcards (15m)", "Quick revision", "Light reading"] },
  { emoji: "😴", label: "Tired", score: 35, advice: "Take it easy. Audio summaries or 10 min revision is enough.", activities: ["Audio summary", "Watch concept video", "Short break"] },
];

function MoodPage() {
  const [m, setM] = useState(moods[0]);
  return (
    <div>
      <PageHeader title="Mood & Productivity" description="Your AI study buddy adapts to how you feel." />
      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-4">How are you feeling right now?</h3>
        <div className="grid grid-cols-3 gap-3">
          {moods.map((mo) => (
            <button key={mo.label} onClick={() => setM(mo)}
              className={`p-6 rounded-2xl border-2 transition-all text-center ${m.label === mo.label ? "border-primary gradient-soft-bg shadow-glow" : "border-transparent hover:border-border"}`}>
              <div className="text-5xl">{mo.emoji}</div>
              <div className="font-medium mt-2">{mo.label}</div>
            </button>
          ))}
        </div>
      </Card>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <div className="text-xs text-muted-foreground">Productivity score</div>
          <div className="text-5xl font-bold gradient-text mt-2">{m.score}</div>
        </Card>
        <Card className="p-6 lg:col-span-2 gradient-soft-bg border-0">
          <h3 className="font-semibold mb-2">AI recommendation</h3>
          <p className="text-sm mb-4">{m.advice}</p>
          <div className="flex flex-wrap gap-2">
            {m.activities.map((a) => (
              <div key={a} className="rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-card">{a}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}