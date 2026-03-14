'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { PERMISSIONS } from '@/lib/authz/permissions';
import { requireTenantAccess } from '@/lib/authz/require-tenant-access';
import { buildQuickBooksAuthorizeUrl, generateCodeChallenge, generateCodeVerifier, generateOAuthState } from '@/lib/connectors/quickbooks/oauth';
import { getErrorMessage } from '@/lib/errors/service-errors';
import { ensureDefaultQuickBooksConnection, updateIntegrationConnectionAuth } from '@/lib/services/accounting';
import { db } from '@/lib/db/client';

export type QuickBooksConnectState = {
  error: string | null;
};

export async function startQuickBooksConnectAction(
  _prev: QuickBooksConnectState,
  _formData: FormData,
): Promise<QuickBooksConnectState> {
  try {
    const ctx = await requireTenantAccess(PERMISSIONS.accountingView);
    const connection = await ensureDefaultQuickBooksConnection(ctx.organizationId);

    const state = generateOAuthState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    await db.integrationConnection.update({
      where: { id: connection.id },
      data: {
        status: 'pending_auth',
        authMetadataJson: {
          ...(typeof connection.authMetadataJson === 'object' && connection.authMetadataJson ? connection.authMetadataJson : {}),
          oauthState: state,
          codeVerifier,
          initiatedAt: new Date().toISOString(),
          initiatedByUserId: ctx.userId ?? null,
        },
        lastAuthCheckAt: new Date(),
      },
    });

    const authorizeUrl = buildQuickBooksAuthorizeUrl({ state, codeChallenge });
    redirect(authorizeUrl);
  } catch (error) {
    return { error: getErrorMessage(error, 'Failed to start QuickBooks connection.') };
  }
}

export async function disconnectQuickBooksAction(connectionId: string): Promise<void> {
  const ctx = await requireTenantAccess(PERMISSIONS.accountingView);
  await updateIntegrationConnectionAuth({
    organizationId: ctx.organizationId,
    integrationConnectionId: connectionId,
    status: 'disconnected',
    realmId: null,
    grantedScopes: [],
    tokenExpiresAt: null,
    authMetadata: { disconnectedAt: new Date().toISOString(), disconnectedByUserId: ctx.userId ?? null },
  });
  revalidatePath('/integrations');
}
