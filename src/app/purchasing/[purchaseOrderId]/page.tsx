export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { getPurchaseOrderDetail } from '@/lib/services/purchasing';
import { NotFoundError } from '@/lib/errors/service-errors';

const STATUS_BADGE: Record<string, string> = {
  draft: 'border-slate-700 bg-slate-800 text-slate-300',
  submitted: 'border-sky-800 bg-sky-950/60 text-sky-300',
  partially_received: 'border-amber-800 bg-amber-950/60 text-amber-300',
  received: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  cancelled: 'border-rose-800 bg-rose-950/60 text-rose-300',
  closed: 'border-slate-700 bg-slate-900 text-slate-400',
};

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ purchaseOrderId: string }>;
}) {
  const { purchaseOrderId } = await params;
  const ctx = await requireTenantAccess(PERMISSIONS.purchasingView);

  let purchaseOrder;
  try {
    purchaseOrder = await getPurchaseOrderDetail(ctx.organizationId, purchaseOrderId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Link href="/purchasing" className="text-sm text-slate-400 hover:text-slate-300">
              ← Purchasing
            </Link>
            <div className="mt-2 text-xs uppercase tracking-[0.2em] text-emerald-400">Purchase order detail</div>
            <h2 className="mt-2 text-3xl font-semibold">{purchaseOrder.poNumber}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {purchaseOrder.supplier.displayName} · {purchaseOrder.location.name}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_BADGE[purchaseOrder.status] ?? 'border-slate-700 bg-slate-800 text-slate-300'}`}>
              {purchaseOrder.statusLabel}
            </span>
            {purchaseOrder.nextAction.href === 'receive' ? (
              <Link
                href={`/receiving/new?purchaseOrderId=${purchaseOrder.id}`}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
              >
                Receive against PO
              </Link>
            ) : (
              <div className="text-right text-sm text-slate-400">{purchaseOrder.nextAction.label}</div>
            )}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Completion" value={`${purchaseOrder.completionPercent}%`} />
          <Metric label="Open lines" value={String(purchaseOrder.openLineCount)} />
          <Metric label="Received qty" value={String(purchaseOrder.receivedQuantity)} />
          <Metric label="Remaining qty" value={String(purchaseOrder.remainingQuantity)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-medium">PO lines</h3>
            <div className="mt-4 space-y-4">
              {purchaseOrder.lines.map((line) => (
                <div key={line.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-white">{line.itemName}</div>
                      <div className="mt-1 text-sm text-slate-400">{line.sku} · {line.description ?? 'No line note'}</div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{line.lineStatus.replaceAll('_', ' ')}</div>
                      <div className="mt-1">{line.completionPercent}% complete</div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
                    <div>Ordered: {line.orderedQuantity} {line.uomCode}</div>
                    <div>Received: {line.receivedQuantity} {line.uomCode}</div>
                    <div>Remaining: {line.remainingQuantity} {line.uomCode}</div>
                  </div>
                  {line.receipts.length > 0 && (
                    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                      <div className="text-xs uppercase tracking-wider text-slate-500">Receipt trail</div>
                      <div className="mt-2 space-y-2 text-sm text-slate-300">
                        {line.receipts.map((receipt) => (
                          <div key={receipt.id} className="flex items-center justify-between gap-4">
                            <div>
                              <span className="font-medium text-white">{receipt.receiptNumber}</span>
                              <span className="ml-2 text-slate-400">{new Date(receipt.receivedAt).toLocaleString()}</span>
                            </div>
                            <div className="text-right text-xs text-slate-400">
                              <div>{receipt.acceptedQuantity} accepted</div>
                              <div>
                                {[receipt.receiptStatus.replaceAll('_', ' '), receipt.discrepancyType, receipt.holdType]
                                  .filter(Boolean)
                                  .join(' · ') || 'clean receipt'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-lg font-medium">Header</h3>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <Detail label="Order date" value={new Date(purchaseOrder.orderDate).toLocaleDateString()} />
                <Detail label="Expected date" value={purchaseOrder.expectedDate ? new Date(purchaseOrder.expectedDate).toLocaleDateString() : 'No ETA'} />
                <Detail label="Currency" value={purchaseOrder.currencyCode} />
                <Detail label="Supplier status" value={purchaseOrder.supplier.status.replaceAll('_', ' ')} />
              </dl>
              {purchaseOrder.notes && (
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                  {purchaseOrder.notes}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-medium">Receipt history</h3>
                {purchaseOrder.nextAction.href === 'receive' && (
                  <Link href={`/receiving/new?purchaseOrderId=${purchaseOrder.id}`} className="text-sm text-emerald-400 hover:text-emerald-300">
                    Start new receipt →
                  </Link>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {purchaseOrder.receipts.length === 0 ? (
                  <p className="text-sm text-slate-400">No receipts have been posted for this PO yet.</p>
                ) : (
                  purchaseOrder.receipts.map((receipt) => (
                    <div key={receipt.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium text-white">{receipt.receiptNumber}</div>
                          <div className="mt-1 text-sm text-slate-400">{new Date(receipt.receivedAt).toLocaleString()} · {receipt.lineCount} lines</div>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <div>{receipt.status.replaceAll('_', ' ')}</div>
                          <div className="mt-1">{receipt.receiptMethod.replaceAll('_', ' ')}</div>
                        </div>
                      </div>
                      {receipt.notes && <div className="mt-3 text-sm text-slate-400">{receipt.notes}</div>}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-white">{value}</dd>
    </div>
  );
}
