'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { writeAuditEvent } from '@/lib/audit/write-audit-event';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { getErrorMessage, NotFoundError } from '@/lib/errors/service-errors';
import { createSupplier, getSupplier, updateSupplier } from '@/lib/services/suppliers';
import { fromFormData } from '@/lib/validation/common';
import { validateCreateSupplierInput, validateUpdateSupplierInput } from '@/lib/validation/suppliers';

export type CreateSupplierState = { error: string | null };

export async function createSupplierAction(
  _prev: CreateSupplierState,
  formData: FormData,
): Promise<CreateSupplierState> {
  try {
    const ctx = await requireTenantAccess(PERMISSIONS.supplierManage);
    const supplier = await createSupplier(
      ctx.organizationId,
      validateCreateSupplierInput(fromFormData(formData)),
    );

    await writeAuditEvent({
      organizationId: ctx.organizationId,
      actorType: 'user',
      actorId: ctx.userId ?? null,
      actionType: 'supplier.created',
      entityType: 'supplier',
      entityId: supplier.id,
      after: supplier,
      sourceChannel: 'web',
    });

    redirect(`/suppliers/${supplier.id}`);
  } catch (err) {
    return { error: getErrorMessage(err, 'Failed to create supplier.') };
  }
}

export async function updateSupplierStatusAction(
  supplierId: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireTenantAccess(PERMISSIONS.supplierManage);
  const before = await getSupplier(ctx.organizationId, supplierId);
  if (!before) throw new NotFoundError('Supplier was not found for this organization.');

  const updated = await updateSupplier(
    ctx.organizationId,
    supplierId,
    validateUpdateSupplierInput({ status: formData.get('status') }),
  );

  await writeAuditEvent({
    organizationId: ctx.organizationId,
    actorType: 'user',
    actorId: ctx.userId ?? null,
    actionType: 'supplier.status_updated',
    entityType: 'supplier',
    entityId: supplierId,
    before: { status: before.status },
    after: { status: updated.status },
    sourceChannel: 'web',
  });

  revalidatePath(`/suppliers/${supplierId}`);
}

export async function updateSupplierNotesAction(
  supplierId: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireTenantAccess(PERMISSIONS.supplierManage);
  const before = await getSupplier(ctx.organizationId, supplierId);
  if (!before) throw new NotFoundError('Supplier was not found for this organization.');

  const updated = await updateSupplier(
    ctx.organizationId,
    supplierId,
    validateUpdateSupplierInput({ notes: ((formData.get('notes') as string) ?? '').trim() || null }),
  );

  await writeAuditEvent({
    organizationId: ctx.organizationId,
    actorType: 'user',
    actorId: ctx.userId ?? null,
    actionType: 'supplier.notes_updated',
    entityType: 'supplier',
    entityId: supplierId,
    before: { notes: before.notes },
    after: { notes: updated.notes },
    sourceChannel: 'web',
  });

  revalidatePath(`/suppliers/${supplierId}`);
}
