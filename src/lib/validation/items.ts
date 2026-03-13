import { ItemType } from '@prisma/client';
import { z } from 'zod';
import { optionalNumber, optionalTrimmedString, parseWithSchema, trimmedString } from '@/lib/validation/common';

const baseItemSchema = z.object({
  itemCategoryId: z.string().trim().optional().transform((value) => value || null),
  trackInventory: z.boolean(),
  trackLots: z.boolean(),
  trackExpiration: z.boolean(),
  reorderEnabled: z.boolean(),
  defaultReorderPoint: optionalNumber,
  defaultReorderQuantity: optionalNumber,
  notes: optionalTrimmedString(),
});

export const createItemSchema = baseItemSchema.extend({
  sku: trimmedString('SKU', 80),
  name: trimmedString('Item name', 160),
  itemType: z.nativeEnum(ItemType, { error: 'Item type is required.' }),
  baseUomId: trimmedString('Base unit'),
  categoryName: optionalTrimmedString(120),
  categoryCode: optionalTrimmedString(80),
}).superRefine((value, ctx) => {
  const hasExistingCategory = Boolean(value.itemCategoryId);
  const hasNewCategoryName = Boolean(value.categoryName);
  const hasNewCategoryCode = Boolean(value.categoryCode);

  if (!hasExistingCategory && hasNewCategoryName !== hasNewCategoryCode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide both category name and category code when creating a new category.',
      path: ['categoryName'],
    });
  }
});

export const updateItemSchema = baseItemSchema.extend({
  isActive: z.boolean(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export function validateCreateItemInput(input: unknown): CreateItemInput {
  return parseWithSchema(createItemSchema, input);
}

export function validateUpdateItemInput(input: unknown): UpdateItemInput {
  return parseWithSchema(updateItemSchema, input);
}
