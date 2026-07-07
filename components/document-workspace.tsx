"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, History, Loader2, RefreshCw, Sparkles, Trash2, Users } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ConnectionBadge } from "@/components/connection-badge";
import { HeaderUser } from "@/components/header-user";
import { SiteFooter } from "@/components/site-footer";
import { VersionPanel } from "@/components/version-panel";
import { SharePanel } from "@/components/share-panel";
import { AiPanel } from "@/components/ai-panel";
import { SyncEngine } from "@/lib/sync/engine";
import type { ConnectionState, DocumentRecord } from "@/types/documents";
import { SNAPSHOT_INTERVAL_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  document: DocumentRecord;
  userId: string;
};

export function DocumentWorkspace({ document, userId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [connection, setConnection] = useState<ConnectionState>("online");
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const engineRef = useRef<SyncEngine | null>(null);
  const readOnly = document.role === "VIEWER";
  const isOwner = document.role === "OWNER";

  const engine = useMemo(
    () => new SyncEngine(document.id, userId, document.role),
    [document.id, document.role, userId],
  );

  useEffect(() => {
    engineRef.current = engine;

    const unsubscribe = engine.onConnectionChange(setConnection);
    const unsubscribeContent = engine.onContentChange(setContent);

    void engine.start({
      id: document.id,
      title: document.title,
      content: document.content,
      clock: document.clock,
      role: document.role,
      updatedAt: document.updatedAt,
      dirty: false,
    });

    // Snapshot only while online and only for editors (viewers cannot write).
    const snapshotTimer = setInterval(() => {
      if (navigator.onLine && document.role !== "VIEWER") {
        void fetch(`/api/docs/${document.id}/versions`, { method: "POST" });
      }
    }, SNAPSHOT_INTERVAL_MS);

    return () => {
      unsubscribe();
      unsubscribeContent();
      engine.dispose();
      clearInterval(snapshotTimer);
    };
  }, [document, engine]);

  const handleContentChange = useCallback(
    (value: string) => {
      setContent(value);
      void engineRef.current?.applyLocalEdit(value);
    },
    [],
  );

  async function saveTitle() {
    if (readOnly || title === document.title) return;
    const response = await fetch(`/api/docs/${document.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      toast.error("Could not rename document");
      return;
    }
    toast.success("Title updated");
  }

  async function deleteDocument() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/docs/${document.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      toast.success("Document deleted");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Could not delete document");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => void saveTitle()}
              readOnly={readOnly}
              className="max-w-md font-medium"
              aria-label="Document title"
            />
            <Badge variant="secondary">{document.role.toLowerCase()}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HeaderUser />
            <ConnectionBadge state={connection} />
            <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
              <History className="size-4" />
              History
            </Button>
            {isOwner ? (
              <Button variant="outline" size="sm" onClick={() => setShowShare(true)}>
                <Users className="size-4" />
                Share
              </Button>
            ) : null}
            {!readOnly ? (
              <Button variant="outline" size="sm" onClick={() => setShowAi(true)}>
                <Sparkles className="size-4" />
                AI
              </Button>
            ) : null}
            {isOwner ? (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {connection === "offline" || connection === "error" ? (
          <div
            role="status"
            className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:text-amber-300"
          >
            <span>
              {connection === "offline"
                ? "You're offline. Edits are saved on this device and will sync automatically when you reconnect."
                : "Couldn't reach the server. Your edits are safe locally."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void engineRef.current?.refresh()}
            >
              <RefreshCw className="size-4" />
              Retry sync
            </Button>
          </div>
        ) : null}

        <Textarea
          value={content}
          onChange={(event) => handleContentChange(event.target.value)}
          readOnly={readOnly}
          className="min-h-[60vh] resize-y text-base leading-7"
          aria-label="Document content"
          placeholder={readOnly ? "You have view-only access." : "Start writing..."}
        />
        {readOnly ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Viewers can read offline copies but cannot push edits to collaborators.
          </p>
        ) : null}
      </main>

      <SiteFooter />

      <VersionPanel
        open={showHistory}
        onOpenChange={setShowHistory}
        documentId={document.id}
        canRestore={!readOnly}
        onRestore={(nextContent) => {
          setContent(nextContent);
          void engineRef.current?.applyLocalEdit(nextContent);
        }}
      />
      <SharePanel open={showShare} onOpenChange={setShowShare} documentId={document.id} />
      <AiPanel
        open={showAi}
        onOpenChange={setShowAi}
        documentId={document.id}
        selection={content}
        onApply={(value) => handleContentChange(value)}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
