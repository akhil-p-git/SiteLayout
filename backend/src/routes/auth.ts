import { Router } from 'express';
import {
  login,
  logout,
  logoutAll,
  refresh,
  getMe,
  getSessions,
  oauthLogin,
  oauthCallback,
  oauthLogout,
} from '../controllers/auth';
import { authenticate, optionalAuth, rateLimit } from '../middleware/auth';

const router = Router();

// Rate limiting for auth endpoints
const authRateLimit = rateLimit(10, 60 * 1000); // 10 requests per minute
const refreshRateLimit = rateLimit(30, 60 * 1000); // 30 requests per minute

/**
 * @route   POST /api/auth/login
 * @desc    Login with email and password
 * @access  Public
 */
router.post('/login', authRateLimit, login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', refreshRateLimit, refresh);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current session
 * @access  Public (token optional for cleanup)
 */
router.post('/logout', optionalAuth, logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all sessions
 * @access  Private
 */
router.post('/logout-all', authenticate, logoutAll);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticate, getMe);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get user's active sessions
 * @access  Private
 */
router.get('/sessions', authenticate, getSessions);

/**
 * @route   GET /api/auth/oauth/login
 * @desc    Initiate OAuth login flow
 * @access  Public
 */
router.get('/oauth/login', oauthLogin);

/**
 * @route   GET /api/auth/oauth/callback
 * @desc    OAuth callback handler
 * @access  Public
 */
router.get('/oauth/callback', oauthCallback);

/**
 * @route   GET /api/auth/oauth/logout
 * @desc    OAuth logout
 * @access  Public
 */
router.get('/oauth/logout', oauthLogout);

export default router;
