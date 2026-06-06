#!/usr/bin/env node
/**
 * One-time AdMob OAuth setup.
 *
 * AdMob's API requires user OAuth credentials, not a service account.
 * Run this once locally to mint a long-lived refresh token bound to your
 * AdMob owner account (info@donkeyideas.com). The refresh token, client ID,
 * and client secret get pasted into Vercel env vars — after that the daily
 * cron uses them to mint fresh access tokens automatically.
 *
 * Prerequisites in Google Cloud Console (project: donkey-marble-racing):
 *   1. APIs & Services → Credentials → + Create Credentials → OAuth client ID
 *   2. Application type: Web application
 *   3. Name: AdMob Reporting (anything)
 *   4. Authorized redirect URIs: add `http://localhost:53682/callback`
 *   5. Create → copy the Client ID and Client Secret
 *
 * Usage:
 *   node scripts/admob-oauth-setup.mjs <CLIENT_ID> <CLIENT_SECRET>
 *
 * The script opens your browser for consent, captures the auth code on a
 * loopback server, exchanges it for a refresh token, and prints the three
 * env-var values you need.
 */

import { createServer } from 'node:http';
import { exec } from 'node:child_process';
import { platform } from 'node:os';

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = 'https://www.googleapis.com/auth/admob.readonly';

const clientId = process.argv[2] || process.env.ADMOB_OAUTH_CLIENT_ID;
const clientSecret = process.argv[3] || process.env.ADMOB_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Usage: node scripts/admob-oauth-setup.mjs <CLIENT_ID> <CLIENT_SECRET>');
  console.error('Or set ADMOB_OAUTH_CLIENT_ID / ADMOB_OAUTH_CLIENT_SECRET env vars.');
  process.exit(1);
}

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n→ Opening your browser for Google OAuth consent...');
console.log('  Sign in as the AdMob owner account (info@donkeyideas.com).');
console.log('  If the browser does not open automatically, paste this URL:\n');
console.log(`  ${authUrl.toString()}\n`);

const openCmd = platform() === 'win32' ? 'start ""' : platform() === 'darwin' ? 'open' : 'xdg-open';
exec(`${openCmd} "${authUrl.toString()}"`);

const code = await new Promise((resolve, reject) => {
  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname !== '/callback') {
      res.writeHead(404).end();
      return;
    }
    const authCode = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (error) {
      res.end(`<h1>OAuth error: ${error}</h1><p>Close this tab and check the terminal.</p>`);
      server.close();
      reject(new Error(error));
      return;
    }
    if (!authCode) {
      res.end('<h1>No code in callback</h1>');
      server.close();
      reject(new Error('No code in callback'));
      return;
    }
    res.end('<h1>Success!</h1><p>Return to the terminal. You can close this tab.</p>');
    server.close();
    resolve(authCode);
  });
  server.listen(PORT, () => {
    console.log(`→ Listening on ${REDIRECT_URI} for the OAuth callback...\n`);
  });
});

console.log('→ Authorization code received. Exchanging for refresh token...\n');

const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  }),
});

if (!tokenResp.ok) {
  const txt = await tokenResp.text();
  console.error(`✗ Token exchange failed (HTTP ${tokenResp.status}):\n${txt}`);
  process.exit(1);
}

const tokens = await tokenResp.json();
if (!tokens.refresh_token) {
  console.error('✗ No refresh_token returned. This usually means you already authorized this client.');
  console.error('  Revoke at https://myaccount.google.com/permissions, then re-run.');
  console.error('  Response:', tokens);
  process.exit(1);
}

console.log('==========================================================');
console.log('SUCCESS — paste these three values into Vercel env vars:');
console.log('==========================================================');
console.log(`ADMOB_OAUTH_CLIENT_ID     = ${clientId}`);
console.log(`ADMOB_OAUTH_CLIENT_SECRET = ${clientSecret}`);
console.log(`ADMOB_OAUTH_REFRESH_TOKEN = ${tokens.refresh_token}`);
console.log('==========================================================');
console.log('\nNext steps:');
console.log('  1. Vercel → marble-admin → Settings → Environment Variables');
console.log('  2. Add the 3 vars above (Production + Preview, mark Sensitive)');
console.log('  3. Delete the now-unused ADMOB_SERVICE_ACCOUNT_JSON env var');
console.log('  4. Redeploy: Deployments → ⋯ → Redeploy');
console.log('  5. /financials → Sync now (should show green banner)');
console.log('  6. Revoke the old service account key in Google Cloud Console');
