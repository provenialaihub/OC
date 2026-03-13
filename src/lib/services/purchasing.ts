import { db } from '@/lib/db/client';
import { NotFoundError } from '@/lib/errors/service-errors';

function toNumber(value: { toString(): string } | number | null | undefined) {
  if (value == null) return 0;
  return Number(value.toString());
}

function percent(received: number, ordered: number) {
  if (ordered <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((received / ordered) * 100)));
}

function formatStatus(value: string) {
  return value.replaceAll('_', ' ');
}

function getNextAction(status: string, openLineCount: number) {
  if (status === 'submitted' || status === 'partially_received') {
    return {
      label: openLineCount > 0 ? 'Receive against this PO' : 'Review receipt completion',
      href: openLineCount > 0 ? 'receive' : null,
      tone: 'ready' as const,
    };
  }

  if (status === 'draft') {
    return {
      label: 'Submit and route for supplier confirmation',
      href: null,
      tone: 'warning' as const,
    };
  }

  if (status === 'received') {
    return {
      label: 'Review receipt history and close when reconciled',
      href: null,
      tone: 'neutral' as const,
    };
  }

  if (status === 'closed') {
    return {
      label: 'PO is fully closed',
      href: null,
      tone: 'neutral' as const,
    };
  }

  return {
    label: `PO is ${formatStatus(status)}`,
    href: null,
    tone: 'neutral' as const,
  };
}

