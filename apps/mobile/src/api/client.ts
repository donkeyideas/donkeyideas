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

export { api, API_BASE_URL, ADMIN_TOKEN };
