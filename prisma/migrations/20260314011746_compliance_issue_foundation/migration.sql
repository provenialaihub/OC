-- CreateTable
CREATE TABLE "ComplianceIssue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "issueType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "openedByActorType" "AuditActorType" NOT NULL,
    "openedByActorId" TEXT,
    "description" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceIssue_organizationId_status_severity_idx" ON "ComplianceIssue"("organizationId", "status", "severity");

-- CreateIndex
CREATE INDEX "ComplianceIssue_organizationId_issueType_createdAt_idx" ON "ComplianceIssue"("organizationId", "issueType", "createdAt");

-- CreateIndex
CREATE INDEX "ComplianceIssue_organizationId_relatedEntityType_relatedEnt_idx" ON "ComplianceIssue"("organizationId", "relatedEntityType", "relatedEntityId");

-- AddForeignKey
ALTER TABLE "ComplianceIssue" ADD CONSTRAINT "ComplianceIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceIssue" ADD CONSTRAINT "ComplianceIssue_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
