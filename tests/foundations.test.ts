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
type PurchasingModule = typeof import('../src/lib/services/purchasing');

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
  releaseHoldPermissionId: string;
  inventoryAdjustPermissionId: string;
  complianceViewPermissionId: string;
};

let dbModule: DbModule;
let suppliersModule: SuppliersModule;
let itemsModule: ItemsModule;
let receivingModule: ReceivingModule;
let purchasingModule: PurchasingModule;
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

  const [releaseHoldPermission, inventoryAdjustPermission, complianceViewPermission] = await Promise.all([
    db.permission.create({
      data: {
        key: `receiving.release_hold.${randomUUID().slice(0, 8)}`,
        description: 'Release hold',
        domain: 'receiving',
      },
    }),
    db.permission.create({
      data: {
        key: `inventory.adjust.${randomUUID().slice(0, 8)}`,
        description: 'Adjust inventory',
        domain: 'inventory',
      },
    }),
    db.permission.create({
      data: {
        key: `compliance.view.${randomUUID().slice(0, 8)}`,
        description: 'View compliance',
        domain: 'compliance',
      },
    }),
  ]);

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
    releaseHoldPermissionId: releaseHoldPermission.id,
    inventoryAdjustPermissionId: inventoryAdjustPermission.id,
    complianceViewPermissionId: complianceViewPermission.id,
  };
}

