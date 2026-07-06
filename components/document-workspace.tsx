"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, History, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConnectionBadge } from "@/components/connection-badge";
import { SiteFooter } from "@/components/site-footer";
import { VersionPanel } from "@/components/version-panel";
import { SharePanel } from "@/components/share-panel";
import { AiPanel } from "@/components/ai-panel";
import { SyncEngine } from "@/lib/sync/engine";
import { saveLocalDocument, getLocalDocument } from "@/lib/sync/storage";
import type { ConnectionState, DocumentRecord } from "@/types/documents";
import { SNAPSHOT_INTERVAL_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  document: DocumentRecord;
  userId: string;
};

export function DocumentWorkspace({ document, userId }: Props) {
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [connection, setConnection] = useState<ConnectionState>("online");
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const engineRef = useRef<SyncEngine | null>(null);
  const readOnly = document.role === "VIEWER";

  const engine = useMemo(
    () => new SyncEngine(document.id, userId, document.role),
    [document.id, document.role, userId],
  );

  useEffect(() => {
    engineRef.current = engine;

    async function init() {
      await saveLocalDocument({
        id: document.id,
        title: document.title,
        content: document.content,
        clock: document.clock,
        role: document.role,
        updatedAt: document.updatedAt,
        dirty: false,
      });

      await engine.bootstrap({
        id: document.id,
        title: document.title,
        content: document.content,
        clock: document.clock,
        role: document.role,
        updatedAt: document.updatedAt,
        dirty: false,
      });

      await engine.pullOnly();

      const local = await getLocalDocument(document.id);
      if (local) setContent(local.content);
    }

    const unsubscribe = engine.onConnectionChange(setConnection);
    const unsubscribeContent = engine.onContentChange(setContent);
    void init();

    const snapshotTimer = setInterval(() => {
      void fetch(`/api/docs/${document.id}/versions`, { method: "POST" });
    }, SNAPSHOT_INTERVAL_MS);

    const pullTimer = setInterval(() => {
      void engine.pullOnly();
    }, 4_000);

    return () => {
      unsubscribe();
      unsubscribeContent();
      engine.dispose();
      clearInterval(snapshotTimer);
      clearInterval(pullTimer);
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
            <ConnectionBadge state={connection} />
            <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
              <History className="size-4" />
              History
            </Button>
            {document.role === "OWNER" ? (
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
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
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
    </div>
  );
}
