import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Upload, FileText, FileImage, FileType, Trash2, Eye, Search, Filter } from "lucide-react";
import { documents } from "@/lib/mock-data";

export const Route = createFileRoute("/app/documents")({
  component: DocumentsPage,
});

const typeIcon = { pdf: FileText, ppt: FileType, doc: FileType, image: FileImage } as const;

function DocumentsPage() {
  return (
    <div>
      <PageHeader title="Documents" description="Your private AI-powered knowledge base." />

      <Card className="p-10 mb-6 border-2 border-dashed text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
        <div className="h-16 w-16 rounded-2xl gradient-primary-bg grid place-items-center text-white mx-auto mb-4">
          <Upload className="h-7 w-7" />
        </div>
        <h3 className="font-semibold text-lg">Drop files here or click to upload</h3>
        <p className="text-sm text-muted-foreground mt-1">PDF, DOCX, PPT, images, and handwritten notes — up to 50MB each.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {["PDF", "DOCX", "PPT", "Images", "Handwritten"].map((t) => (
            <Badge key={t} variant="secondary">{t}</Badge>
          ))}
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents…" className="pl-9" />
        </div>
        <Button variant="outline"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((d) => {
          const Icon = typeIcon[d.type as keyof typeof typeIcon] ?? FileText;
          return (
            <Card key={d.id} className="p-5 hover:shadow-glow transition-all group">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-lg gradient-primary-bg grid place-items-center text-white shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.size} · {d.date}</div>
                  <Badge variant={d.status === "Processing" ? "secondary" : "default"} className="mt-2 text-xs">
                    {d.status}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="outline" className="flex-1"><Eye className="h-3.5 w-3.5 mr-1" />View</Button>
                <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}