'use client';

import { useActionState } from 'react';
import { createInventoryAdjustmentAction, releaseHoldAction, type InventoryActionState } from './actions';

const initialState: InventoryActionState = { error: null, success: null };
const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none';

export function ReleaseHoldForm({
  holdId,
  maxQuantity,
  returnPath = '/inventory',
}: {
  holdId: string;
  maxQuantity: string;
  returnPath?: string;
}) {
  const [state, action, pending] = useActionState(releaseHoldAction, initialState);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <input type="hidden" name="holdId" value={holdId} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
          Release quantity
          <input name="releaseQuantity" type="number" min="0.01" step="0.01" max={maxQuantity} placeholder={maxQuantity} className={inputClass} />
        </label>
        <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
          Reason code
          <input name="reasonCode" defaultValue="qa_passed" className={inputClass} />
        </label>
      </div>
      {state.error && <p className="text-sm text-rose-400">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-400">{state.success}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? 'Releasing…' : 'Release hold'}
      </button>
    </form>
  );
}

export function InventoryAdjustmentForm({
  locations,
  items,
}: {
  locations: Array<{ id: string; name: string }>;
  items: Array<{ id: string; name: string; sku: string }>;
}) {
  const [state, action, pending] = useActionState(createInventoryAdjustmentAction, initialState);

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div>
        <h3 className="text-lg font-medium">Quick adjustment</h3>
        <p className="mt-1 text-sm text-slate-400">Post a reason-coded adjustment through the audited movement ledger.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
          Location
          <select name="locationId" className={inputClass} defaultValue={locations[0]?.id ?? ''}>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
          Item
          <select name="itemId" className={inputClass} defaultValue={items[0]?.id ?? ''}>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
          Lot ID (optional)
          <input name="lotId" className={inputClass} placeholder="Paste lot id for tracked item" />
        </label>
        <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
          Adjustment type
          <select name="adjustmentType" className={inputClass} defaultValue="correction">
            <option value="correction">Correction</option>
            <option value="damage">Damage</option>
            <option value="spoilage">Spoilage</option>
            <option value="writeoff">Writeoff</option>
            <option value="recount">Recount</option>
          </select>
        </label>
        <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
          Quantity delta
          <input name="quantityDelta" type="number" step="0.01" className={inputClass} placeholder="Use negative to reduce stock" />
        </label>
        <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
          Reason code
          <input name="reasonCode" defaultValue="manual_correction" className={inputClass} />
        </label>
      </div>
      <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400 block">
        Notes
        <textarea name="notes" rows={3} className={inputClass} placeholder="Why this adjustment happened…" />
      </label>
      {state.error && <p className="text-sm text-rose-400">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-400">{state.success}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? 'Posting…' : 'Post adjustment'}
      </button>
    </form>
  );
}
