import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { DocumentOp, DocumentRecord, VectorClock } from "@/types/documents";

interface LocalDocument {
  id: string;
  title: string;
  content: string;
  clock: VectorClock;
  role: DocumentRecord["role"];
  updatedAt: string;
  dirty: boolean;
}

interface DraftboardDB extends DBSchema {
  documents: {
    key: string;
    value: LocalDocument;
    indexes: { "by-updated": string };
  };
  pending_ops: {
    key: string;
    value: DocumentOp;
    indexes: { "by-document": string };
  };
  meta: {
    key: string;
    value: { clientId: string };
  };
}

const DB_NAME = "draftboard";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DraftboardDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<DraftboardDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const docs = db.createObjectStore("documents", { keyPath: "id" });
        docs.createIndex("by-updated", "updatedAt");

        const pending = db.createObjectStore("pending_ops", { keyPath: "id" });
        pending.createIndex("by-document", "documentId");

        db.createObjectStore("meta");
      },
    });
  }
  return dbPromise;
}

export async function getClientId(): Promise<string> {
  const db = await getDb();
  const existing = await db.get("meta", "clientId");
  if (existing?.clientId) return existing.clientId;

  const clientId = crypto.randomUUID();
  await db.put("meta", { clientId }, "clientId");
  return clientId;
}

export async function saveLocalDocument(doc: LocalDocument) {
  const db = await getDb();
  await db.put("documents", doc);
}

export async function getLocalDocument(id: string) {
  const db = await getDb();
  return db.get("documents", id);
}

export async function listLocalDocuments() {
  const db = await getDb();
  return db.getAllFromIndex("documents", "by-updated");
}

export async function queuePendingOp(op: DocumentOp) {
  const db = await getDb();
  await db.put("pending_ops", op);
}

export async function getPendingOps(documentId: string) {
  const db = await getDb();
  return db.getAllFromIndex("pending_ops", "by-document", documentId);
}

export async function clearPendingOps(documentId: string, opIds: string[]) {
  const db = await getDb();
  const tx = db.transaction("pending_ops", "readwrite");
  await Promise.all([
    ...opIds.map((id) => tx.store.delete(id)),
    tx.done,
  ]);
}

export async function removeLocalDocument(id: string) {
  const db = await getDb();
  await db.delete("documents", id);
}

export type { LocalDocument };
