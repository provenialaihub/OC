import { db } from '@/lib/db/client';
import type { AuditEventInput } from '@/lib/audit/types';

export async function writeAuditEvent(input: AuditEventInput) {
  return db.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      locationId: input.locationId ?? null,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      actionType: input.actionType,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson: input.before as object | undefined,
      afterJson: input.after as object | undefined,
      reasonCode: input.reasonCode ?? null,
      correlationId: input.correlationId ?? null,
      sourceChannel: input.sourceChannel ?? null,
    },
  });
}
