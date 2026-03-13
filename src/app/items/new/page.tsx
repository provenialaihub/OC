export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { getTenantContext } from '@/lib/tenancy/get-tenant-context';
import { listItemCategories, listUnitsOfMeasure } from '@/lib/services/items';
import { ItemForm } from './item-form';

export default async function NewItemPage() {
  const ctx = await getTenantContext();
  const [categories, uoms] = await Promise.all([
    listItemCategories(ctx.organizationId),
    listUnitsOfMeasure(ctx.organizationId),
  ]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <Link href="/items" className="text-sm text-slate-400 hover:text-slate-300">
            ← Items
          </Link>
          <h2 className="mt-2 text-2xl font-semibold">Add item</h2>
          <p className="mt-1 text-sm text-slate-400">
            Minimal V1 item setup with unit normalization, category support, and reorder defaults.
          </p>
        </header>

        <ItemForm
          categories={categories.map((category) => ({
            id: category.id,
            label: `${category.name} · ${category.code}`,
          }))}
          uoms={uoms.map((uom) => ({
            id: uom.id,
            label: `${uom.name} (${uom.code})`,
          }))}
        />
      </div>
    </AppShell>
  );
}
