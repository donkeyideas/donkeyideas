import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

// Allowed origins from env (comma-separated)
const ALLOWED_ORIGINS = (process.env.CONTACT_ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const CONTACT_API_KEY = process.env.CONTACT_API_KEY || '';

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Max-Age': '86400',
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

// CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    // API key validation for cross-origin requests
    const origin = request.headers.get('origin') || '';
    const isSameOrigin = !origin || origin.includes('donkeyideas.com');

    if (!isSameOrigin && CONTACT_API_KEY) {
      const providedKey = request.headers.get('x-api-key');
      if (providedKey !== CONTACT_API_KEY) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401, headers: corsHeaders }
        );
      }
    }

    // Parse body - support both JSON and form-data
    let body: any;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('form')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await request.json();
    }

    // Honeypot anti-spam: `_hp` is a hidden field real users never see or fill.
    // Bots that auto-fill every input will populate it. Return a success-looking
    // response so the bot moves on, but never store the submission.
    if (typeof body._hp === 'string' && body._hp.trim() !== '') {
      return NextResponse.json(
        { message: 'Thank you! We will get back to you soon.' },
        { status: 200, headers: corsHeaders }
      );
    }

    // Flexible field mapping - accepts name OR firstName+lastName
    const name = body.name || `${body.firstName || ''} ${body.lastName || ''}`.trim();
    const email = body.email;
    const company = body.company || null;
    const message = body.message;
    const interest = body.interest || body.hearAbout || 'other';
    const source = body.source || 'donkey-ideas';

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, message' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Length caps — reject oversized spam payloads before they hit the DB.
    if (
      String(name).length > 200 ||
      String(email).length > 254 ||
      (company && String(company).length > 200) ||
      String(message).length > 5000
    ) {
      return NextResponse.json(
        { error: 'One or more fields exceed the maximum length.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Save to database
    try {
      await prisma.contactSubmission.create({
        data: { name, email, company, message, interest, source },
      });

      return NextResponse.json(
        { message: 'Thank you! We will get back to you within 24 hours.' },
        { status: 200, headers: corsHeaders }
      );
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { message: 'Thank you! We will get back to you soon.' },
        { status: 200, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to submit form. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
