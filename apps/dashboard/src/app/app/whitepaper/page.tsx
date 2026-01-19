'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';
import { NotificationModal } from '@/components/ui/notification-modal';
import { WhitepaperViewer } from '@/components/whitepaper/whitepaper-viewer';
import { SectionImageUpload } from '@/components/whitepaper/section-image-upload';

// SectionCard component moved outside to prevent recreation on every render
const SectionCard = ({ 
  id, 
  title, 
  description, 
  children,
  isExpanded,
  onToggle
}: { 
  id: string; 
  title: string; 
  description?: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && (
              <p className="text-sm text-white/60 mt-1">{description}</p>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={onToggle}
            className="text-sm"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && <CardContent>{children}</CardContent>}
    </Card>
  );
};

interface WhitepaperData {
  id?: string;
  version?: string;
  publishedDate?: string | null;
  classification?: string;
  executiveSummary?: string | null;
  companyOverview?: string | null;
  mission?: string | null;
  vision?: string | null;
  coreValues?: any;
  legalName?: string | null;
  founded?: string | null;
  headquarters?: string | null;
  website?: string | null;
  problemStatement?: string | null;
  marketOpportunity?: string | null;
  solution?: string | null;
  productDescription?: string | null;
  technologyStack?: any;
  architecture?: string | null;
  technicalDetails?: string | null;
  businessModel?: string | null;
  revenueStreams?: any;
  pricingStrategy?: string | null;
  goToMarket?: string | null;
  targetMarket?: string | null;
  marketSize?: string | null;
  marketTrends?: string | null;
  customerSegments?: any;
  competitiveAnalysis?: string | null;
  competitors?: any;
  competitiveAdvantage?: string | null;
  teamDescription?: string | null;
  keyTeamMembers?: any;
  advisors?: any;
  partners?: any;
  roadmap?: any;
  milestones?: any;
  financialProjections?: string | null;
  fundingHistory?: any;
  useOfFunds?: string | null;
  financialHighlights?: any;
  tokenomics?: string | null;
  tokenDistribution?: any;
  economics?: string | null;
  useCases?: any;
  caseStudies?: any;
  legalConsiderations?: string | null;
  regulatoryCompliance?: string | null;
  riskFactors?: string | null;
  disclaimers?: string | null;
  appendices?: any;
  references?: any;
  published?: boolean;
  lastReviewed?: string | null;
  reviewedBy?: string | null;
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
}

