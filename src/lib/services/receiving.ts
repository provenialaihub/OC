import { Prisma, type InventoryHoldType, type ReceiptMethod, type ReceiptStatus } from '@prisma/client';
import { db } from '@/lib/db/client';

type ReceiveLineInput = {
  itemId: string;
  purchaseOrderLineId?: string | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity?: number;
  lotCode?: string | null;
  manufactureDate?: string | null;
  expirationDate?: string | null;
  discrepancyType?: 'short' | 'over' | 'damaged' | 'wrong_item' | 'missing_doc' | 'other' | null;
  discrepancyNotes?: string | null;
  holdType?: InventoryHoldType | null;
  holdReasonCode?: string | null;
};

type CreateReceiptInput = {
  organizationId: string;
  actorId?: string | null;
  locationId: string;
  supplierId: string;
  purchaseOrderId?: string | null;
  receiptMethod: ReceiptMethod;
  receivedAt: string;
  notes?: string | null;
  lines: ReceiveLineInput[];
};

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function normalizeDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function nextPoLineStatus(ordered: Prisma.Decimal, received: Prisma.Decimal) {
  if (received.gte(ordered)) return 'received' as const;
  if (received.gt(0)) return 'partially_received' as const;
  return 'open' as const;
}

async function applyBalanceMovement(tx: Prisma.TransactionClient, args: {
  organizationId: string;
  locationId: string;
  itemId: string;
  lotId?: string | null;
  occurredAt: Date;
  movementType: 'receive' | 'hold';
  quantity: Prisma.Decimal;
}) {
  const existing = await tx.inventoryBalance.findFirst({
    where: {
      organizationId: args.organizationId,
      locationId: args.locationId,
      itemId: args.itemId,
      lotId: args.lotId ?? null,
    },
  });

  const current = existing ?? await tx.inventoryBalance.create({
    data: {
      organizationId: args.organizationId,
      locationId: args.locationId,
      itemId: args.itemId,
      lotId: args.lotId ?? null,
      onHandQuantity: decimal(0),
      availableQuantity: decimal(0),
      heldQuantity: decimal(0),
      allocatedQuantity: decimal(0),
      lastMovementAt: args.occurredAt,
    },
  });

  let onHand = new Prisma.Decimal(current.onHandQuantity);
  let available = new Prisma.Decimal(current.availableQuantity);
  let held = new Prisma.Decimal(current.heldQuantity);

  if (args.movementType === 'receive') {
    onHand = onHand.plus(args.quantity);
    available = available.plus(args.quantity);
  } else if (args.movementType === 'hold') {
    available = available.minus(args.quantity);
    held = held.plus(args.quantity);
  }

  await tx.inventoryBalance.update({
    where: { id: current.id },
    data: {
      onHandQuantity: onHand,
      availableQuantity: available,
      heldQuantity: held,
      lastMovementAt: args.occurredAt,
    },
  });
}

