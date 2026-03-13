export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/layout/app-shell';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { listInventoryBalances } from '@/lib/services/inventory';

export default async function InventoryPage() {
  const ctx = await requireTenantAccess(PERMISSIONS.inventoryView);
  const balances = await listInventoryBalances(ctx.organizationId);

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-3xl font-semibold">Inventory overview</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Current-state balances derived from the inventory movement ledger, with available vs held split by item, location, and lot.
          </p>
        </header>

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
                  <td className="px-4 py-3 text-slate-400">{balance.lot?.lotCode ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{balance.onHandQuantity.toString()}</td>
                  <td className="px-4 py-3 text-slate-400">{balance.availableQuantity.toString()}</td>
                  <td className="px-4 py-3 text-slate-400">{balance.heldQuantity.toString()}</td>
                  <td className="px-4 py-3 text-slate-400">{balance.lastMovementAt ? new Date(balance.lastMovementAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
