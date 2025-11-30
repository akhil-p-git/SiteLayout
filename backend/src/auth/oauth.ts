import { auth } from 'express-oauth2-jwt-bearer';
import type { RequestHandler } from 'express';
import type { OAuthUserInfo, Auth0Config } from '../types/auth';

// Auth0 configuration from environment
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || '';
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || '';
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET || '';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://api.sitelayouts.io';

/**
 * Get Auth0 configuration
 */
export function getAuth0Config(): Auth0Config {
  return {
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    clientSecret: AUTH0_CLIENT_SECRET,
    audience: AUTH0_AUDIENCE,
    issuerBaseURL: `https://${AUTH0_DOMAIN}`,
  };
}

/**
 * Check if Auth0 is configured
 */
export function isAuth0Configured(): boolean {
  return Boolean(AUTH0_DOMAIN && AUTH0_CLIENT_ID && AUTH0_AUDIENCE);
}

/**
 * Create Auth0 JWT validation middleware
 * This validates tokens issued by Auth0
 */
export function createAuth0Middleware(): RequestHandler {
  if (!isAuth0Configured()) {
    // Return pass-through middleware if Auth0 not configured
    console.warn('Auth0 not configured - OAuth middleware disabled');
    return (_req, _res, next) => next();
  }

  return auth({
    audience: AUTH0_AUDIENCE,
    issuerBaseURL: `https://${AUTH0_DOMAIN}`,
    tokenSigningAlg: 'RS256',
  });
}

/**
 * Fetch user info from Auth0 using access token
 */
export async function fetchAuth0UserInfo(accessToken: string): Promise<OAuthUserInfo | null> {
  if (!isAuth0Configured()) {
    return null;
  }

  try {
    const response = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch Auth0 user info:', response.status);
      return null;
    }

    const userInfo = (await response.json()) as OAuthUserInfo;
    return userInfo;
  } catch (error) {
    console.error('Error fetching Auth0 user info:', error);
    return null;
  }
}

/**
 * Exchange authorization code for tokens (Authorization Code Flow)
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; idToken: string; refreshToken?: string } | null> {
  if (!isAuth0Configured()) {
    return null;
  }

  try {
    const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to exchange code for tokens:', error);
      return null;
    }

    const tokens = await response.json();
    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return null;
  }
}

/**
 * Refresh Auth0 tokens using refresh token
 */
export async function refreshAuth0Tokens(
  refreshToken: string
): Promise<{ accessToken: string; idToken: string } | null> {
  if (!isAuth0Configured()) {
    return null;
  }

  try {
    const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to refresh tokens:', error);
      return null;
    }

    const tokens = await response.json();
    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
    };
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return null;
  }
}

/**
 * Generate Auth0 authorization URL
 */
export function getAuth0AuthorizationUrl(
  redirectUri: string,
  state: string,
  scopes: string[] = ['openid', 'profile', 'email', 'offline_access']
): string {
  if (!isAuth0Configured()) {
    throw new Error('Auth0 is not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: AUTH0_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
    audience: AUTH0_AUDIENCE,
  });

  return `https://${AUTH0_DOMAIN}/authorize?${params.toString()}`;
}

/**
 * Logout from Auth0
 */
export function getAuth0LogoutUrl(returnTo: string): string {
  if (!isAuth0Configured()) {
    throw new Error('Auth0 is not configured');
  }

  const params = new URLSearchParams({
    client_id: AUTH0_CLIENT_ID,
    returnTo,
  });

  return `https://${AUTH0_DOMAIN}/v2/logout?${params.toString()}`;
}
