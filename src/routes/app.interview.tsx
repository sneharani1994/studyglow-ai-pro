import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/app/interview")({ component: InterviewPage });

function InterviewPage() {
  return (
    <div>
      <PageHeader title="Mock Interview" description="Practice with an AI interviewer that thinks like FAANG." />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12"><AvatarFallback className="gradient-primary-bg text-white">AI</AvatarFallback></Avatar>
            <div>
              <div className="font-semibold">Aria · Senior Engineer</div>
              <div className="text-xs text-muted-foreground">Conducting your mock</div>
            </div>
            <Badge variant="secondary" className="ml-auto">Question 3 / 5</Badge>
          </div>
          <Card className="p-5 bg-muted/40 border-dashed">
            <div className="text-xs text-muted-foreground mb-2">Question</div>
            <div className="font-medium">Explain how you would design a URL shortener like bit.ly. Walk me through your data model, scaling strategy, and how you'd handle 100M requests per day.</div>
          </Card>
          <Textarea placeholder="Type your answer…" rows={8} className="mt-4" />
          <Button className="mt-4 w-full gradient-primary-bg text-white border-0">Submit answer</Button>
        </Card>

        <div className="space-y-4">
          <Card className="p-6 text-center">
            <div className="text-xs text-muted-foreground">Live score</div>
            <div className="text-5xl font-bold gradient-text mt-2">7.4</div>
            <div className="text-xs text-muted-foreground">/ 10</div>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Feedback so far</h3>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>✓ Clear structure & STAR format</li>
              <li>✓ Good system design instincts</li>
              <li>→ Quantify trade-offs more</li>
              <li>→ Mention cache invalidation strategy</li>
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold mb-2">Improvement areas</h3>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">Concurrency</Badge>
              <Badge variant="outline">Caching</Badge>
              <Badge variant="outline">Sharding</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}