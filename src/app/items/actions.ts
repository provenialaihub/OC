'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { ItemType } from '@prisma/client';
import { getTenantContext } from '@/lib/tenancy/get-tenant-context';
import {
  createItem,
  getItem,
  updateItem,
} from '@/lib/services/items';
import { writeAuditEvent } from '@/lib/audit/write-audit-event';

export type CreateItemState = { error: string | null };

function isChecked(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error('A numeric field contains an invalid value.');
  }
  return parsed;
}

export async function createItemAction(
  _prev: CreateItemState,
  formData: FormData,
): Promise<CreateItemState> {
  const sku = (formData.get('sku') as string)?.trim();
  const name = (formData.get('name') as string)?.trim();
  const itemType = formData.get('itemType') as ItemType;
  const baseUomId = (formData.get('baseUomId') as string)?.trim();
  const itemCategoryId = ((formData.get('itemCategoryId') as string) ?? '').trim() || null;
  const categoryName = ((formData.get('categoryName') as string) ?? '').trim() || null;
  const categoryCode = ((formData.get('categoryCode') as string) ?? '').trim() || null;
  const notes = ((formData.get('notes') as string) ?? '').trim() || null;

  if (!sku) return { error: 'SKU is required.' };
  if (!name) return { error: 'Item name is required.' };
  if (!itemType) return { error: 'Item type is required.' };
  if (!baseUomId) return { error: 'Base unit is required.' };
  if (!itemCategoryId && Boolean(categoryName) !== Boolean(categoryCode)) {
    return { error: 'Provide both category name and category code when creating a new category.' };
  }

  try {
    const ctx = await getTenantContext();
    const item = await createItem(ctx.organizationId, {
      sku,
      name,
      itemType,
      baseUomId,
      itemCategoryId,
      categoryName,
      categoryCode,
      trackInventory: isChecked(formData, 'trackInventory'),
      trackLots: isChecked(formData, 'trackLots'),
      trackExpiration: isChecked(formData, 'trackExpiration'),
      reorderEnabled: isChecked(formData, 'reorderEnabled'),
      defaultReorderPoint: parseOptionalNumber(formData.get('defaultReorderPoint')),
      defaultReorderQuantity: parseOptionalNumber(formData.get('defaultReorderQuantity')),
      notes,
    });

    await writeAuditEvent({
      organizationId: ctx.organizationId,
      locationId: ctx.locationId ?? null,
      actorType: 'user',
      actorId: ctx.userId ?? null,
      actionType: 'item.created',
      entityType: 'item',
      entityId: item.id,
      after: item,
      sourceChannel: 'web',
    });

    redirect(`/items/${item.id}`);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to create item.',
    };
  }
}

export async function updateItemAction(itemId: string, formData: FormData): Promise<void> {
  const ctx = await getTenantContext();
  const before = await getItem(ctx.organizationId, itemId);
  if (!before) return;

  const itemCategoryId = ((formData.get('itemCategoryId') as string) ?? '').trim() || null;

  const updated = await updateItem(ctx.organizationId, itemId, {
    itemCategoryId,
    trackInventory: isChecked(formData, 'trackInventory'),
    trackLots: isChecked(formData, 'trackLots'),
    trackExpiration: isChecked(formData, 'trackExpiration'),
    isActive: isChecked(formData, 'isActive'),
    reorderEnabled: isChecked(formData, 'reorderEnabled'),
    defaultReorderPoint: parseOptionalNumber(formData.get('defaultReorderPoint')),
    defaultReorderQuantity: parseOptionalNumber(formData.get('defaultReorderQuantity')),
    notes: ((formData.get('notes') as string) ?? '').trim() || null,
  });

  await writeAuditEvent({
    organizationId: ctx.organizationId,
    locationId: ctx.locationId ?? null,
    actorType: 'user',
    actorId: ctx.userId ?? null,
    actionType: 'item.updated',
    entityType: 'item',
    entityId: itemId,
    before,
    after: updated,
    sourceChannel: 'web',
  });

  revalidatePath('/items');
  revalidatePath(`/items/${itemId}`);
}
