import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDocumentAccess } from "@/lib/documents/access";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type RouteContext = { params: Promise<{ docId: string; versionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId, versionId } = await context.params;
  const access = await getDocumentAccess(docId, session.user.id);
  if (!access || access.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const version = await db.documentVersion.findFirst({
    where: { id: versionId, documentId: docId },
  });

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const restored = await db.$transaction(async (tx) => {
    await tx.documentOp.deleteMany({ where: { documentId: docId } });

    const document = await tx.document.update({
      where: { id: docId },
      data: {
        content: version.content,
        clock: version.clock as Prisma.InputJsonValue,
      },
    });

    await tx.documentVersion.create({
      data: {
        documentId: docId,
        label: `Restored from ${version.label ?? version.id}`,
        content: version.content,
        clock: version.clock as Prisma.InputJsonValue,
        createdBy: session.user.id,
      },
    });

    return document;
  });

  return NextResponse.json({
    document: {
      id: restored.id,
      title: restored.title,
      content: restored.content,
      clock: restored.clock as Record<string, number>,
      role: access.role,
      updatedAt: restored.updatedAt.toISOString(),
    },
  });
}
