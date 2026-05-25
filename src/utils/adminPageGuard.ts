import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';

export type AdminSessionUser = {
  username: string;
  email: string | null;
};

type SessionState = {
  authorized: boolean;
  loading: boolean;
  user: AdminSessionUser | null;
  error: string | null;
};

interface UseAdminGuardOptions {
  redirectToLogin?: boolean;
  sessionCheckUrl?: string;
}

const SESSION_CACHE_KEY = 'admin_session_cache';
const SESSION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute

export const useAdminGuard = (
  options: UseAdminGuardOptions = {},
): SessionState => {
  const { redirectToLogin = true, sessionCheckUrl = '/api/admin/session' } =
    options;

  const router = useRouter();
  const [state, setState] = useState<SessionState>({
    authorized: false,
    loading: true,
    user: null,
    error: null,
  });

  const isMounted = useRef(true);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  const checkSession = useCallback(
    async (isRetry = false) => {
      if (!isMounted.current) return;

      try {
        // Check for cached session first (only on initial load, not retries)
        if (!isRetry) {
          try {
            const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
            if (cached) {
              const { user, timestamp } = JSON.parse(cached);
              if (Date.now() - timestamp < SESSION_CACHE_DURATION) {
                setState({
                  authorized: true,
                  loading: false,
                  user,
                  error: null,
                });
                return;
              }
              sessionStorage.removeItem(SESSION_CACHE_KEY);
            }
          } catch {
            // Ignore cache errors
          }
        }

        const response = await fetch(sessionCheckUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache',
          },
        });

        // Handle HTTP errors
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (!isMounted.current) return;

        // Check for authentication in response body
        if (!data.ok || data.authenticated === false) {
          setState({
            authorized: false,
            loading: false,
            user: null,
            error: data.message || 'Session expired. Please login again.',
          });

          if (redirectToLogin) {
            // Clear any cached session
            try {
              sessionStorage.removeItem(SESSION_CACHE_KEY);
            } catch {
              // Ignore
            }
            router.push('/sudosuperuser-ostaad/login');
          }
          return;
        }

        if (data.user) {
          // Cache the session
          try {
            sessionStorage.setItem(
              SESSION_CACHE_KEY,
              JSON.stringify({ user: data.user, timestamp: Date.now() }),
            );
          } catch {
            // Ignore storage errors
          }

          setState({
            authorized: true,
            loading: false,
            user: data.user,
            error: null,
          });

          // Reset retry count on success
          retryCount.current = 0;
        } else {
          setState({
            authorized: false,
            loading: false,
            user: null,
            error: 'Invalid session data',
          });

          if (redirectToLogin) {
            router.push('/sudosuperuser-ostaad/login');
          }
        }
      } catch (error) {
        if (!isMounted.current) return;

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('Session check failed:', errorMessage);

        // Retry logic for network errors
        if (isRetry && retryCount.current < MAX_RETRIES) {
          retryCount.current += 1;
          console.log(
            `Retrying session check (${retryCount.current}/${MAX_RETRIES})...`,
          );

          // Exponential backoff
          setTimeout(() => {
            checkSession(true);
          }, Math.pow(2, retryCount.current) * 500);
          return;
        }

        setState({
          authorized: false,
          loading: false,
          user: null,
          error: 'Failed to verify session. Please try again.',
        });

        if (redirectToLogin) {
          router.push('/sudosuperuser-ostaad/login');
        }
      }
    },
    [router, redirectToLogin, sessionCheckUrl],
  );

  // Initial session check
  useEffect(() => {
    isMounted.current = true;

    // Only check session if we're not already on the login page
    if (!router.pathname.includes('/login')) {
      // Small delay to prevent flash on fast connections
      const timer = setTimeout(() => {
        checkSession();
      }, 100);

      return () => {
        isMounted.current = false;
        clearTimeout(timer);
      };
    } else {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [router.pathname, checkSession]);

  // Periodic session refresh
  useEffect(() => {
    if (!state.authorized || state.loading) return;

    const interval = setInterval(() => {
      checkSession(true);
    }, SESSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [state.authorized, state.loading, checkSession]);

  // Refresh session cache on user activity
  useEffect(() => {
    const handleActivity = () => {
      try {
        const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
        if (cached) {
          const { user } = JSON.parse(cached);
          sessionStorage.setItem(
            SESSION_CACHE_KEY,
            JSON.stringify({ user, timestamp: Date.now() }),
          );
        }
      } catch {
        // Ignore
      }
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, []);

  return state;
};

// Logout function
export const logout = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Clear session cache
    try {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    } catch {
      // Ignore
    }

    const response = await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Clear admin session from client
export const clearAdminSession = (): void => {
  try {
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // Ignore
  }
};

// Check if user is authenticated without redirecting
export const checkAuthStatus = async (): Promise<{
  authenticated: boolean;
  user?: AdminSessionUser;
}> => {
  try {
    const response = await fetch('/api/admin/session', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    if (data.ok && data.authenticated && data.user) {
      return { authenticated: true, user: data.user };
    }

    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
};
