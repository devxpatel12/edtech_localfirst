"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { FileText, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/site-footer";
import type { DocumentRecord } from "@/types/documents";
import { toast } from "sonner";

export function DashboardShell({ initialDocuments }: { initialDocuments: DocumentRecord[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void refreshDocuments();
  }, []);

  async function refreshDocuments() {
    const response = await fetch("/api/docs");
    if (!response.ok) return;
    const payload = (await response.json()) as { documents: DocumentRecord[] };
    setDocuments(payload.documents);
  }

  async function createDocument() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
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
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5" aria-hidden />
            <h1 className="text-lg font-semibold">Documents</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="size-4" />
            Sign out
          </Button>
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
              onKeyDown={(event) => {
                if (event.key === "Enter") void createDocument();
              }}
            />
            <Button onClick={() => void createDocument()} disabled={creating || !title.trim()}>
              <Plus className="size-4" />
              Create
            </Button>
          </CardContent>
        </Card>

        <section aria-label="Document list" className="grid gap-3">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet. Create one to get started.</p>
          ) : (
            documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.id}`}
                className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Updated {new Date(doc.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{doc.role.toLowerCase()}</Badge>
                </div>
              </Link>
            ))
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
