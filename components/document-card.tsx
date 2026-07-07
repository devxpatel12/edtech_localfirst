"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DocumentRecord } from "@/types/documents";

type Props = {
  document: DocumentRecord;
  onDeleted: (id: string) => void;
};

export function DocumentCard({ document, onDeleted }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete = document.role === "OWNER";

  async function deleteDocument() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/docs/${document.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      onDeleted(document.id);
    } catch {
      const { toast } = await import("sonner");
      toast.error("Could not delete document");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="group relative flex items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <FileText className="size-4" aria-hidden />
      </span>

      <Link href={`/docs/${document.id}`} className="min-w-0 flex-1">
        <p className="truncate font-medium">{document.title}</p>
        <p className="truncate text-sm text-muted-foreground">
          Updated {new Date(document.updatedAt).toLocaleString()}
        </p>
        <span className="absolute inset-0" aria-hidden />
      </Link>

      <Badge variant="secondary" className="relative z-10 shrink-0">
        {document.role.toLowerCase()}
      </Badge>

      {canDelete ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${document.title}`}
          className="relative z-10 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{document.title}&rdquo; and its version history will be permanently removed for
              all collaborators. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteDocument();
              }}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
