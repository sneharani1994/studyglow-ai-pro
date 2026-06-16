import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StickyNote, HelpCircle, Calculator, Layers, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/app/revision")({ component: RevisionPage });

const sections = [
  { icon: StickyNote, title: "Quick Notes", items: ["Normalization: 1NF→atomic, 2NF→full key, 3NF→no transitive", "TCP: reliable, ordered, connection-oriented", "Deadlock: mutual exclusion + hold-wait + no preempt + circular wait"] },
  { icon: HelpCircle, title: "Important Questions", items: ["Difference between B-tree and B+ tree", "ACID properties with examples", "Banker's algorithm walkthrough"] },
  { icon: Calculator, title: "Formula Sheet", items: ["CPU utilization = busy time / total time", "Page fault rate = faults / references", "Throughput = jobs / unit time"] },
  { icon: Layers, title: "Flashcards (5 sets)", items: ["DBMS Core · 24 cards", "OS Essentials · 18 cards", "Networks Fundamentals · 22 cards"] },
  { icon: Lightbulb, title: "Exam Tips", items: ["Attempt easier questions first to build momentum", "Always draw diagrams for system design questions", "Underline keywords like 'compare', 'justify', 'explain'"] },
];

function RevisionPage() {
  return (
    <div>
      <PageHeader title="Revision Mode" description="Everything you need the night before, in one place." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Card key={s.title} className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-lg gradient-primary-bg grid place-items-center text-white">
                <s.icon className="h-4 w-4" />
              </div>
              <h3 className="font-semibold">{s.title}</h3>
            </div>
            <ul className="text-sm space-y-2 text-muted-foreground">
              {s.items.map((it) => <li key={it}>• {it}</li>)}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}