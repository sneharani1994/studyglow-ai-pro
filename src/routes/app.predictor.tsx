import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { TrendingUp } from "lucide-react";
import { predictorQuestions } from "@/lib/mock-data";

export const Route = createFileRoute("/app/predictor")({
  component: PredictorPage,
});

const buckets = [
  { key: "high", title: "High Probability", color: "from-emerald-500 to-teal-500", items: predictorQuestions.high },
  { key: "medium", title: "Medium Probability", color: "from-amber-500 to-orange-500", items: predictorQuestions.medium },
  { key: "low", title: "Low Probability", color: "from-slate-400 to-slate-500", items: predictorQuestions.low },
];

function PredictorPage() {
  return (
    <div>
      <PageHeader title="AI Exam Predictor" description="Likely exam questions ranked by historical probability." />
      <div className="grid lg:grid-cols-3 gap-6">
        {buckets.map((b) => (
          <div key={b.key}>
            <div className={`rounded-xl p-4 text-white bg-gradient-to-br ${b.color} mb-4 flex items-center gap-2`}>
              <TrendingUp className="h-4 w-4" />
              <span className="font-semibold">{b.title}</span>
            </div>
            <div className="space-y-3">
              {b.items.map((q, i) => (
                <Card key={i} className="p-4">
                  <Badge variant="secondary" className="text-xs">{q.topic}</Badge>
                  <div className="font-medium mt-2">{q.q}</div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-muted-foreground">Probability</div>
                    <div className="font-bold gradient-text">{q.prob}%</div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
                    <div className="h-full gradient-primary-bg" style={{ width: `${q.prob}%` }} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}