import { Prisma } from '@prisma/client';
import { db } from '@/lib/db/client';
import { NotFoundError } from '@/lib/errors/service-errors';

export async function ensureComplianceIssue(args: {
  organizationId: string;
  locationId?: string | null;
  issueType: string;
  severity: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  actorType: 'user' | 'service_account' | 'integration' | 'system';
  actorId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
}) {
  const existing = await db.complianceIssue.findFirst({
    where: {
      organizationId: args.organizationId,
      issueType: args.issueType,
      status: 'open',
      relatedEntityType: args.relatedEntityType ?? null,
      relatedEntityId: args.relatedEntityId ?? null,
    },
  });

  if (existing) return existing;

  return db.complianceIssue.create({
    data: {
      organizationId: args.organizationId,
      locationId: args.locationId ?? null,
      issueType: args.issueType,
      severity: args.severity,
      relatedEntityType: args.relatedEntityType ?? null,
      relatedEntityId: args.relatedEntityId ?? null,
      openedByActorType: args.actorType,
      openedByActorId: args.actorId ?? null,
      description: args.description,
      metadataJson: (args.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listComplianceIssues(organizationId: string) {
  return db.complianceIssue.findMany({
    where: { organizationId },
    include: { location: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getComplianceIssue(organizationId: string, issueId: string) {
  const issue = await db.complianceIssue.findFirst({
    where: { organizationId, id: issueId },
    include: { location: true },
  });

  if (!issue) throw new NotFoundError('Compliance issue was not found for this organization.');
  return issue;
}

export async function updateComplianceIssueStatus(args: {
  organizationId: string;
  issueId: string;
  status: string;
}) {
  const issue = await db.complianceIssue.findFirst({
    where: { organizationId: args.organizationId, id: args.issueId },
    select: { id: true },
  });

  if (!issue) throw new NotFoundError('Compliance issue was not found for this organization.');

  return db.complianceIssue.update({
    where: { id: args.issueId },
    data: { status: args.status },
    include: { location: true },
  });
}
