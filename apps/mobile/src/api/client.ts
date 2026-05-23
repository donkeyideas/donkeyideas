import axios from 'axios';
import Constants from 'expo-constants';

const API_BASE_URL = 'https://www.donkeyideas.com';

// Admin token baked into the APK at build time via app.json `extra.adminApiToken`.
// This is a personal-admin tool for a single owner; the token grants read-only
// access to consolidated admin endpoints. Rotate via the WIDGET_API_TOKEN env
// var on Vercel if the APK ever leaks.
const ADMIN_TOKEN: string =
  (Constants.expoConfig?.extra as any)?.adminApiToken ||
  (Constants.manifest as any)?.extra?.adminApiToken ||
  '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    ...(ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}),
  },
});

// Belt + suspenders: also set on every request in case the default headers
// are overridden somewhere downstream.
api.interceptors.request.use((config) => {
  if (ADMIN_TOKEN) {
    config.headers.set('Authorization', `Bearer ${ADMIN_TOKEN}`);
  }
  return config;
});

// Retry transient network failures up to 2 extra times. On iOS the networking
// stack isn't always ready the instant the app cold-starts, which surfaces as
// a "Network Error" (no response). A short backoff almost always fixes it.
api.interceptors.response.use(undefined, async (error) => {
  const config: any = error?.config;
  const isNetworkError = !error?.response; // no HTTP response at all
  if (!config || !isNetworkError) {
    return Promise.reject(error);
  }
  config.__retryCount = config.__retryCount || 0;
  if (config.__retryCount >= 2) {
    return Promise.reject(error);
  }
  config.__retryCount += 1;
  await new Promise((r) => setTimeout(r, 800 * config.__retryCount));
  return api(config);
});

export { api, API_BASE_URL, ADMIN_TOKEN };
