'use client';

import { useActionState } from 'react';
import { updateComplianceIssueStatusAction, type ComplianceIssueState } from './actions';

const initialState: ComplianceIssueState = { error: null, success: null };
const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none';

export function ComplianceStatusForm({ issueId, status }: { issueId: string; status: string }) {
  const bound = updateComplianceIssueStatusAction.bind(null, issueId);
  const [state, action, pending] = useActionState(bound, initialState);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400 block">
        Status
        <select name="status" defaultValue={status} className={inputClass}>
          <option value="open">Open</option>
          <option value="in_review">In review</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
        </select>
      </label>
      {state.error && <p className="text-sm text-rose-400">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-400">{state.success}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-600 disabled:opacity-60">
        {pending ? 'Saving…' : 'Update issue'}
      </button>
    </form>
  );
}
