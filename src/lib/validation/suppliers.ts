import { SupplierStatus } from '@prisma/client';
import { z } from 'zod';
import { optionalTrimmedString, parseWithSchema, trimmedString } from '@/lib/validation/common';

export const createSupplierSchema = z.object({
  code: trimmedString('Supplier code', 80),
  legalName: trimmedString('Legal name', 160),
  displayName: optionalTrimmedString(160),
  category: optionalTrimmedString(120),
  paymentTerms: optionalTrimmedString(120),
  leadTimeDays: z.preprocess((value) => {
    if (value == null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      return Number.parseInt(trimmed, 10);
    }
    return value;
  }, z.number().int().nonnegative().nullable()),
  notes: optionalTrimmedString(),
}).transform((value) => ({
  ...value,
  displayName: value.displayName || value.legalName,
}));

export const updateSupplierSchema = z.object({
  status: z.nativeEnum(SupplierStatus).optional(),
  notes: optionalTrimmedString(),
  category: optionalTrimmedString(120),
  paymentTerms: optionalTrimmedString(120),
  leadTimeDays: z.number().int().nonnegative().nullable().optional(),
});

export function validateCreateSupplierInput(input: unknown) {
  return parseWithSchema(createSupplierSchema, input);
}

export function validateUpdateSupplierInput(input: unknown) {
  return parseWithSchema(updateSupplierSchema, input);
}
