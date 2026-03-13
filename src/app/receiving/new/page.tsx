export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/layout/app-shell';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { getReceivingFormOptions } from '@/lib/services/receiving';
import { ReceiveForm } from '@/app/receiving/new/receive-form';

export default async function ReceiveInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ purchaseOrderId?: string }>;
}) {
  const ctx = await requireTenantAccess(PERMISSIONS.receivingCreate);
  const { locations, suppliers, items, purchaseOrders } = await getReceivingFormOptions(ctx.organizationId);
  const params = (await searchParams) ?? {};

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-400">Receiving</div>
          <h2 className="text-3xl font-semibold">Receive inventory</h2>
          <p className="max-w-3xl text-sm text-slate-400">
            Post a PO-based or ad hoc receipt, capture lot/date for tracked items, mark discrepancies, and optionally place stock on hold or quarantine.
          </p>
        </header>

        <ReceiveForm
          locations={locations.map((location) => ({ id: location.id, name: location.name }))}
          suppliers={suppliers.map((supplier) => ({ id: supplier.id, displayName: supplier.displayName }))}
          items={items.map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            trackLots: item.trackLots,
            trackExpiration: item.trackExpiration,
            baseUom: { code: item.baseUom.code },
          }))}
          purchaseOrders={purchaseOrders.map((po) => ({
            id: po.id,
            poNumber: po.poNumber,
            supplierId: po.supplierId,
            locationId: po.locationId,
            lines: po.lines.map((line) => ({
              id: line.id,
              itemId: line.itemId,
              item: {
                name: line.item.name,
                sku: line.item.sku,
                trackLots: line.item.trackLots,
                trackExpiration: line.item.trackExpiration,
              },
              orderedQuantity: line.orderedQuantity.toString(),
              receivedQuantity: line.receivedQuantity.toString(),
              uom: { code: line.uom.code },
            })),
          }))}
          defaultLocationId={ctx.locationId ?? locations[0]?.id ?? null}
          initialPurchaseOrderId={params.purchaseOrderId ?? null}
          key={params.purchaseOrderId ?? 'ad-hoc'}
        />
      </div>
    </AppShell>
  );
}
