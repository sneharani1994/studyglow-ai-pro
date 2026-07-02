import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ScanLine } from "lucide-react";

export const Route = createFileRoute("/app/handwritten")({ component: HandwrittenPage });

function HandwrittenPage() {
  return (
    <div>
      <PageHeader title="Handwritten Notes" description="Snap your notebook. We'll turn it into searchable text." />
      <Card className="p-10 text-center">
        <div className="h-12 w-12 rounded-xl gradient-primary-bg grid place-items-center text-white mx-auto mb-4">
          <ScanLine className="h-6 w-6" />
        </div>
        <h3 className="font-semibold text-lg">Handwritten OCR coming soon</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          The backend does not yet expose an OCR endpoint. Once available, you'll be able to upload
          notebook images here and see extracted text plus AI-generated study notes.
        </p>
      </Card>
    </div>
  );
}