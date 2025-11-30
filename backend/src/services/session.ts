import crypto from 'crypto';
import type { SessionData, UserRole } from '../types/auth';

// Session timeout in milliseconds (30 minutes as per PRD)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// Maximum sessions per user
const MAX_SESSIONS_PER_USER = 5;

// In-memory session store (use Redis in production)
const sessions = new Map<string, SessionData>();
const userSessions = new Map<string, Set<string>>();
const refreshTokenSessions = new Map<string, string>();

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Create a new session
 */
export function createSession(
  userId: string,
  organizationId: string,
  role: UserRole,
  refreshTokenId: string,
  ipAddress?: string,
  userAgent?: string
): string {
  const sessionId = generateSessionId();
  const now = Date.now();

  const sessionData: SessionData = {
    userId,
    organizationId,
    role,
    refreshTokenId,
    createdAt: now,
    lastActivityAt: now,
    ipAddress,
    userAgent,
  };

  // Store session
  sessions.set(sessionId, sessionData);

  // Track user sessions
  if (!userSessions.has(userId)) {
    userSessions.set(userId, new Set());
  }
  const userSessionSet = userSessions.get(userId)!;
  userSessionSet.add(sessionId);

  // Map refresh token to session
  refreshTokenSessions.set(refreshTokenId, sessionId);

  // Enforce max sessions per user (remove oldest)
  if (userSessionSet.size > MAX_SESSIONS_PER_USER) {
    const sessionsArray = Array.from(userSessionSet);
    const oldestSessionId = sessionsArray[0];
    deleteSession(oldestSessionId);
  }

  return sessionId;
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): SessionData | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // Check if session has expired
  if (Date.now() - session.lastActivityAt > SESSION_TIMEOUT_MS) {
    deleteSession(sessionId);
    return null;
  }

  return session;
}

/**
 * Get session by refresh token ID
 */
export function getSessionByRefreshToken(refreshTokenId: string): SessionData | null {
  const sessionId = refreshTokenSessions.get(refreshTokenId);
  if (!sessionId) return null;
  return getSession(sessionId);
}

/**
 * Update session activity timestamp
 */
export function touchSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  session.lastActivityAt = Date.now();
  return true;
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  // Remove from user sessions
  const userSessionSet = userSessions.get(session.userId);
  if (userSessionSet) {
    userSessionSet.delete(sessionId);
    if (userSessionSet.size === 0) {
      userSessions.delete(session.userId);
    }
  }

  // Remove refresh token mapping
  refreshTokenSessions.delete(session.refreshTokenId);

  // Remove session
  sessions.delete(sessionId);

  return true;
}

/**
 * Delete all sessions for a user (logout everywhere)
 */
export function deleteUserSessions(userId: string): number {
  const userSessionSet = userSessions.get(userId);
  if (!userSessionSet) return 0;

  let count = 0;
  for (const sessionId of userSessionSet) {
    const session = sessions.get(sessionId);
    if (session) {
      refreshTokenSessions.delete(session.refreshTokenId);
      sessions.delete(sessionId);
      count++;
    }
  }

  userSessions.delete(userId);
  return count;
}

/**
 * Get all active sessions for a user
 */
export function getUserSessions(
  userId: string
): Array<{ sessionId: string; session: SessionData }> {
  const userSessionSet = userSessions.get(userId);
  if (!userSessionSet) return [];

  const activeSessions: Array<{ sessionId: string; session: SessionData }> = [];
  const expiredSessions: string[] = [];

  for (const sessionId of userSessionSet) {
    const session = sessions.get(sessionId);
    if (session) {
      if (Date.now() - session.lastActivityAt > SESSION_TIMEOUT_MS) {
        expiredSessions.push(sessionId);
      } else {
        activeSessions.push({ sessionId, session });
      }
    }
  }

  // Clean up expired sessions
  for (const sessionId of expiredSessions) {
    deleteSession(sessionId);
  }

  return activeSessions;
}

/**
 * Check if session is valid
 */
export function isSessionValid(sessionId: string): boolean {
  return getSession(sessionId) !== null;
}

/**
 * Update session role (when user role changes)
 */
export function updateSessionRole(userId: string, newRole: UserRole): void {
  const userSessionSet = userSessions.get(userId);
  if (!userSessionSet) return;

  for (const sessionId of userSessionSet) {
    const session = sessions.get(sessionId);
    if (session) {
      session.role = newRole;
    }
  }
}

/**
 * Clean up expired sessions (run periodically)
 */
export function cleanupExpiredSessions(): number {
  let cleaned = 0;
  const now = Date.now();

  for (const [sessionId, session] of sessions) {
    if (now - session.lastActivityAt > SESSION_TIMEOUT_MS) {
      deleteSession(sessionId);
      cleaned++;
    }
  }

  return cleaned;
}

// Run cleanup every 5 minutes
setInterval(
  () => {
    const cleaned = cleanupExpiredSessions();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
    }
  },
  5 * 60 * 1000
);

/**
 * Get session statistics
 */
export function getSessionStats(): {
  totalSessions: number;
  totalUsers: number;
  sessionsByRole: Record<UserRole, number>;
} {
  const stats = {
    totalSessions: sessions.size,
    totalUsers: userSessions.size,
    sessionsByRole: {
      admin: 0,
      manager: 0,
      analyst: 0,
      viewer: 0,
    } as Record<UserRole, number>,
  };

  for (const session of sessions.values()) {
    stats.sessionsByRole[session.role]++;
  }

  return stats;
}
