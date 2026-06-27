import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Clock, Sparkles, RotateCcw } from "lucide-react";
import { quizzesService, type Quiz, type QuizQuestion, type QuizAttemptResult } from "@/lib/api";

export const Route = createFileRoute("/app/quizzes")({
  component: QuizzesPage,
});

function QuizzesPage() {
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [active, setActive] = useState<{ quiz: Quiz; questions: QuizQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = (diff: typeof difficulty) =>
    quizzesService.list({ difficulty: diff }).then(setQuizzes).catch(() => setQuizzes([]));

  useEffect(() => { loadList(difficulty); }, [difficulty]);

  useEffect(() => {
    if (!active && quizzes.length) {
      quizzesService.details(quizzes[0].id).then(setActive).catch(() => setActive(null));
    }
  }, [quizzes, active]);

  const pickDifficulty = (d: typeof difficulty) => {
    setDifficulty(d);
    setActive(null);
    setAnswers({});
    setResult(null);
  };

  const submit = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const r = await quizzesService.submit(active.quiz.id, answers);
      setResult(r);
    } finally { setBusy(false); }
  };

  const reset = () => { setAnswers({}); setResult(null); };

  return (
    <div>
      <PageHeader title="Quiz Generator" description="AI-generated MCQs from your own notes." />
      <Card className="p-5 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {(["easy", "medium", "hard"] as const).map((d) => (
            <Button key={d} size="sm" variant={difficulty === d ? "default" : "outline"}
              className={difficulty === d ? "gradient-primary-bg text-white border-0" : ""}
              onClick={() => pickDifficulty(d)}>
              {d[0].toUpperCase() + d.slice(1)}
            </Button>
          ))}
        </div>
        <Button className="ml-auto gradient-primary-bg text-white border-0 hover:opacity-90">
          <Sparkles className="h-4 w-4 mr-2" /> Generate new quiz
        </Button>
      </Card>

      {!active ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {quizzes.length ? "Loading quiz…" : "No quizzes for this difficulty yet."}
        </Card>
      ) : (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Badge variant="secondary">{active.quiz.subjects?.name ?? "Quiz"} · {active.quiz.difficulty}</Badge>
            <h3 className="font-semibold text-lg mt-2">{active.quiz.title}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> {active.questions.length} questions
          </div>
        </div>

        <div className="space-y-6">
          {active.questions.map((q, i) => {
            const detail = result?.evaluationDetails.find((d) => d.questionId === q.id);
            const isCorrect = !!detail?.isCorrect;
            const isWrong = !!result && !!detail && !detail.isCorrect && detail.userChoice !== null;
            return (
              <div key={q.id}>
                <div className="font-medium mb-3">{i + 1}. {q.question_text}</div>
                <RadioGroup
                  value={answers[q.id]?.toString()}
                  onValueChange={(v) => !result && setAnswers({ ...answers, [q.id]: Number(v) })}
                  className="space-y-2"
                >
                  {q.options.map((opt, j) => (
                    <Label
                      key={j}
                      htmlFor={`q${i}-${j}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${
                        result && j === q.correct_option_index ? "border-emerald-500 bg-emerald-500/10" :
                        result && answers[q.id] === j && j !== q.correct_option_index ? "border-destructive bg-destructive/10" : ""
                      }`}
                    >
                      <RadioGroupItem id={`q${i}-${j}`} value={j.toString()} />
                      <span className="font-normal">{opt}</span>
                    </Label>
                  ))}
                </RadioGroup>
                {result && (
                  <div className={`text-xs mt-2 ${isCorrect ? "text-emerald-600" : isWrong ? "text-destructive" : "text-muted-foreground"}`}>
                    {isCorrect ? "✓ Correct" : isWrong ? `✗ Correct answer: ${q.options[q.correct_option_index]}` : "Not answered"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {result ? (
          <Card className="mt-8 p-6 gradient-soft-bg border-0">
            <div className="text-center">
              <div className="text-5xl font-bold gradient-text">{result.score}/{result.totalQuestions}</div>
              <div className="text-muted-foreground mt-1">Great effort! Focus on the questions you missed.</div>
              <Button onClick={reset} variant="outline" className="mt-4">
                <RotateCcw className="h-4 w-4 mr-2" /> Retake
              </Button>
            </div>
          </Card>
        ) : (
          <Button onClick={submit} disabled={busy} className="mt-6 w-full gradient-primary-bg text-white border-0 hover:opacity-90">
            {busy ? "Submitting…" : "Submit quiz"}
          </Button>
        )}
      </Card>
      )}
    </div>
  );
}