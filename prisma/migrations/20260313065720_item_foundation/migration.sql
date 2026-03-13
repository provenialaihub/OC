-- CreateTable
CREATE TABLE "ItemAlias" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "aliasType" TEXT NOT NULL,
    "aliasValue" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemAlias_organizationId_itemId_idx" ON "ItemAlias"("organizationId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemAlias_organizationId_aliasType_aliasValue_key" ON "ItemAlias"("organizationId", "aliasType", "aliasValue");

-- AddForeignKey
ALTER TABLE "UnitOfMeasure" ADD CONSTRAINT "UnitOfMeasure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAlias" ADD CONSTRAINT "ItemAlias_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAlias" ADD CONSTRAINT "ItemAlias_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
