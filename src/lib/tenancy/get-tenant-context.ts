import { headers } from 'next/headers';
import { db } from '@/lib/db/client';
import { PermissionDeniedError, UnauthorizedError } from '@/lib/errors/service-errors';
import type { TenantContext } from '@/lib/tenancy/types';

async function getRequestIdentity() {
  const headerStore = await headers();
  const organizationSlug =
    headerStore.get('x-onaply-org-slug') ?? process.env.DEV_ORG_SLUG ?? 'blue-gourmet';
  const userEmail =
    headerStore.get('x-onaply-user-email') ?? process.env.DEV_USER_EMAIL ?? null;

  return {
    organizationSlug,
    userEmail: userEmail?.trim().toLowerCase() || null,
  };
}

export async function getTenantContext(): Promise<TenantContext> {
  const { organizationSlug, userEmail } = await getRequestIdentity();

  const organization = await db.organization.findUnique({ where: { slug: organizationSlug } });
  if (!organization) {
    throw new UnauthorizedError(
      `Organization "${organizationSlug}" was not found. Seed the app or provide a valid org slug.`,
    );
  }

  if (!userEmail) {
    throw new UnauthorizedError(
      'No user identity was provided. Set DEV_USER_EMAIL locally until real auth is wired.',
    );
  }

  const user = await db.user.findUnique({
    where: { email: userEmail },
    include: {
      memberships: {
        where: {
          organizationId: organization.id,
          membershipStatus: 'active',
        },
        include: {
          roleAssignments: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user?.isActive) {
    throw new UnauthorizedError(`User "${userEmail}" was not found or is inactive.`);
  }

  const membership = user.memberships[0];
  if (!membership) {
    throw new PermissionDeniedError(
      `User "${userEmail}" does not have an active membership in ${organization.displayName}.`,
    );
  }

  const permissions = Array.from(
    new Set(
      membership.roleAssignments.flatMap((assignment) =>
        assignment.role.permissions.map((rolePermission) => rolePermission.permission.key),
      ),
    ),
  );

  return {
    organizationId: organization.id,
    organizationSlug: organization.slug,
    locationId: membership.defaultLocationId,
    userId: user.id,
    membershipId: membership.id,
    permissions,
  };
}
