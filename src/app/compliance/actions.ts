'use server';

import { revalidatePath } from 'next/cache';
import { writeAuditEvent } from '@/lib/audit/write-audit-event';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { getErrorMessage } from '@/lib/errors/service-errors';
import { getComplianceIssue, updateComplianceIssueStatus } from '@/lib/services/compliance';

export type ComplianceIssueState = {
  error: string | null;
  success: string | null;
};

export async function updateComplianceIssueStatusAction(
  issueId: string,
  _prev: ComplianceIssueState,
  formData: FormData,
): Promise<ComplianceIssueState> {
  try {
    const ctx = await requireTenantAccess(PERMISSIONS.supplierManage);
    const before = await getComplianceIssue(ctx.organizationId, issueId);
    const updated = await updateComplianceIssueStatus({
      organizationId: ctx.organizationId,
      issueId,
      status: String(formData.get('status') ?? 'open'),
    });

    await writeAuditEvent({
      organizationId: ctx.organizationId,
      locationId: updated.locationId ?? null,
      actorType: 'user',
      actorId: ctx.userId ?? null,
      actionType: 'compliance.issue.status_updated',
      entityType: 'compliance_issue',
      entityId: issueId,
      before: { status: before.status },
      after: { status: updated.status },
      sourceChannel: 'web',
    });

    revalidatePath('/compliance');
    revalidatePath(`/compliance/${issueId}`);
    return { error: null, success: 'Compliance issue updated.' };
  } catch (error) {
    return { error: getErrorMessage(error, 'Failed to update compliance issue.'), success: null };
  }
}
