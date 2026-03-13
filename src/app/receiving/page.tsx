export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { listReceivingQueue } from '@/lib/services/receiving';

export default async function ReceivingPage() {
  const ctx = await requireTenantAccess(PERMISSIONS.inventoryView);
  const { expectedPurchaseOrders, openReceipts, recentReceipts } = await listReceivingQueue(ctx.organizationId);

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-400">Phase 2 foundation</div>
            <h2 className="mt-2 text-3xl font-semibold">Receiving queue</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Receive expected PO deliveries or post ad hoc/local receipts with lot capture, discrepancy notes, and hold basics.
            </p>
          </div>
          <Link href="/receiving/new" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">
            Receive inventory
          </Link>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm text-slate-400">Expected deliveries</div>
            <div className="mt-3 text-3xl font-semibold">{expectedPurchaseOrders.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm text-slate-400">In review / held</div>
            <div className="mt-3 text-3xl font-semibold">{openReceipts.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm text-slate-400">Recent receipts</div>
            <div className="mt-3 text-3xl font-semibold">{recentReceipts.length}</div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-medium">Expected deliveries</h3>
              <span className="text-xs uppercase tracking-wider text-slate-500">PO-based</span>
            </div>
            <div className="mt-4 space-y-3">
              {expectedPurchaseOrders.length === 0 ? (
                <p className="text-sm text-slate-400">No submitted or partially received purchase orders yet.</p>
              ) : (
                expectedPurchaseOrders.map((po) => (
                  <div key={po.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-white">{po.poNumber}</div>
                        <div className="mt-1 text-sm text-slate-400">{po.supplier.displayName} · {po.location.name}</div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>{po.status.replace('_', ' ')}</div>
                        <div className="mt-1">{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'No ETA'}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-400">
                      {po.lines.length} open line{po.lines.length === 1 ? '' : 's'}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Link href={`/receiving/new?purchaseOrderId=${po.id}`} className="text-sm text-emerald-400 hover:text-emerald-300">
                        Start receipt →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-medium">In review / held receipts</h3>
              <span className="text-xs uppercase tracking-wider text-slate-500">Exceptions</span>
            </div>
            <div className="mt-4 space-y-3">
              {openReceipts.length === 0 ? (
                <p className="text-sm text-slate-400">No receipts currently under review.</p>
              ) : (
                openReceipts.map((receipt) => (
                  <div key={receipt.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="font-medium text-white">{receipt.receiptNumber}</div>
                    <div className="mt-1 text-sm text-slate-400">{receipt.supplier.displayName} · {receipt.location.name}</div>
                    <div className="mt-2 text-xs uppercase tracking-wider text-amber-400">{receipt.status.replace('_', ' ')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-medium">Closed / recent receipts</h3>
            <Link href="/inventory" className="text-sm text-emerald-400 hover:text-emerald-300">View inventory balances →</Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-950 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3">Lines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {recentReceipts.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-400" colSpan={6}>No receipts posted yet.</td></tr>
                ) : recentReceipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="px-4 py-3 font-medium text-white">{receipt.receiptNumber}</td>
                    <td className="px-4 py-3 text-slate-400">{receipt.supplier.displayName}</td>
                    <td className="px-4 py-3 text-slate-400">{receipt.status.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-400">{receipt.receiptMethod.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(receipt.receivedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-400">{receipt.lines.length}</td>
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
