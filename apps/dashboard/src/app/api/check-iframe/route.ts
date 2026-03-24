import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ allowed: false }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });

    const xFrameOptions = response.headers.get('x-frame-options');
    const csp = response.headers.get('content-security-policy');

    let blocked = false;

    if (xFrameOptions) {
      const val = xFrameOptions.toLowerCase();
      if (val === 'deny' || val === 'sameorigin') {
        blocked = true;
      }
    }

    if (csp) {
      const val = csp.toLowerCase();
      // Extract the frame-ancestors directive value
      const faMatch = val.match(/frame-ancestors\s+([^;]+)/);
      if (faMatch) {
        const ancestors = faMatch[1].trim();
        // Only block if frame-ancestors is strictly 'none' or only 'self' with no other origins
        if (ancestors === "'none'" || ancestors === "'self'") {
          blocked = true;
        }
      }
    }

    return NextResponse.json({ allowed: !blocked });
  } catch {
    return NextResponse.json({ allowed: false });
  }
}
