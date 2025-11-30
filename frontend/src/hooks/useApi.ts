import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

interface ApiError {
  error: string;
  message: string;
  code?: string;
}

/**
 * Custom hook for making authenticated API requests
 */
export function useApi() {
  const { accessToken, refreshToken, logout } = useAuth();

  const request = useCallback(
    async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
      const { skipAuth = false, ...fetchOptions } = options;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      };

      // Add auth header if authenticated
      if (!skipAuth && accessToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
      }

      const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

      let response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // If 401, try to refresh token and retry
      if (response.status === 401 && !skipAuth && accessToken) {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry with new token
          const newAccessToken = localStorage.getItem('site_layouts_access_token');
          if (newAccessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`;
            response = await fetch(url, {
              ...fetchOptions,
              headers,
            });
          }
        } else {
          // Refresh failed, logout
          await logout();
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          error: 'Error',
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.message || 'Request failed');
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return response.json();
    },
    [accessToken, refreshToken, logout]
  );

  // Convenience methods
  const get = useCallback(
    <T>(endpoint: string, options?: ApiOptions) => request<T>(endpoint, { ...options, method: 'GET' }),
    [request]
  );

  const post = useCallback(
    <T>(endpoint: string, body?: unknown, options?: ApiOptions) =>
      request<T>(endpoint, {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      }),
    [request]
  );

  const put = useCallback(
    <T>(endpoint: string, body?: unknown, options?: ApiOptions) =>
      request<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      }),
    [request]
  );

  const patch = useCallback(
    <T>(endpoint: string, body?: unknown, options?: ApiOptions) =>
      request<T>(endpoint, {
        ...options,
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      }),
    [request]
  );

  const del = useCallback(
    <T>(endpoint: string, options?: ApiOptions) => request<T>(endpoint, { ...options, method: 'DELETE' }),
    [request]
  );

  return { request, get, post, put, patch, del };
}

export default useApi;
