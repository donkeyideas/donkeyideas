import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Track whether we're already redirecting to prevent multiple parallel 401s
// from all triggering redirects simultaneously
let isRedirectingToLogin = false;

// Verify the session is truly invalid before redirecting
async function verifySessionExpired(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    return res.status === 401;
  } catch {
    return true;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
        try {
          if (typeof window !== 'undefined' && !isRedirectingToLogin) {
            const reqUrl = error.config?.url || '';
            const isLoginRequest = reqUrl.includes('/auth/login') || reqUrl.includes('/api/auth/login');
            const onLoginPage = window.location?.pathname?.startsWith('/login');

            if (!isLoginRequest && !onLoginPage) {
              // Verify the session is actually expired before redirecting
              const sessionExpired = await verifySessionExpired();
              if (sessionExpired && !isRedirectingToLogin) {
                isRedirectingToLogin = true;
                window.location.href = '/login';
              }
            }
          }
        } catch (e) {
          // Fall back to rejecting the error
        }
    }
    return Promise.reject(error);
  }
);

export default api;


