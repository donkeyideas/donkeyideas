import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Production API
const API_BASE_URL = 'https://www.donkeyideas.com';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('auth-token');
    }
    return Promise.reject(error);
  }
);

export { api, API_BASE_URL };
