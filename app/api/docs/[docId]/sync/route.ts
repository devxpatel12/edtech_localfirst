import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { getDocumentAccess } from "@/lib/documents/access";
import { applyIncomingOps, pullRemoteOps, serializeOps } from "@/lib/documents/sync-service";
import { parseJsonBody, syncPayloadSchema } from "@/lib/validation/schemas";
import { canWrite } from "@/lib/sync/operations";

type RouteContext = { params: Promise<{ docId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
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

    return NextResponse.json({
      operations: serializeOps(rows),
      clock: access.document.clock as Record<string, number>,
      content: access.document.content,
      serverSeq: rows.length,
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
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

    return NextResponse.json({
      operations: merged.operations,
      clock: merged.clock,
      content: merged.content,
      serverSeq: merged.serverSeq,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid sync payload" }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return databaseErrorResponse(error);
    }

    const message = error instanceof Error ? error.message : "Invalid sync payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function databaseErrorResponse(error: unknown) {
  console.error("[sync]", error);
  return NextResponse.json(
    { error: "Database error during sync. Retry in a moment." },
    { status: 503 },
  );
}
