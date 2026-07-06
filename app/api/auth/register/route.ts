import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseJsonBody, registerSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const body = parseJsonBody(await request.text(), registerSchema);
    const email = body.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await db.user.create({
      data: {
        name: body.name,
        email,
        passwordHash,
      },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          error:
            "Database connection failed. Use the Supabase Session pooler URL in DATABASE_URL and ensure the project is not paused.",
        },
        { status: 503 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      (error instanceof Error &&
        (error.message.includes("Can't reach database server") ||
          error.message.includes("Authentication failed")))
    ) {
      return NextResponse.json(
        {
          error:
            "Database is unreachable. In Supabase Dashboard, restore the project if paused, then set DATABASE_URL to the Session pooler connection string.",
        },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
