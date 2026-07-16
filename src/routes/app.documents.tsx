import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Upload, FileText, FileImage, FileType, Trash2, Eye, Search, Filter, Download, Pencil } from "lucide-react";
import { uploadsService, type UploadedFile } from "@/lib/api";
import { toast } from "sonner";
import { emitAppRefresh } from "@/lib/events";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<string>('newest');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameFile, setRenameFile] = useState<UploadedFile | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = () => uploadsService.list().then(setDocs).catch(() => setDocs([]));
  useEffect(() => { load(); }, []);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<UploadedFile | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateFile, setDuplicateFile] = useState<File | null>(null);
  const [duplicateExisting, setDuplicateExisting] = useState<UploadedFile | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const initialProgress: Record<string, number> = {};
    Array.from(files).forEach((f) => (initialProgress[f.name] = 0));
    setUploadProgress((prev) => ({ ...prev, ...initialProgress }));
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const existing = docs.find((d) => d.filename === f.name && d.file_size === f.size);
        if (existing) {
          setDuplicateFile(f);
          setDuplicateExisting(existing);
          setDuplicateOpen(true);
          setUploadProgress((p) => {
            const { [f.name]: _, ...rest } = p;
            return rest;
          });
          continue;
        }
        await uploadsService.upload(f);
        setUploadProgress((p) => ({ ...p, [f.name]: 100 }));
      }
      await load();
      emitAppRefresh({ source: "uploads" });
      toast.success("Upload complete");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress({}), 2000);
    }
  };

  return (
    <div>
      <PageHeader title="Documents" description="Your private AI-powered knowledge base." />

      {/* Upload Zone */}
      <Card
        onClick={() => fileInput.current?.click()}
        className="p-10 mb-6 border-2 border-dashed text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
      >
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <div className="h-16 w-16 rounded-2xl gradient-primary-bg grid place-items-center text-white mx-auto mb-4">
          <Upload className="h-7 w-7" />
        </div>
        <h3 className="font-semibold text-lg">{uploading ? "Uploading…" : "Drag & drop files or click to upload"}</h3>
        <p className="text-sm text-muted-foreground mt-1">PDF, DOCX, PPT, images, and handwritten notes — up to 50MB each.</p>
        {Object.entries(uploadProgress).map(([name, percent]) => (
          <div key={name} className="mt-2 w-full max-w-md mx-auto">
            <div className="text-sm text-muted-foreground mb-1">{name}</div>
            <div className="w-full bg-muted rounded h-2">
              <div className="h-2 bg-primary rounded" style={{ width: `${percent}%` }}></div>
            </div>
          </div>
        ))}
      </Card>

      {/* Search, Filter & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-3">
            {['pdf','image','doc','ppt','other'].map((type) => (
              <div key={type} className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id={`filter-${type}`}
                  checked={filterTypes.includes(type)}
                  onCheckedChange={(checked) => {
                    setFilterTypes((prev) =>
                      checked ? [...prev, type] : prev.filter((t) => t !== type)
                    );
                  }}
                />
                <label htmlFor={`filter-${type}`} className="text-sm capitalize">{type}</label>
              </div>
            ))}
          </PopoverContent>
        </Popover>
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest → Oldest</SelectItem>
            <SelectItem value="oldest">Oldest → Newest</SelectItem>
            <SelectItem value="sizeDesc">Size (large → small)</SelectItem>
            <SelectItem value="sizeAsc">Size (small → large)</SelectItem>
            <SelectItem value="nameAsc">Name A‑Z</SelectItem>
            <SelectItem value="nameDesc">Name Z‑A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(() => {
          let filtered = docs;
          if (filterTypes.length) {
            filtered = filtered.filter((d) => {
              const type = d.file_type.toLowerCase();
              if (type.includes('pdf')) return filterTypes.includes('pdf');
              if (type.startsWith('image/')) return filterTypes.includes('image');
              if (type.includes('word') || type.includes('presentation') || type.includes('powerpoint')) return filterTypes.includes('doc');
              return filterTypes.includes('other');
            });
          }
          if (query) {
            filtered = filtered.filter((d) => d.filename.toLowerCase().includes(query.toLowerCase()));
          }
          const sorted = [...filtered].sort((a, b) => {
            switch (sortOption) {
              case 'newest':
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              case 'oldest':
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              case 'sizeDesc':
                return b.file_size - a.file_size;
              case 'sizeAsc':
                return a.file_size - b.file_size;
              case 'nameAsc':
                return a.filename.localeCompare(b.filename);
              case 'nameDesc':
                return b.filename.localeCompare(a.filename);
              default:
                return 0;
            }
          });
          if (sorted.length === 0) {
            return <div className="text-sm text-muted-foreground col-span-full">No documents match your criteria.</div>;
          }
          return (
            <>
              {sorted.map((d) => {
                const Icon = iconFor(d.file_type);
                return (
                  <Card key={d.id} className="p-5 flex flex-col justify-between bg-white/70 backdrop-blur-md border hover:shadow-lg transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{d.filename}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {prettySize(d.file_size)} · {new Date(d.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-2">
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => { setPreviewFile(d); setPreviewOpen(true); }}>
                        <Eye className="h-3.5 w-3.5 mr-2" /> Preview
                      </Button>
                      <a className="flex-1" href={d.file_url} download target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground px-2">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-primary px-2" onClick={() => { setRenameFile(d); setNewFileName(d.filename); setRenameOpen(true); }}>
  <Pencil className="h-4 w-4" />
</Button>
<Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive px-2" onClick={() => { setDocToDelete(d); setDeleteOpen(true); }}>
  <Trash2 className="h-4 w-4" />
</Button>
                    </div>
                  </Card>
                );
              })}
            </>
          );
        })()}

        {/* Rename Dialog */}
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Document</DialogTitle>
              <DialogDescription>Enter a new name for the selected file.</DialogDescription>
            </DialogHeader>
            <Input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button disabled={!newFileName.trim()} onClick={async () => {
                if (renameFile) {
                  await uploadsService.rename(renameFile.id, newFileName.trim());
                  await load();
                  setRenameOpen(false);
                  toast.success('File renamed');
                }
              }}>Rename</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewFile?.filename}</DialogTitle>
            </DialogHeader>
            {previewFile && previewFile.file_type.startsWith('image/') ? (
              <img src={previewFile.file_url} alt={previewFile.filename} className="w-full h-auto" />
            ) : previewFile && previewFile.file_type.includes('pdf') ? (
              <iframe src={previewFile.file_url} className="w-full h-[70vh]" />
            ) : (
              <p className="text-center text-muted-foreground">Preview not available for this file type.</p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Duplicate Upload Modal */}
        <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicate File Detected</DialogTitle>
              <DialogDescription>
                A file named "{duplicateFile?.name}" already exists. How would you like to proceed?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col space-y-2">
              <Button
                variant="destructive"
                onClick={async () => {
                  // Replace existing
                  if (duplicateExisting) {
                    await uploadsService.delete(duplicateExisting.id);
                  }
                  if (duplicateFile) {
                    await uploadsService.upload(duplicateFile);
                    await load();
                    emitAppRefresh({ source: "uploads" });
                  }
                  setDuplicateOpen(false);
                }}
              >
                Replace Existing
              </Button>
              <Button
                variant="default"
                onClick={async () => {
                  // Keep both (upload as new)
                  if (duplicateFile) {
                    await uploadsService.upload(duplicateFile);
                    await load();
                    emitAppRefresh({ source: "uploads" });
                  }
                  setDuplicateOpen(false);
                }}
              >
                Keep Both
              </Button>
              <Button variant="outline" onClick={() => setDuplicateOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
{/* Delete Confirmation Dialog */}
<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete Document</DialogTitle>
      <DialogDescription>Are you sure you want to delete "{docToDelete?.filename}"? This action cannot be undone.</DialogDescription>
    </DialogHeader>
    <DialogFooter className="flex justify-between">
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button variant="destructive" disabled={!docToDelete} onClick={async () => {
        if (docToDelete) {
          await uploadsService.delete(docToDelete.id);
          await load();
          emitAppRefresh({ source: "uploads" });
          setDeleteOpen(false);
          toast.success('File deleted');
        }
      }}>
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>      </div>
    </div>
  );
}