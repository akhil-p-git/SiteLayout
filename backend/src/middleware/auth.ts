import { Response, NextFunction } from 'express';
import { verifyAccessToken, extractBearerToken } from '../auth/jwt';
import type {
  AuthenticatedRequest,
  UserRole,
  RolePermissions,
  AuthenticatedUser,
} from '../types/auth';
import { ROLE_PERMISSIONS } from '../types/auth';

/**
 * Authentication middleware - validates JWT and attaches user to request
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token provided',
    });
    return;
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
    });
    return;
  }

  // Attach user to request
  req.user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    organizationId: payload.organizationId,
  };

  next();
}

/**
 * Optional authentication - doesn't fail if no token, but attaches user if valid
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      req.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        organizationId: payload.organizationId,
      };
    }
  }

  next();
}

/**
 * Role-based access control middleware factory
 * Requires user to have one of the specified roles
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Permission-based access control middleware factory
 * Requires user to have a specific permission
 */
export function requirePermission(permission: keyof RolePermissions) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const permissions = ROLE_PERMISSIONS[req.user.role];

    if (!permissions[permission]) {
      res.status(403).json({
        error: 'Forbidden',
        message: `You do not have permission to perform this action`,
      });
      return;
    }

    next();
  };
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: AuthenticatedUser, permission: keyof RolePermissions): boolean {
  const permissions = ROLE_PERMISSIONS[user.role];
  return permissions[permission];
}

/**
 * Organization access middleware - ensures user belongs to the organization
 * Must be used after authenticate middleware
 */
export function requireOrganizationAccess(orgIdParam: string = 'organizationId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const requestedOrgId = req.params[orgIdParam] || req.body?.[orgIdParam];

    // Admin can access any organization
    if (req.user.role === 'admin') {
      next();
      return;
    }

    if (requestedOrgId && requestedOrgId !== req.user.organizationId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this organization',
      });
      return;
    }

    next();
  };
}

/**
 * Rate limiting by user - simple in-memory implementation
 * In production, use Redis-based rate limiting
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userId = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();

    let record = rateLimitMap.get(userId);

    if (!record || record.resetAt < now) {
      record = { count: 1, resetAt: now + windowMs };
      rateLimitMap.set(userId, record);
    } else {
      record.count++;
    }

    if (record.count > maxRequests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
      return;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    next();
  };
}

// Convenience middleware combinations
export const requireAdmin = requireRoles('admin');
export const requireManager = requireRoles('admin', 'manager');
export const requireAnalyst = requireRoles('admin', 'manager', 'analyst');
export const requireViewer = requireRoles('admin', 'manager', 'analyst', 'viewer');
