import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Download, FileBarChart } from "lucide-react";

export const Route = createFileRoute("/admin/reports")({ component: AdminReports });

const reports = [
  { name: "Monthly platform usage", desc: "User engagement, AI requests, retention.", date: "Jun 2026" },
  { name: "Subject performance trends", desc: "Quiz scores and weak topics by subject.", date: "Jun 2026" },
  { name: "Subscription revenue", desc: "MRR, churn, plan distribution.", date: "Jun 2026" },
  { name: "Activity logs", desc: "Per-user activity audit trail.", date: "Jun 2026" },
];

function AdminReports() {
  return (
    <div>
      <PageHeader title="Reports" description="Exportable platform reports." />
      <div className="grid md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Card key={r.name} className="p-5 flex items-start gap-4">
            <div className="h-11 w-11 rounded-lg gradient-primary-bg grid place-items-center text-white shrink-0">
              <FileBarChart className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-muted-foreground">{r.desc}</div>
              <div className="text-xs text-muted-foreground mt-1">{r.date}</div>
            </div>
            <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}