'use client';

import { useActionState } from 'react';
import { checkQuickBooksHealthAction, refreshQuickBooksConnectionAction, type QuickBooksConnectState } from './actions';

const initialState: QuickBooksConnectState = { error: null, success: null };

export function QuickBooksConnectionControls({ connectionId }: { connectionId: string }) {
  const refresh = refreshQuickBooksConnectionAction.bind(null, connectionId);
  const check = checkQuickBooksHealthAction.bind(null, connectionId);
  const [refreshState, refreshAction, refreshPending] = useActionState(refresh, initialState);
  const [checkState, checkAction, checkPending] = useActionState(check, initialState);

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
      <div className="flex flex-wrap gap-2">
        <form action={refreshAction}>
          <button type="submit" disabled={refreshPending} className="rounded-lg bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600 disabled:opacity-60">
            {refreshPending ? 'Refreshing…' : 'Refresh token'}
          </button>
        </form>
        <form action={checkAction}>
          <button type="submit" disabled={checkPending} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs text-white hover:bg-emerald-600 disabled:opacity-60">
            {checkPending ? 'Checking…' : 'Run health check'}
          </button>
        </form>
      </div>
      {refreshState.error && <p className="text-xs text-rose-400">{refreshState.error}</p>}
      {refreshState.success && <p className="text-xs text-emerald-400">{refreshState.success}</p>}
      {checkState.error && <p className="text-xs text-rose-400">{checkState.error}</p>}
      {checkState.success && <p className="text-xs text-emerald-400">{checkState.success}</p>}
    </div>
  );
}
