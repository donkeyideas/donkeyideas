import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { put } from '@vercel/blob';

// POST /api/blog/upload - Upload blog image
export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: { message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: { message: 'Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, or SVG)' } },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: { message: 'File size too large. Maximum size is 5MB' } },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'png';
    const filename = `blog/${user.id}-${timestamp}.${fileExtension}`;

    // Upload to Vercel Blob Storage
    const bytes = await file.arrayBuffer();
    const blob = await put(filename, bytes, {
      access: 'public',
      contentType: file.type,
    });

    return NextResponse.json({ imageUrl: blob.url });
  } catch (error: any) {
    console.error('Blog image upload error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to upload image' } },
      { status: 500 }
    );
  }
}
