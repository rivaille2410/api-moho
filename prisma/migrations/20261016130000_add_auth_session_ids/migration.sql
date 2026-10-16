ALTER TABLE "refresh_tokens" ADD COLUMN "sessionId" TEXT;

UPDATE "refresh_tokens" SET "sessionId" = gen_random_uuid()::text WHERE "sessionId" IS NULL;

ALTER TABLE "refresh_tokens" ALTER COLUMN "sessionId" SET NOT NULL;

CREATE INDEX "refresh_tokens_userId_sessionId_revoked_idx" ON "refresh_tokens"("userId", "sessionId", "revoked");
