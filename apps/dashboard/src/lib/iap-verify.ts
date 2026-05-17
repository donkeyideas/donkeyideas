/**
 * In-App Purchase receipt verification.
 *
 * Calls Google Play Developer API (`androidpublisher.purchases.products.get`)
 * with the client-supplied purchase token to confirm the purchase actually
 * happened, is in the PURCHASED state, and is NOT a sandbox/test transaction.
 *
 * Apple iOS verification is stubbed — to be implemented with the App Store
 * Server API (JWT-signed with App Store Connect API key).
 */

import { getPlayClients } from './google-play';

export type VerifyResult =
  | { ok: true; orderId: string; isTest: false }
  | { ok: false; reason: string };

const PACKAGE_NAME = 'com.donkeymarble.racing';

// Google Play purchaseState values
const GP_PURCHASED = 0;
// const GP_CANCELED = 1;
// const GP_PENDING = 2;

// Google Play purchaseType values (only present when relevant)
// 0 = Test (i.e., purchased from a license testing account)
// 1 = Promo (i.e., purchased using a promo code)
// 2 = Rewarded (free, from watching a video ad)
const GP_PURCHASE_TYPE_TEST = 0;

// Production Google order IDs look like: GPA.3392-7474-7271-89220
const GOOGLE_ORDER_ID_REGEX = /^GPA\.\d{4}-\d{4}-\d{4}-\d{5,}$/;

/**
 * Verify a Google Play purchase by calling the Developer API.
 * Returns ok:true only for real, PURCHASED, non-test transactions.
 */
export async function verifyGooglePlayPurchase(opts: {
  productId: string;
  purchaseToken: string;
}): Promise<VerifyResult> {
  const { productId, purchaseToken } = opts;

  if (!productId || !purchaseToken) {
    return { ok: false, reason: 'Missing productId or purchaseToken' };
  }

  const clients = getPlayClients();
  if (!clients) {
    return { ok: false, reason: 'Google Play service account not configured' };
  }

  try {
    const res = await clients.publisher.purchases.products.get({
      packageName: PACKAGE_NAME,
      productId,
      token: purchaseToken,
    });

    const data = res.data;

    if (data.purchaseState !== GP_PURCHASED) {
      return { ok: false, reason: `Purchase not in PURCHASED state (state=${data.purchaseState})` };
    }

    if (data.purchaseType === GP_PURCHASE_TYPE_TEST) {
      return { ok: false, reason: 'Test/sandbox purchase rejected' };
    }

    const orderId = data.orderId ?? '';
    if (!GOOGLE_ORDER_ID_REGEX.test(orderId)) {
      return { ok: false, reason: `Order ID format invalid: ${orderId || '(empty)'}` };
    }

    return { ok: true, orderId, isTest: false };
  } catch (err: any) {
    // 404 = token doesn't exist (forged). 410 = consumed/refunded. 401 = bad creds.
    const status = err?.response?.status ?? err?.code ?? 'unknown';
    return { ok: false, reason: `Google Play API rejected token (status=${status})` };
  }
}

/**
 * Apple iOS verification — TODO.
 * Implementation requires the App Store Server API:
 *   - JWT signed with App Store Connect API key (.p8 file)
 *   - Endpoint: https://api.storekit.itunes.apple.com/inApps/v1/transactions/{transactionId}
 * Until this is wired up, iOS purchases are rejected at the API layer.
 */
export async function verifyApplePurchase(_opts: {
  productId: string;
  purchaseToken: string;
}): Promise<VerifyResult> {
  return { ok: false, reason: 'Apple IAP verification not yet implemented' };
}

export async function verifyPurchase(opts: {
  platform: string;
  productId: string;
  purchaseToken: string;
}): Promise<VerifyResult> {
  if (opts.platform === 'android') return verifyGooglePlayPurchase(opts);
  if (opts.platform === 'ios') return verifyApplePurchase(opts);
  return { ok: false, reason: `Unsupported platform: ${opts.platform}` };
}
