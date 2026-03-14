import { Prisma, type InventoryMovementType } from '@prisma/client';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors/service-errors';
import { createAccountingEvent, ensureDefaultQuickBooksConnection } from '@/lib/services/accounting';

function decimal(value: number | string | Prisma.Decimal) {
  if (value instanceof Prisma.Decimal) return value;
  if (typeof value === 'string') return new Prisma.Decimal(value);
  return new Prisma.Decimal(value.toFixed(2));
}

async function applyBalanceMovement(
  tx: Prisma.TransactionClient,
  args: {
    organizationId: string;
    locationId: string;
    itemId: string;
    lotId?: string | null;
    occurredAt: Date;
    movementType: 'adjust' | 'hold' | 'release_hold';
    quantity: Prisma.Decimal;
  },
) {
  const existing = await tx.inventoryBalance.findFirst({
    where: {
      organizationId: args.organizationId,
      locationId: args.locationId,
      itemId: args.itemId,
      lotId: args.lotId ?? null,
    },
  });

  const current =
    existing ??
    (await tx.inventoryBalance.create({
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
    }));

  let onHand = new Prisma.Decimal(current.onHandQuantity);
  let available = new Prisma.Decimal(current.availableQuantity);
  let held = new Prisma.Decimal(current.heldQuantity);

  if (args.movementType === 'adjust') {
    onHand = onHand.plus(args.quantity);
    available = available.plus(args.quantity);
  } else if (args.movementType === 'hold') {
    available = available.minus(args.quantity);
    held = held.plus(args.quantity);
  } else {
    available = available.plus(args.quantity);
    held = held.minus(args.quantity);
  }

  if (available.lt(0)) {
    throw new ConflictError('Inventory operation would push available quantity below zero.');
  }
  if (held.lt(0)) {
    throw new ConflictError('Inventory operation would push held quantity below zero.');
  }
  if (onHand.lt(0)) {
    throw new ConflictError('Inventory operation would push on-hand quantity below zero.');
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

function stableHash(input: unknown) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

async function reserveIdempotencyKey(
  tx: Prisma.TransactionClient,
  args: {
    organizationId: string;
    operationType: string;
    idempotencyKey?: string | null;
    payload: unknown;
  },
) {
  const key = args.idempotencyKey?.trim();
  if (!key) {
    return { existing: null, requestHash: stableHash(args.payload), key: null };
  }

  const requestHash = stableHash(args.payload);
  const existing = await tx.idempotencyKey.findUnique({
    where: {
      organizationId_operationType_idempotencyKey: {
        organizationId: args.organizationId,
        operationType: args.operationType,
        idempotencyKey: key,
      },
    },
  });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new ConflictError('Idempotency key was already used with a different payload.');
    }

    return { existing, requestHash, key };
  }

  await tx.idempotencyKey.create({
    data: {
      organizationId: args.organizationId,
      operationType: args.operationType,
      idempotencyKey: key,
      requestHash,
      status: 'started',
    },
  });

  return { existing: null, requestHash, key };
}

async function completeIdempotencyKey(
  tx: Prisma.TransactionClient,
  args: {
    organizationId: string;
    operationType: string;
    idempotencyKey?: string | null;
    resourceType: string;
    resourceId: string;
  },
) {
  const key = args.idempotencyKey?.trim();
  if (!key) return;

  await tx.idempotencyKey.update({
    where: {
      organizationId_operationType_idempotencyKey: {
        organizationId: args.organizationId,
        operationType: args.operationType,
        idempotencyKey: key,
      },
    },
    data: {
      status: 'completed',
      resourceType: args.resourceType,
      resourceId: args.resourceId,
    },
  });
}

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

