import { Prisma } from '@prisma/client';
import { db } from '@/lib/db/client';
import { ConflictError, NotFoundError } from '@/lib/errors/service-errors';
import {
  validateCreateSupplierInput,
  validateUpdateSupplierInput,
} from '@/lib/validation/suppliers';

export type CreateSupplierInput = ReturnType<typeof validateCreateSupplierInput>;
export type UpdateSupplierInput = ReturnType<typeof validateUpdateSupplierInput>;

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

export async function createSupplier(organizationId: string, input: CreateSupplierInput) {
  const data = validateCreateSupplierInput(input);

  try {
    return await db.supplier.create({
      data: {
        organizationId,
        code: data.code,
        legalName: data.legalName,
        displayName: data.displayName,
        category: data.category ?? null,
        paymentTerms: data.paymentTerms ?? null,
        leadTimeDays: data.leadTimeDays ?? null,
        notes: data.notes ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError(`Supplier code "${data.code}" already exists for this organization.`);
    }
    throw error;
  }
}

export async function updateSupplier(organizationId: string, id: string, input: UpdateSupplierInput) {
  const data = validateUpdateSupplierInput(input);

  const existing = await db.supplier.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError('Supplier was not found for this organization.', { supplierId: id });
  }

  return db.supplier.update({ where: { id }, data });
}
