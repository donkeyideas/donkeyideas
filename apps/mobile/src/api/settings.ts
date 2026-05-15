import { api } from './client';

export interface ApiKeys {
  deepSeekApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  googleApiKey: string;
  stripeApiKey: string;
  sendgridApiKey: string;
  twilioApiKey: string;
  twilioApiSecret: string;
}

export interface TwoFAStatus {
  enabled: boolean;
}

export interface TwoFASetupResponse {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

export async function getApiKeys(): Promise<ApiKeys> {
  const { data } = await api.get('/settings/api-keys');
  return data;
}

export async function saveApiKeys(keys: Partial<ApiKeys>): Promise<void> {
  await api.post('/settings/api-keys', keys);
}

export async function get2FAStatus(): Promise<TwoFAStatus> {
  const { data } = await api.get('/auth/2fa/status');
  return data;
}

export async function setup2FA(): Promise<TwoFASetupResponse> {
  const { data } = await api.post('/auth/2fa/setup');
  return data;
}

export async function verify2FA(code: string): Promise<void> {
  await api.post('/auth/2fa/verify', { code });
}

export async function disable2FA(code: string): Promise<void> {
  await api.post('/auth/2fa/disable', { code });
}
