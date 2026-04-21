-- AlterTable
ALTER TABLE "Client"
ADD COLUMN "phone" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ClientPlan" (
    "id" SERIAL NOT NULL,
    "clientDni" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "durationValue" INTEGER NOT NULL,
    "durationUnit" TEXT NOT NULL,
    "attendanceDays" TEXT[] NOT NULL,
    "attendanceLabel" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "debt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentState" TEXT NOT NULL,
    "paymentSeverity" TEXT NOT NULL DEFAULT 'none',
    "paymentMethod" TEXT NOT NULL,
    "turn" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,

    CONSTRAINT "ClientPlan_pkey" PRIMARY KEY ("id")
);

-- Seed existing clients into their first plan history
INSERT INTO "ClientPlan" (
  "clientDni",
  "name",
  "startDate",
  "endDate",
  "durationValue",
  "durationUnit",
  "attendanceDays",
  "attendanceLabel",
  "pricingMode",
  "sessionCount",
  "totalPrice",
  "amountPaid",
  "debt",
  "paymentState",
  "paymentSeverity",
  "paymentMethod",
  "turn",
  "status",
  "createdAt",
  "updatedAt",
  "createdById"
)
SELECT
  "dni",
  COALESCE(NULLIF("mode", ''), 'Plan inicial'),
  "joinDate",
  "joinDate" + INTERVAL '29 day',
  1,
  'month',
  ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  'Diario',
  'legacy_import',
  30,
  "fee",
  GREATEST("fee" - "debt", 0),
  "debt",
  CASE
    WHEN "debt" <= 0 THEN 'paid'
    WHEN "debt" < "fee" THEN 'partial'
    ELSE 'unpaid'
  END,
  CASE
    WHEN "debt" > 0 THEN 'critical'
    ELSE 'none'
  END,
  "paymentMethod",
  "turn",
  CASE
    WHEN "status" = 'inactive' THEN 'expired'
    ELSE 'active'
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  "createdById"
FROM "Client";

-- CreateIndex
CREATE INDEX "ClientPlan_clientDni_startDate_idx" ON "ClientPlan"("clientDni", "startDate");

-- CreateIndex
CREATE INDEX "ClientPlan_status_paymentSeverity_endDate_idx" ON "ClientPlan"("status", "paymentSeverity", "endDate");

-- AddForeignKey
ALTER TABLE "ClientPlan" ADD CONSTRAINT "ClientPlan_clientDni_fkey" FOREIGN KEY ("clientDni") REFERENCES "Client"("dni") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPlan" ADD CONSTRAINT "ClientPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
