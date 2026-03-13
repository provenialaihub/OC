export type AuditActorType = 'user' | 'service_account' | 'integration' | 'system';

export type AuditEventInput = {
  organizationId: string;
  locationId?: string | null;
  actorType: AuditActorType;
  actorId?: string | null;
  actionType: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reasonCode?: string | null;
  correlationId?: string | null;
  sourceChannel?: string | null;
};
