import { NextResponse } from 'next/server';
import { hasASCCredentials } from '@/lib/app-store-connect';
import { SignJWT, importPKCS8 } from 'jose';

export const dynamic = 'force-dynamic';

// ASC credential verification endpoint
export async function GET() {
  try {
    if (!hasASCCredentials()) {
      return NextResponse.json({
        configured: false,
        message: 'ASC credentials not configured. Set ASC_KEY_ID, ASC_ISSUER_ID, and ASC_PRIVATE_KEY.',
      });
    }

    // Verify JWT generation works
    const keyId = process.env.ASC_KEY_ID!;
    const issuerId = process.env.ASC_ISSUER_ID!;
    const privateKeyPem = process.env.ASC_PRIVATE_KEY!.replace(/\\n/g, '\n');

    const privateKey = await importPKCS8(privateKeyPem, 'ES256');
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
      .setIssuer(issuerId)
      .setIssuedAt(now)
      .setExpirationTime(now + 20 * 60)
      .setAudience('appstoreconnect-v1')
      .sign(privateKey);

    // Try a real API call
    let apiTest = 'not_tested';
    try {
      const resp = await fetch('https://api.appstoreconnect.apple.com/v1/apps?limit=1', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      apiTest = `status_${resp.status}`;
      if (resp.ok) {
        const data = await resp.json();
        apiTest = `ok_${data.data?.length || 0}_apps`;
      }
    } catch (e: any) {
      apiTest = `error_${e.message?.slice(0, 50)}`;
    }

    return NextResponse.json({
      configured: true,
      keyId,
      issuerId,
      jwtGenerated: true,
      tokenLength: token.length,
      apiTest,
    });
  } catch (error: any) {
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }
}
