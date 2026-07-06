export type MemberRole = "OWNER" | "EDITOR" | "VIEWER";

export type OpKind = "insert" | "delete";

export type VectorClock = Record<string, number>;

export interface DocumentOp {
  id: string;
  documentId: string;
  userId: string;
  kind: OpKind;
  position: number;
  text?: string;
  length?: number;
  clock: VectorClock;
  clientId: string;
  seq: number;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  clock: VectorClock;
  role: MemberRole;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  label: string | null;
  content: string;
  clock: VectorClock;
  createdBy: string;
  authorName?: string;
  createdAt: string;
}

export interface SyncPayload {
  documentId: string;
  clientId: string;
  sinceSeq: number;
  clock: VectorClock;
  operations: DocumentOp[];
}

export interface SyncResponse {
  operations: DocumentOp[];
  clock: VectorClock;
  content: string;
  serverSeq: number;
}

export type ConnectionState = "online" | "offline" | "syncing" | "error";
