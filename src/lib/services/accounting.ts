import { Prisma } from '@prisma/client';
import { quickBooksAdapter } from '@/lib/connectors/quickbooks/adapter';
import { db } from '@/lib/db/client';
import { NotFoundError } from '@/lib/errors/service-errors';

export type AccountingProvider = 'quickbooks' | 'csv' | 'manual' | 'other';
export type DbLike = Prisma.TransactionClient | typeof db;
export const ACCOUNTING_MAPPING_TYPES = {
  supplierVendor: 'supplier_vendor',
  item: 'item',
  inventoryAssetAccount: 'inventory_asset_account',
  expenseAccount: 'expense_account',
  cogsAccount: 'cogs_account',
  incomeAccount: 'income_account',
  locationClass: 'location_class',
  taxCode: 'tax_code',
} as const;

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
      grantedScopes: [],
    },
  });
}

export async function updateIntegrationConnectionAuth(args: {
  organizationId: string;
  integrationConnectionId: string;
  status: 'pending_auth' | 'active' | 'expired' | 'error' | 'disconnected';
  realmId?: string | null;
  grantedScopes?: string[];
  tokenExpiresAt?: Date | null;
  authMetadata?: Record<string, unknown> | null;
}) {
  return db.integrationConnection.update({
    where: { id: args.integrationConnectionId },
    data: {
      status: args.status,
      realmId: args.realmId ?? undefined,
      grantedScopes: args.grantedScopes ?? undefined,
      tokenExpiresAt: args.tokenExpiresAt ?? undefined,
      authMetadataJson: (args.authMetadata ?? undefined) as Prisma.InputJsonValue | undefined,
      lastAuthCheckAt: new Date(),
      lastSuccessfulApiAt: args.status === 'active' ? new Date() : undefined,
    },
  });
}

