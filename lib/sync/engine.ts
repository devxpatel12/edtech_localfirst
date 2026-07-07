import type { ConnectionState, SyncResponse } from "@/types/documents";
import { SYNC_DEBOUNCE_MS, SYNC_POLL_MS } from "@/lib/constants";
import { incrementClock, mergeClocks } from "@/lib/sync/clocks";
import { diffToOps, rebuildContent } from "@/lib/sync/operations";
import {
  clearPendingOps,
  getClientId,
  getLocalDocument,
  getPendingOps,
  queuePendingOp,
  saveLocalDocument,
  type LocalDocument,
} from "@/lib/sync/storage";

type Listener = (state: ConnectionState) => void;
type ContentListener = (content: string) => void;

export class SyncEngine {
  private documentId: string;
  private userId: string;
  private role: LocalDocument["role"];
  private clientId = "";
  private seq = 0;
  private content = "";
  private clock: Record<string, number> = {};
  private connection: ConnectionState = "online";
  private listeners = new Set<Listener>();
  private contentListeners = new Set<ContentListener>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastPulledAt = new Date(0).toISOString();
  private syncing = false;

  constructor(documentId: string, userId: string, role: LocalDocument["role"]) {
    this.documentId = documentId;
    this.userId = userId;
    this.role = role;
  }

  async start(server: LocalDocument) {
    this.clientId = await getClientId();

    const local = await getLocalDocument(this.documentId);
    const pending = await getPendingOps(this.documentId);
    this.seq = pending.reduce((max, op) => Math.max(max, op.seq), 0);

    const localIsAuthoritative =
      !!local &&
      (local.dirty ||
        pending.length > 0 ||
        new Date(local.updatedAt).getTime() >= new Date(server.updatedAt).getTime());

    const seed = localIsAuthoritative && local ? local : server;
    this.content = seed.content;
    this.clock = seed.clock ?? {};
    this.role = server.role;

    await saveLocalDocument({
      id: this.documentId,
      title: server.title || seed.title || "Untitled",
      content: this.content,
      clock: this.clock,
      role: this.role,
      updatedAt: seed.updatedAt,
      dirty: pending.length > 0,
    });

    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    this.setConnection(navigator.onLine ? "online" : "offline");
    this.notifyContentChange();

    this.pollTimer = setInterval(() => {
      void this.refresh();
    }, SYNC_POLL_MS);

    await this.refresh();
  }

  async refresh() {
    await this.sync();
    await this.pullOnly();
  }

  dispose() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    if (this.flushTimer) clearTimeout(this.flushTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  getContent() {
    return this.content;
  }

  onConnectionChange(listener: Listener) {
    this.listeners.add(listener);
    listener(this.connection);
    return () => this.listeners.delete(listener);
  }

  onContentChange(listener: ContentListener) {
    this.contentListeners.add(listener);
    listener(this.content);
    return () => this.contentListeners.delete(listener);
  }

  private notifyContentChange() {
    for (const listener of this.contentListeners) {
      listener(this.content);
    }
  }

  async applyLocalEdit(nextContent: string) {
    if (this.role === "VIEWER") return;

    const previous = this.content;
    this.content = nextContent;
    this.clock = incrementClock(this.clock, this.clientId);
    this.seq += 1;

    const opBase = {
      id: crypto.randomUUID(),
      documentId: this.documentId,
      userId: this.userId,
      clock: { ...this.clock },
      clientId: this.clientId,
      seq: this.seq,
      createdAt: new Date().toISOString(),
    };

    const ops = diffToOps(previous, nextContent, opBase);
    for (let i = 0; i < ops.length; i += 1) {
      if (i > 0) {
        this.seq += 1;
        this.clock = incrementClock(this.clock, this.clientId);
      }

      await queuePendingOp({
        ...ops[i],
        id: i === 0 ? ops[i].id : crypto.randomUUID(),
        seq: this.seq,
        clock: { ...this.clock },
      });
    }

    await saveLocalDocument({
      id: this.documentId,
      title: (await getLocalDocument(this.documentId))?.title ?? "Untitled",
      content: this.content,
      clock: this.clock,
      role: this.role,
      updatedAt: new Date().toISOString(),
      dirty: true,
    });

    this.notifyContentChange();
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      void this.sync();
    }, SYNC_DEBOUNCE_MS);
  }

  private handleOnline = () => {
    this.setConnection("online");
    void this.refresh();
  };

  private handleOffline = () => {
    this.setConnection("offline");
  };

  private setConnection(state: ConnectionState) {
    this.connection = state;
    for (const listener of this.listeners) listener(state);
  }

  async sync() {
    if (!navigator.onLine || this.role === "VIEWER" || this.syncing) return;

    const pending = await getPendingOps(this.documentId);
    if (pending.length === 0) return;

    this.syncing = true;
    this.setConnection("syncing");

    try {
      const response = await fetch(`/api/docs/${this.documentId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: this.documentId,
          clientId: this.clientId,
          sinceSeq: 0,
          clock: this.clock,
          operations: pending,
        }),
      });

      if (!response.ok) {
        throw new Error("Sync failed");
      }

      const payload = (await response.json()) as SyncResponse;
      await this.mergeRemote(payload, pending.map((op) => op.id));
      this.setConnection("online");
    } catch {
      this.setConnection(navigator.onLine ? "error" : "offline");
    } finally {
      this.syncing = false;
    }
  }

  private async mergeRemote(payload: SyncResponse, acknowledged: string[]) {
    if (acknowledged.length > 0) {
      await clearPendingOps(this.documentId, acknowledged);
    }

    const pending = await getPendingOps(this.documentId);

    if (pending.length === 0) {
      this.content = payload.content;
    } else {
      this.content = rebuildContent(payload.content, pending);
    }

    this.clock = mergeClocks(this.clock, payload.clock);
    this.lastPulledAt = new Date().toISOString();

    const local = await getLocalDocument(this.documentId);
    if (!local) return;

    await saveLocalDocument({
      ...local,
      content: this.content,
      clock: this.clock,
      dirty: pending.length > 0,
      updatedAt: new Date().toISOString(),
    });

    this.notifyContentChange();
  }

  async pullOnly() {
    if (!navigator.onLine) return;

    const pending = await getPendingOps(this.documentId);
    if (pending.length > 0 && this.role !== "VIEWER") return;

    try {
      const response = await fetch(
        `/api/docs/${this.documentId}/sync?since=${encodeURIComponent(this.lastPulledAt)}`,
      );
      if (!response.ok) return;

      const payload = (await response.json()) as SyncResponse;

      this.content = payload.content;
      this.clock = mergeClocks(this.clock, payload.clock);
      this.lastPulledAt = new Date().toISOString();

      const local = await getLocalDocument(this.documentId);
      if (!local) return;

      await saveLocalDocument({
        ...local,
        content: this.content,
        clock: this.clock,
        updatedAt: new Date().toISOString(),
        dirty: false,
      });

      this.notifyContentChange();
    } catch {
      this.setConnection(navigator.onLine ? "error" : "offline");
    }
  }
}
