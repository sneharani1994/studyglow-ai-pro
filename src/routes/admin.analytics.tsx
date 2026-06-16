import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { studyHoursData, quizScoresData } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/analytics")({ component: AdminAnalytics });

function AdminAnalytics() {
  return (
    <div>
      <PageHeader title="Analytics" description="Platform engagement and learning outcomes." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Daily active users</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={studyHoursData}>
              <XAxis dataKey="day" tickLine={false} axisLine={false} /><Tooltip />
              <Line dataKey="hours" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: "#8b5cf6" }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Subject popularity</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={quizScoresData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} /><Tooltip />
              <Bar dataKey="score" fill="#ec4899" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}