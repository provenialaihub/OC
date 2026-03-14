export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { listItems } from '@/lib/services/items';
import { getReceivingFormOptions } from '@/lib/services/receiving';
import { listActiveHolds, listInventoryBalances } from '@/lib/services/inventory';
import { InventoryAdjustmentForm, ReleaseHoldForm } from './inventory-action-forms';

export default async function InventoryPage() {
  const ctx = await requireTenantAccess(PERMISSIONS.inventoryView);
  const [balances, activeHolds, items, receivingOptions] = await Promise.all([
    listInventoryBalances(ctx.organizationId),
    listActiveHolds(ctx.organizationId),
    listItems(ctx.organizationId),
    getReceivingFormOptions(ctx.organizationId),
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-3xl font-semibold">Inventory overview</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Current-state balances derived from the inventory movement ledger, with available vs held split by item, location, and lot.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-sm">
              <thead className="bg-slate-950 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Lot</th>
                  <th className="px-4 py-3">On hand</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3">Held</th>
                  <th className="px-4 py-3">Last movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {balances.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-slate-400">No inventory has been received yet.</td></tr>
                ) : balances.map((balance) => (
                  <tr key={balance.id}>
                    <td className="px-4 py-3 font-medium text-white">{balance.item.name}</td>
                    <td className="px-4 py-3 text-slate-400">{balance.location.name}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {balance.lot ? (
                        <Link href={`/inventory/lots/${balance.lot.id}`} className="text-emerald-400 hover:text-emerald-300">
                          {balance.lot.lotCode}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{balance.onHandQuantity.toString()}</td>
                    <td className="px-4 py-3 text-slate-400">{balance.availableQuantity.toString()}</td>
                    <td className="px-4 py-3 text-slate-400">{balance.heldQuantity.toString()}</td>
                    <td className="px-4 py-3 text-slate-400">{balance.lastMovementAt ? new Date(balance.lastMovementAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <InventoryAdjustmentForm
            locations={receivingOptions.locations.map((location) => ({ id: location.id, name: location.name }))}
            items={items.map((item) => ({ id: item.id, name: item.name, sku: item.sku }))}
          />
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-medium">Active holds</h3>
            <span className="text-xs uppercase tracking-wider text-slate-500">Release-ready</span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {activeHolds.length === 0 ? (
              <p className="text-sm text-slate-400">No active holds right now.</p>
            ) : activeHolds.map((hold) => (
              <div key={hold.id} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">{hold.item.name}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {hold.holdType.replace('_', ' ')} · {hold.reasonCode} · {hold.location?.name ?? 'No location'}
                    </div>
                    {hold.lot && (
                      <Link href={`/inventory/lots/${hold.lot.id}`} className="mt-2 inline-block text-sm text-emerald-400 hover:text-emerald-300">
                        Open lot {hold.lot.lotCode} →
                      </Link>
                    )}
                  </div>
                  <div className="text-sm text-slate-300">{hold.quantity?.toString() ?? '—'} held</div>
                </div>
                <ReleaseHoldForm holdId={hold.id} maxQuantity={hold.quantity?.toString() ?? ''} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
