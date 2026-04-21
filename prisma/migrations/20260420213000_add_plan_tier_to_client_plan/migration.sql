-- AlterTable
ALTER TABLE "ClientPlan"
ADD COLUMN "planTier" TEXT NOT NULL DEFAULT 'basic';

-- Best-effort backfill for imported legacy plans based on plan name
UPDATE "ClientPlan"
SET "planTier" = CASE
  WHEN LOWER("name") LIKE 'premium%' THEN 'premium'
  WHEN LOWER("name") LIKE 'vip%' THEN 'vip'
  ELSE 'basic'
END;
