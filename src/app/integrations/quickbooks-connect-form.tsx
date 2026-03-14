'use client';

import { useActionState } from 'react';
import { startQuickBooksConnectAction, type QuickBooksConnectState } from './actions';

const initialState: QuickBooksConnectState = { error: null };

export function QuickBooksConnectForm() {
  const [state, action, pending] = useActionState(startQuickBooksConnectAction, initialState);

  return (
    <form action={action} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-medium text-white">QuickBooks Online</div>
          <div className="mt-1 text-sm text-slate-400">Start OAuth and bind this tenant to a real QuickBooks company.</div>
        </div>
        <button type="submit" disabled={pending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60">
          {pending ? 'Redirecting…' : 'Connect QuickBooks'}
        </button>
      </div>
      {state.error && <p className="mt-3 text-sm text-rose-400">{state.error}</p>}
    </form>
  );
}
