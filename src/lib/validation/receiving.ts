import { InventoryHoldType, ReceiptDiscrepancyType, ReceiptMethod } from '@prisma/client';
import { z } from 'zod';
import { optionalTrimmedString, parseWithSchema, trimmedString } from '@/lib/validation/common';

const receiveLineSchema = z.object({
  itemId: trimmedString('Item'),
  purchaseOrderLineId: z.string().trim().optional().transform((value) => value || null),
  receivedQuantity: z.number().finite().nonnegative(),
  acceptedQuantity: z.number().finite().nonnegative(),
  rejectedQuantity: z.number().finite().nonnegative().default(0),
  lotCode: optionalTrimmedString(120),
  manufactureDate: z.string().trim().optional().transform((value) => value || null),
  expirationDate: z.string().trim().optional().transform((value) => value || null),
  discrepancyType: z.nativeEnum(ReceiptDiscrepancyType).nullable().optional(),
  discrepancyNotes: optionalTrimmedString(),
  holdType: z.nativeEnum(InventoryHoldType).nullable().optional(),
  holdReasonCode: optionalTrimmedString(120),
}).superRefine((value, ctx) => {
  if (value.acceptedQuantity + value.rejectedQuantity !== value.receivedQuantity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Received quantity must equal accepted + rejected.',
      path: ['receivedQuantity'],
    });
  }

  if (value.holdType && !value.holdReasonCode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Hold reason is required when a hold is selected.',
      path: ['holdReasonCode'],
    });
  }
});

export const createReceiptSchema = z.object({
  organizationId: trimmedString('Organization'),
  actorId: z.string().trim().optional().transform((value) => value || null),
  locationId: trimmedString('Location'),
  supplierId: trimmedString('Supplier'),
  purchaseOrderId: z.string().trim().optional().transform((value) => value || null),
  receiptMethod: z.nativeEnum(ReceiptMethod),
  receivedAt: trimmedString('Received at'),
  notes: optionalTrimmedString(),
  lines: z.array(receiveLineSchema).min(1, 'At least one receipt line is required.'),
});

export const receiptLinesPayloadSchema = z.array(z.record(z.string(), z.string()));

export function validateCreateReceiptInput(input: unknown) {
  return parseWithSchema(createReceiptSchema, input);
}

export function validateReceiptLinesPayload(input: unknown) {
  return parseWithSchema(receiptLinesPayloadSchema, input);
}
