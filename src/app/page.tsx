import { AppShell } from '@/components/layout/app-shell';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { getInventorySnapshotCounts } from '@/lib/services/inventory';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const ctx = await requireTenantAccess(PERMISSIONS.inventoryView);
  const counts = await getInventorySnapshotCounts(ctx.organizationId);

  const cards = [
    ['Low stock', String(counts.lowStock)],
    ['Receiving tasks', String(counts.receivingTasks)],
    ['Held lots', String(counts.heldLots)],
    ['Receipts in review', String(counts.openIssues)],
  ] as const;

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-400">Operator control tower</div>
          <h2 className="text-3xl font-semibold">Onaply control tower</h2>
          <p className="max-w-3xl text-sm text-slate-400">
            Supplier and item foundations are in place. Receiving now posts audited inventory movements, creates lots for tracked items, and updates current balances with hold/quarantine basics.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="text-sm text-slate-400">{label}</div>
              <div className="mt-3 text-3xl font-semibold">{value}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-medium">Now working</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• supplier and item master data</li>
              <li>• PO-aware and ad hoc receiving</li>
              <li>• lot + expiration capture for tracked items</li>
              <li>• inventory ledger and balance projection</li>
              <li>• discrepancy + hold/quarantine basics</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-medium">Next likely slices</h3>
            <ol className="mt-4 space-y-2 text-sm text-slate-300">
              <li>1. PO detail flow and purchasing overview</li>
              <li>2. lot detail and hold release workflow</li>
              <li>3. inventory adjustments with reason codes</li>
              <li>4. compliance issue surfacing beyond receiving exceptions</li>
              <li>5. accounting event generation for posted receipts</li>
            </ol>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
