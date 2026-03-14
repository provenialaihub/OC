import { randomBytes, createHash, createCipheriv, createDecipheriv, createHash as sha } from 'node:crypto';
import { ValidationError } from '@/lib/errors/service-errors';

const AUTHORIZE_URL = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const COMPANY_INFO_URL = 'https://sandbox-quickbooks.api.intuit.com/v3/company';
const DEFAULT_SCOPE = 'com.intuit.quickbooks.accounting';

export function getQuickBooksEnv() {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID?.trim();
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET?.trim();
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI?.trim();
  const scope = process.env.QUICKBOOKS_SCOPE?.trim() || DEFAULT_SCOPE;
  const encryptionKey = process.env.QUICKBOOKS_TOKEN_ENCRYPTION_KEY?.trim() ?? process.env.APP_SECRET?.trim();
  const apiBaseUrl = process.env.QUICKBOOKS_API_BASE_URL?.trim() || 'https://sandbox-quickbooks.api.intuit.com';

  return {
    clientId,
    clientSecret,
    redirectUri,
    scope,
    encryptionKey,
    apiBaseUrl,
    configured: Boolean(clientId && clientSecret && redirectUri),
  };
}

function requireEncryptionKey() {
  const { encryptionKey } = getQuickBooksEnv();
  if (!encryptionKey) {
    throw new ValidationError('Missing QUICKBOOKS_TOKEN_ENCRYPTION_KEY (or APP_SECRET) for token encryption.');
  }
  return sha('sha256').update(encryptionKey).digest();
}

export function encryptQuickBooksToken(plainText: string) {
  const key = requireEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptQuickBooksToken(cipherText: string) {
  const key = requireEncryptionKey();
  const payload = Buffer.from(cipherText, 'base64');
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
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

async function postTokenRequest(body: URLSearchParams) {
  const env = getQuickBooksEnv();
  if (!env.configured || !env.clientId || !env.clientSecret || !env.redirectUri) {
    throw new ValidationError('QuickBooks OAuth env vars are missing. Set QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, and QUICKBOOKS_REDIRECT_URI.');
  }

  const auth = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString('base64');
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
    throw new ValidationError(`QuickBooks token request failed: ${payload.error_description ?? payload.error ?? response.statusText}`);
  }

  return payload as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in?: number;
    token_type: string;
  };
}

export async function exchangeQuickBooksCode(args: {
  code: string;
  codeVerifier: string;
}) {
  const env = getQuickBooksEnv();
  if (!env.redirectUri) throw new ValidationError('QUICKBOOKS_REDIRECT_URI is missing.');
  return postTokenRequest(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: args.code,
      redirect_uri: env.redirectUri,
      code_verifier: args.codeVerifier,
    }),
  );
}

export async function refreshQuickBooksToken(refreshToken: string) {
  return postTokenRequest(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  );
}

export async function probeQuickBooksCompanyInfo(args: {
  accessToken: string;
  realmId: string;
}) {
  const env = getQuickBooksEnv();
  const url = `${env.apiBaseUrl}/v3/company/${args.realmId}/companyinfo/${args.realmId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ValidationError(`QuickBooks company probe failed: ${payload.Fault?.Error?.[0]?.Detail ?? response.statusText}`);
  }

  return payload;
}
