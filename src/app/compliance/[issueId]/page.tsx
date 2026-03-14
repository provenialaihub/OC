export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { getComplianceIssue } from '@/lib/services/compliance';
import { ComplianceStatusForm } from '../compliance-status-form';

export default async function ComplianceIssueDetailPage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  const ctx = await requireTenantAccess(PERMISSIONS.complianceView);
  const issue = await getComplianceIssue(ctx.organizationId, issueId);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <Link href="/compliance" className="text-sm text-slate-400 hover:text-slate-300">← Compliance</Link>
          <h2 className="mt-2 text-3xl font-semibold">Compliance issue</h2>
          <p className="mt-1 text-sm text-slate-400">{issue.description}</p>
        </header>

        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Type" value={issue.issueType.replace('_', ' ')} />
          <Detail label="Severity" value={issue.severity} />
          <Detail label="Status" value={issue.status.replace('_', ' ')} />
          <Detail label="Location" value={issue.location?.name ?? '—'} />
          <Detail label="Related entity" value={issue.relatedEntityType && issue.relatedEntityId ? `${issue.relatedEntityType} · ${issue.relatedEntityId}` : '—'} mono />
          <Detail label="Opened by" value={issue.openedByActorId ?? issue.openedByActorType} mono />
          <Detail label="Created" value={new Date(issue.createdAt).toLocaleString()} />
          <Detail label="Updated" value={new Date(issue.updatedAt).toLocaleString()} />
        </section>

        <ComplianceStatusForm issueId={issue.id} status={issue.status} />

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-lg font-medium">Issue metadata</h3>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">{JSON.stringify(issue.metadataJson ?? {}, null, 2)}</pre>
        </section>
      </div>
    </AppShell>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`mt-1 text-sm text-white ${mono ? 'font-mono break-all' : ''}`}>{value}</dd>
    </div>
  );
}
