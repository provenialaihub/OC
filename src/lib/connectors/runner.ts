import { getAccountingAdapter, claimPendingAccountingEvent, getAccountingEvent, recordAccountingExportAttempt } from '@/lib/services/accounting';

export async function processNextAccountingEvent(organizationId: string) {
  const claimed = await claimPendingAccountingEvent(organizationId);
  if (!claimed) return null;

  const adapter = getAccountingAdapter((claimed.integrationConnection?.provider ?? 'manual') as any);
  await recordAccountingExportAttempt({
    organizationId,
    accountingEventId: claimed.id,
    integrationConnectionId: claimed.integrationConnectionId,
    status: 'started',
  });

  try {
    const payload = adapter.buildPayload({
      accountingEventType: claimed.accountingEventType,
      payloadJson: claimed.payloadJson,
    });

    await recordAccountingExportAttempt({
      organizationId,
      accountingEventId: claimed.id,
      integrationConnectionId: claimed.integrationConnectionId,
      status: 'succeeded',
      providerRequestId: `sim-${claimed.id}`,
    });

    return {
      eventId: claimed.id,
      provider: adapter.provider,
      payload,
      simulated: true,
    };
  } catch (error) {
    const classified = adapter.classifyError?.(error) ?? {
      errorClass: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown export failure.',
    };

    await recordAccountingExportAttempt({
      organizationId,
      accountingEventId: claimed.id,
      integrationConnectionId: claimed.integrationConnectionId,
      status: 'failed',
      errorClass: classified.errorClass,
      errorMessage: classified.message,
    });

    return getAccountingEvent(organizationId, claimed.id);
  }
}
