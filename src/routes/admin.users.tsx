import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { adminUsers } from "@/lib/mock-data";
import { Search } from "lucide-react";

export const Route = createFileRoute("/admin/users")({ component: AdminUsers });

function AdminUsers() {
  return (
    <div>
      <PageHeader title="User Management" description="Manage students, plans, and access." />
      <Card className="p-4 mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users…" className="pl-9" />
        </div>
        <Button className="gradient-primary-bg text-white border-0">Invite user</Button>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {adminUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell><Badge variant={u.plan === "Pro" ? "default" : u.plan === "Campus" ? "secondary" : "outline"}>{u.plan}</Badge></TableCell>
                <TableCell><Badge variant={u.status === "Active" ? "default" : "outline"} className={u.status === "Active" ? "bg-emerald-500 hover:bg-emerald-600" : ""}>{u.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.joined}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}