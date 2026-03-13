import { db } from '@/lib/db/client';

export async function listInventoryBalances(organizationId: string) {
  return db.inventoryBalance.findMany({
    where: { organizationId },
    include: {
      item: true,
      location: true,
      lot: true,
    },
    orderBy: [{ item: { name: 'asc' } }, { updatedAt: 'desc' }],
  });
}

export async function getInventorySnapshotCounts(organizationId: string) {
  const [receivingTasks, heldLots, openIssues, lowStock] = await Promise.all([
    db.purchaseOrder.count({
      where: { organizationId, status: { in: ['submitted', 'partially_received'] } },
    }),
    db.inventoryHold.count({
      where: { organizationId, status: 'active' },
    }),
    db.receipt.count({
      where: { organizationId, status: 'under_review' },
    }),
    db.inventoryBalance.count({
      where: {
        organizationId,
        item: {
          reorderEnabled: true,
          defaultReorderPoint: { not: null },
        },
        availableQuantity: { lte: 0 },
      },
    }),
  ]);

  return { receivingTasks, heldLots, openIssues, lowStock };
}
