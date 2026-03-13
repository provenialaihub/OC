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

  await db.location.upsert({
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
    ['inventory.view', 'View inventory', 'inventory'],
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
    await db.unitOfMeasure.upsert({
      where: {
        organizationId_code: {
          organizationId: org.id,
          code: unit.code,
        },
      },
      update: {
        name: unit.name,
        category: unit.category,
        baseUnitCode: unit.baseUnitCode ?? null,
        conversionToBase: unit.conversionToBase ?? null,
      },
      create: {
        organizationId: org.id,
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

  console.log('Seeded Blue Gourmet org, starter permissions, UOMs, and item categories.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