export async function listActiveHolds(organizationId: string) {
  return db.inventoryHold.findMany({
    where: { organizationId, status: 'active' },
    include: {
      item: true,
      location: true,
      lot: true,
    },
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function getLotDetail(organizationId: string, lotId: string) {
  return db.lot.findFirst({
    where: { id: lotId, organizationId },
    include: {
      item: { include: { baseUom: true, category: true } },
      supplier: true,
      sourceReceiptLine: {
        include: {
          receipt: {
            include: {
              supplier: true,
              location: true,
              purchaseOrder: true,
            },
          },
        },
      },
      inventoryBalances: {
        include: { location: true },
        orderBy: { updatedAt: 'desc' },
      },
      inventoryHolds: {
        include: { location: true },
        orderBy: { createdAt: 'desc' },
      },
      inventoryMovements: {
        include: { location: true },
        orderBy: { occurredAt: 'desc' },
        take: 25,
      },
    },
  });
}

export async function releaseInventoryHold(input: {
  organizationId: string;
  actorId?: string | null;
  holdId: string;
  releaseQuantity?: number | null;
  reasonCode: string;
  idempotencyKey?: string | null;
}) {
  const reasonCode = input.reasonCode.trim();
  if (!reasonCode) {
    throw new ValidationError('Release reason code is required.');
  }

  return db.$transaction(async (tx) => {
    const reservation = await reserveIdempotencyKey(tx, {
      organizationId: input.organizationId,
      operationType: 'inventory_hold.release',
      idempotencyKey: input.idempotencyKey,
      payload: {
        holdId: input.holdId,
        releaseQuantity: input.releaseQuantity ?? null,
        reasonCode,
      },
    });

    if (reservation.existing?.resourceId) {
      const existing = await tx.inventoryHold.findFirst({
        where: {
          organizationId: input.organizationId,
          id: reservation.existing.resourceId,
        },
        include: { item: true, location: true, lot: true },
      });

      if (!existing) {
        throw new NotFoundError('Released hold was not found for this organization.');
      }

      return existing;
    }

    const hold = await tx.inventoryHold.findFirst({
      where: { id: input.holdId, organizationId: input.organizationId },
      include: { item: true, location: true, lot: true },
    });

    if (!hold) {
      throw new NotFoundError('Inventory hold was not found for this organization.');
    }
    if (hold.status !== 'active') {
      throw new ConflictError('Only active holds can be released.');
    }
    if (!hold.locationId) {
      throw new ValidationError('Only location-scoped holds can currently be released.');
    }

    const fullHeldQuantity = new Prisma.Decimal(hold.quantity ?? 0);
    const releaseQuantity = decimal(input.releaseQuantity ?? fullHeldQuantity);

    if (releaseQuantity.lte(0)) {
      throw new ValidationError('Release quantity must be greater than zero.');
    }
    if (fullHeldQuantity.lte(0)) {
      throw new ConflictError('Hold does not have releasable quantity.');
    }
    if (releaseQuantity.gt(fullHeldQuantity)) {
      throw new ConflictError('Release quantity cannot exceed held quantity.');
    }

    const occurredAt = new Date();
    const movementType: InventoryMovementType = 'release_hold';
    const correlationId = `hold-release:${hold.id}:${occurredAt.toISOString()}`;

    await tx.inventoryMovement.create({
      data: {
        organizationId: input.organizationId,
        locationId: hold.locationId,
        itemId: hold.itemId,
        lotId: hold.lotId,
        movementType,
        quantityDelta: releaseQuantity,
        uomId: hold.item.baseUomId,
        reasonCode,
        sourceReferenceType: 'inventory_hold',
        sourceReferenceId: hold.id,
        actorType: 'user',
        actorId: input.actorId ?? null,
        occurredAt,
        correlationId,
        metadataJson: {
          releaseQuantity: releaseQuantity.toString(),
          originalHeldQuantity: fullHeldQuantity.toString(),
        },
      },
    });

    await applyBalanceMovement(tx, {
      organizationId: input.organizationId,
      locationId: hold.locationId,
      itemId: hold.itemId,
      lotId: hold.lotId,
      occurredAt,
      movementType: 'release_hold',
      quantity: releaseQuantity,
    });

    let updatedHold;
    if (releaseQuantity.eq(fullHeldQuantity)) {
      updatedHold = await tx.inventoryHold.update({
        where: { id: hold.id },
        data: {
          status: 'released',
          releasedAt: occurredAt,
          releasedByUserId: input.actorId ?? null,
          releaseReasonCode: reasonCode,
        },
        include: { item: true, location: true, lot: true },
      });
    } else {
      await tx.inventoryHold.update({
        where: { id: hold.id },
        data: {
          quantity: fullHeldQuantity.minus(releaseQuantity),
        },
      });

      updatedHold = await tx.inventoryHold.create({
        data: {
          organizationId: hold.organizationId,
          locationId: hold.locationId,
          lotId: hold.lotId,
          itemId: hold.itemId,
          holdType: hold.holdType,
          quantity: releaseQuantity,
          reasonCode: hold.reasonCode,
          status: 'released',
          createdByUserId: hold.createdByUserId,
          releasedByUserId: input.actorId ?? null,
          releaseReasonCode: reasonCode,
          releasedAt: occurredAt,
        },
        include: { item: true, location: true, lot: true },
      });
    }

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        locationId: hold.locationId,
        actorType: 'user',
        actorId: input.actorId ?? null,
        actionType: 'inventory.hold.released',
        entityType: 'inventory_hold',
        entityId: updatedHold.id,
        beforeJson: {
          originalHoldId: hold.id,
          status: hold.status,
          quantity: fullHeldQuantity.toString(),
        },
        afterJson: {
          releasedHoldId: updatedHold.id,
          releasedQuantity: releaseQuantity.toString(),
          remainingHeldQuantity: fullHeldQuantity.minus(releaseQuantity).toString(),
          status: updatedHold.status,
        },
        reasonCode,
        correlationId,
        sourceChannel: 'web',
        occurredAt,
      },
    });

    await completeIdempotencyKey(tx, {
      organizationId: input.organizationId,
      operationType: 'inventory_hold.release',
      idempotencyKey: input.idempotencyKey,
      resourceType: 'inventory_hold',
      resourceId: updatedHold.id,
    });

    return updatedHold;
  });
}

