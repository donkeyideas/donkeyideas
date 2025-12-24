import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { put, del } from '@vercel/blob';

// POST /api/companies/:id/logo - Upload company logo
export async function POST(
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
    
    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });
    
    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('logo') as File;
    
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
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: { message: 'File size too large. Maximum size is 5MB' } },
        { status: 400 }
      );
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'png';
    const filename = `logos/${company.id}-${timestamp}.${fileExtension}`;
    
    // Upload to Vercel Blob Storage
    const bytes = await file.arrayBuffer();
    const blob = await put(filename, bytes, {
      access: 'public',
      contentType: file.type,
    });
    
    // Use the blob URL
    const logoUrl = blob.url;
    
    // Update company with logo URL
    const updatedCompany = await prisma.company.update({
      where: { id: params.id },
      data: { logo: logoUrl },
    });
    
    return NextResponse.json({
      company: updatedCompany,
      logoUrl,
    });
  } catch (error: any) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to upload logo' } },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/:id/logo - Delete company logo
export async function DELETE(
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
    
    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });
    
    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }
    
    // Delete the blob from Vercel Blob Storage if it exists
    if (company.logo) {
      try {
        // Check if it's a Vercel Blob URL
        if (company.logo.startsWith('https://') && company.logo.includes('blob.vercel-storage.com')) {
          await del(company.logo);
        }
      } catch (fileError) {
        // Log error but don't fail the request if blob doesn't exist
        console.warn('Failed to delete logo blob:', fileError);
      }
    }
    
    // Update company to remove logo
    const updatedCompany = await prisma.company.update({
      where: { id: params.id },
      data: { logo: null },
    });
    
    return NextResponse.json({
      company: updatedCompany,
      message: 'Logo deleted successfully',
    });
  } catch (error: any) {
    console.error('Logo delete error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete logo' } },
      { status: 500 }
    );
  }
}

