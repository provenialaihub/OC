import { AppShell } from '@/components/layout/app-shell';

const cards = [
  ['Low stock', '0'],
  ['Receiving tasks', '0'],
  ['Held lots', '0'],
  ['Compliance issues', '0'],
];

export default function Home() {
  return (
    <AppShell>
      <div className="space-y-8">
        <header className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-400">Phase 0 scaffold</div>
          <h2 className="text-3xl font-semibold">Onaply control tower</h2>
          <p className="max-w-3xl text-sm text-slate-400">
            This is the initial shell for Blue Gourmet&apos;s operator system. The next build steps are supplier foundation,
            receiving, inventory truth, purchasing, compliance, and the QuickBooks bridge.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="text-sm text-slate-400">{label}</div>
              <div className="mt-3 text-3xl font-semibold">{value}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-medium">First operational milestone</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• model suppliers and items</li>
              <li>• receive truck and pickup deliveries with lot/date capture</li>
              <li>• establish inventory truth by item, lot, and location</li>
              <li>• surface procurement and compliance exceptions</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-medium">Build sequence</h3>
            <ol className="mt-4 space-y-2 text-sm text-slate-300">
              <li>1. auth + tenancy base</li>
              <li>2. supplier and item foundation</li>
              <li>3. receiving + inventory ledger</li>
              <li>4. purchasing + compliance basics</li>
              <li>5. accounting bridge</li>
            </ol>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