export async function createInventoryAdjustment(input: {
  organizationId: string;
  actorId?: string | null;
  locationId: string;
  itemId: string;
  lotId?: string | null;
  adjustmentType: string;
  quantityDelta: number;
  reasonCode: string;
  notes?: string | null;
  idempotencyKey?: string | null;
}) {
  const adjustmentType = input.adjustmentType.trim();
  const reasonCode = input.reasonCode.trim();
  if (!adjustmentType) throw new ValidationError('Adjustment type is required.');
  if (!reasonCode) throw new ValidationError('Reason code is required.');
  if (input.quantityDelta === 0) throw new ValidationError('Adjustment quantity cannot be zero.');

  return db.$transaction(async (tx) => {
    const reservation = await reserveIdempotencyKey(tx, {
      organizationId: input.organizationId,
      operationType: 'inventory.adjustment.create',
      idempotencyKey: input.idempotencyKey,
      payload: {
        locationId: input.locationId,
        itemId: input.itemId,
        lotId: input.lotId ?? null,
        adjustmentType,
        quantityDelta: input.quantityDelta,
        reasonCode,
        notes: input.notes ?? null,
      },
    });

    if (reservation.existing?.resourceId) {
      return tx.inventoryAdjustment.findFirstOrThrow({
        where: { id: reservation.existing.resourceId, organizationId: input.organizationId },
      });
    }

    const [location, item, lot] = await Promise.all([
      tx.location.findFirst({ where: { id: input.locationId, organizationId: input.organizationId } }),
      tx.item.findFirst({ where: { id: input.itemId, organizationId: input.organizationId } }),
      input.lotId
        ? tx.lot.findFirst({ where: { id: input.lotId, organizationId: input.organizationId } })
        : Promise.resolve(null),
    ]);

    if (!location) throw new NotFoundError('Location not found for this organization.');
    if (!item) throw new NotFoundError('Item not found for this organization.');
    if (input.lotId && !lot) throw new NotFoundError('Lot not found for this organization.');
    if (item.trackLots && !input.lotId) {
      throw new ValidationError('Lot is required when adjusting a lot-tracked item.');
    }

    const quantityDelta = decimal(input.quantityDelta);
    const occurredAt = new Date();
    const correlationId = `adjustment:${input.itemId}:${occurredAt.toISOString()}`;

    if (quantityDelta.lt(0)) {
      const balance = await tx.inventoryBalance.findFirst({
        where: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          itemId: input.itemId,
          lotId: input.lotId ?? null,
        },
      });

      const available = new Prisma.Decimal(balance?.availableQuantity ?? 0);
      if (available.plus(quantityDelta).lt(0)) {
        throw new ConflictError('Adjustment would push available inventory below zero.');
      }
    }

    const adjustment = await tx.inventoryAdjustment.create({
      data: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        itemId: input.itemId,
        lotId: input.lotId ?? null,
        adjustmentType,
        quantityDelta,
        uomId: item.baseUomId,
        reasonCode,
        notes: input.notes?.trim() || null,
        createdByUserId: input.actorId ?? null,
      },
    });

    await tx.inventoryMovement.create({
      data: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        itemId: input.itemId,
        lotId: input.lotId ?? null,
        movementType: 'adjust',
        quantityDelta,
        uomId: item.baseUomId,
        reasonCode,
        sourceReferenceType: 'inventory_adjustment',
        sourceReferenceId: adjustment.id,
        actorType: 'user',
        actorId: input.actorId ?? null,
        occurredAt,
        correlationId,
        metadataJson: {
          adjustmentType,
          notes: input.notes?.trim() || null,
        },
      },
    });

    await applyBalanceMovement(tx, {
      organizationId: input.organizationId,
      locationId: input.locationId,
      itemId: input.itemId,
      lotId: input.lotId ?? null,
      occurredAt,
      movementType: 'adjust',
      quantity: quantityDelta,
    });

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        actorType: 'user',
        actorId: input.actorId ?? null,
        actionType: 'inventory.adjusted',
        entityType: 'inventory_adjustment',
        entityId: adjustment.id,
        afterJson: {
          itemId: input.itemId,
          lotId: input.lotId ?? null,
          adjustmentType,
          quantityDelta: quantityDelta.toString(),
        },
        reasonCode,
        correlationId,
        sourceChannel: 'web',
        occurredAt,
      },
    });

    await completeIdempotencyKey(tx, {
      organizationId: input.organizationId,
      operationType: 'inventory.adjustment.create',
      idempotencyKey: input.idempotencyKey,
      resourceType: 'inventory_adjustment',
      resourceId: adjustment.id,
    });

    const quickBooksConnection = await ensureDefaultQuickBooksConnection(input.organizationId, tx);

    await createAccountingEvent({
      organizationId: input.organizationId,
      integrationConnectionId: quickBooksConnection.id,
      sourceEventType: 'inventory_adjustment',
      sourceEventId: adjustment.id,
      accountingEventType: 'inventory_adjustment_posted',
      payload: {
        adjustmentId: adjustment.id,
        locationId: input.locationId,
        itemId: input.itemId,
        lotId: input.lotId ?? null,
        adjustmentType,
        quantityDelta: input.quantityDelta,
        reasonCode,
        notes: input.notes ?? null,
      },
      client: tx,
    });

    return adjustment;
  });
}
