export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { listPurchasingOverview } from '@/lib/services/purchasing';

const STATUS_BADGE: Record<string, string> = {
  draft: 'border-slate-700 bg-slate-800 text-slate-300',
  submitted: 'border-sky-800 bg-sky-950/60 text-sky-300',
  partially_received: 'border-amber-800 bg-amber-950/60 text-amber-300',
  received: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  cancelled: 'border-rose-800 bg-rose-950/60 text-rose-300',
  closed: 'border-slate-700 bg-slate-900 text-slate-400',
};

export default async function PurchasingPage() {
  const ctx = await requireTenantAccess(PERMISSIONS.purchasingView);
  const { summary, activePurchaseOrders, recentlyCompleted } = await listPurchasingOverview(ctx.organizationId);

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-400">Phase 3 slice</div>
            <h2 className="mt-2 text-3xl font-semibold">Purchasing overview</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Track open purchase orders, spot overdue inbound supply, and hand operators directly into the receiving path when stock is ready to land.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Active POs" value={String(summary.activePurchaseOrders)} />
          <SummaryCard label="Ready to receive" value={String(summary.readyToReceiveCount)} />
          <SummaryCard label="Overdue inbound" value={String(summary.overduePurchaseOrders)} />
          <SummaryCard label="Total POs" value={String(summary.totalPurchaseOrders)} />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-medium">Open purchase orders</h3>
            <span className="text-xs uppercase tracking-wider text-slate-500">Purchasing queue</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-950 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">PO</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {activePurchaseOrders.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={6}>
                      No open purchase orders yet.
                    </td>
                  </tr>
                ) : (
                  activePurchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td className="px-4 py-3">
                        <Link href={`/purchasing/${po.id}`} className="font-medium text-white hover:text-emerald-400">
                          {po.poNumber}
                        </Link>
                        <div className="mt-1 text-xs text-slate-500">{po.locationName}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{po.supplierName}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${STATUS_BADGE[po.status] ?? 'border-slate-700 bg-slate-800 text-slate-300'}`}>
                          {po.statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {po.receivedQuantity}/{po.orderedQuantity} · {po.completionPercent}%
                        <div className="mt-1 text-xs text-slate-500">{po.openLineCount} open lines · {po.receiptCount} receipts</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'No ETA'}
                        {po.isOverdue && <div className="mt-1 text-xs text-rose-400">Overdue</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {po.nextAction.href === 'receive' ? (
                          <Link href={`/receiving/new?purchaseOrderId=${po.id}`} className="text-emerald-400 hover:text-emerald-300">
                            Start receipt →
                          </Link>
                        ) : (
                          <span className="text-slate-400">{po.nextAction.label}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-medium">Recently completed</h3>
            <span className="text-xs uppercase tracking-wider text-slate-500">Reconciled / fully received</span>
          </div>
          <div className="mt-4 space-y-3">
            {recentlyCompleted.length === 0 ? (
              <p className="text-sm text-slate-400">No completed purchase orders yet.</p>
            ) : (
              recentlyCompleted.map((po) => (
                <div key={po.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div>
                    <Link href={`/purchasing/${po.id}`} className="font-medium text-white hover:text-emerald-400">
                      {po.poNumber}
                    </Link>
                    <div className="mt-1 text-sm text-slate-400">{po.supplierName} · {po.receiptCount} receipts</div>
                  </div>
                  <div className="text-right text-sm text-slate-400">{po.statusLabel}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}
