import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDocumentAccess } from "@/lib/documents/access";
import {
  applyIncomingOps,
  pullRemoteOps,
  serializeOps,
} from "@/lib/documents/sync-service";
import { db } from "@/lib/db";
import { parseJsonBody, syncPayloadSchema } from "@/lib/validation/schemas";
import { canWrite } from "@/lib/sync/operations";

type RouteContext = { params: Promise<{ docId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await context.params;
  const access = await getDocumentAccess(docId, session.user.id);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sinceParam = new URL(request.url).searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : new Date(0);
  const rows = await pullRemoteOps(docId, since);
  const operations = serializeOps(rows);

  return NextResponse.json({
    operations,
    clock: access.document.clock as Record<string, number>,
    content: access.document.content,
    serverSeq: rows.length,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await context.params;
  const access = await getDocumentAccess(docId, session.user.id);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canWrite(access.role)) {
    return NextResponse.json({ error: "Viewers cannot sync edits" }, { status: 403 });
  }

  try {
    const payload = parseJsonBody(await request.text(), syncPayloadSchema);
    if (payload.documentId !== docId) {
      return NextResponse.json({ error: "Document mismatch" }, { status: 400 });
    }

    const stamped = payload.operations.map((op) => ({
      ...op,
      documentId: docId,
      userId: session.user.id,
    }));

    const merged = await applyIncomingOps(docId, stamped, session.user.id);
    const allRows = await db.documentOp.findMany({ where: { documentId: docId } });

    return NextResponse.json({
      operations: serializeOps(allRows),
      clock: merged.clock,
      content: merged.content,
      serverSeq: allRows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid sync payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
