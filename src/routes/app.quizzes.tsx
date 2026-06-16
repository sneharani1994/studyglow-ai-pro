import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Clock, Sparkles, RotateCcw } from "lucide-react";
import { quizQuestions } from "@/lib/mock-data";

export const Route = createFileRoute("/app/quizzes")({
  component: QuizzesPage,
});

function QuizzesPage() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  const score = quizQuestions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0);

  return (
    <div>
      <PageHeader title="Quiz Generator" description="AI-generated MCQs from your own notes." />
      <Card className="p-5 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {(["easy", "medium", "hard"] as const).map((d) => (
            <Button key={d} size="sm" variant={difficulty === d ? "default" : "outline"}
              className={difficulty === d ? "gradient-primary-bg text-white border-0" : ""}
              onClick={() => setDifficulty(d)}>
              {d[0].toUpperCase() + d.slice(1)}
            </Button>
          ))}
        </div>
        <Button className="ml-auto gradient-primary-bg text-white border-0 hover:opacity-90">
          <Sparkles className="h-4 w-4 mr-2" /> Generate new quiz
        </Button>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Badge variant="secondary">DBMS · {difficulty}</Badge>
            <h3 className="font-semibold text-lg mt-2">Quick MCQ Test</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> 09:42
          </div>
        </div>

        <div className="space-y-6">
          {quizQuestions.map((q, i) => {
            const isCorrect = submitted && answers[i] === q.answer;
            const isWrong = submitted && answers[i] !== undefined && answers[i] !== q.answer;
            return (
              <div key={i}>
                <div className="font-medium mb-3">{i + 1}. {q.q}</div>
                <RadioGroup
                  value={answers[i]?.toString()}
                  onValueChange={(v) => !submitted && setAnswers({ ...answers, [i]: Number(v) })}
                  className="space-y-2"
                >
                  {q.options.map((opt, j) => (
                    <Label
                      key={j}
                      htmlFor={`q${i}-${j}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${
                        submitted && j === q.answer ? "border-emerald-500 bg-emerald-500/10" :
                        submitted && answers[i] === j && j !== q.answer ? "border-destructive bg-destructive/10" : ""
                      }`}
                    >
                      <RadioGroupItem id={`q${i}-${j}`} value={j.toString()} />
                      <span className="font-normal">{opt}</span>
                    </Label>
                  ))}
                </RadioGroup>
                {submitted && (
                  <div className={`text-xs mt-2 ${isCorrect ? "text-emerald-600" : isWrong ? "text-destructive" : "text-muted-foreground"}`}>
                    {isCorrect ? "✓ Correct" : isWrong ? `✗ Correct answer: ${q.options[q.answer]}` : "Not answered"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {submitted ? (
          <Card className="mt-8 p-6 gradient-soft-bg border-0">
            <div className="text-center">
              <div className="text-5xl font-bold gradient-text">{score}/{quizQuestions.length}</div>
              <div className="text-muted-foreground mt-1">Great effort! Focus on the questions you missed.</div>
              <Button onClick={() => { setAnswers({}); setSubmitted(false); }} variant="outline" className="mt-4">
                <RotateCcw className="h-4 w-4 mr-2" /> Retake
              </Button>
            </div>
          </Card>
        ) : (
          <Button onClick={() => setSubmitted(true)} className="mt-6 w-full gradient-primary-bg text-white border-0 hover:opacity-90">
            Submit quiz
          </Button>
        )}
      </Card>
    </div>
  );
}