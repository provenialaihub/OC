export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { listComplianceIssues } from '@/lib/services/compliance';

const tone: Record<string, string> = {
  high: 'text-rose-300 bg-rose-950/50 border-rose-800',
  medium: 'text-amber-300 bg-amber-950/50 border-amber-800',
  low: 'text-sky-300 bg-sky-950/50 border-sky-800',
};

export default async function CompliancePage() {
  const ctx = await requireTenantAccess(PERMISSIONS.complianceView);
  const issues = await listComplianceIssues(ctx.organizationId);

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-3xl font-semibold">Compliance issues</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Exceptions surfaced from receiving, holds, discrepancies, and future supplier/compliance workflows.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <Summary label="Open" value={String(issues.filter((issue) => issue.status === 'open').length)} />
          <Summary label="In review" value={String(issues.filter((issue) => issue.status === 'in_review').length)} />
          <Summary label="Resolved" value={String(issues.filter((issue) => issue.status === 'resolved').length)} />
          <Summary label="Total" value={String(issues.length)} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-950 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {issues.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-slate-400">No compliance issues yet.</td></tr>
              ) : issues.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-4 py-3">
                    <Link href={`/compliance/${issue.id}`} className="font-medium text-white hover:text-emerald-400">
                      {issue.description}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{issue.issueType.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${tone[issue.severity] ?? 'text-slate-300 border-slate-700 bg-slate-800'}`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{issue.location?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{issue.status.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-slate-300">{new Date(issue.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}
