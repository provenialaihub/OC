export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { getTenantContext } from '@/lib/tenancy/get-tenant-context';
import { listItems } from '@/lib/services/items';

const ITEM_TYPE_LABELS: Record<string, string> = {
  ingredient: 'Ingredient',
  packaging: 'Packaging',
  finished_good: 'Finished good',
  supply: 'Supply',
  service: 'Service',
  other: 'Other',
};

export default async function ItemsPage() {
  const ctx = await getTenantContext();
  const items = await listItems(ctx.organizationId);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Items</h2>
            <p className="mt-1 text-sm text-slate-400">
              Establish the item catalog foundation for ingredients, packaging, and finished goods.
            </p>
          </div>
          <Link
            href="/items/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Add item
          </Link>
        </header>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <p className="text-slate-400">No items yet.</p>
            <Link
              href="/items/new"
              className="mt-4 inline-block text-sm text-emerald-400 hover:text-emerald-300"
            >
              Add your first item →
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Base unit</th>
                  <th className="px-4 py-3">Reorder</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/items/${item.id}`}
                        className="font-medium text-white hover:text-emerald-400"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{item.sku}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{item.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{item.baseUom.code}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {item.reorderEnabled
                        ? `${item.defaultReorderPoint ?? '—'} / ${item.defaultReorderQuantity ?? '—'}`
                        : 'Off'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {item.isActive ? 'Active' : 'Inactive'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
