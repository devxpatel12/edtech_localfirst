import { describe, expect, it } from "vitest";
import { rebuildContent } from "@/lib/sync/operations";
import type { DocumentOp } from "@/types/documents";

describe("incremental pull safety", () => {
  it("rebuilding from only new ops with an empty base wipes prior content", () => {
    const prior: DocumentOp = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      documentId: "doc",
      userId: "user",
      kind: "insert",
      position: 0,
      text: "Hello",
      clock: { a: 1 },
      clientId: "client-a",
      seq: 1,
      createdAt: new Date().toISOString(),
    };

    expect(rebuildContent("", [])).toBe("");
    expect(rebuildContent("", [prior])).toBe("Hello");
    expect(rebuildContent("Hello", [])).toBe("Hello");
  });
});