export async function upsertAccountingMapping(args: {
  organizationId: string;
  integrationConnectionId?: string | null;
  mappingType: string;
  internalEntityType: string;
  internalEntityId: string;
  externalRef: string;
  externalName?: string | null;
  metadata?: Record<string, unknown> | null;
  client?: DbLike;
}) {
  const conn = resolveClient(args.client);
  const existing = await conn.accountingMapping.findFirst({
    where: {
      organizationId: args.organizationId,
      integrationConnectionId: args.integrationConnectionId ?? null,
      mappingType: args.mappingType,
      internalEntityType: args.internalEntityType,
      internalEntityId: args.internalEntityId,
    },
  });

  if (existing) {
    return conn.accountingMapping.update({
      where: { id: existing.id },
      data: {
        externalRef: args.externalRef,
        externalName: args.externalName ?? null,
        metadataJson: (args.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  return conn.accountingMapping.create({
    data: {
      organizationId: args.organizationId,
      integrationConnectionId: args.integrationConnectionId ?? null,
      mappingType: args.mappingType,
      internalEntityType: args.internalEntityType,
      internalEntityId: args.internalEntityId,
      externalRef: args.externalRef,
      externalName: args.externalName ?? null,
      metadataJson: (args.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listAccountingMappings(organizationId: string) {
  return db.accountingMapping.findMany({
    where: { organizationId },
    include: { integrationConnection: true },
    orderBy: [{ mappingType: 'asc' }, { updatedAt: 'desc' }],
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
    include: { integrationConnection: true, exportAttempts: true, reconciliationIssues: true },
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function validateAccountingEventReadiness(organizationId: string, accountingEventId: string) {
  const event = await db.accountingEvent.findFirstOrThrow({
    where: { organizationId, id: accountingEventId },
    include: { integrationConnection: true },
  });

  const issues: string[] = [];
  if (!event.integrationConnection) {
    issues.push('No integration connection assigned.');
  } else {
    if (event.integrationConnection.status !== 'active') {
      issues.push(`Connection is ${event.integrationConnection.status}.`);
    }
    if (event.integrationConnection.provider === 'quickbooks' && !event.integrationConnection.realmId) {
      issues.push('QuickBooks realmId is missing.');
    }
  }

  const payload = event.payloadJson as Record<string, unknown>;
  if (event.accountingEventType === 'inventory_receipt_posted') {
    const supplierId = String(payload.supplierId ?? '');
    if (supplierId) {
      const vendorMap = await db.accountingMapping.findFirst({
        where: {
          organizationId,
          integrationConnectionId: event.integrationConnectionId ?? null,
          mappingType: ACCOUNTING_MAPPING_TYPES.supplierVendor,
          internalEntityType: 'supplier',
          internalEntityId: supplierId,
        },
      });
      if (!vendorMap) issues.push('Missing supplier -> vendor mapping.');
    }
  }

  if (event.accountingEventType === 'inventory_adjustment_posted') {
    const itemId = String(payload.itemId ?? '');
    const required = [
      ACCOUNTING_MAPPING_TYPES.item,
      ACCOUNTING_MAPPING_TYPES.inventoryAssetAccount,
      ACCOUNTING_MAPPING_TYPES.expenseAccount,
    ];

    for (const mappingType of required) {
      const mapping = await db.accountingMapping.findFirst({
        where: {
          organizationId,
          integrationConnectionId: event.integrationConnectionId ?? null,
          mappingType,
          internalEntityType: mappingType === ACCOUNTING_MAPPING_TYPES.item ? 'item' : 'organization',
          internalEntityId: mappingType === ACCOUNTING_MAPPING_TYPES.item ? itemId : organizationId,
        },
      });
      if (!mapping) issues.push(`Missing ${mappingType} mapping.`);
    }
  }

  return { event, issues, ready: issues.length === 0 };
}

export async function createAccountingReconciliationIssue(args: {
  organizationId: string;
  integrationConnectionId?: string | null;
  accountingEventId?: string | null;
  issueType: string;
  description: string;
  internalRef?: Record<string, unknown> | null;
  externalRef?: Record<string, unknown> | null;
  client?: DbLike;
}) {
  const conn = resolveClient(args.client);
  return conn.accountingReconciliationIssue.create({
    data: {
      organizationId: args.organizationId,
      integrationConnectionId: args.integrationConnectionId ?? null,
      accountingEventId: args.accountingEventId ?? null,
      issueType: args.issueType,
      description: args.description,
      internalRefJson: (args.internalRef ?? undefined) as Prisma.InputJsonValue | undefined,
      externalRefJson: (args.externalRef ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listAccountingReconciliationIssues(organizationId: string) {
  return db.accountingReconciliationIssue.findMany({
    where: { organizationId },
    include: { integrationConnection: true, accountingEvent: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function claimPendingAccountingEvent(organizationId: string) {
  const event = await db.accountingEvent.findFirst({
    where: { organizationId, status: 'pending' },
    orderBy: { createdAt: 'asc' },
    include: { integrationConnection: true },
  });

  if (!event) return null;

  const readiness = await validateAccountingEventReadiness(organizationId, event.id);
  if (!readiness.ready) {
    await db.accountingEvent.update({
      where: { id: event.id },
      data: {
        status: 'blocked',
        lastAttemptAt: new Date(),
        lastErrorClass: 'mapping_missing',
        lastErrorMessage: readiness.issues.join(' '),
      },
    });

    await createAccountingReconciliationIssue({
      organizationId,
      integrationConnectionId: event.integrationConnectionId,
      accountingEventId: event.id,
      issueType: 'export_blocked',
      description: readiness.issues.join(' '),
      internalRef: {
        accountingEventType: event.accountingEventType,
        sourceEventType: event.sourceEventType,
        sourceEventId: event.sourceEventId,
      },
    });

    return null;
  }

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

  if (args.status === 'failed') {
    await createAccountingReconciliationIssue({
      organizationId: args.organizationId,
      integrationConnectionId: args.integrationConnectionId,
      accountingEventId: args.accountingEventId,
      issueType: args.errorClass ?? 'export_failure',
      description: args.errorMessage ?? 'Accounting export failed.',
    });
  }

  return attempt;
}

export async function getAccountingEvent(organizationId: string, accountingEventId: string) {
  const event = await db.accountingEvent.findFirst({
    where: { organizationId, id: accountingEventId },
    include: { integrationConnection: true, exportAttempts: true, reconciliationIssues: true },
  });

  if (!event) throw new NotFoundError('Accounting event was not found for this organization.');
  return event;
}
