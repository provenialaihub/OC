-- AlterEnum
ALTER TYPE "AccountingEventStatus" ADD VALUE 'blocked';

-- AlterEnum
ALTER TYPE "IntegrationConnectionStatus" ADD VALUE 'expired';

-- AlterTable
ALTER TABLE "AccountingMapping" ADD COLUMN     "externalName" TEXT;

-- AlterTable
ALTER TABLE "IntegrationConnection" ADD COLUMN     "grantedScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lastAuthCheckAt" TIMESTAMP(3),
ADD COLUMN     "lastSuccessfulApiAt" TIMESTAMP(3),
ADD COLUMN     "realmId" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AccountingReconciliationIssue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "integrationConnectionId" TEXT,
    "accountingEventId" TEXT,
    "issueType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "description" TEXT NOT NULL,
    "internalRefJson" JSONB,
    "externalRefJson" JSONB,
    "resolutionNotes" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingReconciliationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingReconciliationIssue_organizationId_status_issueTy_idx" ON "AccountingReconciliationIssue"("organizationId", "status", "issueType");

-- CreateIndex
CREATE INDEX "AccountingReconciliationIssue_organizationId_accountingEven_idx" ON "AccountingReconciliationIssue"("organizationId", "accountingEventId");

-- AddForeignKey
ALTER TABLE "AccountingReconciliationIssue" ADD CONSTRAINT "AccountingReconciliationIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingReconciliationIssue" ADD CONSTRAINT "AccountingReconciliationIssue_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingReconciliationIssue" ADD CONSTRAINT "AccountingReconciliationIssue_accountingEventId_fkey" FOREIGN KEY ("accountingEventId") REFERENCES "AccountingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
