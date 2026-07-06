import { z } from "zod";
import {
  MAX_DOCUMENT_LENGTH,
  MAX_OPS_PER_SYNC,
  MAX_OP_TEXT_LENGTH,
  MAX_PAYLOAD_BYTES,
} from "@/lib/constants";

const vectorClockSchema = z.record(z.string(), z.number().int().min(0).max(1_000_000));

export const documentOpSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().cuid(),
  userId: z.string().cuid(),
  kind: z.enum(["insert", "delete"]),
  position: z.number().int().min(0).max(MAX_DOCUMENT_LENGTH),
  text: z.string().max(MAX_OP_TEXT_LENGTH).optional(),
  length: z.number().int().min(0).max(MAX_DOCUMENT_LENGTH).optional(),
  clock: vectorClockSchema,
  clientId: z.string().uuid(),
  seq: z.number().int().min(0).max(1_000_000),
  createdAt: z.string().datetime(),
});

export const syncPayloadSchema = z.object({
  documentId: z.string().cuid(),
  clientId: z.string().uuid(),
  sinceSeq: z.number().int().min(0).max(1_000_000),
  clock: vectorClockSchema,
  operations: z.array(documentOpSchema).max(MAX_OPS_PER_SYNC),
});

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const createVersionSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const aiRequestSchema = z.object({
  documentId: z.string().cuid(),
  action: z.enum(["summarize", "improve"]),
  selection: z.string().max(20_000).optional(),
});

export function assertPayloadSize(raw: string) {
  const bytes = new TextEncoder().encode(raw).length;
  if (bytes > MAX_PAYLOAD_BYTES) {
    throw new Error(`Payload exceeds ${MAX_PAYLOAD_BYTES} bytes`);
  }
}

export function parseJsonBody<T>(raw: string, schema: z.ZodSchema<T>): T {
  assertPayloadSize(raw);
  const parsed = JSON.parse(raw) as unknown;
  return schema.parse(parsed);
}
