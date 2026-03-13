import type { TenantContext } from '@/lib/tenancy/types';

export function getTenantContext(): TenantContext {
  // Placeholder until auth/session wiring is added.
  return {
    organizationId: 'dev-org',
    locationId: null,
    userId: null,
  };
}
