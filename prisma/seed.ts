import 'dotenv/config';
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

  console.log('Seeded Blue Gourmet base org/location and starter permissions.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
