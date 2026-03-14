import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { getLotDetail } from '@/lib/services/inventory';
import { ReleaseHoldForm } from '../../inventory-action-forms';

export const dynamic = 'force-dynamic';

export default async function LotDetailPage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  const ctx = await requireTenantAccess(PERMISSIONS.inventoryView);
  const lot = await getLotDetail(ctx.organizationId, lotId);

  if (!lot) notFound();

  const activeHolds = lot.inventoryHolds.filter((hold) => hold.status === 'active');

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Link href="/inventory" className="text-sm text-slate-400 hover:text-slate-300">← Inventory</Link>
            <h2 className="mt-2 text-3xl font-semibold">Lot {lot.lotCode}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {lot.item.name} · {lot.supplier?.displayName ?? 'No supplier'}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${lot.status === 'active' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-amber-900/50 text-amber-300'}`}>
            {lot.status.replace('_', ' ')}
          </span>
        </header>

        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Item" value={lot.item.name} />
          <Detail label="SKU" value={lot.item.sku} mono />
          <Detail label="Base unit" value={lot.item.baseUom.code} />
          <Detail label="Category" value={lot.item.category?.name ?? '—'} />
          <Detail label="Received" value={lot.receivedDate ? new Date(lot.receivedDate).toLocaleDateString() : '—'} />
          <Detail label="Expires" value={lot.expirationDate ? new Date(lot.expirationDate).toLocaleDateString() : '—'} />
          <Detail label="Source receipt" value={lot.sourceReceiptLine?.receipt.receiptNumber ?? '—'} mono />
          <Detail label="PO" value={lot.sourceReceiptLine?.receipt.purchaseOrder?.poNumber ?? '—'} mono />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-medium">Balance by location</h3>
              <span className="text-xs uppercase tracking-wider text-slate-500">Derived state</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-950 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">On hand</th>
                    <th className="px-4 py-3">Available</th>
                    <th className="px-4 py-3">Held</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {lot.inventoryBalances.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-slate-400">No current balances for this lot.</td></tr>
                  ) : lot.inventoryBalances.map((balance) => (
                    <tr key={balance.id}>
                      <td className="px-4 py-3 text-white">{balance.location.name}</td>
                      <td className="px-4 py-3 text-slate-300">{balance.onHandQuantity.toString()}</td>
                      <td className="px-4 py-3 text-slate-300">{balance.availableQuantity.toString()}</td>
                      <td className="px-4 py-3 text-slate-300">{balance.heldQuantity.toString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div>
              <h3 className="text-lg font-medium">Active holds</h3>
              <p className="mt-1 text-sm text-slate-400">Release quarantined or held stock from here with reason-coded actions.</p>
            </div>
            {activeHolds.length === 0 ? (
              <p className="text-sm text-slate-400">No active holds on this lot.</p>
            ) : activeHolds.map((hold) => (
              <div key={hold.id} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">{hold.holdType.replace('_', ' ')}</div>
                    <div className="mt-1 text-sm text-slate-400">{hold.reasonCode} · {hold.location?.name ?? 'No location'}</div>
                  </div>
                  <div className="text-sm text-slate-300">{hold.quantity?.toString() ?? '—'} held</div>
                </div>
                <ReleaseHoldForm holdId={hold.id} maxQuantity={hold.quantity?.toString() ?? ''} returnPath={`/inventory/lots/${lot.id}`} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-medium">Recent movement history</h3>
            <span className="text-xs uppercase tracking-wider text-slate-500">Audit-facing</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-950 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Movement</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {lot.inventoryMovements.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-slate-400">No movements yet.</td></tr>
                ) : lot.inventoryMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="px-4 py-3 text-slate-300">{new Date(movement.occurredAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-300">{movement.location.name}</td>
                    <td className="px-4 py-3 text-white">{movement.movementType.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-300">{movement.quantityDelta.toString()}</td>
                    <td className="px-4 py-3 text-slate-300">{movement.reasonCode ?? '—'}</td>
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

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`mt-1 text-sm text-white ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
