-- AlterTable
ALTER TABLE "Client" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

-- Preserve the previous derived behavior for existing clients with debt.
UPDATE "Client" SET "status" = 'pending_payment' WHERE "debt" > 0;
