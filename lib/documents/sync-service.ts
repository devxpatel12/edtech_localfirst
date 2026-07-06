import { db } from "@/lib/db";
import type { DocumentOp, VectorClock } from "@/types/documents";
import { maxClock } from "@/lib/sync/clocks";
import { rebuildContent, sortOps } from "@/lib/sync/operations";
import type { Prisma } from "@prisma/client";

export async function pullRemoteOps(documentId: string, since: Date) {
  return db.documentOp.findMany({
    where: {
      documentId,
      createdAt: { gt: since },
    },
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function applyIncomingOps(
  documentId: string,
  incoming: DocumentOp[],
  userId: string,
) {
  if (incoming.length === 0) {
    const doc = await db.document.findUniqueOrThrow({ where: { id: documentId } });
    return {
      content: doc.content,
      clock: doc.clock as VectorClock,
      operations: [] as DocumentOp[],
    };
  }

  const existing = await db.documentOp.findMany({
    where: {
      documentId,
      OR: incoming.map((op) => ({
        clientId: op.clientId,
        seq: op.seq,
      })),
    },
    select: { clientId: true, seq: true },
  });

  const seen = new Set(existing.map((row) => `${row.clientId}:${row.seq}`));
  const fresh = incoming.filter((op) => !seen.has(`${op.clientId}:${op.seq}`));

  if (fresh.length === 0) {
    const doc = await db.document.findUniqueOrThrow({ where: { id: documentId } });
    const allOps = await db.documentOp.findMany({ where: { documentId } });
    return {
      content: doc.content,
      clock: doc.clock as VectorClock,
      operations: serializeOps(allOps).filter((op) =>
        incoming.some((item) => item.clientId === op.clientId && item.seq === op.seq),
      ),
    };
  }

  for (const op of fresh) {
    if (op.documentId !== documentId || op.userId !== userId) {
      throw new Error("Operation metadata mismatch");
    }
  }

  const result = await db.$transaction(async (tx) => {
    await tx.documentOp.createMany({
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

    const allOps = await tx.documentOp.findMany({ where: { documentId } });
    const content = rebuildContent("", serializeOps(allOps));
    const clock = maxClock(allOps.map((op) => op.clock as VectorClock));

    await tx.document.update({
      where: { id: documentId },
      data: { content, clock: clock as Prisma.InputJsonValue },
    });

    return { content, clock, operations: fresh };
  });

  return result;
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
