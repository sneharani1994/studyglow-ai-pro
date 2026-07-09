import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Download, Save, RotateCw } from "lucide-react";
import { toast } from "sonner";

interface SummaryCardProps {
  title: string;
  markdown: string;
  onRegenerate: () => void;
  onCopy: () => void;
  onDownloadPDF: () => void;
  onDownloadMD: () => void;
  onSave: () => void;
}

export function SummaryCard({ title, markdown, onRegenerate, onCopy, onDownloadPDF, onDownloadMD, onSave }: SummaryCardProps) {
  return (
    <Card className="p-6 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl transition-shadow">
      <h2 className="text-2xl font-bold mb-4 text-foreground">{title}</h2>
      <pre className="whitespace-pre-wrap text-sm text-foreground mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>{markdown}</pre>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onCopy} className="flex items-center">
          <Copy className="h-4 w-4 mr-1" /> Copy
        </Button>
        <Button size="sm" variant="outline" onClick={onDownloadPDF} className="flex items-center">
          <Download className="h-4 w-4 mr-1" /> PDF
        </Button>
        <Button size="sm" variant="outline" onClick={onDownloadMD} className="flex items-center">
          <Download className="h-4 w-4 mr-1" /> MD
        </Button>
        <Button size="sm" variant="outline" onClick={onSave} className="flex items-center">
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
        <Button size="sm" variant="default" onClick={onRegenerate} className="flex items-center">
          <RotateCw className="h-4 w-4 mr-1" /> Regenerate
        </Button>
      </div>
    </Card>
  );
}
