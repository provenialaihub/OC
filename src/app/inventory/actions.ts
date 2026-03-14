'use server';

import { revalidatePath } from 'next/cache';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { getErrorMessage } from '@/lib/errors/service-errors';
import { createInventoryAdjustment, releaseInventoryHold } from '@/lib/services/inventory';

export type InventoryActionState = {
  error: string | null;
  success: string | null;
};

function buildIdempotencyKey(prefix: string, formData: FormData) {
  const explicit = String(formData.get('idempotencyKey') ?? '').trim();
  if (explicit) return explicit;
  return `${prefix}:${Date.now()}`;
}

export async function releaseHoldAction(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  try {
    const ctx = await requireTenantAccess(PERMISSIONS.receivingReleaseHold);

    await releaseInventoryHold({
      organizationId: ctx.organizationId,
      actorId: ctx.userId ?? null,
      holdId: String(formData.get('holdId') ?? ''),
      releaseQuantity: String(formData.get('releaseQuantity') ?? '').trim()
        ? Number(formData.get('releaseQuantity'))
        : null,
      reasonCode: String(formData.get('reasonCode') ?? ''),
      idempotencyKey: buildIdempotencyKey('hold-release', formData),
    });

    revalidatePath('/inventory');
    revalidatePath(String(formData.get('returnPath') ?? '/inventory'));

    return { error: null, success: 'Hold released.' };
  } catch (error) {
    return { error: getErrorMessage(error, 'Failed to release hold.'), success: null };
  }
}

export async function createInventoryAdjustmentAction(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  try {
    const ctx = await requireTenantAccess(PERMISSIONS.inventoryAdjust);

    await createInventoryAdjustment({
      organizationId: ctx.organizationId,
      actorId: ctx.userId ?? null,
      locationId: String(formData.get('locationId') ?? ''),
      itemId: String(formData.get('itemId') ?? ''),
      lotId: String(formData.get('lotId') ?? '').trim() || null,
      adjustmentType: String(formData.get('adjustmentType') ?? ''),
      quantityDelta: Number(formData.get('quantityDelta') ?? 0),
      reasonCode: String(formData.get('reasonCode') ?? ''),
      notes: String(formData.get('notes') ?? '').trim() || null,
      idempotencyKey: buildIdempotencyKey('adjustment', formData),
    });

    revalidatePath('/inventory');
    return { error: null, success: 'Inventory adjustment posted.' };
  } catch (error) {
    return { error: getErrorMessage(error, 'Failed to create adjustment.'), success: null };
  }
}
