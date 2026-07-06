import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDocumentAccess } from "@/lib/documents/access";
import { db } from "@/lib/db";
import { parseJsonBody, inviteMemberSchema } from "@/lib/validation/schemas";

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

  const members = await db.documentMember.findMany({
    where: { documentId: docId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    members: members.map((member) => ({
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
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
  if (!access || access.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can invite members" }, { status: 403 });
  }

  try {
    const body = parseJsonBody(await request.text(), inviteMemberSchema);
    const user = await db.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.id === session.user.id) {
      return NextResponse.json({ error: "Owner is already on this document" }, { status: 400 });
    }

    const member = await db.documentMember.upsert({
      where: {
        documentId_userId: {
          documentId: docId,
          userId: user.id,
        },
      },
      update: { role: body.role },
      create: {
        documentId: docId,
        userId: user.id,
        role: body.role,
      },
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
