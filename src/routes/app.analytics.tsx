import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { studyHoursData, quizScoresData, progressData } from "@/lib/mock-data";

export const Route = createFileRoute("/app/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const cards = [
    { label: "Weekly progress", value: "+24%", sub: "vs last week" },
    { label: "Monthly progress", value: "+86%", sub: "this month" },
    { label: "Learning streak", value: "14 days", sub: "🔥 keep going" },
    { label: "Accuracy rate", value: "82%", sub: "across quizzes" },
  ];
  return (
    <div>
      <PageHeader title="Analytics" description="The numbers behind your progress." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="text-3xl font-bold gradient-text mt-2">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.sub}</div>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Study hours (this week)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={studyHoursData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Area dataKey="hours" stroke="#8b5cf6" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Quiz scores by subject</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={quizScoresData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="score" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Learning progress over time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={progressData}>
              <XAxis dataKey="week" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Line dataKey="progress" stroke="#ec4899" strokeWidth={3} dot={{ r: 5, fill: "#ec4899" }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}