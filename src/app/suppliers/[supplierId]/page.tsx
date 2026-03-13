export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { getTenantContext } from '@/lib/tenancy/get-tenant-context';
import { getSupplier } from '@/lib/services/suppliers';
import { updateSupplierStatusAction, updateSupplierNotesAction } from '../actions';

const STATUS_BADGE: Record<string, string> = {
  active: 'border-emerald-800 bg-emerald-900/50 text-emerald-300',
  inactive: 'border-slate-700 bg-slate-800 text-slate-400',
  pending_review: 'border-amber-800 bg-amber-900/50 text-amber-300',
  suspended: 'border-red-800 bg-red-900/50 text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending_review: 'Pending review',
  suspended: 'Suspended',
};

const ALL_STATUSES = ['active', 'inactive', 'pending_review', 'suspended'] as const;

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const { supplierId } = await params;
  const ctx = await getTenantContext();
  const supplier = await getSupplier(ctx.organizationId, supplierId);
  if (!supplier) notFound();

  const boundUpdateStatus = updateSupplierStatusAction.bind(null, supplier.id);
  const boundUpdateNotes = updateSupplierNotesAction.bind(null, supplier.id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Link href="/suppliers" className="text-sm text-slate-400 hover:text-slate-300">
              ← Suppliers
            </Link>
            <h2 className="mt-2 text-2xl font-semibold">{supplier.displayName}</h2>
            {supplier.legalName !== supplier.displayName && (
              <p className="text-sm text-slate-400">{supplier.legalName}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_BADGE[supplier.status] ?? 'border-slate-700 bg-slate-800 text-slate-400'}`}
          >
            {STATUS_LABELS[supplier.status] ?? supplier.status}
          </span>
        </header>

        {/* Core details */}
        <dl className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Code" value={supplier.code} mono />
          <Detail label="Category" value={supplier.category ?? '—'} />
          <Detail label="Payment terms" value={supplier.paymentTerms ?? '—'} />
          <Detail
            label="Lead time"
            value={supplier.leadTimeDays != null ? `${supplier.leadTimeDays} days` : '—'}
          />
          <Detail label="Created" value={supplier.createdAt.toLocaleDateString()} />
          <Detail label="Last updated" value={supplier.updatedAt.toLocaleDateString()} />
        </dl>

        {/* Status update */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">
            Update status
          </h3>
          <form action={boundUpdateStatus} className="flex items-center gap-3">
            <select
              name="status"
              defaultValue={supplier.status}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-600"
            >
              Update
            </button>
          </form>
        </section>

        {/* Notes */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">
            Notes
          </h3>
          <form action={boundUpdateNotes} className="space-y-3">
            <textarea
              name="notes"
              defaultValue={supplier.notes ?? ''}
              rows={4}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              placeholder="Internal notes…"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-600"
            >
              Save notes
            </button>
          </form>
        </section>

        {/* Stub sections for future phases */}
        <div className="grid gap-4 sm:grid-cols-2">
          <StubSection
            title="Certifications"
            description="Supplier docs and compliance certifications — Phase 3."
          />
          <StubSection
            title="Compliance issues"
            description="Active and resolved issues — Phase 3."
          />
        </div>
      </div>
    </AppShell>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`mt-1 text-sm text-white ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
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