before(async () => {
  dbModule = await import('../src/lib/db/client');
  suppliersModule = await import('../src/lib/services/suppliers');
  itemsModule = await import('../src/lib/services/items');
  receivingModule = await import('../src/lib/services/receiving');
  purchasingModule = await import('../src/lib/services/purchasing');
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

    await assert.rejects(
      suppliersModule.updateSupplier('org-does-not-own-record', created.id, {
        status: 'inactive',
      }),
      /Supplier was not found/,
    );
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

  test('builds a purchasing overview and PO detail with receiving linkage', async () => {
    let overview = await purchasingModule.listPurchasingOverview(fixtures.organizationId);
    assert.equal(overview.summary.activePurchaseOrders, 1);
    assert.equal(overview.summary.readyToReceiveCount, 1);
    assert.equal(overview.activePurchaseOrders[0]?.poNumber, 'PO-1001');
    assert.equal(overview.activePurchaseOrders[0]?.completionPercent, 0);
    assert.equal(overview.activePurchaseOrders[0]?.nextAction.href, 'receive');

    await receivingModule.createReceiptWithPosting({
      organizationId: fixtures.organizationId,
      actorId: 'user-123',
      locationId: fixtures.locationId,
      supplierId: fixtures.supplierId,
      purchaseOrderId: fixtures.purchaseOrderId,
      receiptMethod: 'truck_delivery',
      receivedAt: '2026-03-13T18:00:00.000Z',
      lines: [
        {
          itemId: fixtures.lotTrackedItemId,
          purchaseOrderLineId: fixtures.lotTrackedPoLineId,
          receivedQuantity: 40,
          acceptedQuantity: 40,
          lotCode: 'LOT-PO-PARTIAL-001',
          expirationDate: '2026-03-20T00:00:00.000Z',
        },
      ],
    });

    overview = await purchasingModule.listPurchasingOverview(fixtures.organizationId);
    assert.equal(overview.summary.activePurchaseOrders, 1);
    assert.equal(overview.activePurchaseOrders[0]?.completionPercent, 7);
    assert.equal(overview.activePurchaseOrders[0]?.receiptCount, 1);
    assert.equal(overview.activePurchaseOrders[0]?.openLineCount, 2);

    const detail = await purchasingModule.getPurchaseOrderDetail(fixtures.organizationId, fixtures.purchaseOrderId);
    assert.equal(detail.status, 'partially_received');
    assert.equal(detail.receipts.length, 1);
    assert.equal(detail.nextAction.href, 'receive');
    assert.equal(detail.lines.length, 2);
    const lotTrackedLine = detail.lines.find((line) => line.itemId === fixtures.lotTrackedItemId);
    const simpleLine = detail.lines.find((line) => line.itemId === fixtures.simpleItemId);
    assert.equal(lotTrackedLine?.receipts[0]?.receiptNumber, 'RCV-00001');
    assert.equal(lotTrackedLine?.remainingQuantity, 40);
    assert.equal(simpleLine?.remainingQuantity, 500);

    await assert.rejects(
      purchasingModule.getPurchaseOrderDetail('org-does-not-own-record', fixtures.purchaseOrderId),
      /Purchase order was not found/,
    );
  });

  test('releases an active hold and is idempotent across retries', async () => {
    await receivingModule.createReceiptWithPosting({
      organizationId: fixtures.organizationId,
      actorId: 'user-123',
      locationId: fixtures.locationId,
      supplierId: fixtures.supplierId,
      purchaseOrderId: fixtures.purchaseOrderId,
      receiptMethod: 'truck_delivery',
      receivedAt: '2026-03-13T18:00:00.000Z',
      lines: [
        {
          itemId: fixtures.lotTrackedItemId,
          purchaseOrderLineId: fixtures.lotTrackedPoLineId,
          receivedQuantity: 80,
          acceptedQuantity: 80,
          lotCode: 'LOT-HOLD-001',
          expirationDate: '2026-03-20T00:00:00.000Z',
          holdType: 'quarantine',
          holdReasonCode: 'inspection_required',
        },
      ],
    });

    const hold = await db.inventoryHold.findFirstOrThrow({
      where: { organizationId: fixtures.organizationId, status: 'active' },
    });

    const inventoryModule = await import('../src/lib/services/inventory');
    const released = await inventoryModule.releaseInventoryHold({
      organizationId: fixtures.organizationId,
      actorId: 'user-456',
      holdId: hold.id,
      reasonCode: 'qa_passed',
      idempotencyKey: 'release-hold-1',
    });

    assert.equal(released.status, 'released');
    assert.equal(released.releaseReasonCode, 'qa_passed');

    const retried = await (await import('../src/lib/services/inventory')).releaseInventoryHold({
      organizationId: fixtures.organizationId,
      actorId: 'user-456',
      holdId: hold.id,
      reasonCode: 'qa_passed',
      idempotencyKey: 'release-hold-1',
    });

    assert.equal(retried.id, released.id);

    const movement = await db.inventoryMovement.findFirstOrThrow({
      where: {
        organizationId: fixtures.organizationId,
        sourceReferenceType: 'inventory_hold',
        sourceReferenceId: hold.id,
        movementType: 'release_hold',
      },
    });
    assert.equal(movement.quantityDelta.toString(), '80');

    const balance = await db.inventoryBalance.findFirstOrThrow({
      where: {
        organizationId: fixtures.organizationId,
        itemId: fixtures.lotTrackedItemId,
      },
    });
    assert.equal(balance.availableQuantity.toString(), '80');
    assert.equal(balance.heldQuantity.toString(), '0');

    const keys = await db.idempotencyKey.findMany({
      where: { organizationId: fixtures.organizationId, operationType: 'inventory_hold.release' },
    });
    assert.equal(keys.length, 1);
    assert.equal(keys[0]?.resourceId, released.id);
  });

  test('creates an inventory adjustment and blocks impossible negative inventory', async () => {
    await receivingModule.createReceiptWithPosting({
      organizationId: fixtures.organizationId,
      actorId: 'user-123',
      locationId: fixtures.locationId,
      supplierId: fixtures.supplierId,
      purchaseOrderId: fixtures.purchaseOrderId,
      receiptMethod: 'truck_delivery',
      receivedAt: '2026-03-13T18:00:00.000Z',
      lines: [
        {
          itemId: fixtures.simpleItemId,
          purchaseOrderLineId: fixtures.simplePoLineId,
          receivedQuantity: 500,
          acceptedQuantity: 500,
        },
      ],
    });

    const inventoryModule = await import('../src/lib/services/inventory');
    const adjustment = await inventoryModule.createInventoryAdjustment({
      organizationId: fixtures.organizationId,
      actorId: 'user-789',
      locationId: fixtures.locationId,
      itemId: fixtures.simpleItemId,
      adjustmentType: 'damage',
      quantityDelta: -50,
      reasonCode: 'damage_found',
      notes: 'Cracked trays during unload',
      idempotencyKey: 'adjustment-1',
    });

    assert.equal(adjustment.reasonCode, 'damage_found');

    const retried = await inventoryModule.createInventoryAdjustment({
      organizationId: fixtures.organizationId,
      actorId: 'user-789',
      locationId: fixtures.locationId,
      itemId: fixtures.simpleItemId,
      adjustmentType: 'damage',
      quantityDelta: -50,
      reasonCode: 'damage_found',
      notes: 'Cracked trays during unload',
      idempotencyKey: 'adjustment-1',
    });
    assert.equal(retried.id, adjustment.id);

    const balance = await db.inventoryBalance.findFirstOrThrow({
      where: {
        organizationId: fixtures.organizationId,
        locationId: fixtures.locationId,
        itemId: fixtures.simpleItemId,
      },
    });
    assert.equal(balance.onHandQuantity.toString(), '450');
    assert.equal(balance.availableQuantity.toString(), '450');

    await assert.rejects(
      inventoryModule.createInventoryAdjustment({
        organizationId: fixtures.organizationId,
        actorId: 'user-789',
        locationId: fixtures.locationId,
        itemId: fixtures.simpleItemId,
        adjustmentType: 'damage',
        quantityDelta: -1000,
        reasonCode: 'damage_found',
      }),
      /below zero/,
    );
  });

  test('auto-creates compliance issues for held and discrepant receipt lines', async () => {
    await receivingModule.createReceiptWithPosting({
      organizationId: fixtures.organizationId,
      actorId: 'user-123',
      locationId: fixtures.locationId,
      supplierId: fixtures.supplierId,
      purchaseOrderId: fixtures.purchaseOrderId,
      receiptMethod: 'truck_delivery',
      receivedAt: '2026-03-13T18:00:00.000Z',
      lines: [
        {
          itemId: fixtures.lotTrackedItemId,
          purchaseOrderLineId: fixtures.lotTrackedPoLineId,
          receivedQuantity: 40,
          acceptedQuantity: 40,
          lotCode: 'LOT-COMP-001',
          expirationDate: '2026-03-20T00:00:00.000Z',
          holdType: 'quarantine',
          holdReasonCode: 'inspection_required',
        },
        {
          itemId: fixtures.simpleItemId,
          purchaseOrderLineId: fixtures.simplePoLineId,
          receivedQuantity: 50,
          acceptedQuantity: 45,
          rejectedQuantity: 5,
          discrepancyType: 'damaged',
          discrepancyNotes: 'Corner crushed on arrival',
        },
      ],
    });

    const complianceModule = await import('../src/lib/services/compliance');
    const issues = await complianceModule.listComplianceIssues(fixtures.organizationId);
    assert.equal(issues.length, 2);
    assert.equal(issues.filter((issue) => issue.issueType === 'receipt_hold').length, 1);
    assert.equal(issues.filter((issue) => issue.issueType === 'receipt_discrepancy').length, 1);
  });

  test('creates provider-neutral accounting events for receipts and adjustments', async () => {
    const receipt = await receivingModule.createReceiptWithPosting({
      organizationId: fixtures.organizationId,
      actorId: 'user-123',
      locationId: fixtures.locationId,
      supplierId: fixtures.supplierId,
      purchaseOrderId: fixtures.purchaseOrderId,
      receiptMethod: 'truck_delivery',
      receivedAt: '2026-03-13T18:00:00.000Z',
      lines: [
        {
          itemId: fixtures.simpleItemId,
          purchaseOrderLineId: fixtures.simplePoLineId,
          receivedQuantity: 100,
          acceptedQuantity: 100,
        },
      ],
    });

    const inventoryModule = await import('../src/lib/services/inventory');
    await inventoryModule.createInventoryAdjustment({
      organizationId: fixtures.organizationId,
      actorId: 'user-123',
      locationId: fixtures.locationId,
      itemId: fixtures.simpleItemId,
      adjustmentType: 'correction',
      quantityDelta: -10,
      reasonCode: 'manual_correction',
      notes: 'Cycle count correction',
      idempotencyKey: 'acct-adjust-1',
    });

    const quickbooksConnection = await db.integrationConnection.findFirstOrThrow({
      where: { organizationId: fixtures.organizationId, provider: 'quickbooks' },
    });
    assert.equal(quickbooksConnection.displayName, 'QuickBooks Online');

    const events = await db.accountingEvent.findMany({
      where: { organizationId: fixtures.organizationId },
      orderBy: { createdAt: 'asc' },
    });
    assert.equal(events.length, 2);
    assert.equal(events[0]?.accountingEventType, 'inventory_receipt_posted');
    assert.equal(events[0]?.sourceEventId, receipt.id);
    assert.equal(events[0]?.integrationConnectionId, quickbooksConnection.id);
    assert.equal(events[1]?.accountingEventType, 'inventory_adjustment_posted');
    assert.equal(events[1]?.integrationConnectionId, quickbooksConnection.id);
  });
});
