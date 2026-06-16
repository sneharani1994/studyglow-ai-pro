import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/app/handwritten")({ component: HandwrittenPage });

function HandwrittenPage() {
  return (
    <div>
      <PageHeader title="Handwritten Notes" description="Snap your notebook. We'll turn it into searchable text." />
      <Card className="p-8 mb-6 border-2 border-dashed text-center bg-muted/20">
        <Upload className="h-10 w-10 mx-auto text-primary mb-3" />
        <h3 className="font-semibold">Upload notebook images</h3>
        <p className="text-sm text-muted-foreground">JPG, PNG, HEIC — multiple pages supported.</p>
        <Button className="mt-4 gradient-primary-bg text-white border-0">Choose files</Button>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Original image</h3>
          <div className="aspect-[3/4] rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 grid place-items-center text-muted-foreground font-handwriting italic p-6 text-center">
            "Normalization is the process of removing redundancy from a database…"
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Extracted text (OCR)</h3>
          <p className="text-sm leading-relaxed">Normalization is the process of removing redundancy from a database design. It progresses through normal forms — 1NF, 2NF, 3NF, BCNF — each adding stricter rules to eliminate anomalies.</p>
        </Card>
        <Card className="p-6 gradient-soft-bg border-0">
          <h3 className="font-semibold mb-3">AI-converted notes</h3>
          <p className="text-sm leading-relaxed">📘 <b>Database Normalization</b><br/>A method to organize tables and reduce redundancy.<br/><br/>• <b>1NF:</b> atomic values<br/>• <b>2NF:</b> no partial dep<br/>• <b>3NF:</b> no transitive dep<br/>• <b>BCNF:</b> every determinant is a candidate key</p>
        </Card>
      </div>
    </div>
  );
}