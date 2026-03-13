'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { writeAuditEvent } from '@/lib/audit/write-audit-event';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { getErrorMessage, NotFoundError } from '@/lib/errors/service-errors';
import { createItem, getItem, updateItem } from '@/lib/services/items';
import { fromFormData } from '@/lib/validation/common';
import { validateCreateItemInput, validateUpdateItemInput } from '@/lib/validation/items';

export type CreateItemState = { error: string | null };

function isChecked(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}

export async function createItemAction(
  _prev: CreateItemState,
  formData: FormData,
): Promise<CreateItemState> {
  try {
    const ctx = await requireTenantAccess(PERMISSIONS.itemManage);
    const raw = fromFormData<Record<string, FormDataEntryValue>>(formData);
    const item = await createItem(
      ctx.organizationId,
      validateCreateItemInput({
        ...raw,
        trackInventory: isChecked(formData, 'trackInventory'),
        trackLots: isChecked(formData, 'trackLots'),
        trackExpiration: isChecked(formData, 'trackExpiration'),
        reorderEnabled: isChecked(formData, 'reorderEnabled'),
      }),
    );

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
    return { error: getErrorMessage(err, 'Failed to create item.') };
  }
}

export async function updateItemAction(itemId: string, formData: FormData): Promise<void> {
  const ctx = await requireTenantAccess(PERMISSIONS.itemManage);
  const before = await getItem(ctx.organizationId, itemId);
  if (!before) throw new NotFoundError('Item was not found for this organization.');

  const updated = await updateItem(
    ctx.organizationId,
    itemId,
    validateUpdateItemInput({
      itemCategoryId: ((formData.get('itemCategoryId') as string) ?? '').trim() || null,
      trackInventory: isChecked(formData, 'trackInventory'),
      trackLots: isChecked(formData, 'trackLots'),
      trackExpiration: isChecked(formData, 'trackExpiration'),
      isActive: isChecked(formData, 'isActive'),
      reorderEnabled: isChecked(formData, 'reorderEnabled'),
      defaultReorderPoint: formData.get('defaultReorderPoint'),
      defaultReorderQuantity: formData.get('defaultReorderQuantity'),
      notes: ((formData.get('notes') as string) ?? '').trim() || null,
    }),
  );

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
