import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor for auth token if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
        // Avoid redirect loops:
        // - Do not force a client redirect when the failing request is the login endpoint itself
        // - Do not redirect if we're already on the login page
        try {
          if (typeof window !== 'undefined') {
            const reqUrl = error.config?.url || '';
            const isLoginRequest = reqUrl.includes('/auth/login') || reqUrl.includes('/api/auth/login');
            const onLoginPage = window.location && window.location.pathname && window.location.pathname.startsWith('/login');

            if (!isLoginRequest && !onLoginPage) {
              window.location.href = '/login';
            }
          }
        } catch (e) {
          // If anything goes wrong reading error.config or window, fall back to rejecting the error.
        }
    }
    return Promise.reject(error);
  }
);

export default api;


