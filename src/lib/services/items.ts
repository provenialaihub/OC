import { db } from '@/lib/db/client';
import type { ItemType } from '@prisma/client';

export type CreateItemInput = {
  sku: string;
  name: string;
  itemType: ItemType;
  baseUomId: string;
  itemCategoryId?: string | null;
  categoryName?: string | null;
  categoryCode?: string | null;
  trackInventory: boolean;
  trackLots: boolean;
  trackExpiration: boolean;
  reorderEnabled: boolean;
  defaultReorderPoint?: number | null;
  defaultReorderQuantity?: number | null;
  notes?: string | null;
};

export type UpdateItemInput = {
  itemCategoryId?: string | null;
  trackInventory: boolean;
  trackLots: boolean;
  trackExpiration: boolean;
  isActive: boolean;
  reorderEnabled: boolean;
  defaultReorderPoint?: number | null;
  defaultReorderQuantity?: number | null;
  notes?: string | null;
};

export async function listItems(organizationId: string) {
  return db.item.findMany({
    where: { organizationId },
    include: {
      category: true,
      baseUom: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function getItem(organizationId: string, id: string) {
  return db.item.findFirst({
    where: { id, organizationId },
    include: {
      category: true,
      baseUom: true,
    },
  });
}

export async function listItemCategories(organizationId: string) {
  return db.itemCategory.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
  });
}

export async function listUnitsOfMeasure(organizationId: string) {
  return db.unitOfMeasure.findMany({
    where: {
      OR: [{ organizationId }, { organizationId: null }],
    },
    orderBy: { name: 'asc' },
  });
}

export async function createItem(organizationId: string, input: CreateItemInput) {
  return db.$transaction(async (tx) => {
    const uom = await tx.unitOfMeasure.findFirst({
      where: {
        id: input.baseUomId,
        OR: [{ organizationId }, { organizationId: null }],
      },
    });

    if (!uom) {
      throw new Error('Selected unit of measure is not available for this organization.');
    }

    let itemCategoryId = input.itemCategoryId ?? null;

    if (!itemCategoryId && input.categoryName && input.categoryCode) {
      const category = await tx.itemCategory.upsert({
        where: {
          organizationId_code: {
            organizationId,
            code: input.categoryCode,
          },
        },
        update: {
          name: input.categoryName,
        },
        create: {
          organizationId,
          name: input.categoryName,
          code: input.categoryCode,
        },
      });
      itemCategoryId = category.id;
    }

    if (itemCategoryId) {
      const category = await tx.itemCategory.findFirst({
        where: { id: itemCategoryId, organizationId },
      });
      if (!category) {
        throw new Error('Selected item category was not found for this organization.');
      }
    }

    return tx.item.create({
      data: {
        organizationId,
        sku: input.sku,
        name: input.name,
        itemType: input.itemType,
        itemCategoryId,
        baseUomId: input.baseUomId,
        trackInventory: input.trackInventory,
        trackLots: input.trackLots,
        trackExpiration: input.trackExpiration,
        reorderEnabled: input.reorderEnabled,
        defaultReorderPoint: input.defaultReorderPoint ?? null,
        defaultReorderQuantity: input.defaultReorderQuantity ?? null,
        notes: input.notes ?? null,
      },
      include: {
        category: true,
        baseUom: true,
      },
    });
  });
}

export async function updateItem(
  organizationId: string,
  id: string,
  input: UpdateItemInput,
) {
  const existing = await db.item.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });

  if (!existing) return null;

  if (input.itemCategoryId) {
    const category = await db.itemCategory.findFirst({
      where: { id: input.itemCategoryId, organizationId },
      select: { id: true },
    });
    if (!category) {
      throw new Error('Selected item category was not found for this organization.');
    }
  }

  return db.item.update({
    where: { id },
    data: {
      itemCategoryId: input.itemCategoryId ?? null,
      trackInventory: input.trackInventory,
      trackLots: input.trackLots,
      trackExpiration: input.trackExpiration,
      isActive: input.isActive,
      reorderEnabled: input.reorderEnabled,
      defaultReorderPoint: input.defaultReorderPoint ?? null,
      defaultReorderQuantity: input.defaultReorderQuantity ?? null,
      notes: input.notes ?? null,
    },
    include: {
      category: true,
      baseUom: true,
    },
  });
}
