import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/languages")({ component: LanguagesPage });

const langs = [
  { code: "en", name: "English", q: "What is normalization in databases?", a: "Normalization is the process of organizing data to reduce redundancy and improve integrity." },
  { code: "hi", name: "Hindi", q: "डेटाबेस में नॉर्मलाइज़ेशन क्या है?", a: "नॉर्मलाइज़ेशन डेटा को इस तरह व्यवस्थित करने की प्रक्रिया है जिससे दोहराव कम हो और शुद्धता बढ़े।" },
  { code: "gu", name: "Gujarati", q: "ડેટાબેઝમાં નોર્મલાઇઝેશન શું છે?", a: "નોર્મલાઇઝેશન એ ડેટાને એવી રીતે ગોઠવવાની પ્રક્રિયા છે જે પુનરાવર્તન ઘટાડે અને શુદ્ધતા વધારે." },
];

function LanguagesPage() {
  const [lang, setLang] = useState(langs[0]);
  return (
    <div>
      <PageHeader title="Multi-language Learning" description="Learn in the language you think in." />
      <Card className="p-5 mb-6 flex flex-wrap gap-2">
        {langs.map((l) => (
          <Button key={l.code} size="sm" variant={lang.code === l.code ? "default" : "outline"}
            className={lang.code === l.code ? "gradient-primary-bg text-white border-0" : ""}
            onClick={() => setLang(l)}>{l.name}</Button>
        ))}
      </Card>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="text-xs font-bold text-primary mb-2">QUESTION</div>
          <div className="text-lg font-semibold">{lang.q}</div>
        </Card>
        <Card className="p-6 gradient-soft-bg border-0">
          <div className="text-xs font-bold text-primary mb-2">ANSWER</div>
          <div className="text-base">{lang.a}</div>
        </Card>
      </div>
    </div>
  );
}