import { NextRequest, NextResponse } from 'next/server';
import { exchangeQuickBooksCode } from '@/lib/connectors/quickbooks/oauth';
import { db } from '@/lib/db/client';
import { storeQuickBooksTokens } from '@/lib/services/accounting';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state')?.trim() ?? '';
  const code = url.searchParams.get('code')?.trim() ?? '';
  const realmId = url.searchParams.get('realmId')?.trim() ?? '';
  const oauthError = url.searchParams.get('error')?.trim();

  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectTo = new URL('/integrations', baseUrl);

  if (oauthError) {
    redirectTo.searchParams.set('qb_error', oauthError);
    return NextResponse.redirect(redirectTo);
  }

  const connection = await db.integrationConnection.findFirst({
    where: { provider: 'quickbooks' },
    orderBy: { updatedAt: 'desc' },
  });

  if (!connection) {
    redirectTo.searchParams.set('qb_error', 'missing_connection');
    return NextResponse.redirect(redirectTo);
  }

  const authMetadata =
    typeof connection.authMetadataJson === 'object' && connection.authMetadataJson
      ? (connection.authMetadataJson as Record<string, unknown>)
      : {};

  if (!state || authMetadata.oauthState !== state || typeof authMetadata.codeVerifier !== 'string') {
    await db.integrationConnection.update({
      where: { id: connection.id },
      data: {
        status: 'error',
        lastAuthCheckAt: new Date(),
        authMetadataJson: {
          ...authMetadata,
          lastOAuthError: 'state_mismatch',
        },
      },
    });
    redirectTo.searchParams.set('qb_error', 'state_mismatch');
    return NextResponse.redirect(redirectTo);
  }

  if (!code) {
    redirectTo.searchParams.set('qb_error', 'missing_code');
    return NextResponse.redirect(redirectTo);
  }

  try {
    const token = await exchangeQuickBooksCode({
      code,
      codeVerifier: authMetadata.codeVerifier,
    });

    const tokenExpiresAt = new Date(Date.now() + token.expires_in * 1000);
    await db.integrationConnection.update({
      where: { id: connection.id },
      data: {
        status: 'active',
        realmId: realmId || null,
        grantedScopes: ['com.intuit.quickbooks.accounting'],
        tokenExpiresAt,
        lastAuthCheckAt: new Date(),
        lastSuccessfulApiAt: new Date(),
        authMetadataJson: {
          ...authMetadata,
          connectedAt: new Date().toISOString(),
          oauthState: null,
          codeVerifier: null,
        },
      },
    });

    await storeQuickBooksTokens({
      integrationConnectionId: connection.id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenType: token.token_type,
      refreshTokenExpiresIn: token.x_refresh_token_expires_in ?? null,
    });

    redirectTo.searchParams.set('qb_connected', '1');
    return NextResponse.redirect(redirectTo);
  } catch (error) {
    await db.integrationConnection.update({
      where: { id: connection.id },
      data: {
        status: 'error',
        lastAuthCheckAt: new Date(),
        authMetadataJson: {
          ...authMetadata,
          lastOAuthError: error instanceof Error ? error.message : 'unknown_oauth_error',
        },
      },
    });
    redirectTo.searchParams.set('qb_error', 'token_exchange_failed');
    return NextResponse.redirect(redirectTo);
  }
}
