import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/documents/:id/versions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: { message: 'Not authenticated' } },
        { status: 401 }
      );
    }
    
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid session' } },
        { status: 401 }
      );
    }
    
    // Find document and verify company ownership
    const document = await prisma.document.findFirst({
      where: { id: params.id },
      include: {
        company: true,
      },
    });
    
    if (!document) {
      return NextResponse.json(
        { error: { message: 'Document not found' } },
        { status: 404 }
      );
    }
    
    if (document.company.userId !== user.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }
    
    // Get all versions including the current document as version 1
    const versions = await prisma.documentVersion.findMany({
      where: { documentId: params.id },
      orderBy: { version: 'desc' },
    });
    
    // Include the current document as the latest version
    const allVersions = [
      {
        id: document.id,
        version: document.version,
        fileUrl: document.fileUrl,
        changes: 'Initial version',
        createdAt: document.createdAt,
      },
      ...versions.map((v) => ({
        id: v.id,
        version: v.version,
        fileUrl: v.fileUrl,
        changes: v.changes,
        createdAt: v.createdAt,
      })),
    ].sort((a, b) => b.version - a.version);
    
    return NextResponse.json({ versions: allVersions });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch versions' } },
      { status: 500 }
    );
  }
}

