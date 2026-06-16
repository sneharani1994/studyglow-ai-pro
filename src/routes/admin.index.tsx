import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { adminStats, recentActivity } from "@/lib/mock-data";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { progressData } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/")({ component: AdminOverview });

function AdminOverview() {
  return (
    <div>
      <PageHeader title="Overview" description="Platform health at a glance." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {adminStats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-3xl font-bold mt-2 gradient-text">{s.value}</div>
            <Badge variant="secondary" className="mt-2 text-xs">{s.change}</Badge>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Platform growth</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={progressData}>
              <defs>
                <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tickLine={false} axisLine={false} />
              <Tooltip />
              <Area dataKey="progress" stroke="#6366f1" fill="url(#ag)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Recent activity</h3>
          <div className="space-y-3 text-sm">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full gradient-primary-bg mt-1.5" />
                <div className="flex-1"><span className="text-muted-foreground">{a.action}</span> <span className="font-medium">{a.target}</span></div>
                <span className="text-xs text-muted-foreground">{a.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}