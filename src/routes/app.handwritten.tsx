import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ScanLine, Upload, X, Copy, Download, Loader2, Sparkles } from "lucide-react";
import { aiService } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/handwritten")({ component: HandwrittenPage });

function HandwrittenPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notesBusy, setNotesBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    setFile(f);
    setText(""); setNotes(""); setProgress(0);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    accept(e.dataTransfer.files?.[0]);
  }, []);

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setText(""); setNotes(""); setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const extract = async () => {
    if (!file) return;
    setBusy(true); setProgress(0); setText("");
    try {
      const { recognize } = await import("tesseract.js");
      const { data } = await recognize(file, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        },
      });
      const cleaned = (data.text || "").trim();
      if (!cleaned) { toast.error("Couldn't read any text. Try a clearer image."); return; }
      setText(cleaned);
      toast.success("Text extracted");
    } catch {
      toast.error("OCR failed. Try a different image or try again.");
    } finally { setBusy(false); }
  };

  const makeNotes = async () => {
    if (!text.trim()) return;
    setNotesBusy(true);
    try {
      const res = await aiService.generateStudyNotes(text.slice(0, 4000), "standard");
      setNotes(res.studyNotes);
    } catch {
      toast.error("AI service is temporarily busy. Please try again.");
    } finally { setNotesBusy(false); }
  };

  const copyText = async () => {
    try { await navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); }
    catch { toast.error("Copy failed"); }
  };

  const download = () => {
    const blob = new Blob([notes || text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "handwritten-notes.txt";
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Handwritten Notes" description="Snap your notebook. We'll turn it into searchable text." />

      {!preview ? (
        <Card
          className={`p-10 text-center border-2 border-dashed transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="h-12 w-12 rounded-xl gradient-primary-bg grid place-items-center text-white mx-auto mb-4">
            <ScanLine className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg">Drop a handwritten image</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            PNG or JPG. We run OCR in your browser — nothing leaves your device until you generate AI notes.
          </p>
          <div className="mt-5">
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => accept(e.target.files?.[0])} />
            <Button onClick={() => inputRef.current?.click()} className="gradient-primary-bg text-white border-0">
              <Upload className="h-4 w-4 mr-2" />Choose image
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium truncate">{file?.name}</div>
              <Button size="sm" variant="ghost" onClick={clear}><X className="h-4 w-4" /></Button>
            </div>
            <img src={preview} alt="preview" className="rounded-lg w-full object-contain max-h-[420px] bg-muted" />
            <div className="flex gap-2 mt-3">
              <Button onClick={extract} disabled={busy} className="gradient-primary-bg text-white border-0 flex-1">
                {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reading… {progress}%</> : <><ScanLine className="h-4 w-4 mr-2" />Extract text</>}
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Extracted text</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!text} onClick={copyText}><Copy className="h-3.5 w-3.5 mr-1" />Copy</Button>
                <Button size="sm" variant="outline" disabled={!text} onClick={download}><Download className="h-3.5 w-3.5 mr-1" />Download</Button>
              </div>
            </div>
            {text ? (
              <pre className="text-sm whitespace-pre-wrap bg-muted rounded-lg p-3 max-h-[300px] overflow-auto">{text}</pre>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-10">
                {busy ? "Reading your notes…" : "Extracted text will appear here."}
              </div>
            )}
            {text && (
              <div className="mt-4">
                <Button onClick={makeNotes} disabled={notesBusy} variant="secondary" className="w-full">
                  {notesBusy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating notes…</> : <><Sparkles className="h-4 w-4 mr-2" />Generate AI study notes</>}
                </Button>
              </div>
            )}
            {notes && (
              <div className="mt-4 gradient-soft-bg rounded-lg p-4">
                <div className="text-xs font-bold text-primary mb-2">AI STUDY NOTES</div>
                <div className="text-sm whitespace-pre-line leading-relaxed">{notes}</div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}