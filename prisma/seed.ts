import 'dotenv/config';
import { type UnitOfMeasureCategory } from '@prisma/client';
import { db } from '../src/lib/db/client';

async function main() {
  const org = await db.organization.upsert({
    where: { slug: 'blue-gourmet' },
    update: {},
    create: {
      slug: 'blue-gourmet',
      legalName: 'Blue Gourmet',
      displayName: 'Blue Gourmet',
      status: 'trial',
      timezone: 'America/Chicago',
    },
  });

  const location = await db.location.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'main' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Main Facility',
      code: 'main',
      type: 'production',
    },
  });

  const permissions = [
    ['supplier.view', 'View suppliers', 'supplier'],
    ['supplier.manage', 'Manage suppliers', 'supplier'],
    ['item.view', 'View items', 'item'],
    ['item.manage', 'Manage items', 'item'],
    ['receiving.create', 'Create receipts', 'receiving'],
    ['receiving.release_hold', 'Release held inventory', 'receiving'],
    ['inventory.view', 'View inventory', 'inventory'],
    ['inventory.adjust', 'Adjust inventory', 'inventory'],
    ['purchasing.create', 'Create purchase orders', 'purchasing'],
    ['compliance.view', 'View compliance items', 'compliance'],
    ['accounting.view', 'View accounting bridge', 'accounting'],
  ] as const;

  for (const [key, description, domain] of permissions) {
    await db.permission.upsert({
      where: { key },
      update: {},
      create: { key, description, domain },
    });
  }

  const units: {
    code: string;
    name: string;
    category: UnitOfMeasureCategory;
    baseUnitCode?: string;
    conversionToBase?: string;
  }[] = [
    { code: 'ea', name: 'Each', category: 'count' },
    { code: 'case', name: 'Case', category: 'package' },
    { code: 'lb', name: 'Pound', category: 'weight' },
    { code: 'oz', name: 'Ounce', category: 'weight', baseUnitCode: 'lb', conversionToBase: '0.0625' },
    { code: 'gal', name: 'Gallon', category: 'volume' },
    { code: 'qt', name: 'Quart', category: 'volume', baseUnitCode: 'gal', conversionToBase: '0.25' },
  ];

  for (const unit of units) {
    const existing = await db.unitOfMeasure.findFirst({
      where: { organizationId: null, code: unit.code },
      select: { id: true },
    });

    if (existing) {
      await db.unitOfMeasure.update({
        where: { id: existing.id },
        data: {
          name: unit.name,
          category: unit.category,
          baseUnitCode: unit.baseUnitCode ?? null,
          conversionToBase: unit.conversionToBase ?? null,
        },
      });
      continue;
    }

    await db.unitOfMeasure.create({
      data: {
        organizationId: null,
        code: unit.code,
        name: unit.name,
        category: unit.category,
        baseUnitCode: unit.baseUnitCode ?? null,
        conversionToBase: unit.conversionToBase ?? null,
      },
    });
  }

  const categories = [
    ['protein', 'Protein'],
    ['produce', 'Produce'],
    ['dry-goods', 'Dry goods'],
    ['packaging', 'Packaging'],
  ] as const;

  for (const [code, name] of categories) {
    await db.itemCategory.upsert({
      where: {
        organizationId_code: {
          organizationId: org.id,
          code,
        },
      },
      update: { name },
      create: {
        organizationId: org.id,
        code,
        name,
      },
    });
  }

  const each = await db.unitOfMeasure.findFirstOrThrow({ where: { organizationId: null, code: 'ea' } });
  const pounds = await db.unitOfMeasure.findFirstOrThrow({ where: { organizationId: null, code: 'lb' } });
  const proteinCategory = await db.itemCategory.findUniqueOrThrow({
    where: { organizationId_code: { organizationId: org.id, code: 'protein' } },
  });
  const packagingCategory = await db.itemCategory.findUniqueOrThrow({
    where: { organizationId_code: { organizationId: org.id, code: 'packaging' } },
  });

  const supplier = await db.supplier.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'us-foods' } },
    update: { displayName: 'US Foods', legalName: 'US Foods, Inc.', status: 'active' },
    create: {
      organizationId: org.id,
      code: 'us-foods',
      legalName: 'US Foods, Inc.',
      displayName: 'US Foods',
      status: 'active',
      category: 'Distributor',
      paymentTerms: 'Net 14',
      leadTimeDays: 2,
    },
  });

  const chicken = await db.item.upsert({
    where: { organizationId_sku: { organizationId: org.id, sku: 'CHK-BRST-40LB' } },
    update: {},
    create: {
      organizationId: org.id,
      sku: 'CHK-BRST-40LB',
      name: 'Chicken breast case',
      itemType: 'ingredient',
      itemCategoryId: proteinCategory.id,
      baseUomId: pounds.id,
      trackInventory: true,
      trackLots: true,
      trackExpiration: true,
      reorderEnabled: true,
      defaultReorderPoint: 40,
      defaultReorderQuantity: 120,
    },
  });

  const tray = await db.item.upsert({
    where: { organizationId_sku: { organizationId: org.id, sku: 'TRAY-9X9-BLK' } },
    update: {},
    create: {
      organizationId: org.id,
      sku: 'TRAY-9X9-BLK',
      name: '9x9 black meal tray',
      itemType: 'packaging',
      itemCategoryId: packagingCategory.id,
      baseUomId: each.id,
      trackInventory: true,
      trackLots: false,
      trackExpiration: false,
      reorderEnabled: true,
      defaultReorderPoint: 200,
      defaultReorderQuantity: 1000,
    },
  });

  const purchaseOrder = await db.purchaseOrder.upsert({
    where: { organizationId_poNumber: { organizationId: org.id, poNumber: 'PO-1001' } },
    update: {},
    create: {
      organizationId: org.id,
      locationId: location.id,
      supplierId: supplier.id,
      poNumber: 'PO-1001',
      status: 'submitted',
      orderDate: new Date('2026-03-12T10:00:00.000Z'),
      expectedDate: new Date('2026-03-13T15:00:00.000Z'),
      currencyCode: 'USD',
      notes: 'Starter receiving seed PO',
    },
  });

  await db.purchaseOrderLine.upsert({
    where: { id: `${purchaseOrder.id}-1` },
    update: {},
    create: {
      id: `${purchaseOrder.id}-1`,
      organizationId: org.id,
      purchaseOrderId: purchaseOrder.id,
      itemId: chicken.id,
      orderedQuantity: 80,
      receivedQuantity: 0,
      uomId: pounds.id,
      description: 'Fresh chicken breasts',
      unitPrice: 3.45,
    },
  });

  await db.purchaseOrderLine.upsert({
    where: { id: `${purchaseOrder.id}-2` },
    update: {},
    create: {
      id: `${purchaseOrder.id}-2`,
      organizationId: org.id,
      purchaseOrderId: purchaseOrder.id,
      itemId: tray.id,
      orderedQuantity: 500,
      receivedQuantity: 0,
      uomId: each.id,
      description: 'Meal tray packaging',
      unitPrice: 0.24,
    },
  });

  console.log('Seeded Blue Gourmet org, supplier/item foundations, and starter receiving PO.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
