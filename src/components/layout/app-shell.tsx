import Link from 'next/link';
import { ReactNode } from 'react';

const nav = [
  ['Dashboard', '/'],
  ['Receiving', '/receiving'],
  ['Inventory', '/inventory'],
  ['Items', '/items'],
  ['Purchasing', '/purchasing'],
  ['Suppliers', '/suppliers'],
  ['Compliance', '/compliance'],
  ['Audit', '/audit'],
  ['Integrations', '/integrations'],
  ['Settings', '/settings'],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="border-r border-slate-800 p-6">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Onaply</div>
            <h1 className="mt-2 text-2xl font-semibold">Operator OS</h1>
            <p className="mt-2 text-sm text-slate-400">Procurement, inventory, compliance, and accounting-connected control.</p>
          </div>
          <nav className="space-y-2">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
