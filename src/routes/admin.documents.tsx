import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { documents } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/documents")({ component: AdminDocs });

function AdminDocs() {
  return (
    <div>
      <PageHeader title="Document Management" description="All documents uploaded across the platform." />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Owner</TableHead><TableHead>Size</TableHead><TableHead>Status</TableHead><TableHead>Uploaded</TableHead></TableRow></TableHeader>
          <TableBody>
            {documents.map((d, i) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-muted-foreground">{["Aisha Khan", "Rohan Mehta", "Priya Sharma"][i % 3]}</TableCell>
                <TableCell>{d.size}</TableCell>
                <TableCell><Badge variant={d.status === "Processing" ? "secondary" : "default"}>{d.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}