export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/layout/app-shell';
import { listAccountingEvents, listAccountingMappings, listAccountingReconciliationIssues, listIntegrationConnections } from '@/lib/services/accounting';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { QuickBooksConnectForm } from './quickbooks-connect-form';

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireTenantAccess(PERMISSIONS.accountingView);
  const query = (await searchParams) ?? {};
  const qbConnected = query.qb_connected === '1';
  const qbError = typeof query.qb_error === 'string' ? query.qb_error : null;

  const [connections, events, mappings, reconciliationIssues] = await Promise.all([
    listIntegrationConnections(ctx.organizationId),
    listAccountingEvents(ctx.organizationId),
    listAccountingMappings(ctx.organizationId),
    listAccountingReconciliationIssues(ctx.organizationId),
  ]);

  return (
    <AppShell>
      <div className="space-y-8">
        <header>
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-400">Accounting bridge</div>
          <h2 className="mt-2 text-3xl font-semibold">Integrations</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Provider-neutral accounting bridge with QuickBooks positioned as connector #1 for Blue Gourmet.
          </p>
        </header>

        {qbConnected && (
          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-300">
            QuickBooks connected successfully.
          </div>
        )}
        {qbError && (
          <div className="rounded-2xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-300">
            QuickBooks connection failed: {qbError}
          </div>
        )}

        <QuickBooksConnectForm />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card label="Connections" value={String(connections.length)} />
          <Card label="Pending events" value={String(events.filter((event) => event.status === 'pending').length)} />
          <Card label="Blocked events" value={String(events.filter((event) => event.status === 'blocked').length)} />
          <Card label="Failed events" value={String(events.filter((event) => event.status === 'failed').length)} />
          <Card label="Open reconciliation" value={String(reconciliationIssues.filter((issue) => issue.status === 'open').length)} />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-medium">Connections</h3>
            <span className="text-xs uppercase tracking-wider text-slate-500">Provider layer</span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {connections.length === 0 ? (
              <p className="text-sm text-slate-400">No integrations created yet.</p>
            ) : connections.map((connection) => (
              <div key={connection.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">{connection.displayName}</div>
                    <div className="mt-1 text-sm text-slate-400">{connection.provider} · {connection.status.replace('_', ' ')}</div>
                  </div>
                  <div className="text-xs text-slate-500">{connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : 'Never synced'}</div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                  <div>Realm: <span className="text-slate-300">{connection.realmId ?? '—'}</span></div>
                  <div>Token expires: <span className="text-slate-300">{connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt).toLocaleString() : '—'}</span></div>
                  <div>Last auth check: <span className="text-slate-300">{connection.lastAuthCheckAt ? new Date(connection.lastAuthCheckAt).toLocaleString() : '—'}</span></div>
                  <div>Last good API: <span className="text-slate-300">{connection.lastSuccessfulApiAt ? new Date(connection.lastSuccessfulApiAt).toLocaleString() : '—'}</span></div>
                </div>
                <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-300">{JSON.stringify(connection.configJson ?? {}, null, 2)}</pre>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-medium">Accounting mappings</h3>
            <span className="text-xs uppercase tracking-wider text-slate-500">Required bridge refs</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-950 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Internal</th>
                  <th className="px-4 py-3">External ref</th>
                  <th className="px-4 py-3">Connection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {mappings.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-slate-400">No accounting mappings yet.</td></tr>
                ) : mappings.map((mapping) => (
                  <tr key={mapping.id}>
                    <td className="px-4 py-3 text-white">{mapping.mappingType}</td>
                    <td className="px-4 py-3 text-slate-300">{mapping.internalEntityType} · {mapping.internalEntityId}</td>
                    <td className="px-4 py-3 text-slate-300">{mapping.externalName ?? mapping.externalRef}</td>
                    <td className="px-4 py-3 text-slate-300">{mapping.integrationConnection?.displayName ?? 'Global'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-medium">Accounting events</h3>
            <span className="text-xs uppercase tracking-wider text-slate-500">Outbox</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-950 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Event type</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Connection</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {events.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-slate-400">No accounting events yet.</td></tr>
                ) : events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 text-white">{event.accountingEventType.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-300">{event.sourceEventType} · {event.sourceEventId}</td>
                    <td className="px-4 py-3 text-slate-300">{event.integrationConnection?.displayName ?? 'Unassigned'}</td>
                    <td className="px-4 py-3 text-slate-300">{event.status}{event.reconciliationIssues.length > 0 ? ` · ${event.reconciliationIssues.length} issue(s)` : ''}</td>
                    <td className="px-4 py-3 text-slate-300">{event.exportAttempts.length}</td>
                    <td className="px-4 py-3 text-slate-300">{new Date(event.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-medium">Reconciliation issues</h3>
            <span className="text-xs uppercase tracking-wider text-slate-500">What blocks trust</span>
          </div>
          <div className="mt-4 space-y-3">
            {reconciliationIssues.length === 0 ? (
              <p className="text-sm text-slate-400">No reconciliation issues yet.</p>
            ) : reconciliationIssues.map((issue) => (
              <div key={issue.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">{issue.issueType}</div>
                    <div className="mt-1 text-sm text-slate-400">{issue.description}</div>
                  </div>
                  <div className="text-xs text-slate-500">{issue.status} · {new Date(issue.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}
