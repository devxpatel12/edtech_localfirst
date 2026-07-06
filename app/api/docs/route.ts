import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listAccessibleDocuments } from "@/lib/documents/access";
import { db } from "@/lib/db";
import { parseJsonBody, createDocumentSchema } from "@/lib/validation/schemas";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await listAccessibleDocuments(session.user.id);
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = parseJsonBody(await request.text(), createDocumentSchema);
    const document = await db.document.create({
      data: {
        title: body.title,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        clock: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        document: {
          ...document,
          role: "OWNER",
          clock: document.clock as Record<string, number>,
          updatedAt: document.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
