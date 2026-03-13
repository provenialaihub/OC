import { db } from '@/lib/db/client';
import type { SupplierStatus } from '@prisma/client';

export type CreateSupplierInput = {
  code: string;
  legalName: string;
  displayName: string;
  category?: string | null;
  paymentTerms?: string | null;
  leadTimeDays?: number | null;
  notes?: string | null;
};

export type UpdateSupplierInput = {
  status?: SupplierStatus;
  notes?: string | null;
  category?: string | null;
  paymentTerms?: string | null;
  leadTimeDays?: number | null;
};

export async function listSuppliers(organizationId: string) {
  return db.supplier.findMany({
    where: { organizationId },
    orderBy: { displayName: 'asc' },
  });
}

export async function getSupplier(organizationId: string, id: string) {
  return db.supplier.findFirst({
    where: { id, organizationId },
  });
}

export async function createSupplier(
  organizationId: string,
  input: CreateSupplierInput,
) {
  return db.supplier.create({
    data: {
      organizationId,
      code: input.code,
      legalName: input.legalName,
      displayName: input.displayName,
      category: input.category ?? null,
      paymentTerms: input.paymentTerms ?? null,
      leadTimeDays: input.leadTimeDays ?? null,
      notes: input.notes ?? null,
    },
  });
}

export async function updateSupplier(
  organizationId: string,
  id: string,
  input: UpdateSupplierInput,
) {
  // Verify ownership before updating
  const existing = await db.supplier.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!existing) return null;
  return db.supplier.update({ where: { id }, data: input });
}
