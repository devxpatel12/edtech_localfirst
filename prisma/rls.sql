-- Optional PostgreSQL row-level security policies.
-- Apply after Prisma migrations when using a direct Postgres connection.

ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentOp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentVersion" ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS in managed providers; app-level auth remains primary.

CREATE POLICY document_owner_access ON "Document"
  FOR SELECT
  USING (
    "ownerId" = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM "DocumentMember" m
      WHERE m."documentId" = "Document".id
        AND m."userId" = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY document_member_read ON "DocumentMember"
  FOR SELECT
  USING (
    "userId" = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM "Document" d
      WHERE d.id = "DocumentMember"."documentId"
        AND d."ownerId" = current_setting('app.current_user_id', true)
    )
  );
