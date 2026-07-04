import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Check, RefreshCw, Download, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface AIResponseProps {
  content: string;
  loading?: boolean;
  error?: string | null;
  onRegenerate?: () => void;
  onRetry?: () => void;
  title?: string;
  pdfFileName?: string;
  emptyState?: React.ReactNode;
  className?: string;
}

/** Reusable AI-response card: markdown + code highlight + copy / regenerate / PDF export / retry. */
export function AIResponse({
  content,
  loading,
  error,
  onRegenerate,
  onRetry,
  title,
  pdfFileName = "ai-response",
  emptyState,
  className,
}: AIResponseProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  const exportPdf = () => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;
      if (title) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        const titleLines = doc.splitTextToSize(title, width);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 20 + 6;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      // Strip markdown symbols for cleaner PDF text
      const plain = content
        .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?|```/g, ""))
        .replace(/[*_`>#]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
      const lines = doc.splitTextToSize(plain, width);
      for (const line of lines) {
        if (y > pageHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 15;
      }
      doc.save(`${pdfFileName}.pdf`);
      toast.success("PDF exported");
    } catch {
      toast.error("PDF export failed");
    }
  };

  if (loading) {
    return (
      <Card className={`p-10 text-center text-sm text-muted-foreground ${className ?? ""}`}>
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
        <div className="inline-flex items-center gap-1">
          Thinking
          <span className="inline-flex gap-0.5">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
          </span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-8 text-center ${className ?? ""}`}>
        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-destructive" />
        <div className="text-sm text-muted-foreground mb-4">{error}</div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        )}
      </Card>
    );
  }

  if (!content) return emptyState ? <>{emptyState}</> : null;

  return (
    <Card className={`p-6 ${className ?? ""}`}>
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button size="sm" variant="ghost" onClick={copy} title="Copy">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={exportPdf} title="Export PDF">
          <Download className="h-4 w-4" />
        </Button>
        {onRegenerate && (
          <Button size="sm" variant="ghost" onClick={onRegenerate} title="Regenerate">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code(props) {
              const { className, children, ...rest } = props as {
                className?: string;
                children?: React.ReactNode;
              };
              const match = /language-(\w+)/.exec(className || "");
              const text = String(children ?? "").replace(/\n$/, "");
              if (match) {
                return (
                  <SyntaxHighlighter
                    style={oneDark as never}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{ borderRadius: "0.5rem", fontSize: "0.85rem", margin: 0 }}
                  >
                    {text}
                  </SyntaxHighlighter>
                );
              }
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </Card>
  );
}