import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { documents } from "@/lib/mock-data";

export const Route = createFileRoute("/app/summaries")({
  component: SummariesPage,
});

const sections = [
  { title: "Overview", body: "Database normalization is the process of structuring relational data to minimize redundancy and dependency. It progresses through normal forms (1NF, 2NF, 3NF, BCNF) each adding stricter rules." },
  { title: "Key Concepts", body: "Functional dependency · Transitive dependency · Candidate keys · Decomposition · Lossless joins · Dependency preservation." },
  { title: "Important Points", body: "• 1NF: atomic values\n• 2NF: no partial dependency\n• 3NF: no transitive dependency\n• BCNF: every determinant is a candidate key" },
  { title: "Exam Notes", body: "Likely 6-mark question: convert a given relation to 3NF and justify each step. Watch for trick examples with composite keys." },
  { title: "Quick Revision", body: "Memorize: 1NF→atomic, 2NF→full key, 3NF→no transitive, BCNF→determinant=key. Practice 3 conversions/day." },
];

function SummariesPage() {
  return (
    <div>
      <PageHeader title="AI Summaries" description="Long PDF? Get the essence in 60 seconds." />
      <Card className="p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Select document</label>
          <Select defaultValue={documents[0].name}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {documents.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button className="gradient-primary-bg text-white border-0 hover:opacity-90">
          <Sparkles className="h-4 w-4 mr-2" /> Generate summary
        </Button>
      </Card>
      <div className="grid lg:grid-cols-2 gap-4">
        {sections.map((s) => (
          <Card key={s.title} className="p-6">
            <h3 className="font-semibold text-lg gradient-text">{s.title}</h3>
            <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line leading-relaxed">{s.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}