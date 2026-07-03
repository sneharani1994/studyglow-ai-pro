import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { Loader2 } from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/languages")({ component: LanguagesPage });

const langs = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "pa", name: "Punjabi" },
  { code: "ur", name: "Urdu" },
  { code: "or", name: "Odia" },
  { code: "as", name: "Assamese" },
] as const;

const STORAGE_KEY = "studygpt.lang";

function LanguagesPage() {
  const [lang, setLang] = useState<(typeof langs)[number]>(() => {
    if (typeof window === "undefined") return langs[0];
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const found = langs.find((l) => l.code === saved);
      return found ?? langs[0];
    } catch { return langs[0]; }
  });
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [askedQ, setAskedQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, lang.code); } catch { /* ignore */ }
  }, [lang]);

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setBusy(true);
    try {
      const prompt = `You are a helpful tutor. Respond ONLY in ${lang.name} (${lang.code}). Do not use any other language. Keep the answer clear, well-structured, and educational.\n\nQuestion: ${q}`;
      const res = await aiService.explain(prompt, "intermediate");
      setAnswer(res.explanation);
      setAskedQ(q);
    } catch (e: unknown) {
      toast.error("AI service is temporarily busy. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Multi-language Learning" description="Learn in the language you think in." />
      <Card className="p-4 mb-6 flex flex-wrap gap-2">
        {langs.map((l) => (
          <Button key={l.code} size="sm" variant={lang.code === l.code ? "default" : "outline"}
            className={lang.code === l.code ? "gradient-primary-bg text-white border-0" : ""}
            onClick={() => setLang(l)}>{l.name}</Button>
        ))}
      </Card>
      <Card className="p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Ask a question</label>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
            placeholder="Type any question…"
          />
        </div>
        <Button onClick={ask} disabled={busy || !question.trim()} className="gradient-primary-bg text-white border-0">
          {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Translating…</> : `Ask in ${lang.name}`}
        </Button>
      </Card>
      {!answer && !busy && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Ask a question above to see it answered in {lang.name}.
        </Card>
      )}
      {answer && !busy && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="text-xs font-bold text-primary mb-2">QUESTION</div>
            <div className="text-lg font-semibold">{askedQ}</div>
          </Card>
          <Card className="p-6 gradient-soft-bg border-0">
            <div className="text-xs font-bold text-primary mb-2">ANSWER · {lang.name.toUpperCase()}</div>
            <div className="text-base whitespace-pre-line">{answer}</div>
          </Card>
        </div>
      )}
    </div>
  );
}