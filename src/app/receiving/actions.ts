'use server';

import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/tenancy/get-tenant-context';
import { createReceiptWithPosting } from '@/lib/services/receiving';

export type ReceiveInventoryState = {
  error: string | null;
};

export async function createReceiptAction(
  _prev: ReceiveInventoryState,
  formData: FormData,
): Promise<ReceiveInventoryState> {
  const ctx = await getTenantContext();

  try {
    const linesRaw = JSON.parse(String(formData.get('lines') ?? '[]')) as Array<Record<string, string>>;
    if (!Array.isArray(linesRaw) || linesRaw.length === 0) {
      return { error: 'Add at least one receipt line.' };
    }

    const receipt = await createReceiptWithPosting({
      organizationId: ctx.organizationId,
      actorId: ctx.userId ?? null,
      locationId: String(formData.get('locationId') ?? ''),
      supplierId: String(formData.get('supplierId') ?? ''),
      purchaseOrderId: String(formData.get('purchaseOrderId') ?? '').trim() || null,
      receiptMethod: String(formData.get('receiptMethod') ?? 'ad_hoc') as never,
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
        discrepancyType: (line.discrepancyType?.trim() || null) as never,
        discrepancyNotes: line.discrepancyNotes?.trim() || null,
        holdType: (line.holdType?.trim() || null) as never,
        holdReasonCode: line.holdReasonCode?.trim() || null,
      })),
    });

    redirect(`/receiving?posted=${receipt.id}`);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to post receipt.',
    };
  }
}
