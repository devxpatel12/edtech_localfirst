import type { DocumentOp, OpKind } from "@/types/documents";
import { compareClocks } from "./clocks";

export function sortOps(ops: DocumentOp[]): DocumentOp[] {
  return [...ops].sort((left, right) => {
    const clockOrder = compareClocks(left.clock, right.clock);
    if (clockOrder !== 0) return clockOrder;

    if (left.clientId !== right.clientId) {
      return left.clientId.localeCompare(right.clientId);
    }

    return left.seq - right.seq;
  });
}

export function applyOp(content: string, op: DocumentOp): string {
  if (op.kind === "insert") {
    const text = op.text ?? "";
    const position = clampPosition(op.position, content.length);
    return content.slice(0, position) + text + content.slice(position);
  }

  const position = clampPosition(op.position, content.length);
  const length = Math.min(op.length ?? 0, content.length - position);
  return content.slice(0, position) + content.slice(position + length);
}

export function rebuildContent(base: string, ops: DocumentOp[]): string {
  return sortOps(ops).reduce((content, op) => applyOp(content, op), base);
}

export function diffToOps(
  previous: string,
  next: string,
  meta: Pick<DocumentOp, "id" | "documentId" | "userId" | "clock" | "clientId" | "seq" | "createdAt">,
): DocumentOp[] {
  if (previous === next) return [];

  const prefix = commonPrefix(previous, next);
  const suffix = commonSuffix(previous, next, prefix);
  const ops: DocumentOp[] = [];

  const deleteLength = previous.length - prefix - suffix;
  if (deleteLength > 0) {
    ops.push({
      ...meta,
      kind: "delete",
      position: prefix,
      length: deleteLength,
    });
  }

  const insertText = next.slice(prefix, next.length - suffix);
  if (insertText.length > 0) {
    ops.push({
      ...meta,
      kind: "insert",
      position: prefix,
      text: insertText,
    });
  }

  return ops;
}

function commonPrefix(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let i = 0;
  while (i < limit && a[i] === b[i]) i += 1;
  return i;
}

function commonSuffix(a: string, b: string, prefix: number): number {
  let i = 0;
  while (
    i < a.length - prefix &&
    i < b.length - prefix &&
    a[a.length - 1 - i] === b[b.length - 1 - i]
  ) {
    i += 1;
  }
  return i;
}

function clampPosition(position: number, length: number): number {
  return Math.max(0, Math.min(position, length));
}

export function canWrite(role: string): boolean {
  return role === "OWNER" || role === "EDITOR";
}

export type { OpKind };
