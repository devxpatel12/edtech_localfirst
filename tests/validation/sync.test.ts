import { describe, expect, it } from "vitest";
import { assertPayloadSize, syncPayloadSchema } from "@/lib/validation/schemas";

describe("sync payload validation", () => {
  it("rejects oversized payloads", () => {
    expect(() => assertPayloadSize("x".repeat(600_000))).toThrow();
  });

  it("accepts valid sync payloads", () => {
    const payload = {
      documentId: "cltxyz1234567890abcdefghij",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      sinceSeq: 0,
      clock: { client: 1 },
      operations: [
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          documentId: "cltxyz1234567890abcdefghij",
          userId: "cltxyz1234567890abcdefgh",
          kind: "insert" as const,
          position: 0,
          text: "hello",
          clock: { client: 1 },
          clientId: "550e8400-e29b-41d4-a716-446655440000",
          seq: 1,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    expect(syncPayloadSchema.parse(payload).operations).toHaveLength(1);
  });
});
