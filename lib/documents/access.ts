import type { MemberRole } from "@/types/documents";
import { db, withDbRetry } from "@/lib/db";

export async function getDocumentAccess(documentId: string, userId: string) {
  const document = await withDbRetry(() =>
    db.document.findUnique({
      where: { id: documentId },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    }),
  );

  if (!document) return null;

  if (document.ownerId === userId) {
    return { document, role: "OWNER" as MemberRole };
  }

  const membership = document.members[0];
  if (!membership) return null;

  return { document, role: membership.role as MemberRole };
}

export async function listAccessibleDocuments(userId: string) {
  const owned = await withDbRetry(() =>
    db.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        clock: true,
        updatedAt: true,
      },
    }),
  );

  const shared = await withDbRetry(() =>
    db.documentMember.findMany({
      where: { userId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            content: true,
            clock: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  );

  const ownedRows = owned.map((doc) => ({
    ...doc,
    role: "OWNER" as MemberRole,
    clock: doc.clock as Record<string, number>,
    updatedAt: doc.updatedAt.toISOString(),
  }));

  const sharedRows = shared.map((row) => ({
    ...row.document,
    role: row.role as MemberRole,
    clock: row.document.clock as Record<string, number>,
    updatedAt: row.document.updatedAt.toISOString(),
  }));

  const byId = new Map<string, (typeof ownedRows)[number]>();
  for (const doc of [...ownedRows, ...sharedRows]) {
    byId.set(doc.id, doc);
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