export async function listPurchasingOverview(organizationId: string) {
  const [purchaseOrders, receiptCounts] = await Promise.all([
    db.purchaseOrder.findMany({
      where: { organizationId },
      include: {
        supplier: true,
        location: true,
        lines: {
          include: {
            item: true,
            uom: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ expectedDate: 'asc' }, { createdAt: 'desc' }],
    }),
    db.receipt.groupBy({
      by: ['purchaseOrderId'],
      where: {
        organizationId,
        purchaseOrderId: { not: null },
      },
      _count: { _all: true },
    }),
  ]);

  const receiptCountByPoId = new Map(
    receiptCounts
      .filter((entry) => entry.purchaseOrderId)
      .map((entry) => [entry.purchaseOrderId as string, entry._count._all]),
  );

  const rows = purchaseOrders.map((po) => {
    const lines = po.lines.map((line) => {
      const orderedQuantity = toNumber(line.orderedQuantity);
      const receivedQuantity = toNumber(line.receivedQuantity);
      const remainingQuantity = Math.max(orderedQuantity - receivedQuantity, 0);

      return {
        id: line.id,
        lineStatus: line.lineStatus,
        orderedQuantity,
        receivedQuantity,
        remainingQuantity,
      };
    });

    const orderedQuantity = lines.reduce((sum, line) => sum + line.orderedQuantity, 0);
    const receivedQuantity = lines.reduce((sum, line) => sum + line.receivedQuantity, 0);
    const openLineCount = lines.filter((line) => ['open', 'partially_received'].includes(line.lineStatus)).length;
    const completionPercent = percent(receivedQuantity, orderedQuantity);
    const receiptCount = receiptCountByPoId.get(po.id) ?? 0;

    return {
      id: po.id,
      poNumber: po.poNumber,
      status: po.status,
      statusLabel: formatStatus(po.status),
      supplierName: po.supplier.displayName,
      locationName: po.location.name,
      orderDate: po.orderDate,
      expectedDate: po.expectedDate,
      currencyCode: po.currencyCode,
      orderedQuantity,
      receivedQuantity,
      openLineCount,
      lineCount: po.lines.length,
      receiptCount,
      completionPercent,
      isOverdue: Boolean(po.expectedDate && po.expectedDate < new Date() && openLineCount > 0),
      nextAction: getNextAction(po.status, openLineCount),
    };
  });

  const activePurchaseOrders = rows.filter((po) => ['draft', 'submitted', 'partially_received'].includes(po.status));
  const recentlyCompleted = rows.filter((po) => ['received', 'closed'].includes(po.status)).slice(0, 5);

  return {
    summary: {
      totalPurchaseOrders: rows.length,
      activePurchaseOrders: activePurchaseOrders.length,
      overduePurchaseOrders: activePurchaseOrders.filter((po) => po.isOverdue).length,
      readyToReceiveCount: activePurchaseOrders.filter((po) => po.nextAction.href === 'receive').length,
    },
    activePurchaseOrders,
    recentlyCompleted,
  };
}

export async function getPurchaseOrderDetail(organizationId: string, purchaseOrderId: string) {
  const purchaseOrder = await db.purchaseOrder.findFirst({
    where: {
      id: purchaseOrderId,
      organizationId,
    },
    include: {
      supplier: true,
      location: true,
      lines: {
        include: {
          item: true,
          uom: true,
          receiptLines: {
            include: {
              receipt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      receipts: {
        include: {
          lines: {
            include: { item: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { receivedAt: 'desc' },
      },
    },
  });

  if (!purchaseOrder) {
    throw new NotFoundError('Purchase order was not found for this organization.');
  }

  const lines = purchaseOrder.lines.map((line) => {
    const orderedQuantity = toNumber(line.orderedQuantity);
    const receivedQuantity = toNumber(line.receivedQuantity);
    const remainingQuantity = Math.max(orderedQuantity - receivedQuantity, 0);

    return {
      id: line.id,
      itemId: line.itemId,
      itemName: line.item.name,
      sku: line.item.sku,
      description: line.description,
      uomCode: line.uom.code,
      orderedQuantity,
      receivedQuantity,
      remainingQuantity,
      lineStatus: line.lineStatus,
      completionPercent: percent(receivedQuantity, orderedQuantity),
      receipts: line.receiptLines.map((receiptLine) => ({
        id: receiptLine.id,
        receiptId: receiptLine.receiptId,
        receiptNumber: receiptLine.receipt.receiptNumber,
        receiptStatus: receiptLine.receipt.status,
        acceptedQuantity: toNumber(receiptLine.acceptedQuantity),
        receivedAt: receiptLine.receipt.receivedAt,
        discrepancyType: receiptLine.discrepancyType,
        holdType: receiptLine.holdType,
      })),
    };
  });

  const orderedQuantity = lines.reduce((sum, line) => sum + line.orderedQuantity, 0);
  const receivedQuantity = lines.reduce((sum, line) => sum + line.receivedQuantity, 0);
  const openLineCount = lines.filter((line) => ['open', 'partially_received'].includes(line.lineStatus)).length;
  const completionPercent = percent(receivedQuantity, orderedQuantity);
  const nextAction = getNextAction(purchaseOrder.status, openLineCount);

  return {
    id: purchaseOrder.id,
    poNumber: purchaseOrder.poNumber,
    status: purchaseOrder.status,
    statusLabel: formatStatus(purchaseOrder.status),
    orderDate: purchaseOrder.orderDate,
    expectedDate: purchaseOrder.expectedDate,
    currencyCode: purchaseOrder.currencyCode,
    notes: purchaseOrder.notes,
    supplier: {
      id: purchaseOrder.supplier.id,
      displayName: purchaseOrder.supplier.displayName,
      status: purchaseOrder.supplier.status,
    },
    location: {
      id: purchaseOrder.location.id,
      name: purchaseOrder.location.name,
    },
    orderedQuantity,
    receivedQuantity,
    remainingQuantity: Math.max(orderedQuantity - receivedQuantity, 0),
    lineCount: lines.length,
    openLineCount,
    completionPercent,
    nextAction,
    lines,
    receipts: purchaseOrder.receipts.map((receipt) => ({
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      status: receipt.status,
      receiptMethod: receipt.receiptMethod,
      receivedAt: receipt.receivedAt,
      notes: receipt.notes,
      lineCount: receipt.lines.length,
    })),
  };
}
