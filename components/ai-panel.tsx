"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  selection: string;
  onApply: (value: string) => void;
};

export function AiPanel({ open, onOpenChange, documentId, selection, onApply }: Props) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function run(action: "summarize" | "improve") {
    setLoading(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, action, selection }),
      });
      const payload = (await response.json()) as { result?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "AI request failed");
      setResult(payload.result ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>AI assistant</SheetTitle>
          <SheetDescription>Summarize or improve the current document.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" disabled={loading} onClick={() => void run("summarize")}>
            Summarize
          </Button>
          <Button variant="outline" disabled={loading} onClick={() => void run("improve")}>
            Improve writing
          </Button>
        </div>

        <Textarea
          className="mt-4 min-h-48"
          value={result}
          onChange={(event) => setResult(event.target.value)}
          placeholder="AI output appears here"
          aria-label="AI output"
        />

        {result ? (
          <Button className="mt-3" onClick={() => onApply(result)}>
            Apply to document
          </Button>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
