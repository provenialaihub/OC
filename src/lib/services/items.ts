import { Prisma } from '@prisma/client';
import { db } from '@/lib/db/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors/service-errors';
import {
  validateCreateItemInput,
  validateUpdateItemInput,
  type CreateItemInput,
  type UpdateItemInput,
} from '@/lib/validation/items';

export type { CreateItemInput, UpdateItemInput };

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
  const data = validateCreateItemInput(input);

  return db.$transaction(async (tx) => {
    const uom = await tx.unitOfMeasure.findFirst({
      where: {
        id: data.baseUomId,
        OR: [{ organizationId }, { organizationId: null }],
      },
    });

    if (!uom) {
      throw new ValidationError('Selected unit of measure is not available for this organization.');
    }

    let itemCategoryId = data.itemCategoryId ?? null;

    if (!itemCategoryId && data.categoryName && data.categoryCode) {
      const category = await tx.itemCategory.upsert({
        where: {
          organizationId_code: {
            organizationId,
            code: data.categoryCode,
          },
        },
        update: { name: data.categoryName },
        create: {
          organizationId,
          name: data.categoryName,
          code: data.categoryCode,
        },
      });
      itemCategoryId = category.id;
    }

    if (itemCategoryId) {
      const category = await tx.itemCategory.findFirst({ where: { id: itemCategoryId, organizationId } });
      if (!category) {
        throw new NotFoundError('Selected item category was not found for this organization.');
      }
    }

    try {
      return await tx.item.create({
        data: {
          organizationId,
          sku: data.sku,
          name: data.name,
          itemType: data.itemType,
          itemCategoryId,
          baseUomId: data.baseUomId,
          trackInventory: data.trackInventory,
          trackLots: data.trackLots,
          trackExpiration: data.trackExpiration,
          reorderEnabled: data.reorderEnabled,
          defaultReorderPoint: data.defaultReorderPoint ?? null,
          defaultReorderQuantity: data.defaultReorderQuantity ?? null,
          notes: data.notes ?? null,
        },
        include: {
          category: true,
          baseUom: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError(`SKU "${data.sku}" already exists for this organization.`);
      }
      throw error;
    }
  });
}

export async function updateItem(organizationId: string, id: string, input: UpdateItemInput) {
  const data = validateUpdateItemInput(input);

  const existing = await db.item.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError('Item was not found for this organization.', { itemId: id });
  }

  if (data.itemCategoryId) {
    const category = await db.itemCategory.findFirst({
      where: { id: data.itemCategoryId, organizationId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundError('Selected item category was not found for this organization.');
    }
  }

  return db.item.update({
    where: { id },
    data: {
      itemCategoryId: data.itemCategoryId ?? null,
      trackInventory: data.trackInventory,
      trackLots: data.trackLots,
      trackExpiration: data.trackExpiration,
      isActive: data.isActive,
      reorderEnabled: data.reorderEnabled,
      defaultReorderPoint: data.defaultReorderPoint ?? null,
      defaultReorderQuantity: data.defaultReorderQuantity ?? null,
      notes: data.notes ?? null,
    },
    include: {
      category: true,
      baseUom: true,
    },
  });
}
