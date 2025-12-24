import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST /api/companies/:id/decks/:deckId/export/pptx
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; deckId: string } }
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

    // Verify deck ownership
    const deck = await prisma.deck.findFirst({
      where: {
        id: params.deckId,
        companyId: params.id,
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: { message: 'Deck not found' } },
        { status: 404 }
      );
    }

    // Generate PPTX (simplified implementation)
    // In production, you would use a library like PptxGenJS or officegen
    const pptxContent = generatePPTX(deck, company);
    
    // Convert Buffer to Uint8Array for NextResponse
    const pptxArray = new Uint8Array(pptxContent);
    
    return new NextResponse(pptxArray, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${company.name}-pitch-deck.pptx"`,
      },
    });
  } catch (error: any) {
    console.error('Failed to export PPTX:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to export PPTX' } },
      { status: 500 }
    );
  }
}

// Simplified PPTX generation (would use proper PPTX library in production)
function generatePPTX(deck: any, company: any): Buffer {
  // This is a placeholder - in production you would use:
  // - PptxGenJS for creating PowerPoint presentations
  // - officegen for generating Office documents
  // - node-pptx for PowerPoint generation
  
  // For now, return a simple text file with deck content
  const textContent = `${company.name} - Pitch Deck
Generated from Donkey Ideas AI Deck Builder

${deck.content.map((slide: any, index: number) => `
Slide ${slide.number}: ${slide.title}
${slide.content.map((item: string) => `• ${item}`).join('\n')}
`).join('\n')}

Total Slides: ${deck.content.length}
Generated: ${new Date().toLocaleDateString()}
`;

  // In production, this would be actual PPTX binary data
  return Buffer.from(textContent, 'utf-8');
}
