import { Request } from 'express';

// User roles matching Prisma schema
export type UserRole = 'admin' | 'manager' | 'analyst' | 'viewer';

// JWT payload structure
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  iat?: number;
  exp?: number;
}

// Refresh token payload
export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

// Token pair returned on login
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Authenticated user attached to request
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
}

// Extended Express Request with user
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  sessionId?: string;
}

// OAuth provider user info
export interface OAuthUserInfo {
  sub: string; // External provider ID
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

// Auth0 configuration
export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
  issuerBaseURL: string;
}

// Session data stored in Redis
export interface SessionData {
  userId: string;
  organizationId: string;
  role: UserRole;
  refreshTokenId: string;
  createdAt: number;
  lastActivityAt: number;
  ipAddress?: string;
  userAgent?: string;
}

// Audit log entry
export interface AuditLogEntry {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Role permissions
export interface RolePermissions {
  canCreateProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canCreateSite: boolean;
  canEditSite: boolean;
  canDeleteSite: boolean;
  canCreateLayout: boolean;
  canEditLayout: boolean;
  canApproveLayout: boolean;
  canDeleteLayout: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
}

// Permission matrix by role
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canCreateProject: true,
    canEditProject: true,
    canDeleteProject: true,
    canCreateSite: true,
    canEditSite: true,
    canDeleteSite: true,
    canCreateLayout: true,
    canEditLayout: true,
    canApproveLayout: true,
    canDeleteLayout: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canExportData: true,
  },
  manager: {
    canCreateProject: true,
    canEditProject: true,
    canDeleteProject: false,
    canCreateSite: true,
    canEditSite: true,
    canDeleteSite: false,
    canCreateLayout: true,
    canEditLayout: true,
    canApproveLayout: true,
    canDeleteLayout: false,
    canManageUsers: false,
    canViewAnalytics: true,
    canExportData: true,
  },
  analyst: {
    canCreateProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canCreateSite: true,
    canEditSite: true,
    canDeleteSite: false,
    canCreateLayout: true,
    canEditLayout: true,
    canApproveLayout: false,
    canDeleteLayout: false,
    canManageUsers: false,
    canViewAnalytics: true,
    canExportData: true,
  },
  viewer: {
    canCreateProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canCreateSite: false,
    canEditSite: false,
    canDeleteSite: false,
    canCreateLayout: false,
    canEditLayout: false,
    canApproveLayout: false,
    canDeleteLayout: false,
    canManageUsers: false,
    canViewAnalytics: true,
    canExportData: false,
  },
};
