'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { createSupplierAction, type CreateSupplierState } from '../actions';

const initialState: CreateSupplierState = { error: null };

export default function NewSupplierPage() {
  const [state, formAction, isPending] = useActionState(createSupplierAction, initialState);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <Link href="/suppliers" className="text-sm text-slate-400 hover:text-slate-300">
            ← Suppliers
          </Link>
          <h2 className="mt-2 text-2xl font-semibold">Add supplier</h2>
        </header>

        {state.error && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {state.error}
          </div>
        )}

        <form
          action={formAction}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="legalName" className="text-xs uppercase tracking-wide text-slate-400">
                Legal name <span className="text-red-400">*</span>
              </label>
              <input
                id="legalName"
                name="legalName"
                type="text"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Sysco Corporation"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="displayName" className="text-xs uppercase tracking-wide text-slate-400">
                Display name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Sysco (defaults to legal name)"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="code" className="text-xs uppercase tracking-wide text-slate-400">
                Supplier code <span className="text-red-400">*</span>
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="SYSCO-01"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="category" className="text-xs uppercase tracking-wide text-slate-400">
                Category
              </label>
              <input
                id="category"
                name="category"
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Protein, Produce, Dry goods…"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="paymentTerms" className="text-xs uppercase tracking-wide text-slate-400">
                Payment terms
              </label>
              <input
                id="paymentTerms"
                name="paymentTerms"
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Net 30"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="leadTimeDays" className="text-xs uppercase tracking-wide text-slate-400">
                Lead time (days)
              </label>
              <input
                id="leadTimeDays"
                name="leadTimeDays"
                type="number"
                min="0"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="3"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="notes" className="text-xs uppercase tracking-wide text-slate-400">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              placeholder="Internal notes about this supplier…"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/suppliers"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {isPending ? 'Saving…' : 'Save supplier'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
