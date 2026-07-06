import { describe, expect, it } from "vitest";
import { compareClocks, incrementClock, mergeClocks } from "@/lib/sync/clocks";
import { applyOp, diffToOps, rebuildContent, sortOps } from "@/lib/sync/operations";
import type { DocumentOp } from "@/types/documents";

function makeOp(overrides: Partial<DocumentOp>): DocumentOp {
  return {
    id: crypto.randomUUID(),
    documentId: "doc_1",
    userId: "user_1",
    kind: "insert",
    position: 0,
    text: "a",
    clock: { client_a: 1 },
    clientId: "client_a",
    seq: 1,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("vector clocks", () => {
  it("orders concurrent clocks deterministically", () => {
    const left = { a: 1, b: 1 };
    const right = { a: 1, b: 2 };
    expect(compareClocks(left, right)).toBe(-1);
    expect(compareClocks(right, left)).toBe(1);
  });

  it("merges clocks by taking max per client", () => {
    expect(mergeClocks({ a: 2 }, { a: 5, b: 1 })).toEqual({ a: 5, b: 1 });
    expect(incrementClock({ a: 1 }, "a")).toEqual({ a: 2 });
  });
});

describe("operation merge", () => {
  it("applies insert and delete operations in stable order", () => {
    const ops = [
      makeOp({ kind: "insert", position: 0, text: "Hello", clientId: "a", seq: 1, clock: { a: 1 } }),
      makeOp({ kind: "insert", position: 5, text: " world", clientId: "b", seq: 1, clock: { b: 1 } }),
    ];

    expect(rebuildContent("", sortOps(ops))).toBe("Hello world");
  });

  it("creates diff operations for local edits", () => {
    const ops = diffToOps("hi", "hello", {
      id: crypto.randomUUID(),
      documentId: "doc",
      userId: "user",
      clock: { client: 1 },
      clientId: "client",
      seq: 1,
      createdAt: new Date().toISOString(),
    });

    expect(ops.length).toBeGreaterThan(0);
    expect(rebuildContent("hi", ops)).toBe("hello");
  });

  it("does not lose characters when deleting from the middle", () => {
    const content = applyOp("draftboard", makeOp({
      kind: "delete",
      position: 0,
      length: 5,
      text: undefined,
    }));
    expect(content).toBe("board");
  });
});
