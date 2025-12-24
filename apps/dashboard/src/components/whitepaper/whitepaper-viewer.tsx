'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@donkey-ideas/ui';

interface WhitepaperData {
  version?: string;
  publishedDate?: string | null;
  classification?: string;
  executiveSummary?: string | null;
  companyOverview?: string | null;
  mission?: string | null;
  vision?: string | null;
  legalName?: string | null;
  founded?: string | null;
  headquarters?: string | null;
  website?: string | null;
  problemStatement?: string | null;
  marketOpportunity?: string | null;
  solution?: string | null;
  productDescription?: string | null;
  architecture?: string | null;
  technicalDetails?: string | null;
  businessModel?: string | null;
  pricingStrategy?: string | null;
  goToMarket?: string | null;
  targetMarket?: string | null;
  marketSize?: string | null;
  marketTrends?: string | null;
  competitiveAnalysis?: string | null;
  competitiveAdvantage?: string | null;
  teamDescription?: string | null;
  financialProjections?: string | null;
  useOfFunds?: string | null;
  tokenomics?: string | null;
  economics?: string | null;
  legalConsiderations?: string | null;
  regulatoryCompliance?: string | null;
  riskFactors?: string | null;
  disclaimers?: string | null;
  // Image fields for each section
  executiveSummaryImage?: string | null;
  executiveSummaryImagePosition?: 'left' | 'right' | 'center';
  companyOverviewImage?: string | null;
  companyOverviewImagePosition?: 'left' | 'right' | 'center';
  problemSolutionImage?: string | null;
  problemSolutionImagePosition?: 'left' | 'right' | 'center';
  technologyImage?: string | null;
  technologyImagePosition?: 'left' | 'right' | 'center';
  businessModelImage?: string | null;
  businessModelImagePosition?: 'left' | 'right' | 'center';
  marketAnalysisImage?: string | null;
  marketAnalysisImagePosition?: 'left' | 'right' | 'center';
  competitiveImage?: string | null;
  competitiveImagePosition?: 'left' | 'right' | 'center';
  teamImage?: string | null;
  teamImagePosition?: 'left' | 'right' | 'center';
  roadmapImage?: string | null;
  roadmapImagePosition?: 'left' | 'right' | 'center';
  financialsImage?: string | null;
  financialsImagePosition?: 'left' | 'right' | 'center';
  tokenomicsImage?: string | null;
  tokenomicsImagePosition?: 'left' | 'right' | 'center';
  legalImage?: string | null;
  legalImagePosition?: 'left' | 'right' | 'center';
  conclusion?: string | null;
  conclusionImage?: string | null;
  conclusionImagePosition?: 'left' | 'right' | 'center';
  [key: string]: any;
}

interface WhitepaperViewerProps {
  isOpen: boolean;
  onClose: () => void;
  whitepaper: WhitepaperData | null;
  companyName: string;
  companyLogo?: string | null;
}

interface Page {
  title: string;
  content: string;
  section?: string;
}

// Helper function to render content with image based on position
function renderContentWithImage(
  content: string,
  imageUrl?: string | null,
  imagePosition: 'left' | 'right' | 'center' = 'center'
): string {
  if (!imageUrl || imageUrl.trim() === '') return content;

  // Ensure the image URL is properly formatted
  const sanitizedImageUrl = imageUrl.trim();
  
  if (imagePosition === 'left') {
    // Float image left, text wraps around and continues under
    const imageHtml = `<img src="${sanitizedImageUrl.replace(/"/g, '&quot;')}" alt="Section image" style="float: left; max-width: 400px; max-height: 300px; width: auto; height: auto; object-fit: contain; margin: 0 20px 20px 0; border-radius: 8px; display: block;" />`;
    return `
      <div style="overflow: hidden;">
        ${imageHtml}
        ${content}
      </div>
    `;
  } else if (imagePosition === 'right') {
    // Float image right, text wraps around and continues under
    const imageHtml = `<img src="${sanitizedImageUrl.replace(/"/g, '&quot;')}" alt="Section image" style="float: right; max-width: 400px; max-height: 300px; width: auto; height: auto; object-fit: contain; margin: 0 0 20px 20px; border-radius: 8px; display: block;" />`;
    return `
      <div style="overflow: hidden;">
        ${imageHtml}
        ${content}
      </div>
    `;
  } else {
    // center - image above text
    const imageHtml = `<img src="${sanitizedImageUrl.replace(/"/g, '&quot;')}" alt="Section image" style="max-width: 400px; max-height: 300px; object-fit: contain; margin: 0 auto 30px auto; border-radius: 8px; display: block;" />`;
    return `
      <div style="text-align: center; margin: 20px 0 30px 0;">${imageHtml}</div>
      ${content}
    `;
  }
}

