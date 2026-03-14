import type { Prisma } from '@prisma/client';
import type { AccountingAdapter } from '@/lib/services/accounting';

function asRecord(value: Prisma.JsonValue): Record<string, any> {
  return (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, any>;
}

export const quickBooksAdapter: AccountingAdapter = {
  provider: 'quickbooks',
  buildPayload(event) {
    const payload = asRecord(event.payloadJson);

    if (event.accountingEventType === 'inventory_receipt_posted') {
      return {
        provider: 'quickbooks',
        entity: 'itemReceiptCandidate',
        receiptNumber: payload.receiptNumber ?? null,
        transactionDate: payload.receivedAt ?? null,
        vendorRefHint: payload.supplierId ?? null,
        locationRefHint: payload.locationId ?? null,
        purchaseOrderRefHint: payload.purchaseOrderId ?? null,
        lineCount: Array.isArray(payload.lines) ? payload.lines.length : 0,
        lines: Array.isArray(payload.lines)
          ? payload.lines.map((line: any) => ({
              itemRefHint: line.itemId ?? null,
              quantityReceived: line.acceptedQuantity ?? line.receivedQuantity ?? null,
              discrepancyType: line.discrepancyType ?? null,
              holdType: line.holdType ?? null,
            }))
          : [],
      };
    }

    if (event.accountingEventType === 'inventory_adjustment_posted') {
      return {
        provider: 'quickbooks',
        entity: 'inventoryAdjustmentCandidate',
        transactionDate: new Date().toISOString(),
        locationRefHint: payload.locationId ?? null,
        itemRefHint: payload.itemId ?? null,
        lotRefHint: payload.lotId ?? null,
        adjustmentType: payload.adjustmentType ?? null,
        quantityDelta: payload.quantityDelta ?? null,
        reasonCode: payload.reasonCode ?? null,
        memo: payload.notes ?? null,
      };
    }

    return {
      provider: 'quickbooks',
      entity: 'unsupported',
      rawType: event.accountingEventType,
      payload,
    };
  },
  classifyError(error) {
    const message = error instanceof Error ? error.message : 'Unknown QuickBooks error.';
    return { errorClass: 'unknown', message };
  },
};
