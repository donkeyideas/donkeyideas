import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const apiKeysSchema = z.object({
  deepSeekApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  googleApiKey: z.string().optional(),
  stripeApiKey: z.string().optional(),
  sendgridApiKey: z.string().optional(),
  twilioApiKey: z.string().optional(),
  twilioApiSecret: z.string().optional(),
});

// GET /api/settings/api-keys - Get user's API keys
export async function GET(request: NextRequest) {
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
    
    // Try to get API keys from user settings or return empty defaults
    try {
      // Check if userSettings model exists in Prisma client
      if (!prisma.userSettings) {
        // Return empty defaults if model doesn't exist
        return NextResponse.json({
          deepSeekApiKey: '',
          openaiApiKey: '',
          anthropicApiKey: '',
          googleApiKey: '',
          stripeApiKey: '',
          sendgridApiKey: '',
          twilioApiKey: '',
          twilioApiSecret: '',
        });
      }

      const apiKeys = await prisma.userSettings.findUnique({
        where: { userId: user.id },
        select: {
          deepSeekApiKey: true,
          openaiApiKey: true,
          anthropicApiKey: true,
          googleApiKey: true,
          stripeApiKey: true,
          sendgridApiKey: true,
          twilioApiKey: true,
          twilioApiSecret: true,
        },
      });
      
      // If no settings exist, return empty object
      if (!apiKeys) {
        return NextResponse.json({
          deepSeekApiKey: '',
          openaiApiKey: '',
          anthropicApiKey: '',
          googleApiKey: '',
          stripeApiKey: '',
          sendgridApiKey: '',
          twilioApiKey: '',
          twilioApiSecret: '',
        });
      }
      
      return NextResponse.json(apiKeys);
    } catch (dbError: any) {
      // If table doesn't exist yet, return empty defaults
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('relation') || dbError.message?.includes('table')) {
        console.warn('UserSettings table does not exist yet. Please run database migration.');
        return NextResponse.json({
          deepSeekApiKey: '',
          openaiApiKey: '',
          anthropicApiKey: '',
          googleApiKey: '',
          stripeApiKey: '',
          sendgridApiKey: '',
          twilioApiKey: '',
          twilioApiSecret: '',
        });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error('Failed to get API keys:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to retrieve API keys' } },
      { status: 500 }
    );
  }
}

// POST /api/settings/api-keys - Save user's API keys
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
    
    const body = await request.json();
    const validatedData = apiKeysSchema.parse(body);
    
    // Upsert user settings
    try {
      // Check if userSettings model exists in Prisma client
      if (!prisma.userSettings) {
        return NextResponse.json(
          { 
            error: { 
              message: 'Prisma client needs to be regenerated. Please stop the dev server, run "npx prisma generate" in packages/database, then restart the server.' 
            } 
          },
          { status: 500 }
        );
      }

      await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: validatedData,
        create: {
          userId: user.id,
          ...validatedData,
        },
      });
      
      return NextResponse.json({ success: true });
    } catch (dbError: any) {
      // If table doesn't exist yet, return helpful error
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('relation') || dbError.message?.includes('table')) {
        return NextResponse.json(
          { 
            error: { 
              message: 'Database table does not exist. Please run the SQL script in packages/database/create_user_settings_table.sql or run: npx prisma migrate dev' 
            } 
          },
          { status: 500 }
        );
      }
      throw dbError;
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Invalid input', details: error.errors } },
        { status: 400 }
      );
    }
    
    console.error('Failed to save API keys:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to save API keys' } },
      { status: 500 }
    );
  }
}

