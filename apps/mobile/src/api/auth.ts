import { api } from './client';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: string;
  email: string;
  name: string;
}

export async function login(email: string, password: string, totpCode?: string) {
  const { data } = await api.post('/auth/login', { email, password, totpCode });

  if (data.requires2FA) {
    return { requires2FA: true as const, userId: data.userId };
  }

  // Store token securely
  if (data.token) {
    await SecureStore.setItemAsync('auth-token', data.token);
  }

  return { requires2FA: false as const, user: data.user as User };
}

export async function getMe(): Promise<User | null> {
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore errors on logout
  }
  await SecureStore.deleteItemAsync('auth-token');
}

export async function hasStoredToken(): Promise<boolean> {
  const token = await SecureStore.getItemAsync('auth-token');
  return !!token;
}
