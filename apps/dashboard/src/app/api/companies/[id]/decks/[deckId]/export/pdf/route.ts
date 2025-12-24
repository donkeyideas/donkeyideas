import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST /api/companies/:id/decks/:deckId/export/pdf
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

    // Generate PDF (simplified implementation)
    // In production, you would use a library like Puppeteer or jsPDF
    const pdfContent = generatePDF(deck, company);
    
    // Convert Buffer to Uint8Array for NextResponse
    const pdfArray = new Uint8Array(pdfContent);
    
    return new NextResponse(pdfArray, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${company.name}-pitch-deck.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Failed to export PDF:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to export PDF' } },
      { status: 500 }
    );
  }
}

// Simplified PDF generation (would use proper PDF library in production)
function generatePDF(deck: any, company: any): Buffer {
  // This is a placeholder - in production you would use:
  // - Puppeteer to render HTML to PDF
  // - jsPDF for client-side PDF generation
  // - PDFKit for server-side PDF generation
  
  const pdfContent = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 24 Tf
100 700 Td
(${company.name} - Pitch Deck) Tj
0 -50 Td
/F1 12 Tf
(Generated from Donkey Ideas AI Deck Builder) Tj
0 -30 Td
(Slides: ${deck.content.length}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000110 00000 n 
0000000271 00000 n 
0000000524 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
593
%%EOF
`;

  return Buffer.from(pdfContent, 'utf-8');
}
