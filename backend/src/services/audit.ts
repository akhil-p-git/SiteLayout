import type { AuditLogEntry } from '../types/auth';
import type { AuthenticatedRequest } from '../types/auth';

// Audit action types
export const AuditActions = {
  // Authentication
  LOGIN: 'auth.login',
  LOGIN_FAILED: 'auth.login_failed',
  LOGOUT: 'auth.logout',
  LOGOUT_ALL: 'auth.logout_all',
  TOKEN_REFRESH: 'auth.token_refresh',
  PASSWORD_CHANGE: 'auth.password_change',
  PASSWORD_RESET: 'auth.password_reset',

  // Users
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ROLE_CHANGE: 'user.role_change',

  // Organizations
  ORG_CREATE: 'organization.create',
  ORG_UPDATE: 'organization.update',
  ORG_DELETE: 'organization.delete',

  // Projects
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  PROJECT_ARCHIVE: 'project.archive',

  // Sites
  SITE_CREATE: 'site.create',
  SITE_UPDATE: 'site.update',
  SITE_DELETE: 'site.delete',
  SITE_BOUNDARY_UPDATE: 'site.boundary_update',

  // Layouts
  LAYOUT_CREATE: 'layout.create',
  LAYOUT_UPDATE: 'layout.update',
  LAYOUT_DELETE: 'layout.delete',
  LAYOUT_APPROVE: 'layout.approve',
  LAYOUT_REJECT: 'layout.reject',

  // Exclusion Zones
  EXCLUSION_CREATE: 'exclusion.create',
  EXCLUSION_UPDATE: 'exclusion.update',
  EXCLUSION_DELETE: 'exclusion.delete',
  CREATE_ZONE: 'zone.create',
  UPDATE_ZONE: 'zone.update',
  DELETE_ZONE: 'zone.delete',

  // Assets
  ASSET_CREATE: 'asset.create',
  ASSET_UPDATE: 'asset.update',
  ASSET_DELETE: 'asset.delete',

  // Data Operations
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',

  // Jobs
  JOB_START: 'job.start',
  JOB_COMPLETE: 'job.complete',
  JOB_FAIL: 'job.fail',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

// In-memory audit log buffer (in production, write to database)
const auditBuffer: AuditLogEntry[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  const timestamp = new Date().toISOString();

  // Add to buffer
  auditBuffer.push({
    ...entry,
  });

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[AUDIT ${timestamp}] ${entry.action}`, {
      userId: entry.userId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      changes: entry.changes ? JSON.stringify(entry.changes) : undefined,
    });
  }

  // Trim buffer if too large
  if (auditBuffer.length > MAX_BUFFER_SIZE) {
    auditBuffer.shift();
  }

  // In production, this would write to the database
  // await prisma.auditLog.create({ data: entry });
}

/**
 * Create audit log from request context
 */
export async function logFromRequest(
  req: AuthenticatedRequest,
  action: AuditAction,
  entityType: string,
  entityId?: string,
  changes?: Record<string, unknown>
): Promise<void> {
  if (!req.user) {
    console.warn('Attempted to create audit log without authenticated user');
    return;
  }

  await createAuditLog({
    userId: req.user.id,
    action,
    entityType,
    entityId,
    changes,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });
}

/**
 * Get client IP address from request
 */
function getClientIp(req: AuthenticatedRequest): string | undefined {
  // Check for forwarded IP (behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }

  // Check for real IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0];
  }

  // Fall back to socket remote address
  return req.socket?.remoteAddress;
}

/**
 * Get recent audit logs (for admin dashboard)
 */
export function getRecentAuditLogs(limit: number = 100): AuditLogEntry[] {
  return auditBuffer.slice(-limit).reverse();
}

/**
 * Get audit logs for a specific user
 */
export function getUserAuditLogs(userId: string, limit: number = 50): AuditLogEntry[] {
  return auditBuffer
    .filter((log) => log.userId === userId)
    .slice(-limit)
    .reverse();
}

/**
 * Get audit logs for a specific entity
 */
export function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  limit: number = 50
): AuditLogEntry[] {
  return auditBuffer
    .filter((log) => log.entityType === entityType && log.entityId === entityId)
    .slice(-limit)
    .reverse();
}

/**
 * Get audit logs by action type
 */
export function getAuditLogsByAction(action: AuditAction, limit: number = 50): AuditLogEntry[] {
  return auditBuffer
    .filter((log) => log.action === action)
    .slice(-limit)
    .reverse();
}

/**
 * Clear audit buffer (for testing)
 */
export function clearAuditBuffer(): void {
  auditBuffer.length = 0;
}

/**
 * Middleware to automatically log API requests
 */
export function auditMiddleware(action: AuditAction, entityType: string) {
  return async (req: AuthenticatedRequest, _res: unknown, next: () => void): Promise<void> => {
    if (req.user) {
      const entityId = req.params.id || req.body?.id;
      await logFromRequest(req, action, entityType, entityId, req.body);
    }
    next();
  };
}
