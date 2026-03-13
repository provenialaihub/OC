'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getTenantContext } from '@/lib/tenancy/get-tenant-context';
import { createSupplier, getSupplier, updateSupplier } from '@/lib/services/suppliers';
import { writeAuditEvent } from '@/lib/audit/write-audit-event';
import type { SupplierStatus } from '@prisma/client';

export type CreateSupplierState = { error: string | null };

export async function createSupplierAction(
  _prev: CreateSupplierState,
  formData: FormData,
): Promise<CreateSupplierState> {
  const legalName = (formData.get('legalName') as string)?.trim();
  const displayNameRaw = (formData.get('displayName') as string)?.trim();
  const displayName = displayNameRaw || legalName;
  const code = (formData.get('code') as string)?.trim();
  const category = (formData.get('category') as string)?.trim() || null;
  const paymentTerms = (formData.get('paymentTerms') as string)?.trim() || null;
  const leadTimeDaysRaw = (formData.get('leadTimeDays') as string)?.trim();
  const leadTimeDays = leadTimeDaysRaw ? parseInt(leadTimeDaysRaw, 10) : null;
  const notes = (formData.get('notes') as string)?.trim() || null;

  if (!legalName) return { error: 'Legal name is required.' };
  if (!code) return { error: 'Supplier code is required.' };

  let supplierId: string;
  try {
    const ctx = await getTenantContext();
    const supplier = await createSupplier(ctx.organizationId, {
      code,
      legalName,
      displayName,
      category,
      paymentTerms,
      leadTimeDays,
      notes,
    });

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

    supplierId = supplier.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create supplier.';
    return { error: msg };
  }

  redirect(`/suppliers/${supplierId}`);
}

export async function updateSupplierStatusAction(
  supplierId: string,
  formData: FormData,
): Promise<void> {
  const ctx = await getTenantContext();
  const status = formData.get('status') as SupplierStatus;

  const before = await getSupplier(ctx.organizationId, supplierId);
  if (!before) return;

  const updated = await updateSupplier(ctx.organizationId, supplierId, { status });

  await writeAuditEvent({
    organizationId: ctx.organizationId,
    actorType: 'user',
    actorId: ctx.userId ?? null,
    actionType: 'supplier.status_updated',
    entityType: 'supplier',
    entityId: supplierId,
    before: { status: before.status },
    after: { status: updated?.status },
    sourceChannel: 'web',
  });

  revalidatePath(`/suppliers/${supplierId}`);
}

export async function updateSupplierNotesAction(
  supplierId: string,
  formData: FormData,
): Promise<void> {
  const ctx = await getTenantContext();
  const notes = ((formData.get('notes') as string) ?? '').trim() || null;

  const before = await getSupplier(ctx.organizationId, supplierId);
  if (!before) return;

  await updateSupplier(ctx.organizationId, supplierId, { notes });

  await writeAuditEvent({
    organizationId: ctx.organizationId,
    actorType: 'user',
    actorId: ctx.userId ?? null,
    actionType: 'supplier.notes_updated',
    entityType: 'supplier',
    entityId: supplierId,
    before: { notes: before.notes },
    after: { notes },
    sourceChannel: 'web',
  });

  revalidatePath(`/suppliers/${supplierId}`);
}
