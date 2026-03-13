import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const schema = `test_${randomUUID().replace(/-/g, '')}`;
const baseDatabaseUrl = process.env.DATABASE_URL;

if (!baseDatabaseUrl) {
  throw new Error('DATABASE_URL is required to run the test suite.');
}

const testDatabaseUrl = new URL(baseDatabaseUrl);
testDatabaseUrl.searchParams.set('schema', schema);
process.env.DATABASE_URL = testDatabaseUrl.toString();
process.env.NODE_ENV = 'test';

execFileSync('npx', ['prisma', 'db', 'push'], {
  cwd: ROOT,
  env: process.env,
  stdio: 'inherit',
});

type DbModule = typeof import('../src/lib/db/client');
type SuppliersModule = typeof import('../src/lib/services/suppliers');
type ItemsModule = typeof import('../src/lib/services/items');
type ReceivingModule = typeof import('../src/lib/services/receiving');

type FixtureContext = {
  organizationId: string;
  locationId: string;
  supplierId: string;
  eachUomId: string;
  poundUomId: string;
  proteinCategoryId: string;
  packagingCategoryId: string;
  lotTrackedItemId: string;
  simpleItemId: string;
  purchaseOrderId: string;
  lotTrackedPoLineId: string;
  simplePoLineId: string;
};

let dbModule: DbModule;
let suppliersModule: SuppliersModule;
let itemsModule: ItemsModule;
let receivingModule: ReceivingModule;
let db: DbModule['db'];
let fixtures: FixtureContext;

async function dropSchema() {
  const client = new Client({ connectionString: baseDatabaseUrl });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.end();
}

async function truncateSchema() {
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = current_schema()
  `;

  if (!tables.length) return;

  const identifiers = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${identifiers} CASCADE`);
}

async function seedFixtures(): Promise<FixtureContext> {
  const organization = await db.organization.create({
    data: {
      slug: `org-${randomUUID().slice(0, 8)}`,
      legalName: 'Test Organization LLC',
      displayName: 'Test Organization',
      status: 'trial',
    },
  });

  const location = await db.location.create({
    data: {
      organizationId: organization.id,
      name: 'Main Warehouse',
      code: 'main',
      type: 'warehouse',
    },
  });

  const [each, pounds] = await Promise.all([
    db.unitOfMeasure.create({
      data: {
        organizationId: null,
        code: `ea-${randomUUID().slice(0, 6)}`,
        name: 'Each',
        category: 'count',
      },
    }),
    db.unitOfMeasure.create({
      data: {
        organizationId: null,
        code: `lb-${randomUUID().slice(0, 6)}`,
        name: 'Pound',
        category: 'weight',
      },
    }),
  ]);

  const [proteinCategory, packagingCategory] = await Promise.all([
    db.itemCategory.create({
      data: {
        organizationId: organization.id,
        code: 'protein',
        name: 'Protein',
      },
    }),
    db.itemCategory.create({
      data: {
        organizationId: organization.id,
        code: 'packaging',
        name: 'Packaging',
      },
    }),
  ]);

  const supplier = await db.supplier.create({
    data: {
      organizationId: organization.id,
      code: 'supplier-1',
      legalName: 'Vendor Foods LLC',
      displayName: 'Vendor Foods',
      status: 'active',
    },
  });

  const [lotTrackedItem, simpleItem] = await Promise.all([
    db.item.create({
      data: {
        organizationId: organization.id,
        sku: 'CHK-001',
        name: 'Chicken Breast',
        itemType: 'ingredient',
        itemCategoryId: proteinCategory.id,
        baseUomId: pounds.id,
        trackInventory: true,
        trackLots: true,
        trackExpiration: true,
      },
    }),
    db.item.create({
      data: {
        organizationId: organization.id,
        sku: 'TRY-001',
        name: 'Meal Tray',
        itemType: 'packaging',
        itemCategoryId: packagingCategory.id,
        baseUomId: each.id,
        trackInventory: true,
        trackLots: false,
        trackExpiration: false,
      },
    }),
  ]);

  const purchaseOrder = await db.purchaseOrder.create({
    data: {
      organizationId: organization.id,
      locationId: location.id,
      supplierId: supplier.id,
      poNumber: 'PO-1001',
      status: 'submitted',
      orderDate: new Date('2026-03-12T10:00:00.000Z'),
      expectedDate: new Date('2026-03-13T15:00:00.000Z'),
    },
  });

  const [lotTrackedPoLine, simplePoLine] = await Promise.all([
    db.purchaseOrderLine.create({
      data: {
        organizationId: organization.id,
        purchaseOrderId: purchaseOrder.id,
        itemId: lotTrackedItem.id,
        orderedQuantity: 80,
        receivedQuantity: 0,
        uomId: pounds.id,
      },
    }),
    db.purchaseOrderLine.create({
      data: {
        organizationId: organization.id,
        purchaseOrderId: purchaseOrder.id,
        itemId: simpleItem.id,
        orderedQuantity: 500,
        receivedQuantity: 0,
        uomId: each.id,
      },
    }),
  ]);

  return {
    organizationId: organization.id,
    locationId: location.id,
    supplierId: supplier.id,
    eachUomId: each.id,
    poundUomId: pounds.id,
    proteinCategoryId: proteinCategory.id,
    packagingCategoryId: packagingCategory.id,
    lotTrackedItemId: lotTrackedItem.id,
    simpleItemId: simpleItem.id,
    purchaseOrderId: purchaseOrder.id,
    lotTrackedPoLineId: lotTrackedPoLine.id,
    simplePoLineId: simplePoLine.id,
  };
}

