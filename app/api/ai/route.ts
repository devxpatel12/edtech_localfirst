import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDocumentAccess } from "@/lib/documents/access";
import { parseJsonBody, aiRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured. Set OPENAI_API_KEY to enable this feature." },
      { status: 503 },
    );
  }

  try {
    const [{ generateText }, { createOpenAI }] = await Promise.all([
      import("ai"),
      import("@ai-sdk/openai"),
    ]);

    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const body = parseJsonBody(await request.text(), aiRequestSchema);
    const access = await getDocumentAccess(body.documentId, session.user.id);
    if (!access || access.role === "VIEWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const source = body.selection?.trim() || access.document.content;
    const prompt =
      body.action === "summarize"
        ? `Summarize the following document in 3 concise bullet points:\n\n${source}`
        : `Improve clarity and grammar while preserving meaning:\n\n${source}`;

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      maxOutputTokens: 500,
    });

    return NextResponse.json({ result: result.text.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
