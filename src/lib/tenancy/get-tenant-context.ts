import { db } from '@/lib/db/client';
import type { TenantContext } from '@/lib/tenancy/types';

/**
 * Returns the tenant context for the current request.
 *
 * Production: wire real auth/session here.
 * Development: resolves the org by DEV_ORG_SLUG env var (defaults to 'blue-gourmet').
 * Run `npm run db:seed` first if the dev org is missing.
 */
export async function getTenantContext(): Promise<TenantContext> {
  if (process.env.NODE_ENV !== 'production') {
    const slug = process.env.DEV_ORG_SLUG ?? 'blue-gourmet';
    const org = await db.organization.findUnique({ where: { slug } });
    if (!org) {
      throw new Error(
        `Dev org not found for slug "${slug}". Run: npm run db:seed`,
      );
    }
    return {
      organizationId: org.id,
      locationId: null,
      userId: null,
    };
  }
  // TODO: replace with real auth session extraction
  throw new Error('getTenantContext: real auth not implemented yet');
}
