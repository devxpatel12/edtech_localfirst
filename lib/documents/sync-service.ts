import { db } from "@/lib/db";
import type { DocumentOp, VectorClock } from "@/types/documents";
import { maxClock } from "@/lib/sync/clocks";
import { rebuildContent, sortOps } from "@/lib/sync/operations";
import type { Prisma } from "@prisma/client";

type SyncResult = {
  content: string;
  clock: VectorClock;
  operations: DocumentOp[];
  serverSeq: number;
};

export async function pullRemoteOps(documentId: string, since: Date) {
  return db.documentOp.findMany({
    where: {
      documentId,
      createdAt: { gt: since },
    },
    orderBy: [{ createdAt: "asc" }],
    take: 200,
  });
}

async function loadDocumentState(documentId: string): Promise<SyncResult> {
  const [doc, serverSeq] = await Promise.all([
    db.document.findUniqueOrThrow({ where: { id: documentId } }),
    db.documentOp.count({ where: { documentId } }),
  ]);

  return {
    content: doc.content,
    clock: doc.clock as VectorClock,
    operations: [],
    serverSeq,
  };
}

async function findExistingOpKeys(documentId: string, incoming: DocumentOp[]) {
  if (incoming.length === 0) return new Set<string>();

  const clientIds = [...new Set(incoming.map((op) => op.clientId))];
  const rows = await db.documentOp.findMany({
    where: { documentId, clientId: { in: clientIds } },
    select: { clientId: true, seq: true },
  });

  return new Set(rows.map((row) => `${row.clientId}:${row.seq}`));
}

export async function applyIncomingOps(
  documentId: string,
  incoming: DocumentOp[],
  userId: string,
): Promise<SyncResult> {
  if (incoming.length === 0) {
    return loadDocumentState(documentId);
  }

  const seen = await findExistingOpKeys(documentId, incoming);
  const fresh = incoming.filter((op) => !seen.has(`${op.clientId}:${op.seq}`));

  if (fresh.length === 0) {
    return loadDocumentState(documentId);
  }

  for (const op of fresh) {
    if (op.documentId !== documentId || op.userId !== userId) {
      throw new Error("Operation metadata mismatch");
    }
  }

  await db.documentOp.createMany({
    data: fresh.map((op) => ({
      id: op.id,
      documentId: op.documentId,
      userId: op.userId,
      kind: op.kind,
      position: op.position,
      text: op.text ?? null,
      length: op.length ?? null,
      clock: op.clock as Prisma.InputJsonValue,
      clientId: op.clientId,
      seq: op.seq,
      createdAt: new Date(op.createdAt),
    })),
    skipDuplicates: true,
  });

  const allOps = await db.documentOp.findMany({
    where: { documentId },
    orderBy: { createdAt: "asc" },
  });

  const serialized = serializeOps(allOps);
  const content = rebuildContent("", serialized);
  const clock = maxClock(allOps.map((op) => op.clock as VectorClock));

  await db.document.update({
    where: { id: documentId },
    data: { content, clock: clock as Prisma.InputJsonValue },
  });

  return {
    content,
    clock,
    operations: serialized,
    serverSeq: allOps.length,
  };
}

export function serializeOps(
  rows: Array<{
    id: string;
    documentId: string;
    userId: string;
    kind: string;
    position: number;
    text: string | null;
    length: number | null;
    clock: unknown;
    clientId: string;
    seq: number;
    createdAt: Date;
  }>,
): DocumentOp[] {
  return sortOps(
    rows.map((row) => ({
      id: row.id,
      documentId: row.documentId,
      userId: row.userId,
      kind: row.kind as DocumentOp["kind"],
      position: row.position,
      text: row.text ?? undefined,
      length: row.length ?? undefined,
      clock: row.clock as VectorClock,
      clientId: row.clientId,
      seq: row.seq,
      createdAt: row.createdAt.toISOString(),
    })),
  );
}
