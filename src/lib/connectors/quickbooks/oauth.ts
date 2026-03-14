import { randomBytes, createHash } from 'node:crypto';
import { ValidationError } from '@/lib/errors/service-errors';

const AUTHORIZE_URL = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const DEFAULT_SCOPE = 'com.intuit.quickbooks.accounting';

export function getQuickBooksEnv() {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID?.trim();
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET?.trim();
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI?.trim();
  const scope = process.env.QUICKBOOKS_SCOPE?.trim() || DEFAULT_SCOPE;

  return {
    clientId,
    clientSecret,
    redirectUri,
    scope,
    configured: Boolean(clientId && clientSecret && redirectUri),
  };
}

export function generateOAuthState() {
  return randomBytes(24).toString('hex');
}

export function generateCodeVerifier() {
  return randomBytes(48).toString('base64url');
}

export function generateCodeChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function buildQuickBooksAuthorizeUrl(args: {
  state: string;
  codeChallenge: string;
}) {
  const env = getQuickBooksEnv();
  if (!env.configured || !env.clientId || !env.redirectUri) {
    throw new ValidationError('QuickBooks OAuth env vars are missing. Set QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, and QUICKBOOKS_REDIRECT_URI.');
  }

  const params = new URLSearchParams({
    client_id: env.clientId,
    response_type: 'code',
    scope: env.scope,
    redirect_uri: env.redirectUri,
    state: args.state,
    code_challenge: args.codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeQuickBooksCode(args: {
  code: string;
  codeVerifier: string;
}) {
  const env = getQuickBooksEnv();
  if (!env.configured || !env.clientId || !env.clientSecret || !env.redirectUri) {
    throw new ValidationError('QuickBooks OAuth env vars are missing. Set QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, and QUICKBOOKS_REDIRECT_URI.');
  }

  const auth = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    redirect_uri: env.redirectUri,
    code_verifier: args.codeVerifier,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ValidationError(`QuickBooks token exchange failed: ${payload.error_description ?? payload.error ?? response.statusText}`);
  }

  return payload as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in?: number;
    token_type: string;
  };
}
