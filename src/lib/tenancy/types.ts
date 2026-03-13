export type OrganizationId = string;
export type LocationId = string;
export type UserId = string;

export type TenantContext = {
  organizationId: OrganizationId;
  locationId?: LocationId | null;
  userId?: UserId | null;
  membershipId?: string | null;
  permissions: string[];
  organizationSlug?: string | null;
};
