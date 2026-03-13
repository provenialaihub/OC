'use client';

import { useActionState, useMemo, useState } from 'react';
import type { InventoryHoldType, ReceiptMethod } from '@prisma/client';
import { createReceiptAction, type ReceiveInventoryState } from '@/app/receiving/actions';

type ItemOption = {
  id: string;
  name: string;
  sku: string;
  trackLots: boolean;
  trackExpiration: boolean;
  baseUom: { code: string };
};

type PurchaseOrderOption = {
  id: string;
  poNumber: string;
  supplierId: string;
  locationId: string;
  lines: Array<{
    id: string;
    itemId: string;
    item: { name: string; sku: string; trackLots: boolean; trackExpiration: boolean };
    orderedQuantity: string;
    receivedQuantity: string;
    uom: { code: string };
  }>;
};

type FormLine = {
  key: string;
  itemId: string;
  purchaseOrderLineId: string;
  receivedQuantity: string;
  acceptedQuantity: string;
  rejectedQuantity: string;
  lotCode: string;
  manufactureDate: string;
  expirationDate: string;
  discrepancyType: string;
  discrepancyNotes: string;
  holdType: string;
  holdReasonCode: string;
};

const initialState: ReceiveInventoryState = { error: null };

function blankLine(): FormLine {
  return {
    key: crypto.randomUUID(),
    itemId: '',
    purchaseOrderLineId: '',
    receivedQuantity: '0',
    acceptedQuantity: '0',
    rejectedQuantity: '0',
    lotCode: '',
    manufactureDate: '',
    expirationDate: '',
    discrepancyType: '',
    discrepancyNotes: '',
    holdType: '',
    holdReasonCode: '',
  };
}

