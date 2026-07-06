import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDocumentAccess } from "@/lib/documents/access";
import { db } from "@/lib/db";
import { parseJsonBody, updateDocumentSchema } from "@/lib/validation/schemas";

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

  return NextResponse.json({
    document: {
      id: access.document.id,
      title: access.document.title,
      content: access.document.content,
      clock: access.document.clock as Record<string, number>,
      role: access.role,
      updatedAt: access.document.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
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
    const body = parseJsonBody(await request.text(), updateDocumentSchema);
    const document = await db.document.update({
      where: { id: docId },
      data: { title: body.title },
      select: {
        id: true,
        title: true,
        content: true,
        clock: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      document: {
        ...document,
        role: access.role,
        clock: document.clock as Record<string, number>,
        updatedAt: document.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await context.params;
  const access = await getDocumentAccess(docId, session.user.id);
  if (!access || access.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.document.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
}
