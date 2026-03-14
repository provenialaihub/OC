-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('quickbooks', 'csv', 'manual', 'other');

-- CreateEnum
CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('active', 'disconnected', 'error', 'pending_auth');

-- CreateEnum
CREATE TYPE "AccountingEventStatus" AS ENUM ('pending', 'processing', 'exported', 'synced', 'failed', 'ignored');

-- CreateEnum
CREATE TYPE "AccountingExportAttemptStatus" AS ENUM ('started', 'succeeded', 'failed', 'abandoned');

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'pending_auth',
    "displayName" TEXT NOT NULL,
    "authMetadataJson" JSONB,
    "configJson" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingMapping" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "integrationConnectionId" TEXT,
    "mappingType" TEXT NOT NULL,
    "internalEntityType" TEXT NOT NULL,
    "internalEntityId" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "integrationConnectionId" TEXT,
    "sourceEventType" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "accountingEventType" TEXT NOT NULL,
    "status" "AccountingEventStatus" NOT NULL DEFAULT 'pending',
    "payloadJson" JSONB NOT NULL,
    "externalRef" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "lastErrorClass" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingExportAttempt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountingEventId" TEXT NOT NULL,
    "integrationConnectionId" TEXT,
    "status" "AccountingExportAttemptStatus" NOT NULL DEFAULT 'started',
    "providerRequestId" TEXT,
    "errorClass" TEXT,
    "errorMessage" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingExportAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationConnection_organizationId_provider_status_idx" ON "IntegrationConnection"("organizationId", "provider", "status");

-- CreateIndex
CREATE INDEX "AccountingMapping_organizationId_mappingType_idx" ON "AccountingMapping"("organizationId", "mappingType");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingMapping_organizationId_integrationConnectionId_ma_key" ON "AccountingMapping"("organizationId", "integrationConnectionId", "mappingType", "internalEntityType", "internalEntityId");

-- CreateIndex
CREATE INDEX "AccountingEvent_organizationId_status_createdAt_idx" ON "AccountingEvent"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AccountingEvent_organizationId_sourceEventType_sourceEventI_idx" ON "AccountingEvent"("organizationId", "sourceEventType", "sourceEventId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingEvent_organizationId_sourceEventType_sourceEventI_key" ON "AccountingEvent"("organizationId", "sourceEventType", "sourceEventId", "accountingEventType");

-- CreateIndex
CREATE INDEX "AccountingExportAttempt_organizationId_status_startedAt_idx" ON "AccountingExportAttempt"("organizationId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "AccountingExportAttempt_organizationId_accountingEventId_idx" ON "AccountingExportAttempt"("organizationId", "accountingEventId");

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingMapping" ADD CONSTRAINT "AccountingMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingMapping" ADD CONSTRAINT "AccountingMapping_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEvent" ADD CONSTRAINT "AccountingEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEvent" ADD CONSTRAINT "AccountingEvent_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingExportAttempt" ADD CONSTRAINT "AccountingExportAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingExportAttempt" ADD CONSTRAINT "AccountingExportAttempt_accountingEventId_fkey" FOREIGN KEY ("accountingEventId") REFERENCES "AccountingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingExportAttempt" ADD CONSTRAINT "AccountingExportAttempt_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