export async function listReceivingQueue(organizationId: string) {
  const [expectedPurchaseOrders, openReceipts, recentReceipts] = await Promise.all([
    db.purchaseOrder.findMany({
      where: {
        organizationId,
        status: { in: ['submitted', 'partially_received'] },
      },
      include: {
        supplier: true,
        location: true,
        lines: {
          include: { item: true, uom: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ expectedDate: 'asc' }, { createdAt: 'desc' }],
    }),
    db.receipt.findMany({
      where: {
        organizationId,
        status: { in: ['draft', 'under_review'] },
      },
      include: { supplier: true, location: true },
      orderBy: { receivedAt: 'desc' },
    }),
    db.receipt.findMany({
      where: { organizationId },
      include: {
        supplier: true,
        location: true,
        lines: { include: { item: true } },
      },
      orderBy: { receivedAt: 'desc' },
      take: 10,
    }),
  ]);

  return { expectedPurchaseOrders, openReceipts, recentReceipts };
}

export async function getReceivingFormOptions(organizationId: string) {
  const [locations, suppliers, items, purchaseOrders] = await Promise.all([
    db.location.findMany({ where: { organizationId, isActive: true }, orderBy: { name: 'asc' } }),
    db.supplier.findMany({ where: { organizationId }, orderBy: { displayName: 'asc' } }),
    db.item.findMany({
      where: { organizationId, isActive: true, trackInventory: true },
      include: { baseUom: true },
      orderBy: { name: 'asc' },
    }),
    db.purchaseOrder.findMany({
      where: {
        organizationId,
        status: { in: ['submitted', 'partially_received'] },
      },
      include: {
        supplier: true,
        location: true,
        lines: {
          where: { lineStatus: { in: ['open', 'partially_received'] } },
          include: { item: true, uom: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ expectedDate: 'asc' }, { createdAt: 'desc' }],
    }),
  ]);

  return { locations, suppliers, items, purchaseOrders };
}

export async function createReceiptWithPosting(input: CreateReceiptInput) {
  if (!input.lines.length) {
    throw new Error('At least one receipt line is required.');
  }

  const receivedAt = new Date(input.receivedAt);
  if (Number.isNaN(receivedAt.getTime())) {
    throw new Error('Received at is invalid.');
  }

  return db.$transaction(async (tx) => {
    const [location, supplier, purchaseOrder] = await Promise.all([
      tx.location.findFirst({ where: { id: input.locationId, organizationId: input.organizationId } }),
      tx.supplier.findFirst({ where: { id: input.supplierId, organizationId: input.organizationId } }),
      input.purchaseOrderId
        ? tx.purchaseOrder.findFirst({
            where: { id: input.purchaseOrderId, organizationId: input.organizationId },
            include: { lines: true },
          })
        : Promise.resolve(null),
    ]);

    if (!location) throw new Error('Location not found for this organization.');
    if (!supplier) throw new Error('Supplier not found for this organization.');
    if (input.purchaseOrderId && !purchaseOrder) throw new Error('Purchase order not found for this organization.');

    const itemIds = [...new Set(input.lines.map((line) => line.itemId))];
    const items = await tx.item.findMany({
      where: { organizationId: input.organizationId, id: { in: itemIds } },
      include: { baseUom: true },
    });
    const itemMap = new Map(items.map((item) => [item.id, item]));

    const receiptCount = await tx.receipt.count({ where: { organizationId: input.organizationId } });
    const receiptNumber = `RCV-${String(receiptCount + 1).padStart(5, '0')}`;
    const correlationId = `receipt:${receiptNumber}`;

    let status: ReceiptStatus = 'received';
    if (input.lines.some((line) => line.discrepancyType || line.holdType)) {
      status = 'under_review';
    }

    const receipt = await tx.receipt.create({
      data: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId ?? null,
        receiptNumber,
        receiptMethod: input.receiptMethod,
        status,
        receivedAt,
        notes: input.notes ?? null,
      },
    });

    const createdLines = [] as Array<{ id: string; itemId: string; acceptedQuantity: Prisma.Decimal; holdType: InventoryHoldType | null; holdReasonCode: string | null; lotId: string | null; }>;

    for (const line of input.lines) {
      const item = itemMap.get(line.itemId);
      if (!item) throw new Error('A receipt line item was not found for this organization.');

      const receivedQty = decimal(line.receivedQuantity);
      const acceptedQty = decimal(line.acceptedQuantity);
      const rejectedQty = decimal(line.rejectedQuantity ?? Math.max(line.receivedQuantity - line.acceptedQuantity, 0));

      if (receivedQty.lt(0) || acceptedQty.lt(0) || rejectedQty.lt(0)) {
        throw new Error('Receipt quantities cannot be negative.');
      }
      if (!receivedQty.eq(acceptedQty.plus(rejectedQty))) {
        throw new Error(`Received quantity must equal accepted + rejected for ${item.name}.`);
      }
      if (item.trackLots && !line.lotCode?.trim()) {
        throw new Error(`Lot code is required for lot-tracked item ${item.name}.`);
      }
      if (item.trackExpiration && !line.expirationDate) {
        throw new Error(`Expiration date is required for expiration-tracked item ${item.name}.`);
      }
      if (line.holdType && !line.holdReasonCode?.trim()) {
        throw new Error(`Hold reason is required when placing ${item.name} on hold.`);
      }

      const receiptLine = await tx.receiptLine.create({
        data: {
          organizationId: input.organizationId,
          receiptId: receipt.id,
          purchaseOrderLineId: line.purchaseOrderLineId ?? null,
          itemId: line.itemId,
          receivedQuantity: receivedQty,
          acceptedQuantity: acceptedQty,
          rejectedQuantity: rejectedQty,
          uomId: item.baseUomId,
          lotCode: line.lotCode?.trim() || null,
          manufactureDate: normalizeDate(line.manufactureDate),
          expirationDate: normalizeDate(line.expirationDate),
          discrepancyType: line.discrepancyType ?? null,
          discrepancyNotes: line.discrepancyNotes?.trim() || null,
          holdType: line.holdType ?? null,
          holdReasonCode: line.holdReasonCode?.trim() || null,
        },
      });

      let lotId: string | null = null;
      if (item.trackLots) {
        const lot = await tx.lot.upsert({
          where: {
            organizationId_itemId_lotCode: {
              organizationId: input.organizationId,
              itemId: item.id,
              lotCode: line.lotCode!.trim(),
            },
          },
          update: {
            supplierId: supplier.id,
            sourceReceiptLineId: receiptLine.id,
            manufactureDate: normalizeDate(line.manufactureDate),
            receivedDate: receivedAt,
            expirationDate: normalizeDate(line.expirationDate),
            status: line.holdType === 'quarantine' ? 'quarantined' : line.holdType ? 'held' : 'active',
          },
          create: {
            organizationId: input.organizationId,
            itemId: item.id,
            supplierId: supplier.id,
            sourceReceiptLineId: receiptLine.id,
            lotCode: line.lotCode!.trim(),
            manufactureDate: normalizeDate(line.manufactureDate),
            receivedDate: receivedAt,
            expirationDate: normalizeDate(line.expirationDate),
            status: line.holdType === 'quarantine' ? 'quarantined' : line.holdType ? 'held' : 'active',
          },
        });
        lotId = lot.id;
      }

      if (acceptedQty.gt(0) && item.trackInventory) {
        await tx.inventoryMovement.create({
          data: {
            organizationId: input.organizationId,
            locationId: input.locationId,
            itemId: item.id,
            lotId,
            movementType: 'receive',
            quantityDelta: acceptedQty,
            uomId: item.baseUomId,
            reasonCode: line.discrepancyType ? `discrepancy:${line.discrepancyType}` : 'receipt_posted',
            sourceReferenceType: 'receipt_line',
            sourceReferenceId: receiptLine.id,
            actorType: 'user',
            actorId: input.actorId ?? null,
            occurredAt: receivedAt,
            correlationId,
            metadataJson: {
              receiptId: receipt.id,
              receiptNumber,
              discrepancyType: line.discrepancyType ?? null,
            },
          },
        });

        await applyBalanceMovement(tx, {
          organizationId: input.organizationId,
          locationId: input.locationId,
          itemId: item.id,
          lotId,
          occurredAt: receivedAt,
          movementType: 'receive',
          quantity: acceptedQty,
        });
      }

      if (line.purchaseOrderLineId && purchaseOrder) {
        const poLine = purchaseOrder.lines.find((candidate) => candidate.id === line.purchaseOrderLineId);
        if (poLine) {
          const nextReceived = new Prisma.Decimal(poLine.receivedQuantity).plus(acceptedQty);
          await tx.purchaseOrderLine.update({
            where: { id: poLine.id },
            data: {
              receivedQuantity: nextReceived,
              lineStatus: nextPoLineStatus(poLine.orderedQuantity, nextReceived),
            },
          });
        }
      }

      createdLines.push({
        id: receiptLine.id,
        itemId: item.id,
        acceptedQuantity: acceptedQty,
        holdType: line.holdType ?? null,
        holdReasonCode: line.holdReasonCode?.trim() || null,
        lotId,
      });
    }

    if (purchaseOrder) {
      const refreshedLines = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: purchaseOrder.id } });
      const allReceived = refreshedLines.every((line) => ['received', 'cancelled'].includes(line.lineStatus));
      const anyReceived = refreshedLines.some((line) => ['partially_received', 'received'].includes(line.lineStatus));
      await tx.purchaseOrder.update({
        where: { id: purchaseOrder.id },
        data: {
          status: allReceived ? 'received' : anyReceived ? 'partially_received' : purchaseOrder.status,
        },
      });
    }

    for (const line of createdLines) {
      if (!line.holdType || !line.acceptedQuantity.gt(0)) continue;

      await tx.inventoryHold.create({
        data: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          lotId: line.lotId,
          itemId: line.itemId,
          holdType: line.holdType,
          quantity: line.acceptedQuantity,
          reasonCode: line.holdReasonCode ?? 'inspection_required',
        },
      });

      await tx.inventoryMovement.create({
        data: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          itemId: line.itemId,
          lotId: line.lotId,
          movementType: 'hold',
          quantityDelta: decimal(0),
          uomId: (await tx.item.findUniqueOrThrow({ where: { id: line.itemId } })).baseUomId,
          reasonCode: line.holdReasonCode ?? 'inspection_required',
          sourceReferenceType: 'receipt_line',
          sourceReferenceId: line.id,
          actorType: 'user',
          actorId: input.actorId ?? null,
          occurredAt: receivedAt,
          correlationId,
          metadataJson: { holdType: line.holdType },
        },
      });

      await applyBalanceMovement(tx, {
        organizationId: input.organizationId,
        locationId: input.locationId,
        itemId: line.itemId,
        lotId: line.lotId,
        occurredAt: receivedAt,
        movementType: 'hold',
        quantity: line.acceptedQuantity,
      });
    }

    await tx.auditEvent.createMany({
      data: [
        {
          organizationId: input.organizationId,
          locationId: input.locationId,
          actorType: 'user',
          actorId: input.actorId ?? null,
          actionType: 'receipt.posted',
          entityType: 'receipt',
          entityId: receipt.id,
          afterJson: { receiptNumber, lineCount: createdLines.length, status },
          correlationId,
          sourceChannel: 'web',
          occurredAt: receivedAt,
        },
        ...createdLines
          .filter((line) => Boolean(line.holdType))
          .map((line) => ({
            organizationId: input.organizationId,
            locationId: input.locationId,
            actorType: 'user' as const,
            actorId: input.actorId ?? null,
            actionType: 'inventory.hold.created',
            entityType: 'receipt_line',
            entityId: line.id,
            afterJson: { holdType: line.holdType, quantity: line.acceptedQuantity.toString() },
            reasonCode: line.holdReasonCode,
            correlationId,
            sourceChannel: 'web',
            occurredAt: receivedAt,
          })),
      ],
    });

    return tx.receipt.findUniqueOrThrow({
      where: { id: receipt.id },
      include: {
        supplier: true,
        location: true,
        purchaseOrder: true,
        lines: { include: { item: true } },
      },
    });
  });
}
