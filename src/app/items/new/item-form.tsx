'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useActionState } from 'react';
import { createItemAction, type CreateItemState } from '../actions';

const initialState: CreateItemState = { error: null };

const ITEM_TYPES = [
  ['ingredient', 'Ingredient'],
  ['packaging', 'Packaging'],
  ['finished_good', 'Finished good'],
  ['supply', 'Supply'],
  ['service', 'Service'],
  ['other', 'Other'],
] as const;

export function ItemForm({
  categories,
  uoms,
}: {
  categories: Array<{ id: string; label: string }>;
  uoms: Array<{ id: string; label: string }>;
}) {
  const [state, formAction, isPending] = useActionState(createItemAction, initialState);

  return (
    <>
      {state.error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Item name *" htmlFor="name">
            <input id="name" name="name" required className={inputClass} placeholder="Boneless chicken thigh" />
          </Field>
          <Field label="SKU *" htmlFor="sku">
            <input id="sku" name="sku" required className={`${inputClass} font-mono`} placeholder="CHKN-THIGH-BLS" />
          </Field>
          <Field label="Item type *" htmlFor="itemType">
            <select id="itemType" name="itemType" required className={inputClass} defaultValue="ingredient">
              {ITEM_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Base unit *" htmlFor="baseUomId">
            <select id="baseUomId" name="baseUomId" required className={inputClass}>
              <option value="">Select a base unit</option>
              {uoms.map((uom) => (
                <option key={uom.id} value={uom.id}>{uom.label}</option>
              ))}
            </select>
          </Field>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-800 p-4">
          <div>
            <h3 className="text-sm font-medium text-white">Category</h3>
            <p className="mt-1 text-xs text-slate-500">Use an existing category or create a simple new one during item setup.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Existing category" htmlFor="itemCategoryId">
              <select id="itemCategoryId" name="itemCategoryId" className={inputClass}>
                <option value="">None selected</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
            </Field>
            <Field label="New category name" htmlFor="categoryName">
              <input id="categoryName" name="categoryName" className={inputClass} placeholder="Protein" />
            </Field>
            <Field label="New category code" htmlFor="categoryCode">
              <input id="categoryCode" name="categoryCode" className={`${inputClass} font-mono`} placeholder="protein" />
            </Field>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Toggle name="trackInventory" label="Track inventory" defaultChecked />
          <Toggle name="trackLots" label="Track lots" />
          <Toggle name="trackExpiration" label="Track expiration" />
          <Toggle name="reorderEnabled" label="Enable reorder defaults" />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Default reorder point" htmlFor="defaultReorderPoint">
            <input id="defaultReorderPoint" name="defaultReorderPoint" type="number" min="0" step="0.01" className={inputClass} placeholder="25" />
          </Field>
          <Field label="Default reorder quantity" htmlFor="defaultReorderQuantity">
            <input id="defaultReorderQuantity" name="defaultReorderQuantity" type="number" min="0" step="0.01" className={inputClass} placeholder="50" />
          </Field>
        </section>

        <Field label="Notes" htmlFor="notes">
          <textarea id="notes" name="notes" rows={4} className={inputClass} placeholder="Internal catalog notes…" />
        </Field>

        <div className="flex justify-end gap-3">
          <Link href="/items" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800">
            Cancel
          </Link>
          <button type="submit" disabled={isPending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60">
            {isPending ? 'Saving…' : 'Save item'}
          </button>
        </div>
      </form>
    </>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-xs uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-800 px-4 py-3 text-sm text-slate-300">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500" />
      <span>{label}</span>
    </label>
  );
}
