/**
 * In-App Purchase receipt verification.
 *
 * Calls Google Play Developer API (`androidpublisher.purchases.products.get`)
 * with the client-supplied purchase token to confirm the purchase actually
 * happened, is in the PURCHASED state, and is NOT a sandbox/test transaction.
 *
 * Apple iOS verification uses the legacy verifyReceipt endpoint to detect
 * environment (Production vs Sandbox). TestFlight + sandbox purchases are
 * allowed through but tagged so Financials can exclude them.
 */

import { getPlayClients } from './google-play';

export type VerifyResult =
  | { ok: true; orderId: string; isTest: false; environment: 'production' }
  | { ok: true; orderId: string; isTest: true; environment: 'sandbox' }
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

    return { ok: true, orderId, isTest: false, environment: 'production' };
  } catch (err: any) {
    // 404 = token doesn't exist (forged). 410 = consumed/refunded. 401 = bad creds.
    const status = err?.response?.status ?? err?.code ?? 'unknown';
    return { ok: false, reason: `Google Play API rejected token (status=${status})` };
  }
}

/**
 * Apple iOS verification via the legacy verifyReceipt endpoint.
 *
 * Why legacy and not the App Store Server API: the legacy endpoint works
 * without an App Store Connect API key (.p8 file) and reliably returns
 * the `environment` field, which is what we actually need — we want to
 * accept TestFlight/sandbox purchases (so they don't break the player's
 * UX) but tag them so Financials excludes them. APP_STORE_SHARED_SECRET
 * env var is optional for non-subscription products.
 *
 * Apple's documented flow: POST to production endpoint first. If status
 * is 21007 ("sandbox receipt sent to production endpoint"), retry against
 * the sandbox endpoint. The `environment` field in the response is the
 * authoritative signal.
 *
 * Reference: https://developer.apple.com/documentation/appstorereceipts/verifyreceipt
 */

const APPLE_PROD_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

interface AppleReceiptEntry {
  product_id?: string;
  transaction_id?: string;
  original_transaction_id?: string;
}

interface AppleReceiptResponse {
  status: number;
  environment?: 'Production' | 'Sandbox';
  receipt?: {
    in_app?: AppleReceiptEntry[];
  };
  latest_receipt_info?: AppleReceiptEntry[];
}

async function callAppleVerify(url: string, receiptData: string): Promise<AppleReceiptResponse | null> {
  try {
    const body: Record<string, string> = { 'receipt-data': receiptData };
    if (process.env.APP_STORE_SHARED_SECRET) {
      body.password = process.env.APP_STORE_SHARED_SECRET;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as AppleReceiptResponse;
  } catch {
    return null;
  }
}

/** Map an Apple verifyReceipt status code to a human-readable explanation
 *  so the server logs (and the mobile error toast) actually tell us what
 *  went wrong instead of just "rejected (status=21002)". */
function explainAppleStatus(status: number): string {
  switch (status) {
    case 21000: return 'request not application/json';
    case 21002: return 'receipt-data malformed or missing';
    case 21003: return 'receipt could not be authenticated';
    case 21004: return 'shared secret mismatch (subscription receipts only)';
    case 21005: return 'receipt server temporarily unavailable';
    case 21006: return 'receipt valid but subscription expired';
    case 21007: return 'sandbox receipt sent to production endpoint';
    case 21008: return 'production receipt sent to sandbox endpoint';
    case 21010: return 'account not found or deleted';
    default: return `unmapped status ${status}`;
  }
}

export async function verifyApplePurchase(opts: {
  productId: string;
  purchaseToken: string;
}): Promise<VerifyResult> {
  const { productId, purchaseToken } = opts;
  if (!productId || !purchaseToken) {
    return { ok: false, reason: 'Missing productId or purchaseToken' };
  }

  // Quick sanity check on the receipt shape. verifyReceipt expects a base64
  // string; anything short or whitespace-only will produce status 21002.
  // Logging the length helps diagnose client-side receipt-extraction bugs
  // where transactionReceipt comes back empty or already-decoded JWS.
  const receiptLen = purchaseToken.length;
  if (receiptLen < 100) {
    console.warn(
      `[iap-verify:apple] suspiciously short receipt (${receiptLen} chars) for productId=${productId}. ` +
      `Expected a base64-encoded app receipt blob (typically 1000+ chars).`,
    );
  }

  // 1) Try production endpoint
  let resp = await callAppleVerify(APPLE_PROD_URL, purchaseToken);
  if (!resp) {
    return { ok: false, reason: 'Apple verifyReceipt unreachable (network/HTTP error)' };
  }

  // 2) Status 21007 = sandbox receipt — retry against sandbox endpoint
  if (resp.status === 21007) {
    resp = await callAppleVerify(APPLE_SANDBOX_URL, purchaseToken);
    if (!resp) return { ok: false, reason: 'Apple sandbox verifyReceipt unreachable (network/HTTP error)' };
  }

  if (resp.status !== 0) {
    const explanation = explainAppleStatus(resp.status);
    console.warn(
      `[iap-verify:apple] REJECTED productId=${productId} status=${resp.status} ` +
      `meaning="${explanation}" env=${resp.environment ?? '?'} receiptLen=${receiptLen}`,
    );
    return {
      ok: false,
      reason: `Apple rejected receipt (status=${resp.status}: ${explanation})`,
    };
  }

  // Find the in-app entry that matches this purchase
  const inApps = resp.receipt?.in_app ?? resp.latest_receipt_info ?? [];
  const match = inApps.find((entry) => entry.product_id === productId);
  const orderId = match?.transaction_id ?? match?.original_transaction_id ?? '';
  if (!orderId) {
    const seenIds = inApps.map((e) => e.product_id).filter(Boolean).join(', ') || '(none)';
    console.warn(
      `[iap-verify:apple] receipt valid but no match for productId=${productId}. ` +
      `Receipt contained product_ids: ${seenIds}. Likely a store-ID-map mismatch.`,
    );
    return {
      ok: false,
      reason: `Receipt valid but did not contain ${productId} (saw: ${seenIds})`,
    };
  }

  const isSandbox = resp.environment === 'Sandbox';
  if (isSandbox) {
    return { ok: true, orderId, isTest: true, environment: 'sandbox' };
  }
  return { ok: true, orderId, isTest: false, environment: 'production' };
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
