import { Prisma } from '@prisma/client';
import { quickBooksAdapter } from '@/lib/connectors/quickbooks/adapter';
import { db } from '@/lib/db/client';
import { NotFoundError } from '@/lib/errors/service-errors';

export type AccountingProvider = 'quickbooks' | 'csv' | 'manual' | 'other';
export type DbLike = Prisma.TransactionClient | typeof db;

export type AccountingAdapter = {
  provider: AccountingProvider;
  buildPayload: (event: {
    accountingEventType: string;
    payloadJson: Prisma.JsonValue;
  }) => Record<string, unknown>;
  classifyError?: (error: unknown) => {
    errorClass:
      | 'auth_error'
      | 'rate_limit'
      | 'validation_error'
      | 'mapping_missing'
      | 'provider_unavailable'
      | 'timeout'
      | 'conflict'
      | 'duplicate'
      | 'unsupported_operation'
      | 'data_quality_error'
      | 'unknown';
    message: string;
  };
};

function resolveClient(client?: DbLike) {
  return client ?? db;
}

const adapters: Record<AccountingProvider, AccountingAdapter> = {
  quickbooks: quickBooksAdapter,
  csv: {
    provider: 'csv',
    buildPayload(event) {
      return {
        provider: 'csv',
        rowType: event.accountingEventType,
        payload: event.payloadJson,
      };
    },
  },
  manual: {
    provider: 'manual',
    buildPayload(event) {
      return {
        provider: 'manual',
        payload: event.payloadJson,
      };
    },
  },
  other: {
    provider: 'other',
    buildPayload(event) {
      return {
        provider: 'other',
        payload: event.payloadJson,
      };
    },
  },
};

export function getAccountingAdapter(provider: AccountingProvider) {
  return adapters[provider];
}

export async function listIntegrationConnections(organizationId: string) {
  return db.integrationConnection.findMany({
    where: { organizationId },
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function ensureDefaultQuickBooksConnection(organizationId: string, client?: DbLike) {
  const conn = resolveClient(client);
  const existing = await conn.integrationConnection.findFirst({
    where: { organizationId, provider: 'quickbooks' },
  });

  if (existing) return existing;

  return conn.integrationConnection.create({
    data: {
      organizationId,
      provider: 'quickbooks',
      status: 'pending_auth',
      displayName: 'QuickBooks Online',
      configJson: {
        capabilities: {
          canPushAccountingEvents: true,
          canExportReceipts: true,
          canExportAdjustments: true,
          canImportVendors: true,
          canImportItems: true,
        },
      },
    },
  });
}

export async function createAccountingEvent(args: {
  organizationId: string;
  integrationConnectionId?: string | null;
  sourceEventType: string;
  sourceEventId: string;
  accountingEventType: string;
  payload: Record<string, unknown>;
  client?: DbLike;
}) {
  const conn = resolveClient(args.client);
  return conn.accountingEvent.upsert({
    where: {
      organizationId_sourceEventType_sourceEventId_accountingEventType: {
        organizationId: args.organizationId,
        sourceEventType: args.sourceEventType,
        sourceEventId: args.sourceEventId,
        accountingEventType: args.accountingEventType,
      },
    },
    update: {
      payloadJson: args.payload as Prisma.InputJsonValue,
      integrationConnectionId: args.integrationConnectionId ?? null,
      status: 'pending',
      lastErrorClass: null,
      lastErrorMessage: null,
    },
    create: {
      organizationId: args.organizationId,
      integrationConnectionId: args.integrationConnectionId ?? null,
      sourceEventType: args.sourceEventType,
      sourceEventId: args.sourceEventId,
      accountingEventType: args.accountingEventType,
      payloadJson: args.payload as Prisma.InputJsonValue,
      status: 'pending',
    },
  });
}

export async function listAccountingEvents(organizationId: string) {
  return db.accountingEvent.findMany({
    where: { organizationId },
    include: { integrationConnection: true, exportAttempts: true },
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function claimPendingAccountingEvent(organizationId: string) {
  const event = await db.accountingEvent.findFirst({
    where: { organizationId, status: 'pending' },
    orderBy: { createdAt: 'asc' },
    include: { integrationConnection: true },
  });

  if (!event) return null;

  return db.accountingEvent.update({
    where: { id: event.id },
    data: { status: 'processing', lastAttemptAt: new Date() },
    include: { integrationConnection: true, exportAttempts: true },
  });
}

export async function recordAccountingExportAttempt(args: {
  organizationId: string;
  accountingEventId: string;
  integrationConnectionId?: string | null;
  status: 'started' | 'succeeded' | 'failed' | 'abandoned';
  providerRequestId?: string | null;
  errorClass?: string | null;
  errorMessage?: string | null;
}) {
  const attempts = await db.accountingExportAttempt.count({
    where: { organizationId: args.organizationId, accountingEventId: args.accountingEventId },
  });

  const attempt = await db.accountingExportAttempt.create({
    data: {
      organizationId: args.organizationId,
      accountingEventId: args.accountingEventId,
      integrationConnectionId: args.integrationConnectionId ?? null,
      status: args.status,
      providerRequestId: args.providerRequestId ?? null,
      errorClass: args.errorClass ?? null,
      errorMessage: args.errorMessage ?? null,
      attemptNumber: attempts + 1,
      finishedAt: args.status === 'started' ? null : new Date(),
    },
  });

  await db.accountingEvent.update({
    where: { id: args.accountingEventId },
    data: {
      status:
        args.status === 'succeeded'
          ? 'exported'
          : args.status === 'failed'
            ? 'failed'
            : args.status === 'started'
              ? 'processing'
              : 'ignored',
      lastAttemptAt: new Date(),
      lastErrorClass: args.errorClass ?? null,
      lastErrorMessage: args.errorMessage ?? null,
    },
  });

  return attempt;
}

export async function getAccountingEvent(organizationId: string, accountingEventId: string) {
  const event = await db.accountingEvent.findFirst({
    where: { organizationId, id: accountingEventId },
    include: { integrationConnection: true, exportAttempts: true },
  });

  if (!event) throw new NotFoundError('Accounting event was not found for this organization.');
  return event;
}
