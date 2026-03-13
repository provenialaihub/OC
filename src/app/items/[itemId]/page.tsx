import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { getTenantContext } from '@/lib/tenancy/get-tenant-context';
import { getItem, listItemCategories } from '@/lib/services/items';
import { updateItemAction } from '../actions';

const ITEM_TYPE_LABELS: Record<string, string> = {
  ingredient: 'Ingredient',
  packaging: 'Packaging',
  finished_good: 'Finished good',
  supply: 'Supply',
  service: 'Service',
  other: 'Other',
};

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const ctx = await getTenantContext();
  const [item, categories] = await Promise.all([
    getItem(ctx.organizationId, itemId),
    listItemCategories(ctx.organizationId),
  ]);

  if (!item) notFound();

  const boundUpdateItem = updateItemAction.bind(null, item.id);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Link href="/items" className="text-sm text-slate-400 hover:text-slate-300">
              ← Items
            </Link>
            <h2 className="mt-2 text-2xl font-semibold">{item.name}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {ITEM_TYPE_LABELS[item.itemType] ?? item.itemType} · <span className="font-mono">{item.sku}</span>
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.isActive ? 'bg-emerald-900/50 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
            {item.isActive ? 'Active' : 'Inactive'}
          </span>
        </header>

        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Base unit" value={`${item.baseUom.name} (${item.baseUom.code})`} />
          <Detail label="Category" value={item.category?.name ?? 'Uncategorized'} />
          <Detail label="Track lots" value={item.trackLots ? 'Yes' : 'No'} />
          <Detail label="Track expiration" value={item.trackExpiration ? 'Yes' : 'No'} />
          <Detail label="Reorder point" value={item.defaultReorderPoint?.toString() ?? '—'} />
          <Detail label="Reorder quantity" value={item.defaultReorderQuantity?.toString() ?? '—'} />
          <Detail label="Created" value={item.createdAt.toLocaleDateString()} />
          <Detail label="Updated" value={item.updatedAt.toLocaleDateString()} />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">
            Catalog settings
          </h3>
          <form action={boundUpdateItem} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="itemCategoryId">
                <select id="itemCategoryId" name="itemCategoryId" defaultValue={item.itemCategoryId ?? ''} className={inputClass}>
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name} · {category.code}</option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle name="isActive" label="Active" defaultChecked={item.isActive} />
                <Toggle name="trackInventory" label="Track inventory" defaultChecked={item.trackInventory} />
                <Toggle name="trackLots" label="Track lots" defaultChecked={item.trackLots} />
                <Toggle name="trackExpiration" label="Track expiration" defaultChecked={item.trackExpiration} />
                <Toggle name="reorderEnabled" label="Enable reorder" defaultChecked={item.reorderEnabled} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default reorder point" htmlFor="defaultReorderPoint">
                <input id="defaultReorderPoint" name="defaultReorderPoint" type="number" min="0" step="0.01" defaultValue={item.defaultReorderPoint?.toString() ?? ''} className={inputClass} />
              </Field>
              <Field label="Default reorder quantity" htmlFor="defaultReorderQuantity">
                <input id="defaultReorderQuantity" name="defaultReorderQuantity" type="number" min="0" step="0.01" defaultValue={item.defaultReorderQuantity?.toString() ?? ''} className={inputClass} />
              </Field>
            </div>

            <Field label="Notes" htmlFor="notes">
              <textarea id="notes" name="notes" rows={4} defaultValue={item.notes ?? ''} className={inputClass} placeholder="Internal item notes…" />
            </Field>

            <button type="submit" className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-600">
              Save item settings
            </button>
          </form>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <StubSection title="Inventory by location" description="Phase 2: derived from the movement ledger and balances." />
          <StubSection title="Supplier mappings" description="Phase 3: approved item suppliers and contract-aware sourcing." />
        </div>
      </div>
    </AppShell>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-white">{value}</dd>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-xs uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-800 px-4 py-3 text-sm text-slate-300">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500" />
      <span>{label}</span>
    </label>
  );
}

function StubSection({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 p-6">
      <h3 className="text-sm font-medium text-slate-400">{title}</h3>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}
