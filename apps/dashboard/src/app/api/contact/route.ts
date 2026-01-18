import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, company, message, hearAbout } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Save to database
    try {
      await prisma.contactSubmission.create({
        data: {
          name: `${firstName} ${lastName}`,
          email,
          company: company || null,
          message,
          interest: hearAbout || 'other',
        },
      });

      return NextResponse.json(
        { message: 'Thank you! We will get back to you within 24 hours.' },
        { status: 200 }
      );
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // If database fails, still return success to user
      // You could add email notification here as fallback
      return NextResponse.json(
        { message: 'Thank you! We will get back to you soon.' },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to submit form. Please try again.' },
      { status: 500 }
    );
  }
}
