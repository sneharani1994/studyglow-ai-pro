import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/app/tutor")({ component: TutorPage });

const levels = ["Beginner", "Student", "Advanced", "Interview"] as const;

function TutorPage() {
  const [level, setLevel] = useState<typeof levels[number]>("Student");
  return (
    <div>
      <PageHeader title="AI Tutor Mode" description="Your personal teacher, available 24/7." />
      <Card className="p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <Input placeholder="Ask any doubt…" defaultValue="Explain B+ trees" className="flex-1" />
        <div className="flex gap-2">
          {levels.map((l) => (
            <Button key={l} size="sm" variant={level === l ? "default" : "outline"}
              className={level === l ? "gradient-primary-bg text-white border-0" : ""}
              onClick={() => setLevel(l)}>{l}</Button>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Explanation ({level})</h3>
          </div>
          <p className="text-sm leading-relaxed">A B+ tree is a self-balancing tree where all data lives in the leaves, and leaves are linked together. This makes range queries blazing fast — perfect for database indexes.</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Example</h3>
          <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto">{`Search for key 27:
    [10 | 25]
    /   |   \\
 [5,8] [12,20] [27, 30, 40]
               ↑ found in O(log n)`}</pre>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Practice question</h3>
          <p className="text-sm">In a B+ tree of order 4, how many keys can a leaf node hold? Justify with an example.</p>
          <Button className="mt-4 gradient-primary-bg text-white border-0">Try answering</Button>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Follow-up</h3>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>→ How does insertion handle node overflow?</li>
            <li>→ Compare B-tree vs B+ tree for range queries.</li>
            <li>→ Why are B+ trees preferred for disk-based indexes?</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}