export default function WhitepaperPage() {
  const { currentCompany, companies } = useAppStore();
  const [whitepaper, setWhitepaper] = useState<WhitepaperData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['executiveSummary']));
  const [formData, setFormData] = useState<WhitepaperData>({});
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      loadWhitepaper();
    }
  }, [currentCompany]);

  const loadWhitepaper = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const response = await api.get(`/companies/${currentCompany.id}/whitepaper`);
      const data = response.data.whitepaper || {};
      
      // Check localStorage for images (backup in case API doesn't return them)
      const imageFields = [
        'executiveSummaryImage', 'executiveSummaryImagePosition',
        'companyOverviewImage', 'companyOverviewImagePosition',
        'problemSolutionImage', 'problemSolutionImagePosition',
        'technologyImage', 'technologyImagePosition',
        'businessModelImage', 'businessModelImagePosition',
        'marketAnalysisImage', 'marketAnalysisImagePosition',
        'competitiveImage', 'competitiveImagePosition',
        'teamImage', 'teamImagePosition',
        'roadmapImage', 'roadmapImagePosition',
        'financialsImage', 'financialsImagePosition',
        'tokenomicsImage', 'tokenomicsImagePosition',
        'legalImage', 'legalImagePosition',
        'conclusionImage', 'conclusionImagePosition',
      ];
      
      // Restore images from localStorage if API doesn't have them
      // Priority: API data > localStorage > nothing
      const restoredImages: Partial<WhitepaperData> = {};
      imageFields.forEach(field => {
        const fieldKey = field as keyof WhitepaperData;
        const apiValue = data[fieldKey];
        
        // If API has a value (even if empty string), use it and update localStorage
        if (apiValue !== undefined && apiValue !== null && apiValue !== '') {
          localStorage.setItem(`whitepaper-${currentCompany.id}-${field}`, String(apiValue));
          restoredImages[fieldKey] = apiValue;
        } else {
          // API doesn't have it, check localStorage
          const stored = localStorage.getItem(`whitepaper-${currentCompany.id}-${field}`);
          if (stored && stored !== 'null' && stored !== '') {
            restoredImages[fieldKey] = stored;
          }
        }
      });
      
      // Merge: use API data, but restore images from localStorage if needed
      const mergedData = {
        ...data,
        ...restoredImages,
      };
      
      setWhitepaper(mergedData);
      setFormData(mergedData);
    } catch (error) {
      console.error('Failed to load whitepaper:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentCompany) return;

    setSaving(true);
    try {
      // Prepare data to save - ensure all image fields are included
      const dataToSave = { ...formData };
      
      // Verify images are in the payload
      const imageFieldsWithData = Object.keys(dataToSave).filter(key => 
        key.includes('Image') && dataToSave[key as keyof WhitepaperData] && 
        !key.includes('Position')
      );
      
      console.log('Saving whitepaper with images:', imageFieldsWithData);
      
      // Save all formData including images
      const response = await api.put(`/companies/${currentCompany.id}/whitepaper`, dataToSave);
      
      // The API response might not include image fields (they might be too large or not returned)
      // So we ALWAYS preserve the current formData which has the images
      const responseData = response.data?.whitepaper || {};
      
      // Merge: use response for non-image fields, but ALWAYS keep images from formData
      const mergedData = {
        ...responseData,
      };
      
      // Explicitly preserve ALL image fields from formData (they might not be in response)
      const imageFields = [
        'executiveSummaryImage', 'executiveSummaryImagePosition',
        'companyOverviewImage', 'companyOverviewImagePosition',
        'problemSolutionImage', 'problemSolutionImagePosition',
        'technologyImage', 'technologyImagePosition',
        'businessModelImage', 'businessModelImagePosition',
        'marketAnalysisImage', 'marketAnalysisImagePosition',
        'competitiveImage', 'competitiveImagePosition',
        'teamImage', 'teamImagePosition',
        'roadmapImage', 'roadmapImagePosition',
        'financialsImage', 'financialsImagePosition',
        'tokenomicsImage', 'tokenomicsImagePosition',
        'legalImage', 'legalImagePosition',
        'conclusionImage', 'conclusionImagePosition',
      ];
      
      // Always preserve image fields from formData
      imageFields.forEach(field => {
        const fieldKey = field as keyof WhitepaperData;
        if (formData[fieldKey] !== undefined) {
          mergedData[fieldKey] = formData[fieldKey];
          
          // Only save to localStorage if it's not an image or if it's small enough
          if (formData[fieldKey] && !field.includes('Image')) {
            // Non-image fields are safe to store
            try {
              localStorage.setItem(`whitepaper-${currentCompany.id}-${field}`, String(formData[fieldKey]));
            } catch (error) {
              console.warn(`Failed to store ${field} in localStorage:`, error);
            }
          } else if (formData[fieldKey] && field.includes('Image')) {
            // For images, only store if small enough
            try {
              const imageData = String(formData[fieldKey]);
              const estimatedSize = new Blob([imageData]).size;
              
              if (estimatedSize < 500 * 1024) { // Only store images smaller than 500KB
                localStorage.setItem(`whitepaper-${currentCompany.id}-${field}`, imageData);
              } else {
                console.log(`Skipping localStorage for large image ${field} (${Math.round(estimatedSize / 1024)}KB)`);
                // Remove any existing entry
                localStorage.removeItem(`whitepaper-${currentCompany.id}-${field}`);
              }
            } catch (error) {
              console.warn(`Failed to store image ${field} in localStorage:`, error);
              localStorage.removeItem(`whitepaper-${currentCompany.id}-${field}`);
            }
          } else if (!formData[fieldKey]) {
            // Remove empty fields
            localStorage.removeItem(`whitepaper-${currentCompany.id}-${field}`);
          }
        }
      });
      
      // Also preserve conclusion
      if (formData.conclusion !== undefined) {
        mergedData.conclusion = formData.conclusion;
      }
      
      // Update both states with merged data (images from formData are preserved)
      setWhitepaper(mergedData);
      setFormData(mergedData);
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'Whitepaper saved successfully!',
        type: 'success',
      });
    } catch (error: any) {
      console.error('Save error:', error);
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to save whitepaper',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(section)) {
        newExpanded.delete(section);
      } else {
        newExpanded.add(section);
      }
      return newExpanded;
    });
  }, []);

  // Helper function to get localStorage usage
  const getLocalStorageUsage = () => {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    return totalSize;
  };

  const updateField = (field: keyof WhitepaperData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // If this is an image field, handle storage carefully
      if (field.includes('Image') && !field.includes('Position') && currentCompany?.id) {
        try {
          if (value) {
            // Check if the value is too large for localStorage
            const storageKey = `whitepaper-${currentCompany.id}-${field}`;
            const estimatedSize = new Blob([value]).size;
            
            // Use much smaller limit - 1MB per image
            if (estimatedSize > 1 * 1024 * 1024) {
              console.warn(`Image ${field} is too large (${Math.round(estimatedSize / 1024 / 1024)}MB) for localStorage. Skipping local storage.`);
              // Remove any existing entry
              localStorage.removeItem(storageKey);
              
              // Don't show notification every time, just log
              console.info('Large image will be saved to database but not cached locally');
            } else {
              // Try to store with additional safety checks
              try {
                // Test if we can store this item
                localStorage.setItem(storageKey + '_test', 'test');
                localStorage.removeItem(storageKey + '_test');
                
                // If test passed, store the actual item
                localStorage.setItem(storageKey, value);
              } catch (testError) {
                console.warn('localStorage test failed, clearing space and retrying');
                
                // Clear ALL whitepaper localStorage data to free up maximum space
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.startsWith('whitepaper-')) {
                    keysToRemove.push(key);
                  }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
                console.log(`Cleared ${keysToRemove.length} localStorage entries to free up space`);
                
                // Try one more time after clearing
                try {
                  localStorage.setItem(storageKey, value);
                } catch (finalError) {
                  console.warn('Still cannot store in localStorage after clearing. Image too large.');
                }
              }
            }
          } else {
            localStorage.removeItem(`whitepaper-${currentCompany.id}-${field}`);
          }
        } catch (error) {
          console.warn(`Failed to store image in localStorage: ${error}. Skipping localStorage for this image.`);
          // Don't try to store in localStorage at all for this image
        }
      }
      
      return updated;
    });
  };

  if (!currentCompany) {
    return (
      <EmptyState
        icon="📄"
        title="No company selected"
        description="Select a company from the sidebar to create and edit whitepaper"
      />
    );
  }

  if (loading) {
    return <div className="text-white/60 [.light_&]:text-slate-600">Loading whitepaper...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">Whitepaper</h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            {currentCompany.name} — Comprehensive company whitepaper
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            onClick={() => setShowViewer(true)}
            disabled={!whitepaper || Object.keys(whitepaper).length === 0}
          >
            View Whitepaper
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Whitepaper'}
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Version</label>
              <input
                type="text"
                value={formData.version || '1.0'}
                onChange={(e) => updateField('version', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
                placeholder="1.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Classification</label>
              <select
                value={formData.classification || 'Public'}
                onChange={(e) => updateField('classification', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 [&>option]:bg-[#0F0F0F] [&>option]:text-white placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              >
                <option value="Public">Public</option>
                <option value="Private">Private</option>
                <option value="Confidential">Confidential</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Published Date</label>
              <input
                type="date"
                value={formData.publishedDate ? new Date(formData.publishedDate).toISOString().split('T')[0] : ''}
                onChange={(e) => updateField('publishedDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <SectionCard 
        id="executiveSummary" 
        title="Executive Summary"
        description="High-level overview of the company, solution, and value proposition"
        isExpanded={expandedSections.has('executiveSummary')}
        onToggle={() => toggleSection('executiveSummary')}
      >
        <div>
          <label className="block text-sm font-medium mb-2">Executive Summary</label>
          <textarea
            value={formData.executiveSummary || ''}
            onChange={(e) => updateField('executiveSummary', e.target.value)}
            rows={8}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
            placeholder="Provide a compelling executive summary that captures the essence of your company, the problem you solve, your solution, and key value propositions..."
          />
          <SectionImageUpload
            imageUrl={formData.executiveSummaryImage}
            imagePosition={formData.executiveSummaryImagePosition || 'center'}
            onImageChange={(url) => updateField('executiveSummaryImage', url)}
            onPositionChange={(position) => updateField('executiveSummaryImagePosition', position)}
            sectionName="Executive Summary"
          />
        </div>
      </SectionCard>

      {/* Company Overview */}
      <SectionCard 
        id="companyOverview" 
        title="Company Overview"
        description="Company background, mission, vision, and core values"
        isExpanded={expandedSections.has('companyOverview')}
        onToggle={() => toggleSection('companyOverview')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Company Overview</label>
            <textarea
              value={formData.companyOverview || ''}
              onChange={(e) => updateField('companyOverview', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Describe your company's background, history, and positioning..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Legal Name</label>
              <input
                type="text"
                value={formData.legalName || ''}
                onChange={(e) => updateField('legalName', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
                placeholder="Company Legal Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Founded</label>
              <input
                type="text"
                value={formData.founded || ''}
                onChange={(e) => updateField('founded', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
                placeholder="2023"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Headquarters</label>
              <input
                type="text"
                value={formData.headquarters || ''}
                onChange={(e) => updateField('headquarters', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
                placeholder="City, State/Country"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Website</label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => updateField('website', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Mission Statement</label>
            <textarea
              value={formData.mission || ''}
              onChange={(e) => updateField('mission', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Your company's mission statement..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Vision</label>
            <textarea
              value={formData.vision || ''}
              onChange={(e) => updateField('vision', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Your company's vision for the future..."
            />
          </div>
          <SectionImageUpload
            imageUrl={formData.companyOverviewImage}
            imagePosition={formData.companyOverviewImagePosition || 'center'}
            onImageChange={(url) => updateField('companyOverviewImage', url)}
            onPositionChange={(position) => updateField('companyOverviewImagePosition', position)}
            sectionName="Company Overview"
          />
        </div>
      </SectionCard>

      {/* Problem & Solution */}
      <SectionCard 
        id="problemSolution" 
        title="Problem & Solution"
        description="Define the problem you solve and your unique solution"
        isExpanded={expandedSections.has('problemSolution')}
        onToggle={() => toggleSection('problemSolution')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Problem Statement</label>
            <textarea
              value={formData.problemStatement || ''}
              onChange={(e) => updateField('problemStatement', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Clearly articulate the problem your company addresses. Who has this problem? How significant is it? What are the current pain points?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Market Opportunity</label>
            <textarea
              value={formData.marketOpportunity || ''}
              onChange={(e) => updateField('marketOpportunity', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Describe the market opportunity. Include market size (TAM, SAM, SOM), growth trends, and why now is the right time..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Solution</label>
            <textarea
              value={formData.solution || ''}
              onChange={(e) => updateField('solution', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Explain your solution. How does it solve the problem? What makes it unique? What are the key features and benefits?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Product Description</label>
            <textarea
              value={formData.productDescription || ''}
              onChange={(e) => updateField('productDescription', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Provide detailed product description, features, functionality, and how it works..."
            />
          </div>
          <SectionImageUpload
            imageUrl={formData.problemSolutionImage}
            imagePosition={formData.problemSolutionImagePosition || 'center'}
            onImageChange={(url) => updateField('problemSolutionImage', url)}
            onPositionChange={(position) => updateField('problemSolutionImagePosition', position)}
            sectionName="Problem & Solution"
          />
        </div>
      </SectionCard>

      {/* Technology */}
      <SectionCard 
        id="technology" 
        title="Technology & Architecture"
        description="Technical stack, architecture, and implementation details"
        isExpanded={expandedSections.has('technology')}
        onToggle={() => toggleSection('technology')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Architecture</label>
            <textarea
              value={formData.architecture || ''}
              onChange={(e) => updateField('architecture', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Describe your system architecture, infrastructure, scalability approach..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Technical Details</label>
            <textarea
              value={formData.technicalDetails || ''}
              onChange={(e) => updateField('technicalDetails', e.target.value)}
              rows={8}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Provide technical details, algorithms, protocols, security measures, performance metrics..."
            />
          </div>
          <SectionImageUpload
            imageUrl={formData.technologyImage}
            imagePosition={formData.technologyImagePosition || 'center'}
            onImageChange={(url) => updateField('technologyImage', url)}
            onPositionChange={(position) => updateField('technologyImagePosition', position)}
            sectionName="Technology & Architecture"
          />
        </div>
      </SectionCard>

      {/* Business Model */}
      <SectionCard 
        id="businessModel" 
        title="Business Model"
        description="Revenue streams, pricing, and go-to-market strategy"
        isExpanded={expandedSections.has('businessModel')}
        onToggle={() => toggleSection('businessModel')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Business Model</label>
            <textarea
              value={formData.businessModel || ''}
              onChange={(e) => updateField('businessModel', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Explain your business model. How do you make money? What are your revenue streams?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Pricing Strategy</label>
            <textarea
              value={formData.pricingStrategy || ''}
              onChange={(e) => updateField('pricingStrategy', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Describe your pricing strategy, pricing tiers, and value proposition at each tier..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Go-to-Market Strategy</label>
            <textarea
              value={formData.goToMarket || ''}
              onChange={(e) => updateField('goToMarket', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Explain your go-to-market strategy, customer acquisition channels, sales process..."
            />
          </div>
          <SectionImageUpload
            imageUrl={formData.businessModelImage}
            imagePosition={formData.businessModelImagePosition || 'center'}
            onImageChange={(url) => updateField('businessModelImage', url)}
            onPositionChange={(position) => updateField('businessModelImagePosition', position)}
            sectionName="Business Model"
          />
        </div>
      </SectionCard>

      {/* Market Analysis */}
      <SectionCard 
        id="marketAnalysis" 
        title="Market Analysis"
        description="Target market, market size, trends, and customer segments"
        isExpanded={expandedSections.has('marketAnalysis')}
        onToggle={() => toggleSection('marketAnalysis')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Target Market</label>
            <textarea
              value={formData.targetMarket || ''}
              onChange={(e) => updateField('targetMarket', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Define your target market, ideal customer profile, and market segments..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Market Size</label>
            <textarea
              value={formData.marketSize || ''}
              onChange={(e) => updateField('marketSize', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Include TAM (Total Addressable Market), SAM (Serviceable Addressable Market), SOM (Serviceable Obtainable Market) with numbers..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Market Trends</label>
            <textarea
              value={formData.marketTrends || ''}
              onChange={(e) => updateField('marketTrends', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Describe relevant market trends, industry dynamics, and why now is the right time..."
            />
          </div>
          <SectionImageUpload
            imageUrl={formData.marketAnalysisImage}
            imagePosition={formData.marketAnalysisImagePosition || 'center'}
            onImageChange={(url) => updateField('marketAnalysisImage', url)}
            onPositionChange={(position) => updateField('marketAnalysisImagePosition', position)}
            sectionName="Market Analysis"
          />
        </div>
      </SectionCard>

      {/* Competitive Landscape */}
      <SectionCard 
        id="competitive" 
        title="Competitive Landscape"
        description="Competitive analysis and competitive advantages"
        isExpanded={expandedSections.has('competitive')}
        onToggle={() => toggleSection('competitive')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Competitive Analysis</label>
            <textarea
              value={formData.competitiveAnalysis || ''}
              onChange={(e) => updateField('competitiveAnalysis', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Analyze your competitors, their strengths and weaknesses, market positioning..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Competitive Advantage</label>
            <textarea
              value={formData.competitiveAdvantage || ''}
              onChange={(e) => updateField('competitiveAdvantage', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Explain your competitive advantages, moats, unique differentiators, and why you'll win..."
            />
          </div>
          <SectionImageUpload
            imageUrl={formData.competitiveImage}
            imagePosition={formData.competitiveImagePosition || 'center'}
            onImageChange={(url) => updateField('competitiveImage', url)}
            onPositionChange={(position) => updateField('competitiveImagePosition', position)}
            sectionName="Competitive Landscape"
          />
        </div>
      </SectionCard>

      {/* Team & Advisors */}
      <SectionCard 
        id="team" 
        title="Team & Advisors"
        description="Team description, key members, advisors, and partners"
        isExpanded={expandedSections.has('team')}
        onToggle={() => toggleSection('team')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Team Description</label>
            <textarea
              value={formData.teamDescription || ''}
              onChange={(e) => updateField('teamDescription', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Describe your team, culture, and why your team is uniquely qualified to execute..."
            />
          </div>
          <SectionImageUpload
            imageUrl={formData.teamImage}
            imagePosition={formData.teamImagePosition || 'center'}
            onImageChange={(url) => updateField('teamImage', url)}
            onPositionChange={(position) => updateField('teamImagePosition', position)}
            sectionName="Team & Advisors"
          />
        </div>
      </SectionCard>

      {/* Roadmap & Milestones */}
      <SectionCard 
        id="roadmap" 
        title="Roadmap & Milestones"
        description="Product roadmap and key milestones"
        isExpanded={expandedSections.has('roadmap')}
        onToggle={() => toggleSection('roadmap')}
      >
        <div className="space-y-6">
          {/* Roadmap Items List */}
          <div>
            <label className="block text-sm font-medium mb-3">Roadmap Items</label>
            {formData.roadmap && Array.isArray(formData.roadmap) && formData.roadmap.length > 0 ? (
              <div className="space-y-3">
                {formData.roadmap.map((item: any, index: number) => (
                  <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-md">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-white mb-1">{item.quarter || item.period || `Item ${index + 1}`}</div>
                        {item.milestones && Array.isArray(item.milestones) && item.milestones.length > 0 && (
                          <ul className="list-disc list-inside text-white/80 text-sm space-y-1 ml-2">
                            {item.milestones.map((milestone: string, mIndex: number) => (
                              <li key={mIndex}>{milestone}</li>
                            ))}
                          </ul>
                        )}
                        {item.description && (
                          <p className="text-white/60 text-sm mt-2">{item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const newRoadmap = [...(formData.roadmap || [])];
                          newRoadmap.splice(index, 1);
                          updateField('roadmap', newRoadmap.length > 0 ? newRoadmap : null);
                        }}
                        className="text-red-400 hover:text-red-300 text-sm ml-4"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-sm italic">No roadmap items yet. Add one below.</p>
            )}
          </div>

          {/* Add New Roadmap Item Form */}
          <div className="border-t border-white/10 pt-4">
            <label className="block text-sm font-medium mb-3">Add Roadmap Item</label>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/60 mb-1">Quarter/Period</label>
                <input
                  type="text"
                  id="new-roadmap-quarter"
                  placeholder="e.g., Q1 2024, Q2 2024, or H1 2024"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  id="new-roadmap-description"
                  placeholder="Brief description of this period"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Milestones (one per line)</label>
                <textarea
                  id="new-roadmap-milestones"
                  rows={4}
                  placeholder="Launch MVP&#10;First 100 users&#10;Reach $10K MRR"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
                />
                <p className="text-xs text-white/40 mt-1">Enter each milestone on a new line</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  const quarterInput = document.getElementById('new-roadmap-quarter') as HTMLInputElement;
                  const descriptionInput = document.getElementById('new-roadmap-description') as HTMLInputElement;
                  const milestonesInput = document.getElementById('new-roadmap-milestones') as HTMLTextAreaElement;
                  
                  const quarter = quarterInput?.value.trim();
                  const description = descriptionInput?.value.trim();
                  const milestonesText = milestonesInput?.value.trim();
                  
                  if (!quarter) {
                    setNotification({
                      isOpen: true,
                      title: 'Error',
                      message: 'Please enter a quarter/period',
                      type: 'error',
                    });
                    return;
                  }
                  
                  const milestones = milestonesText
                    ? milestonesText.split('\n').filter(m => m.trim()).map(m => m.trim())
                    : [];
                  
                  const newItem: any = { quarter };
                  if (description) newItem.description = description;
                  if (milestones.length > 0) newItem.milestones = milestones;
                  
                  const currentRoadmap = Array.isArray(formData.roadmap) ? formData.roadmap : [];
                  updateField('roadmap', [...currentRoadmap, newItem]);
                  
                  // Clear form
                  if (quarterInput) quarterInput.value = '';
                  if (descriptionInput) descriptionInput.value = '';
                  if (milestonesInput) milestonesInput.value = '';
                }}
              >
                Add Roadmap Item
              </Button>
            </div>
          </div>
          <SectionImageUpload
            imageUrl={formData.roadmapImage}
            imagePosition={formData.roadmapImagePosition || 'center'}
            onImageChange={(url) => updateField('roadmapImage', url)}
            onPositionChange={(position) => updateField('roadmapImagePosition', position)}
            sectionName="Roadmap & Milestones"
          />
        </div>
      </SectionCard>

      {/* Financials */}
      <SectionCard 
        id="financials" 
        title="Financial Projections"
        description="Financial projections, funding history, and use of funds"
        isExpanded={expandedSections.has('financials')}
        onToggle={() => toggleSection('financials')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Financial Projections</label>
            <textarea
              value={formData.financialProjections || ''}
              onChange={(e) => updateField('financialProjections', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Provide financial projections, revenue forecasts, growth assumptions, unit economics..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Use of Funds</label>
            <textarea
              value={formData.useOfFunds || ''}
              onChange={(e) => updateField('useOfFunds', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="If raising funds, explain how you'll use the capital (e.g., 40% product development, 30% marketing, 20% team, 10% operations)..."
            />
          </div>
          <SectionImageUpload
            imageUrl={formData.financialsImage}
            imagePosition={formData.financialsImagePosition || 'center'}
            onImageChange={(url) => updateField('financialsImage', url)}
            onPositionChange={(position) => updateField('financialsImagePosition', position)}
            sectionName="Financial Projections"
          />
        </div>
      </SectionCard>

      {/* Tokenomics / Economics */}
      <SectionCard 
        id="tokenomics" 
        title="Tokenomics / Economics"
        description="Token distribution, economics, and incentive structures (if applicable)"
        isExpanded={expandedSections.has('tokenomics')}
        onToggle={() => toggleSection('tokenomics')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tokenomics / Economics</label>
            <textarea
              value={formData.tokenomics || ''}
              onChange={(e) => updateField('tokenomics', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="If applicable, describe tokenomics, token distribution, utility, staking mechanisms, governance..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Economics Model</label>
            <textarea
              value={formData.economics || ''}
              onChange={(e) => updateField('economics', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Describe your economic model, value creation, value capture, network effects..."
            />
          </div>
          <SectionImageUpload
            imageUrl={formData.tokenomicsImage}
            imagePosition={formData.tokenomicsImagePosition || 'center'}
            onImageChange={(url) => updateField('tokenomicsImage', url)}
            onPositionChange={(position) => updateField('tokenomicsImagePosition', position)}
            sectionName="Tokenomics / Economics"
          />
        </div>
      </SectionCard>

      {/* Legal & Regulatory */}
      <SectionCard 
        id="legal" 
        title="Legal & Regulatory"
        description="Legal considerations, compliance, risk factors, and disclaimers"
        isExpanded={expandedSections.has('legal')}
        onToggle={() => toggleSection('legal')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Legal Considerations</label>
            <textarea
              value={formData.legalConsiderations || ''}
              onChange={(e) => updateField('legalConsiderations', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Describe legal structure, intellectual property, licenses, contracts..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Regulatory Compliance</label>
            <textarea
              value={formData.regulatoryCompliance || ''}
              onChange={(e) => updateField('regulatoryCompliance', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Describe regulatory requirements, compliance measures, certifications..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Risk Factors</label>
            <textarea
              value={formData.riskFactors || ''}
              onChange={(e) => updateField('riskFactors', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Identify and describe key risk factors (market risks, technical risks, regulatory risks, competition risks)..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Disclaimers</label>
            <textarea
              value={formData.disclaimers || ''}
              onChange={(e) => updateField('disclaimers', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Include necessary disclaimers, forward-looking statements notice, investment disclaimers..."
            />
          </div>
          <SectionImageUpload
            imageUrl={formData.legalImage}
            imagePosition={formData.legalImagePosition || 'center'}
            onImageChange={(url) => updateField('legalImage', url)}
            onPositionChange={(position) => updateField('legalImagePosition', position)}
            sectionName="Legal & Regulatory"
          />
        </div>
      </SectionCard>

      {/* Conclusion */}
      <SectionCard 
        id="conclusion" 
        title="Conclusion"
        description="Summary, key takeaways, and call to action"
        isExpanded={expandedSections.has('conclusion')}
        onToggle={() => toggleSection('conclusion')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Conclusion</label>
            <textarea
              value={formData.conclusion || ''}
              onChange={(e) => updateField('conclusion', e.target.value)}
              rows={8}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              placeholder="Summarize the key points of your whitepaper, reinforce your value proposition, and provide a clear call to action for readers..."
            />
          </div>
          <SectionImageUpload
            imageUrl={formData.conclusionImage}
            imagePosition={formData.conclusionImagePosition || 'center'}
            onImageChange={(url) => updateField('conclusionImage', url)}
            onPositionChange={(position) => updateField('conclusionImagePosition', position)}
            sectionName="Conclusion"
          />
        </div>
      </SectionCard>

      {notification && (
        <NotificationModal
          isOpen={notification.isOpen}
          onClose={() => setNotification(null)}
          title={notification.title}
          message={notification.message}
          type={notification.type}
        />
      )}

      <WhitepaperViewer
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
        whitepaper={formData}
        companyName={currentCompany?.name || 'Company'}
        companyLogo={(() => {
          // Get logo from multiple sources in priority order
          if (currentCompany?.logo) return currentCompany.logo;
          
          // Check companies array
          if (currentCompany?.id) {
            const companyInArray = companies.find(c => c.id === currentCompany.id);
            if (companyInArray?.logo) return companyInArray.logo;
            
            // Check localStorage backup
            if (typeof window !== 'undefined') {
              const storedLogo = localStorage.getItem(`company-logo-${currentCompany.id}`);
              if (storedLogo) return storedLogo;
            }
          }
          return null;
        })()}
      />
    </div>
  );
}