export function ReceiveForm({
  locations,
  suppliers,
  items,
  purchaseOrders,
  defaultLocationId,
  initialPurchaseOrderId,
}: {
  locations: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; displayName: string }>;
  items: ItemOption[];
  purchaseOrders: PurchaseOrderOption[];
  defaultLocationId?: string | null;
  initialPurchaseOrderId?: string | null;
}) {
  const [state, formAction, pending] = useActionState(createReceiptAction, initialState);
  const initialPurchaseOrder = purchaseOrders.find((po) => po.id === (initialPurchaseOrderId ?? '')) ?? null;
  const [purchaseOrderId, setPurchaseOrderId] = useState(initialPurchaseOrderId ?? '');
  const [supplierId, setSupplierId] = useState(initialPurchaseOrder?.supplierId ?? '');
  const [locationId, setLocationId] = useState(initialPurchaseOrder?.locationId ?? defaultLocationId ?? locations[0]?.id ?? '');
  const [lines, setLines] = useState<FormLine[]>(
    initialPurchaseOrder?.lines.length
      ? initialPurchaseOrder.lines.map((line) => ({
          ...blankLine(),
          key: `${line.id}-${crypto.randomUUID()}`,
          itemId: line.itemId,
          purchaseOrderLineId: line.id,
        }))
      : [blankLine()],
  );

  const selectedPurchaseOrder = useMemo(
    () => purchaseOrders.find((po) => po.id === purchaseOrderId) ?? null,
    [purchaseOrderId, purchaseOrders],
  );

  function syncFromPurchaseOrder(nextPurchaseOrderId: string) {
    setPurchaseOrderId(nextPurchaseOrderId);
    const po = purchaseOrders.find((entry) => entry.id === nextPurchaseOrderId);
    if (!po) return;
    setSupplierId(po.supplierId);
    setLocationId(po.locationId);
    setLines(
      po.lines.length
        ? po.lines.map((line) => ({
            ...blankLine(),
            key: `${line.id}-${crypto.randomUUID()}`,
            itemId: line.itemId,
            purchaseOrderLineId: line.id,
            receivedQuantity: '0',
            acceptedQuantity: '0',
            rejectedQuantity: '0',
          }))
        : [blankLine()],
    );
  }

  function updateLine(index: number, patch: Partial<FormLine>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} readOnly />

      <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-sm">
          <span className="text-slate-300">Purchase order (optional)</span>
          <select
            name="purchaseOrderId"
            value={purchaseOrderId}
            onChange={(event) => syncFromPurchaseOrder(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          >
            <option value="">Ad hoc / local receive</option>
            {purchaseOrders.map((po) => (
              <option key={po.id} value={po.id}>
                {po.poNumber}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-slate-300">Supplier</span>
          <select
            name="supplierId"
            required
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          >
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-slate-300">Location</span>
          <select
            name="locationId"
            required
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-slate-300">Receipt method</span>
          <select name="receiptMethod" defaultValue={'truck_delivery' satisfies ReceiptMethod} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
            <option value="truck_delivery">Truck delivery</option>
            <option value="local_pickup">Local pickup</option>
            <option value="ad_hoc">Ad hoc</option>
            <option value="transfer">Transfer</option>
            <option value="return">Return</option>
          </select>
        </label>

        <label className="space-y-2 text-sm md:col-span-2">
          <span className="text-slate-300">Received at</span>
          <input
            name="receivedAt"
            type="datetime-local"
            required
            defaultValue={new Date().toISOString().slice(0, 16)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          />
        </label>

        <label className="space-y-2 text-sm md:col-span-2">
          <span className="text-slate-300">Notes</span>
          <input
            name="notes"
            placeholder="Dock notes, condition notes, missing docs, etc."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium">Receipt lines</h3>
            <p className="mt-1 text-sm text-slate-400">Capture accepted vs rejected, lot/date, and hold basics per line.</p>
          </div>
          <button
            type="button"
            onClick={() => setLines((current) => [...current, blankLine()])}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Add line
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {lines.map((line, index) => {
            const item = items.find((entry) => entry.id === line.itemId) ?? selectedPurchaseOrder?.lines.find((entry) => entry.itemId === line.itemId)?.item;
            const trackLots = item?.trackLots ?? false;
            const trackExpiration = item?.trackExpiration ?? false;

            return (
              <div key={line.key} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <input type="hidden" value={line.purchaseOrderLineId} readOnly />
                <div className="grid gap-4 xl:grid-cols-4">
                  <label className="space-y-2 text-sm xl:col-span-2">
                    <span className="text-slate-300">Item</span>
                    <select
                      value={line.itemId}
                      onChange={(event) => updateLine(index, { itemId: event.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    >
                      <option value="">Select item</option>
                      {items.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} · {option.sku}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Received qty</span>
                    <input value={line.receivedQuantity} onChange={(event) => updateLine(index, { receivedQuantity: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Accepted qty</span>
                    <input value={line.acceptedQuantity} onChange={(event) => updateLine(index, { acceptedQuantity: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Rejected qty</span>
                    <input value={line.rejectedQuantity} onChange={(event) => updateLine(index, { rejectedQuantity: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Lot code {trackLots ? '(required)' : '(optional)'}</span>
                    <input value={line.lotCode} onChange={(event) => updateLine(index, { lotCode: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Manufacture date</span>
                    <input type="date" value={line.manufactureDate} onChange={(event) => updateLine(index, { manufactureDate: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Expiration date {trackExpiration ? '(required)' : '(optional)'}</span>
                    <input type="date" value={line.expirationDate} onChange={(event) => updateLine(index, { expirationDate: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
                  </label>

                  <label className="space-y-2 text-sm xl:col-span-2">
                    <span className="text-slate-300">Discrepancy</span>
                    <select value={line.discrepancyType} onChange={(event) => updateLine(index, { discrepancyType: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
                      <option value="">None</option>
                      <option value="short">Short</option>
                      <option value="over">Over</option>
                      <option value="damaged">Damaged</option>
                      <option value="wrong_item">Wrong item</option>
                      <option value="missing_doc">Missing doc</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm xl:col-span-2">
                    <span className="text-slate-300">Discrepancy notes</span>
                    <input value={line.discrepancyNotes} onChange={(event) => updateLine(index, { discrepancyNotes: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Hold / quarantine</span>
                    <select value={line.holdType} onChange={(event) => updateLine(index, { holdType: event.target.value as InventoryHoldType | '' })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
                      <option value="">Release to available</option>
                      <option value="quality_hold">Quality hold</option>
                      <option value="quarantine">Quarantine</option>
                      <option value="manual_hold">Manual hold</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm xl:col-span-2">
                    <span className="text-slate-300">Hold reason</span>
                    <input value={line.holdReasonCode} onChange={(event) => updateLine(index, { holdReasonCode: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" placeholder="inspection_required, damaged_case, etc." />
                  </label>

                  <div className="flex items-end justify-end">
                    <button type="button" onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/30 disabled:opacity-50" disabled={lines.length === 1}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedPurchaseOrder && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
          <div className="font-medium text-white">PO context · {selectedPurchaseOrder.poNumber}</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {selectedPurchaseOrder.lines.map((line) => (
              <div key={line.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <div className="font-medium">{line.item.name}</div>
                <div className="mt-1 text-xs text-slate-400">Ordered {line.orderedQuantity} {line.uom.code} · Received {line.receivedQuantity}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.error && <div className="rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{state.error}</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60">
          {pending ? 'Posting receipt…' : 'Post receipt'}
        </button>
      </div>
    </form>
  );
}
