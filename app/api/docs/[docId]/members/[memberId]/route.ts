import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDocumentAccess } from "@/lib/documents/access";
import { db } from "@/lib/db";
import { parseJsonBody, updateMemberSchema } from "@/lib/validation/schemas";

type RouteContext = { params: Promise<{ docId: string; memberId: string }> };

async function requireOwner(docId: string, userId: string) {
  const access = await getDocumentAccess(docId, userId);
  if (!access) return { error: "Not found", status: 404 as const };
  if (access.role !== "OWNER") {
    return { error: "Only owners can manage members", status: 403 as const };
  }
  return { access };
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId, memberId } = await context.params;
  const guard = await requireOwner(docId, session.user.id);
  if (guard.error) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const body = parseJsonBody(await request.text(), updateMemberSchema);
    const existing = await db.documentMember.findFirst({
      where: { id: memberId, documentId: docId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const member = await db.documentMember.update({
      where: { id: memberId },
      data: { role: body.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({
      member: {
        id: member.id,
        userId: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
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

  const { docId, memberId } = await context.params;
  const guard = await requireOwner(docId, session.user.id);
  if (guard.error) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const existing = await db.documentMember.findFirst({
    where: { id: memberId, documentId: docId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (existing.userId === session.user.id) {
    return NextResponse.json({ error: "Owners cannot remove themselves" }, { status: 400 });
  }

  await db.documentMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