export function WhitepaperViewer({ isOpen, onClose, whitepaper, companyName, companyLogo }: WhitepaperViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // Convert whitepaper data into formatted pages
  const pages = useMemo(() => {
    if (!whitepaper) return [];

    const pageList: Page[] = [];

    // Cover Page
    pageList.push({
      title: companyName,
      section: 'WHITEPAPER',
      content: `
        <div style="text-align: center; padding: 60px 40px;">
          ${companyLogo ? `
            <div style="margin-bottom: 40px;">
              <img src="${companyLogo}" alt="${companyName} Logo" style="max-width: 200px; max-height: 200px; object-fit: contain; margin: 0 auto;" />
            </div>
          ` : ''}
          <h1 style="font-size: 48px; font-weight: bold; margin-bottom: 20px; color: #fff;">${companyName}</h1>
          <h2 style="font-size: 24px; font-weight: 300; margin-bottom: 40px; color: #888; letter-spacing: 4px;">WHITEPAPER</h2>
          <div style="margin-top: 60px; color: #666; font-size: 14px;">
            <p>Version ${whitepaper.version || '1.0'}</p>
            ${whitepaper.publishedDate ? `<p>Published: ${new Date(whitepaper.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
            <p>Classification: ${whitepaper.classification || 'Public'}</p>
          </div>
        </div>
      `,
    });

    // Table of Contents
    const sections: { title: string; hasContent: boolean }[] = [
      { title: 'Executive Summary', hasContent: !!whitepaper.executiveSummary },
      { title: 'Company Overview', hasContent: !!(whitepaper.companyOverview || whitepaper.mission || whitepaper.vision) },
      { title: 'Problem & Solution', hasContent: !!(whitepaper.problemStatement || whitepaper.solution) },
      { title: 'Technology & Architecture', hasContent: !!(whitepaper.architecture || whitepaper.technicalDetails) },
      { title: 'Business Model', hasContent: !!(whitepaper.businessModel || whitepaper.pricingStrategy) },
      { title: 'Market Analysis', hasContent: !!(whitepaper.targetMarket || whitepaper.marketSize) },
      { title: 'Competitive Landscape', hasContent: !!(whitepaper.competitiveAnalysis || whitepaper.competitiveAdvantage) },
      { title: 'Team & Advisors', hasContent: !!whitepaper.teamDescription },
      { title: 'Financial Projections', hasContent: !!(whitepaper.financialProjections || whitepaper.useOfFunds) },
      { title: 'Tokenomics / Economics', hasContent: !!(whitepaper.tokenomics || whitepaper.economics) },
      { title: 'Legal & Regulatory', hasContent: !!(whitepaper.legalConsiderations || whitepaper.riskFactors) },
      { title: 'Conclusion', hasContent: !!(whitepaper.conclusion || whitepaper.conclusionImage) },
    ];

    const tocContent = sections
      .filter(s => s.hasContent)
      .map((s, i) => `<div style="margin-bottom: 12px; font-size: 16px;"><span style="color: #666; margin-right: 20px;">${i + 1}.</span>${s.title}</div>`)
      .join('');

    if (tocContent) {
      pageList.push({
        title: 'Table of Contents',
        content: `
          <div style="padding: 40px;">
            <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px;">Table of Contents</h2>
            ${tocContent}
          </div>
        `,
      });
    }

    // Executive Summary
    if (whitepaper.executiveSummary) {
      const summaryContent = `<div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.executiveSummary}</div>`;
      pageList.push({
        title: 'Executive Summary',
        content: `
          <div style="padding: 40px;">
            <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">Executive Summary</h2>
            ${renderContentWithImage(
              summaryContent,
              whitepaper.executiveSummaryImage,
              whitepaper.executiveSummaryImagePosition || 'center'
            )}
          </div>
        `,
      });
    }

    // Company Overview
    if (whitepaper.companyOverview || whitepaper.mission || whitepaper.vision || whitepaper.legalName) {
      let companyContent = '';
      if (whitepaper.companyOverview) {
        companyContent += `<div style="margin-bottom: 30px; line-height: 1.8; font-size: 16px; color: #ddd;">${whitepaper.companyOverview}</div>`;
      }
      if (whitepaper.legalName || whitepaper.founded || whitepaper.headquarters || whitepaper.website) {
        companyContent += '<div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #333;">';
        if (whitepaper.legalName) companyContent += `<p style="margin-bottom: 8px;"><strong>Legal Name:</strong> ${whitepaper.legalName}</p>`;
        if (whitepaper.founded) companyContent += `<p style="margin-bottom: 8px;"><strong>Founded:</strong> ${whitepaper.founded}</p>`;
        if (whitepaper.headquarters) companyContent += `<p style="margin-bottom: 8px;"><strong>Headquarters:</strong> ${whitepaper.headquarters}</p>`;
        if (whitepaper.website) companyContent += `<p style="margin-bottom: 8px;"><strong>Website:</strong> ${whitepaper.website}</p>`;
        companyContent += '</div>';
      }
      if (whitepaper.mission) {
        companyContent += `<div style="margin-top: 30px; padding: 20px; background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6;"><h3 style="font-size: 18px; margin-bottom: 10px; color: #3b82f6;">Mission</h3><p style="line-height: 1.8; color: #ddd;">${whitepaper.mission}</p></div>`;
      }
      if (whitepaper.vision) {
        companyContent += `<div style="margin-top: 20px; padding: 20px; background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981;"><h3 style="font-size: 18px; margin-bottom: 10px; color: #10b981;">Vision</h3><p style="line-height: 1.8; color: #ddd;">${whitepaper.vision}</p></div>`;
      }

      const overviewContent = companyContent;
      pageList.push({
        title: 'Company Overview',
        content: `
          <div style="padding: 40px;">
            <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">Company Overview</h2>
            ${renderContentWithImage(
              overviewContent,
              whitepaper.companyOverviewImage,
              whitepaper.companyOverviewImagePosition || 'center'
            )}
          </div>
        `,
      });
    }

    // Problem & Solution
    if (whitepaper.problemStatement || whitepaper.solution || whitepaper.marketOpportunity) {
      let problemContent = '';
      if (whitepaper.problemStatement) {
        problemContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Problem Statement</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.problemStatement}</div></div>`;
      }
      if (whitepaper.marketOpportunity) {
        problemContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Market Opportunity</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.marketOpportunity}</div></div>`;
      }
      if (whitepaper.solution) {
        problemContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Solution</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.solution}</div></div>`;
      }
      if (whitepaper.productDescription) {
        problemContent += `<div><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Product Description</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.productDescription}</div></div>`;
      }

      pageList.push({
        title: 'Problem & Solution',
        content: `
          <div style="padding: 40px;">
            <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">Problem & Solution</h2>
            ${renderContentWithImage(
              problemContent,
              whitepaper.problemSolutionImage,
              whitepaper.problemSolutionImagePosition || 'center'
            )}
          </div>
        `,
      });
    }

    // Technology
    if (whitepaper.architecture || whitepaper.technicalDetails) {
      let techContent = '';
      if (whitepaper.architecture) {
        techContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Architecture</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.architecture}</div></div>`;
      }
      if (whitepaper.technicalDetails) {
        techContent += `<div><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Technical Details</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.technicalDetails}</div></div>`;
      }

      pageList.push({
        title: 'Technology & Architecture',
        content: `
          <div style="padding: 40px;">
            <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">Technology & Architecture</h2>
            ${renderContentWithImage(
              techContent,
              whitepaper.technologyImage,
              whitepaper.technologyImagePosition || 'center'
            )}
          </div>
        `,
      });
    }

    // Business Model
    if (whitepaper.businessModel || whitepaper.pricingStrategy || whitepaper.goToMarket) {
      let businessContent = '';
      if (whitepaper.businessModel) {
        businessContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Business Model</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.businessModel}</div></div>`;
      }
      if (whitepaper.pricingStrategy) {
        businessContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Pricing Strategy</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.pricingStrategy}</div></div>`;
      }
      if (whitepaper.goToMarket) {
        businessContent += `<div><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Go-to-Market Strategy</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.goToMarket}</div></div>`;
      }

      pageList.push({
        title: 'Business Model',
        content: `
          <div style="padding: 40px;">
            <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">Business Model</h2>
            ${renderContentWithImage(
              businessContent,
              whitepaper.businessModelImage,
              whitepaper.businessModelImagePosition || 'center'
            )}
          </div>
        `,
      });
    }

    // Market Analysis
    if (whitepaper.targetMarket || whitepaper.marketSize || whitepaper.marketTrends) {
      let marketContent = '';
      if (whitepaper.targetMarket) {
        marketContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Target Market</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.targetMarket}</div></div>`;
      }
      if (whitepaper.marketSize) {
        marketContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Market Size</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.marketSize}</div></div>`;
      }
      if (whitepaper.marketTrends) {
        marketContent += `<div><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Market Trends</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.marketTrends}</div></div>`;
      }

      pageList.push({
        title: 'Market Analysis',
        content: `
          <div style="padding: 40px;">
            <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">Market Analysis</h2>
            ${renderContentWithImage(
              marketContent,
              whitepaper.marketAnalysisImage,
              whitepaper.marketAnalysisImagePosition || 'center'
            )}
          </div>
        `,
      });
    }

    // Competitive Landscape
    if (whitepaper.competitiveAnalysis || whitepaper.competitiveAdvantage) {
      let competitiveContent = '';
      if (whitepaper.competitiveAnalysis) {
        competitiveContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Competitive Analysis</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.competitiveAnalysis}</div></div>`;
      }
      if (whitepaper.competitiveAdvantage) {
        competitiveContent += `<div><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Competitive Advantage</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.competitiveAdvantage}</div></div>`;
      }

      pageList.push({
        title: 'Competitive Landscape',
        content: `
          <div style="padding: 40px;">
            <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">Competitive Landscape</h2>
            ${renderContentWithImage(
              competitiveContent,
              whitepaper.competitiveImage,
              whitepaper.competitiveImagePosition || 'center'
            )}
          </div>
        `,
      });
    }

    // Team
    if (whitepaper.teamDescription) {
      const teamContent = `<div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.teamDescription}</div>`;
      pageList.push({
        title: 'Team & Advisors',
        content: `
          <div style="padding: 40px;">
            <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">Team & Advisors</h2>
            ${renderContentWithImage(
              teamContent,
              whitepaper.teamImage,
              whitepaper.teamImagePosition || 'center'
            )}
          </div>
        `,
      });
    }

    // Financials
    if (whitepaper.financialProjections || whitepaper.useOfFunds) {
      let financialContent = '';
      if (whitepaper.financialProjections) {
        financialContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Financial Projections</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.financialProjections}</div></div>`;
      }
      if (whitepaper.useOfFunds) {
        financialContent += `<div><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Use of Funds</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.useOfFunds}</div></div>`;
      }

      pageList.push({
        title: 'Financial Projections',
        content: `
          <div style="padding: 40px;">
            <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">Financial Projections</h2>
            ${renderContentWithImage(
              financialContent,
              whitepaper.financialsImage,
              whitepaper.financialsImagePosition || 'center'
            )}
          </div>
        `,
      });
    }

    // Tokenomics
    if (whitepaper.tokenomics || whitepaper.economics) {
      let tokenContent = '';
      if (whitepaper.tokenomics) {
        tokenContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Tokenomics</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.tokenomics}</div></div>`;
      }
      if (whitepaper.economics) {
        tokenContent += `<div><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Economics Model</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.economics}</div></div>`;
      }

      pageList.push({
        title: 'Tokenomics / Economics',
        content: `
          <div style="padding: 40px;">
            <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">Tokenomics / Economics</h2>
            ${renderContentWithImage(
              tokenContent,
              whitepaper.tokenomicsImage,
              whitepaper.tokenomicsImagePosition || 'center'
            )}
          </div>
        `,
      });
    }

    // Legal & Regulatory
    if (whitepaper.legalConsiderations || whitepaper.regulatoryCompliance || whitepaper.riskFactors || whitepaper.disclaimers) {
      let legalContent = '';
      if (whitepaper.legalConsiderations) {
        legalContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Legal Considerations</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.legalConsiderations}</div></div>`;
      }
      if (whitepaper.regulatoryCompliance) {
        legalContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Regulatory Compliance</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.regulatoryCompliance}</div></div>`;
      }
      if (whitepaper.riskFactors) {
        legalContent += `<div style="margin-bottom: 30px;"><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Risk Factors</h3><div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.riskFactors}</div></div>`;
      }
      if (whitepaper.disclaimers) {
        legalContent += `<div><h3 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Disclaimers</h3><div style="line-height: 1.8; font-size: 14px; color: #999; white-space: pre-wrap;">${whitepaper.disclaimers}</div></div>`;
      }

        pageList.push({
          title: 'Legal & Regulatory',
          content: `
            <div style="padding: 40px;">
              <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">Legal & Regulatory</h2>
              ${renderContentWithImage(
                legalContent,
                whitepaper.legalImage,
                whitepaper.legalImagePosition || 'center'
              )}
            </div>
          `,
        });
      }

      // Conclusion - always show if conclusion field exists (even if empty, to allow for image-only conclusions)
      if (whitepaper.conclusion !== undefined && whitepaper.conclusion !== null) {
        const conclusionContent = whitepaper.conclusion.trim() 
          ? `<div style="line-height: 1.8; font-size: 16px; color: #ddd; white-space: pre-wrap;">${whitepaper.conclusion}</div>`
          : '';
        
        // Show conclusion page if there's content or an image
        if (conclusionContent || whitepaper.conclusionImage) {
          pageList.push({
            title: 'Conclusion',
            content: `
              <div style="padding: 40px;">
                <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">Conclusion</h2>
                ${renderContentWithImage(
                  conclusionContent || '<div style="line-height: 1.8; font-size: 16px; color: #ddd;"></div>',
                  whitepaper.conclusionImage,
                  whitepaper.conclusionImagePosition || 'center'
                )}
              </div>
            `,
          });
        }
      }

      return pageList;
  }, [whitepaper, companyName, companyLogo]);

  const handlePrevious = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentPage((prev) => (prev < pages.length - 1 ? prev + 1 : prev));
  };

  // Keyboard navigation - must be called before any conditional returns
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentPage((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        setCurrentPage((prev) => (prev < pages.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pages.length, onClose]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  const currentPageData = pages[currentPage] || pages[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div 
        className="bg-[#0F0F0F] border border-white/20 rounded-lg w-full max-w-6xl h-[90vh] m-4 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">Whitepaper Viewer</h2>
            <span className="text-sm text-white/60">
              Page {currentPage + 1} of {pages.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => {
                alert('PDF Export temporarily disabled to prevent infinite loops. Will be fixed soon.');
              }}
              className="text-sm"
            >
              Export PDF
            </Button>
            <Button variant="secondary" onClick={onClose} className="text-sm">
              Close
            </Button>
          </div>
        </div>

        {/* Book Content */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden bg-gradient-to-b from-[#0A0A0A] to-[#1A1A1A]">
          <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] via-[#0F0F0F] to-[#1A1A1A] rounded-lg shadow-2xl border border-white/20 p-12 overflow-y-auto relative">
            {/* Page number indicator */}
            <div className="absolute top-4 right-4 text-white/40 text-sm font-mono">
              {currentPage + 1} / {pages.length}
            </div>
            
            <div 
              className="max-w-4xl mx-auto"
              dangerouslySetInnerHTML={{ __html: currentPageData?.content || '<p>No content available</p>' }}
              style={{
                color: '#fff',
                fontFamily: 'Georgia, "Times New Roman", serif',
                lineHeight: '1.8',
              }}
            />
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-[#0A0A0A]">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentPage === 0}
            className="flex items-center gap-2"
          >
            <span>←</span> Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {pages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentPage
                    ? 'bg-blue-500 w-8'
                    : 'bg-white/20 hover:bg-white/40'
                }`}
                title={`Go to page ${index + 1}`}
              />
            ))}
          </div>

          <Button
            variant="secondary"
            onClick={handleNext}
            disabled={currentPage === pages.length - 1}
            className="flex items-center gap-2"
          >
            Next <span>→</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

