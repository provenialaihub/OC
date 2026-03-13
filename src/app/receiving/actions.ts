'use server';

import { redirect } from 'next/navigation';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { getErrorMessage } from '@/lib/errors/service-errors';
import { createReceiptWithPosting } from '@/lib/services/receiving';
import { validateCreateReceiptInput, validateReceiptLinesPayload } from '@/lib/validation/receiving';

export type ReceiveInventoryState = {
  error: string | null;
};

export async function createReceiptAction(
  _prev: ReceiveInventoryState,
  formData: FormData,
): Promise<ReceiveInventoryState> {
  try {
    const ctx = await requireTenantAccess(PERMISSIONS.receivingCreate);
    const linesRaw = validateReceiptLinesPayload(JSON.parse(String(formData.get('lines') ?? '[]')));

    const receipt = await createReceiptWithPosting(
      validateCreateReceiptInput({
        organizationId: ctx.organizationId,
        actorId: ctx.userId ?? null,
        locationId: String(formData.get('locationId') ?? ''),
        supplierId: String(formData.get('supplierId') ?? ''),
        purchaseOrderId: String(formData.get('purchaseOrderId') ?? '').trim() || null,
        receiptMethod: String(formData.get('receiptMethod') ?? 'ad_hoc'),
        receivedAt: String(formData.get('receivedAt') ?? ''),
        notes: String(formData.get('notes') ?? '').trim() || null,
        lines: linesRaw.map((line) => ({
          itemId: line.itemId,
          purchaseOrderLineId: line.purchaseOrderLineId || null,
          receivedQuantity: Number(line.receivedQuantity ?? 0),
          acceptedQuantity: Number(line.acceptedQuantity ?? 0),
          rejectedQuantity: Number(line.rejectedQuantity ?? 0),
          lotCode: line.lotCode?.trim() || null,
          manufactureDate: line.manufactureDate?.trim() || null,
          expirationDate: line.expirationDate?.trim() || null,
          discrepancyType: line.discrepancyType?.trim() || null,
          discrepancyNotes: line.discrepancyNotes?.trim() || null,
          holdType: line.holdType?.trim() || null,
          holdReasonCode: line.holdReasonCode?.trim() || null,
        })),
      }),
    );

    redirect(`/receiving?posted=${receipt.id}`);
  } catch (error) {
    return {
      error: getErrorMessage(error, 'Failed to post receipt.'),
    };
  }
}
