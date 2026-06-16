import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/concept-maps")({ component: ConceptMapPage });

const branches = [
  { name: "SQL", children: ["DDL", "DML", "Joins", "Views"] },
  { name: "Transactions", children: ["ACID", "Isolation", "Locking"] },
  { name: "Normalization", children: ["1NF", "2NF", "3NF", "BCNF"] },
  { name: "Indexing", children: ["B+ Tree", "Hash", "Bitmap"] },
];

function ConceptMapPage() {
  return (
    <div>
      <PageHeader title="Concept Maps" description="See how every idea connects." />
      <Card className="p-10 overflow-x-auto">
        <div className="min-w-[700px] flex flex-col items-center gap-8">
          <div className="rounded-2xl gradient-primary-bg text-white px-8 py-4 font-bold text-lg shadow-glow">DBMS</div>
          <div className="grid grid-cols-4 gap-6 w-full">
            {branches.map((b) => (
              <div key={b.name} className="flex flex-col items-center gap-3">
                <div className="h-px w-px relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-px h-8 bg-border" />
                </div>
                <div className="rounded-xl glass px-4 py-2 font-semibold text-sm">{b.name}</div>
                <div className="space-y-2 w-full">
                  {b.children.map((c) => (
                    <div key={c} className="rounded-lg border bg-card px-3 py-2 text-xs text-center hover:shadow-card transition-all hover:-translate-y-0.5 cursor-pointer">
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}