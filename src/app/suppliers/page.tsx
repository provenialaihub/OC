export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { listSuppliers } from '@/lib/services/suppliers';

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400',
  inactive: 'text-slate-400',
  pending_review: 'text-amber-400',
  suspended: 'text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending_review: 'Pending review',
  suspended: 'Suspended',
};

export default async function SuppliersPage() {
  const ctx = await requireTenantAccess(PERMISSIONS.supplierView);
  const suppliers = await listSuppliers(ctx.organizationId);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Suppliers</h2>
            <p className="mt-1 text-sm text-slate-400">
              Manage supplier master records and governance.
            </p>
          </div>
          <Link
            href="/suppliers/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Add supplier
          </Link>
        </header>

        {suppliers.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <p className="text-slate-400">No suppliers yet.</p>
            <Link
              href="/suppliers/new"
              className="mt-4 inline-block text-sm text-emerald-400 hover:text-emerald-300"
            >
              Add your first supplier →
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Payment terms</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {suppliers.map((s) => (
                  <tr key={s.id} className="transition hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/suppliers/${s.id}`}
                        className="font-medium text-white hover:text-emerald-400"
                      >
                        {s.displayName}
                      </Link>
                      {s.legalName !== s.displayName && (
                        <span className="ml-2 text-xs text-slate-500">{s.legalName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.code}</td>
                    <td className="px-4 py-3 text-slate-400">{s.category ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{s.paymentTerms ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={STATUS_COLORS[s.status] ?? 'text-slate-400'}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </span>
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
