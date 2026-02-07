import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { auditPage, auditAllPublicPages } from '@/lib/seo-audit';

// GET /api/seo-geo/audit?url=https://...
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (url) {
      const result = await auditPage(url);
      return NextResponse.json({ audit: result });
    }

    const result = await auditAllPublicPages();
    return NextResponse.json({ audit: result });
  } catch (error: any) {
    console.error('SEO audit error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to run SEO audit' } },
      { status: 500 }
    );
  }
}

// POST /api/seo-geo/audit - Force re-audit
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const result = await auditAllPublicPages();
    return NextResponse.json({ audit: result });
  } catch (error: any) {
    console.error('SEO audit error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to run SEO audit' } },
      { status: 500 }
    );
  }
}
