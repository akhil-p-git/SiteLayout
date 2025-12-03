import { Response } from 'express';
import crypto from 'crypto';
import {
  generateTokenPair,
  verifyRefreshToken,
  generateAccessToken,
  generateTokenId,
  generateRefreshToken,
} from '../auth/jwt';
import {
  getAuth0AuthorizationUrl,
  getAuth0LogoutUrl,
  exchangeCodeForTokens,
  fetchAuth0UserInfo,
  isAuth0Configured,
} from '../auth/oauth';
import {
  createSession,
  deleteSession,
  deleteUserSessions,
  getSessionByRefreshToken,
  getUserSessions,
  touchSession,
} from '../services/session';
import { createAuditLog, AuditActions } from '../services/audit';
import type { AuthenticatedRequest, AuthenticatedUser, UserRole } from '../types/auth';

// Demo users for development (remove in production)
const DEMO_USERS: Record<string, AuthenticatedUser & { password: string }> = {
  'admin@example.com': {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    organizationId: '00000000-0000-0000-0000-000000000001',
    password: 'admin123',
  },
  'manager@example.com': {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'manager@example.com',
    name: 'Manager User',
    role: 'manager',
    organizationId: '00000000-0000-0000-0000-000000000001',
    password: 'manager123',
  },
  'analyst@example.com': {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'analyst@example.com',
    name: 'Analyst User',
    role: 'analyst',
    organizationId: '00000000-0000-0000-0000-000000000001',
    password: 'analyst123',
  },
  'viewer@example.com': {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'viewer@example.com',
    name: 'Viewer User',
    role: 'viewer',
    organizationId: '00000000-0000-0000-0000-000000000001',
    password: 'viewer123',
  },
};

/**
 * Login with email/password (development mode)
 * POST /api/auth/login
 */
export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
      return;
    }

    // In development, use demo users
    const user = DEMO_USERS[email.toLowerCase()];

    if (!user || user.password !== password) {
      await createAuditLog({
        userId: 'anonymous',
        action: AuditActions.LOGIN_FAILED,
        entityType: 'user',
        changes: { email, reason: 'Invalid credentials' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate tokens
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    };

    const tokenId = generateTokenId();
    const accessToken = generateAccessToken(authenticatedUser);
    const refreshToken = generateRefreshToken(user.id, tokenId);

    // Create session
    const sessionId = createSession(
      user.id,
      user.organizationId,
      user.role,
      tokenId,
      req.ip,
      req.headers['user-agent']
    );

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditActions.LOGIN,
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      user: authenticatedUser,
      sessionId,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during login',
    });
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export async function refresh(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required',
      });
      return;
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      });
      return;
    }

    // Get session
    const session = getSessionByRefreshToken(payload.tokenId);
    if (!session) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Session not found or expired',
      });
      return;
    }

    // Get user (in production, fetch from database)
    const user = Object.values(DEMO_USERS).find((u) => u.id === payload.sub);
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      });
      return;
    }

    // Generate new access token
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = generateAccessToken(authenticatedUser);

    // Update session activity
    touchSession(payload.tokenId);

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditActions.TOKEN_REFRESH,
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      accessToken,
      expiresIn: 15 * 60,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during token refresh',
    });
  }
}

/**
 * Logout current session
 * POST /api/auth/logout
 */
export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const payload = verifyRefreshToken(refreshToken);
      if (payload) {
        deleteSession(payload.tokenId);
      }
    }

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        action: AuditActions.LOGOUT,
        entityType: 'user',
        entityId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during logout',
    });
  }
}

/**
 * Logout from all sessions
 * POST /api/auth/logout-all
 */
export async function logoutAll(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const count = deleteUserSessions(req.user.id);

    await createAuditLog({
      userId: req.user.id,
      action: AuditActions.LOGOUT_ALL,
      entityType: 'user',
      entityId: req.user.id,
      changes: { sessionsRevoked: count },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      message: 'Logged out from all sessions',
      sessionsRevoked: count,
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during logout',
    });
  }
}

/**
 * Get current user info
 * GET /api/auth/me
 */
export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  res.json({ user: req.user });
}

/**
 * Get user's active sessions
 * GET /api/auth/sessions
 */
export async function getSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  const sessions = getUserSessions(req.user.id).map(({ sessionId, session }) => ({
    id: sessionId,
    createdAt: new Date(session.createdAt).toISOString(),
    lastActivityAt: new Date(session.lastActivityAt).toISOString(),
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
  }));

  res.json({ sessions });
}

/**
 * Initiate OAuth login (redirect to Auth0)
 * GET /api/auth/oauth/login
 */
export async function oauthLogin(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!isAuth0Configured()) {
    res.status(501).json({
      error: 'Not Implemented',
      message: 'OAuth is not configured. Use email/password login.',
    });
    return;
  }

  // Build the redirect URI with proper protocol handling
  // Use environment variable if provided, otherwise construct from request
  const redirectUri = process.env.OAUTH_CALLBACK_URL ||
    `${req.protocol}://${req.get('host')}/api/auth/oauth/callback`;
  const state = crypto.randomBytes(16).toString('hex');

  // In production, store state in session for CSRF protection
  const authUrl = getAuth0AuthorizationUrl(redirectUri, state);

  res.redirect(authUrl);
}

/**
 * OAuth callback handler
 * GET /api/auth/oauth/callback
 */
export async function oauthCallback(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { code, error, error_description } = req.query;

    if (error) {
      res.redirect(
        `/login?error=${encodeURIComponent((error_description as string) || (error as string))}`
      );
      return;
    }

    if (!code || typeof code !== 'string') {
      res.redirect('/login?error=No authorization code received');
      return;
    }

    // Build the redirect URI with proper protocol handling
    // Use environment variable if provided, otherwise construct from request
    const redirectUri = process.env.OAUTH_CALLBACK_URL ||
      `${req.protocol}://${req.get('host')}/api/auth/oauth/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens) {
      res.redirect('/login?error=Failed to exchange authorization code');
      return;
    }

    // Fetch user info
    const userInfo = await fetchAuth0UserInfo(tokens.accessToken);
    if (!userInfo) {
      res.redirect('/login?error=Failed to fetch user information');
      return;
    }

    // In production, look up or create user in database
    // For now, create a temporary user object
    const user: AuthenticatedUser = {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      role: 'viewer' as UserRole, // Default role, would be fetched from DB
      organizationId: '00000000-0000-0000-0000-000000000001', // Would be fetched from DB
    };

    // Generate our own tokens
    const tokenPair = generateTokenPair(user);

    // Create session
    const tokenId = generateTokenId();
    createSession(
      user.id,
      user.organizationId,
      user.role,
      tokenId,
      req.ip,
      req.headers['user-agent']
    );

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditActions.LOGIN,
      entityType: 'user',
      entityId: user.id,
      changes: { method: 'oauth' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokenPair.accessToken}&refreshToken=${tokenPair.refreshToken}`
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/login?error=Authentication failed');
  }
}

/**
 * OAuth logout
 * GET /api/auth/oauth/logout
 */
export async function oauthLogout(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!isAuth0Configured()) {
    res.redirect('/');
    return;
  }

  const returnTo = `${req.protocol}://${req.get('host')}`;
  const logoutUrl = getAuth0LogoutUrl(returnTo);

  res.redirect(logoutUrl);
}
