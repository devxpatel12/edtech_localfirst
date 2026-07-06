"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocumentVersion } from "@/types/documents";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  canRestore: boolean;
  onRestore: (content: string) => void;
};

export function VersionPanel({ open, onOpenChange, documentId, canRestore, onRestore }: Props) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    void loadVersions();
  }, [open, documentId]);

  async function loadVersions() {
    setLoading(true);
    try {
      const response = await fetch(`/api/docs/${documentId}/versions`);
      if (!response.ok) throw new Error("Failed to load versions");
      const payload = (await response.json()) as { versions: DocumentVersion[] };
      setVersions(payload.versions);
    } catch {
      toast.error("Could not load version history");
    } finally {
      setLoading(false);
    }
  }

  async function restore(versionId: string) {
    const response = await fetch(`/api/docs/${documentId}/versions/${versionId}/restore`, {
      method: "POST",
    });
    if (!response.ok) {
      toast.error("Restore failed");
      return;
    }
    const payload = (await response.json()) as { document: { content: string } };
    onRestore(payload.document.content);
    toast.success("Version restored");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Version history</SheetTitle>
          <SheetDescription>Browse snapshots and restore safely.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[70vh] pr-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading versions...</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No snapshots yet.</p>
          ) : (
            <ul className="space-y-3">
              {versions.map((version) => (
                <li key={version.id} className="rounded-md border p-3">
                  <p className="font-medium">{version.label ?? "Snapshot"}</p>
                  <p className="text-xs text-muted-foreground">
                    {version.authorName} · {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{version.content}</p>
                  {canRestore ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => void restore(version.id)}
                    >
                      Restore
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
