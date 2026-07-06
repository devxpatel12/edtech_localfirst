import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDocumentAccess } from "@/lib/documents/access";
import { db } from "@/lib/db";
import { parseJsonBody, createVersionSchema } from "@/lib/validation/schemas";
import type { Prisma } from "@prisma/client";

type RouteContext = { params: Promise<{ docId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await context.params;
  const access = await getDocumentAccess(docId, session.user.id);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const versions = await db.documentVersion.findMany({
    where: { documentId: docId },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    versions: versions.map((version) => ({
      id: version.id,
      documentId: version.documentId,
      label: version.label,
      content: version.content,
      clock: version.clock as Record<string, number>,
      createdBy: version.createdBy,
      authorName: version.author.name,
      createdAt: version.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await context.params;
  const access = await getDocumentAccess(docId, session.user.id);
  if (!access || access.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = parseJsonBody(await request.text(), createVersionSchema);
    const version = await db.documentVersion.create({
      data: {
        documentId: docId,
        label: body.label ?? `Snapshot ${new Date().toLocaleString()}`,
        content: access.document.content,
        clock: access.document.clock as Prisma.InputJsonValue,
        createdBy: session.user.id,
      },
      include: { author: { select: { name: true } } },
    });

    return NextResponse.json(
      {
        version: {
          id: version.id,
          documentId: version.documentId,
          label: version.label,
          content: version.content,
          clock: version.clock as Record<string, number>,
          createdBy: version.createdBy,
          authorName: version.author.name,
          createdAt: version.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
