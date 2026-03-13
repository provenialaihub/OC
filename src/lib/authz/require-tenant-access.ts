import type { AppPermission } from '@/lib/authz/permissions';
import { PermissionDeniedError } from '@/lib/errors/service-errors';
import { getTenantContext } from '@/lib/tenancy/get-tenant-context';

export async function requireTenantAccess(permission?: AppPermission) {
  const context = await getTenantContext();

  if (permission && !context.permissions.includes(permission)) {
    throw new PermissionDeniedError(`Missing required permission: ${permission}.`, {
      permission,
      membershipId: context.membershipId,
    });
  }

  return context;
}
