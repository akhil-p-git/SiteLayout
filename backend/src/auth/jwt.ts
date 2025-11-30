import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import type { JwtPayload, RefreshTokenPayload, TokenPair, AuthenticatedUser } from '../types/auth';

// Environment variables with defaults for development
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY: SignOptions['expiresIn'] = (process.env.ACCESS_TOKEN_EXPIRY ||
  '15m') as SignOptions['expiresIn'];
const REFRESH_TOKEN_EXPIRY: SignOptions['expiresIn'] = (process.env.REFRESH_TOKEN_EXPIRY ||
  '7d') as SignOptions['expiresIn'];

// Token expiry in seconds for client
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes

/**
 * Generate a unique token ID for refresh tokens
 */
export function generateTokenId(): string {
  return crypto.randomUUID();
}

/**
 * Generate an access token for a user
 */
export function generateAccessToken(user: AuthenticatedUser): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'site-layouts-api',
    audience: 'site-layouts-client',
  });
}

/**
 * Generate a refresh token for a user
 */
export function generateRefreshToken(userId: string, tokenId: string): string {
  const payload: RefreshTokenPayload = {
    sub: userId,
    tokenId,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'site-layouts-api',
    audience: 'site-layouts-client',
  });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(user: AuthenticatedUser): TokenPair {
  const tokenId = generateTokenId();
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id, tokenId);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
  };
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'site-layouts-api',
      audience: 'site-layouts-client',
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Invalid access token:', error.message);
    }
    return null;
  }
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'site-layouts-api',
      audience: 'site-layouts-client',
    }) as RefreshTokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Invalid refresh token:', error.message);
    }
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Check if token is about to expire (within 5 minutes)
 */
export function isTokenExpiringSoon(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  const fiveMinutes = 5 * 60;

  return decoded.exp - now < fiveMinutes;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}
