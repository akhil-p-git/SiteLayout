// User roles
export type UserRole = 'admin' | 'manager' | 'analyst' | 'viewer';

// User object
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
}

// Auth state
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

// Login response
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
  sessionId: string;
}

// Refresh response
export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

// Session info
export interface Session {
  id: string;
  createdAt: string;
  lastActivityAt: string;
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

// Permission matrix
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
