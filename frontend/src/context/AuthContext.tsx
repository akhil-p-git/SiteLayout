/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from 'react';
import type { ReactNode } from 'react';
import type {
  AuthState,
  User,
  LoginCredentials,
  LoginResponse,
  RefreshResponse,
  RolePermissions,
} from '../types/auth';
import { ROLE_PERMISSIONS } from '../types/auth';

// API base URL - empty string means relative URLs (same origin)
const API_URL = import.meta.env.VITE_API_URL ?? '';

// Token storage keys
const ACCESS_TOKEN_KEY = 'site_layouts_access_token';
const REFRESH_TOKEN_KEY = 'site_layouts_refresh_token';
const USER_KEY = 'site_layouts_user';

// Initial state
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'TOKEN_REFRESH'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'TOKEN_REFRESH':
      return { ...state, accessToken: action.payload };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// Context type
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  getPermissions: () => RolePermissions | null;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load stored auth on mount
  useEffect(() => {
    const loadStoredAuth = () => {
      try {
        const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedAccessToken && storedRefreshToken && storedUser) {
          const user = JSON.parse(storedUser) as User;
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user,
              accessToken: storedAccessToken,
              refreshToken: storedRefreshToken,
            },
          });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadStoredAuth();
  }, []);

  // Store auth data
  const storeAuth = useCallback((accessToken: string, refreshToken: string, user: User) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }, []);

  // Clear stored auth
  const clearStoredAuth = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Login
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      dispatch({ type: 'AUTH_START' });

      try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Login failed');
        }

        const data: LoginResponse = await response.json();

        storeAuth(data.accessToken, data.refreshToken, data.user);

        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        dispatch({ type: 'AUTH_FAILURE', payload: message });
        throw error;
      }
    },
    [storeAuth]
  );

  // Refresh token
  const refreshTokenFn = useCallback(async (): Promise<boolean> => {
    const currentRefreshToken = state.refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!currentRefreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (!response.ok) {
        clearStoredAuth();
        dispatch({ type: 'LOGOUT' });
        return false;
      }

      const data: RefreshResponse = await response.json();

      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      dispatch({ type: 'TOKEN_REFRESH', payload: data.accessToken });

      return true;
    } catch {
      clearStoredAuth();
      dispatch({ type: 'LOGOUT' });
      return false;
    }
  }, [state.refreshToken, clearStoredAuth]);

  // Logout
  const logout = useCallback(async () => {
    try {
      const currentRefreshToken = state.refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);

      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: state.accessToken ? `Bearer ${state.accessToken}` : '',
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });
    } catch {
      // Ignore logout errors
    } finally {
      clearStoredAuth();
      dispatch({ type: 'LOGOUT' });
    }
  }, [state.accessToken, state.refreshToken, clearStoredAuth]);

  // Logout all sessions
  const logoutAll = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${state.accessToken}`,
        },
        credentials: 'include',
      });
    } catch {
      // Ignore errors
    } finally {
      clearStoredAuth();
      dispatch({ type: 'LOGOUT' });
    }
  }, [state.accessToken, clearStoredAuth]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Check permission
  const hasPermission = useCallback(
    (permission: keyof RolePermissions): boolean => {
      if (!state.user) return false;
      const permissions = ROLE_PERMISSIONS[state.user.role];
      return permissions[permission];
    },
    [state.user]
  );

  // Get all permissions
  const getPermissions = useCallback((): RolePermissions | null => {
    if (!state.user) return null;
    return ROLE_PERMISSIONS[state.user.role];
  }, [state.user]);

  // Set up token refresh interval
  useEffect(() => {
    if (!state.isAuthenticated) return;

    // Refresh token 1 minute before expiry (assuming 15min expiry)
    const refreshInterval = setInterval(
      () => {
        refreshTokenFn();
      },
      14 * 60 * 1000
    ); // 14 minutes

    return () => clearInterval(refreshInterval);
  }, [state.isAuthenticated, refreshTokenFn]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    logoutAll,
    refreshToken: refreshTokenFn,
    clearError,
    hasPermission,
    getPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export context for advanced use cases
export { AuthContext };