before(async () => {
  dbModule = await import('../src/lib/db/client');
  suppliersModule = await import('../src/lib/services/suppliers');
  itemsModule = await import('../src/lib/services/items');
  receivingModule = await import('../src/lib/services/receiving');
  db = dbModule.db;
});

beforeEach(async () => {
  await truncateSchema();
  fixtures = await seedFixtures();
});

after(async () => {
  await db.$disconnect();
  await dropSchema();
});

describe('Onaply foundation services', () => {
  test('creates and updates suppliers inside the current organization', async () => {
    const created = await suppliersModule.createSupplier(fixtures.organizationId, {
      code: 'fresh-edge',
      legalName: 'Fresh Edge Distribution LLC',
      displayName: 'Fresh Edge',
      category: 'Distributor',
      paymentTerms: 'Net 15',
      leadTimeDays: 3,
      notes: 'Primary produce back-up vendor',
    });

    assert.equal(created.organizationId, fixtures.organizationId);
    assert.equal(created.status, 'pending_review');
    assert.equal(created.displayName, 'Fresh Edge');

    const updated = await suppliersModule.updateSupplier(fixtures.organizationId, created.id, {
      status: 'active',
      category: 'Regional distributor',
      paymentTerms: 'Net 7',
      leadTimeDays: 1,
      notes: 'Approved after onboarding review',
    });

    assert.ok(updated);
    assert.equal(updated?.status, 'active');
    assert.equal(updated?.paymentTerms, 'Net 7');
    assert.equal(updated?.leadTimeDays, 1);
    assert.equal(updated?.notes, 'Approved after onboarding review');

    const outsider = await suppliersModule.updateSupplier('org-does-not-own-record', created.id, {
      status: 'inactive',
    });
    assert.equal(outsider, null);
  });

  test('creates items with an inline category and updates tracked settings', async () => {
    const created = await itemsModule.createItem(fixtures.organizationId, {
      sku: 'SPICE-001',
      name: 'Smoked Paprika',
      itemType: 'ingredient',
      baseUomId: fixtures.poundUomId,
      categoryName: 'Dry Goods',
      categoryCode: 'dry-goods',
      trackInventory: true,
      trackLots: false,
      trackExpiration: false,
      reorderEnabled: true,
      defaultReorderPoint: 10,
      defaultReorderQuantity: 40,
      notes: 'Shelf stable spice',
    });

    assert.equal(created.category?.code, 'dry-goods');
    assert.equal(created.baseUom.id, fixtures.poundUomId);
    assert.equal(created.defaultReorderPoint?.toString(), '10');

    const updated = await itemsModule.updateItem(fixtures.organizationId, created.id, {
      itemCategoryId: fixtures.proteinCategoryId,
      trackInventory: true,
      trackLots: true,
      trackExpiration: true,
      isActive: false,
      reorderEnabled: true,
      defaultReorderPoint: 12,
      defaultReorderQuantity: 48,
      notes: 'Now sourced as a regulated ingredient',
    });

    assert.ok(updated);
    assert.equal(updated?.category?.id, fixtures.proteinCategoryId);
    assert.equal(updated?.trackLots, true);
    assert.equal(updated?.trackExpiration, true);
    assert.equal(updated?.isActive, false);
    assert.equal(updated?.defaultReorderQuantity?.toString(), '48');
  });

  test('posts a receipt, creates inventory movements and balances, and writes an audit event', async () => {
    const receipt = await receivingModule.createReceiptWithPosting({
      organizationId: fixtures.organizationId,
      actorId: 'user-123',
      locationId: fixtures.locationId,
      supplierId: fixtures.supplierId,
      purchaseOrderId: fixtures.purchaseOrderId,
      receiptMethod: 'truck_delivery',
      receivedAt: '2026-03-13T18:00:00.000Z',
      notes: 'Delivered on time',
      lines: [
        {
          itemId: fixtures.lotTrackedItemId,
          purchaseOrderLineId: fixtures.lotTrackedPoLineId,
          receivedQuantity: 80,
          acceptedQuantity: 80,
          lotCode: 'LOT-CHICKEN-001',
          expirationDate: '2026-03-20T00:00:00.000Z',
        },
        {
          itemId: fixtures.simpleItemId,
          purchaseOrderLineId: fixtures.simplePoLineId,
          receivedQuantity: 500,
          acceptedQuantity: 500,
        },
      ],
    });

    assert.equal(receipt.status, 'received');
    assert.equal(receipt.receiptNumber, 'RCV-00001');
    assert.equal(receipt.lines.length, 2);

    const po = await db.purchaseOrder.findUniqueOrThrow({ where: { id: fixtures.purchaseOrderId } });
    assert.equal(po.status, 'received');

    const [updatedLotLine, updatedSimpleLine] = await Promise.all([
      db.purchaseOrderLine.findUniqueOrThrow({ where: { id: fixtures.lotTrackedPoLineId } }),
      db.purchaseOrderLine.findUniqueOrThrow({ where: { id: fixtures.simplePoLineId } }),
    ]);
    assert.equal(updatedLotLine.lineStatus, 'received');
    assert.equal(updatedLotLine.receivedQuantity.toString(), '80');
    assert.equal(updatedSimpleLine.lineStatus, 'received');
    assert.equal(updatedSimpleLine.receivedQuantity.toString(), '500');

    const lot = await db.lot.findFirstOrThrow({
      where: {
        organizationId: fixtures.organizationId,
        itemId: fixtures.lotTrackedItemId,
        lotCode: 'LOT-CHICKEN-001',
      },
    });
    assert.equal(lot.status, 'active');

    const movements = await db.inventoryMovement.findMany({
      where: { organizationId: fixtures.organizationId },
      orderBy: [{ itemId: 'asc' }, { createdAt: 'asc' }],
    });
    assert.equal(movements.length, 2);
    assert.deepEqual(
      movements.map((movement) => ({
        itemId: movement.itemId,
        movementType: movement.movementType,
        quantityDelta: movement.quantityDelta.toString(),
        lotId: movement.lotId,
      })),
      [
        {
          itemId: fixtures.lotTrackedItemId,
          movementType: 'receive',
          quantityDelta: '80',
          lotId: lot.id,
        },
        {
          itemId: fixtures.simpleItemId,
          movementType: 'receive',
          quantityDelta: '500',
          lotId: null,
        },
      ].sort((a, b) => a.itemId.localeCompare(b.itemId)),
    );

    const balances = await db.inventoryBalance.findMany({
      where: { organizationId: fixtures.organizationId },
      orderBy: [{ itemId: 'asc' }],
    });
    assert.equal(balances.length, 2);
    const lotBalance = balances.find((balance) => balance.itemId === fixtures.lotTrackedItemId);
    const simpleBalance = balances.find((balance) => balance.itemId === fixtures.simpleItemId);
    assert.ok(lotBalance);
    assert.ok(simpleBalance);
    assert.equal(lotBalance?.lotId, lot.id);
    assert.equal(lotBalance?.onHandQuantity.toString(), '80');
    assert.equal(lotBalance?.availableQuantity.toString(), '80');
    assert.equal(lotBalance?.heldQuantity.toString(), '0');
    assert.equal(simpleBalance?.lotId, null);
    assert.equal(simpleBalance?.onHandQuantity.toString(), '500');
    assert.equal(simpleBalance?.availableQuantity.toString(), '500');

    const auditEvents = await db.auditEvent.findMany({
      where: {
        organizationId: fixtures.organizationId,
        entityType: 'receipt',
        entityId: receipt.id,
      },
    });
    assert.equal(auditEvents.length, 1);
    assert.equal(auditEvents[0]?.actionType, 'receipt.posted');
    assert.equal(auditEvents[0]?.correlationId, `receipt:${receipt.receiptNumber}`);
  });

  test('requires lot codes for lot-tracked items on receipt posting', async () => {
    await assert.rejects(
      receivingModule.createReceiptWithPosting({
        organizationId: fixtures.organizationId,
        locationId: fixtures.locationId,
        supplierId: fixtures.supplierId,
        purchaseOrderId: fixtures.purchaseOrderId,
        receiptMethod: 'truck_delivery',
        receivedAt: '2026-03-13T18:00:00.000Z',
        lines: [
          {
            itemId: fixtures.lotTrackedItemId,
            purchaseOrderLineId: fixtures.lotTrackedPoLineId,
            receivedQuantity: 5,
            acceptedQuantity: 5,
            expirationDate: '2026-03-20T00:00:00.000Z',
          },
        ],
      }),
      /Lot code is required/,
    );
  });

  test('requires expiration dates for expiration-tracked items on receipt posting', async () => {
    await assert.rejects(
      receivingModule.createReceiptWithPosting({
        organizationId: fixtures.organizationId,
        locationId: fixtures.locationId,
        supplierId: fixtures.supplierId,
        purchaseOrderId: fixtures.purchaseOrderId,
        receiptMethod: 'truck_delivery',
        receivedAt: '2026-03-13T18:00:00.000Z',
        lines: [
          {
            itemId: fixtures.lotTrackedItemId,
            purchaseOrderLineId: fixtures.lotTrackedPoLineId,
            receivedQuantity: 5,
            acceptedQuantity: 5,
            lotCode: 'LOT-NEEDS-EXP',
          },
        ],
      }),
      /Expiration date is required/,
    );
  });
});
