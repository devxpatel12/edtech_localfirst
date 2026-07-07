"use client";

import { useCallback, useState } from "react";
import { FileText, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SiteFooter } from "@/components/site-footer";
import { HeaderUser } from "@/components/header-user";
import { DocumentCard } from "@/components/document-card";
import type { DocumentRecord } from "@/types/documents";
import { toast } from "sonner";

export function DashboardShell({ initialDocuments }: { initialDocuments: DocumentRecord[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const createDocument = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || creating) return;

    setCreating(true);
    try {
      const response = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!response.ok) throw new Error("Could not create document");
      const payload = (await response.json()) as { document: DocumentRecord };
      setDocuments((prev) => [payload.document, ...prev]);
      setTitle("");
      toast.success("Document created");
    } catch {
      toast.error("Failed to create document");
    } finally {
      setCreating(false);
    }
  }, [title, creating]);

  const handleDeleted = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    toast.success("Document deleted");
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5" aria-hidden />
            <h1 className="text-lg font-semibold">Documents</h1>
          </div>
          <HeaderUser showSignOut />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New document</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Quarterly planning notes"
              aria-label="Document title"
              disabled={creating}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createDocument();
              }}
            />
            <Button onClick={() => void createDocument()} disabled={creating || !title.trim()}>
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create
            </Button>
          </CardContent>
        </Card>

        <section aria-label="Document list" className="grid gap-3">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="size-5" aria-hidden />
              </span>
              <p className="font-medium">No documents yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Create your first document above to start writing offline and syncing automatically.
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} onDeleted={handleDeleted} />
            ))
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
