export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/layout/app-shell';
import { listAccountingEvents, listIntegrationConnections } from '@/lib/services/accounting';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';

export default async function IntegrationsPage() {
  const ctx = await requireTenantAccess(PERMISSIONS.accountingView);
  const [connections, events] = await Promise.all([
    listIntegrationConnections(ctx.organizationId),
    listAccountingEvents(ctx.organizationId),
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card label="Connections" value={String(connections.length)} />
          <Card label="Pending events" value={String(events.filter((event) => event.status === 'pending').length)} />
          <Card label="Failed events" value={String(events.filter((event) => event.status === 'failed').length)} />
          <Card label="Exported events" value={String(events.filter((event) => event.status === 'exported' || event.status === 'synced').length)} />
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
                <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-300">{JSON.stringify(connection.configJson ?? {}, null, 2)}</pre>
              </div>
            ))}
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
                    <td className="px-4 py-3 text-slate-300">{event.status}</td>
                    <td className="px-4 py-3 text-slate-300">{event.exportAttempts.length}</td>
                    <td className="px-4 py-3 text-slate-300">{new Date(event.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
