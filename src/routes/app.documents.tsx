import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Upload, FileText, FileImage, FileType, Trash2, Eye, Search, Filter } from "lucide-react";
import { uploadsService, type UploadedFile } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/documents")({
  component: DocumentsPage,
});

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("pdf")) return FileText;
  if (mime.includes("word") || mime.includes("presentation") || mime.includes("powerpoint")) return FileType;
  return FileText;
}

function prettySize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function DocumentsPage() {
  const [docs, setDocs] = useState<UploadedFile[]>([]);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = () => uploadsService.list().then(setDocs).catch(() => setDocs([]));
  useEffect(() => { load(); }, []);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) await uploadsService.upload(f);
      await load();
      toast.success("Upload complete");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally { setUploading(false); }
  };

  const visible = docs.filter((d) => d.filename.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <PageHeader title="Documents" description="Your private AI-powered knowledge base." />

      <Card
        onClick={() => fileInput.current?.click()}
        className="p-10 mb-6 border-2 border-dashed text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
      >
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <div className="h-16 w-16 rounded-2xl gradient-primary-bg grid place-items-center text-white mx-auto mb-4">
          <Upload className="h-7 w-7" />
        </div>
        <h3 className="font-semibold text-lg">{uploading ? "Uploading…" : "Drop files here or click to upload"}</h3>
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
          <Input placeholder="Search documents…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button variant="outline"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.length === 0 ? (
          <div className="text-sm text-muted-foreground col-span-full">No documents yet.</div>
        ) : visible.map((d) => {
          const Icon = iconFor(d.file_type);
          return (
            <Card key={d.id} className="p-5 hover:shadow-glow transition-all group">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-lg gradient-primary-bg grid place-items-center text-white shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{d.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {prettySize(d.file_size)} · {new Date(d.created_at).toLocaleDateString()}
                  </div>
                  <Badge variant="default" className="mt-2 text-xs">Ready</Badge>
                </div>
              </div>
              <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a className="flex-1" href={d.file_url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="w-full"><Eye className="h-3.5 w-3.5 mr-1" />View</Button>
                </a>
                <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}