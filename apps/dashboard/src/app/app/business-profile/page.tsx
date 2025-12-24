'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';
import { NotificationModal } from '@/components/ui/notification-modal';

export default function BusinessProfilePage() {
  const { currentCompany, setCurrentCompany, companies, setCompanies } = useAppStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    logo: '',
    mission: '',
    about: '',
    projectStatus: '',
    targetMarket: '',
    competitiveAdvantage: '',
    keyCompetitors: '',
    totalCustomers: 0,
    monthlyRevenue: 0,
    momGrowth: 0,
    retentionRate: 0,
    teamSize: 0,
    totalFunding: 0,
    keyAchievements: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      loadProfile();
    }
  }, [currentCompany?.id]); // Only reload when company ID changes

  // Update company name and logo in form when currentCompany changes
  // This ensures the form stays in sync when switching companies
  // IMPORTANT: Only update if the company ID actually changed to avoid cross-contamination
  useEffect(() => {
    if (currentCompany) {
      // Get logo from multiple sources in priority order
      let logoUrl = currentCompany.logo || '';
      
      // If no logo in currentCompany, check companies array
      if (!logoUrl) {
        const companyInArray = companies.find(c => c.id === currentCompany.id);
        if (companyInArray?.logo) {
          logoUrl = companyInArray.logo;
        }
      }
      
      // If still no logo, check localStorage
      if (!logoUrl && typeof window !== 'undefined') {
        const storedLogo = localStorage.getItem(`company-logo-${currentCompany.id}`);
        if (storedLogo) {
          logoUrl = storedLogo;
          // Update store with logo from localStorage
          const updatedCompany = { ...currentCompany, logo: logoUrl };
          setCurrentCompany(updatedCompany);
          const updatedCompanies = companies.map((c) =>
            c.id === updatedCompany.id ? updatedCompany : c
          );
          setCompanies(updatedCompanies);
        }
      }
      
      // Always update formData when company ID changes to ensure we use THIS company's logo
      setFormData((prev) => {
        // Always update logo when company changes to ensure we use THIS company's logo
        return {
          ...prev,
          companyName: currentCompany.name || '',
          logo: logoUrl, // Always use currentCompany's logo, never previous formData
        };
      });
      setLogoPreview(logoUrl || null);
    }
  }, [currentCompany?.id, companies]); // Watch for ID changes and companies array

  const loadProfile = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const response = await api.get(`/companies/${currentCompany.id}/profile`);
      const profileData = response.data.profile || {};
      setProfile(profileData);
      
      // Get logo from multiple sources in priority order:
      // 1. currentCompany from store (updated when uploaded)
      // 2. companies array for this specific company
      // 3. localStorage backup (persisted when uploaded)
      let logoUrl = '';
      
      // First check currentCompany from store
      if (currentCompany?.logo) {
        logoUrl = currentCompany.logo;
      } else {
        // Check companies array for THIS specific company's logo
        const companyInArray = companies.find(c => c.id === currentCompany.id);
        if (companyInArray?.logo) {
          logoUrl = companyInArray.logo;
        } else {
          // Check localStorage as backup
          const storedLogo = localStorage.getItem(`company-logo-${currentCompany.id}`);
          if (storedLogo) {
            logoUrl = storedLogo;
          }
        }
        
        // If we found a logo, update the store with it
        if (logoUrl) {
          const updatedCompany = { ...currentCompany, logo: logoUrl };
          setCurrentCompany(updatedCompany);
          const updatedCompanies = companies.map((c) =>
            c.id === updatedCompany.id ? updatedCompany : c
          );
          setCompanies(updatedCompanies);
        }
      }
      
      // Update formData with all profile data - always use logoUrl from store/localStorage
      // This ensures the logo persists when switching companies
      const updatedFormData = {
        companyName: currentCompany.name || '',
        logo: logoUrl, // Always use logoUrl from store/localStorage, never formData.logo
        mission: profileData.mission || '',
        about: profileData.about || '',
        projectStatus: profileData.projectStatus || '',
        targetMarket: profileData.targetMarket || '',
        competitiveAdvantage: profileData.competitiveAdvantage || '',
        keyCompetitors: profileData.keyCompetitors || '',
        totalCustomers: profileData.totalCustomers || 0,
        monthlyRevenue: profileData.monthlyRevenue || 0,
        momGrowth: profileData.momGrowth || 0,
        retentionRate: profileData.retentionRate || 0,
        teamSize: profileData.teamSize || 0,
        totalFunding: profileData.totalFunding || 0,
        keyAchievements: profileData.keyAchievements || '',
      };
      
      setFormData(updatedFormData);
      setLogoPreview(logoUrl || null);
      
      // If we found a logo, ensure it's in localStorage as backup and in the store
      if (currentCompany?.id && logoUrl) {
        localStorage.setItem(`company-logo-${currentCompany.id}`, logoUrl);
        // Ensure it's in the store
        if (!currentCompany.logo || currentCompany.logo !== logoUrl) {
          const updatedCompany = { ...currentCompany, logo: logoUrl };
          setCurrentCompany(updatedCompany);
          const updatedCompanies = companies.map((c) =>
            c.id === updatedCompany.id ? updatedCompany : c
          );
          setCompanies(updatedCompanies);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setNotification({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load business profile. Please try refreshing the page.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentCompany) return;

    setSaving(true);
    try {
      // Always save company name and logo to ensure persistence
      // The logo upload endpoint saves it, but we also save it here to ensure it's in the database
      const logoToSave = formData.logo || currentCompany.logo || '';
      
      console.log('[BusinessProfile] Saving profile with logo:', {
        companyId: currentCompany.id,
        logoToSave: logoToSave ? `${logoToSave.substring(0, 50)}...` : 'empty',
        currentCompanyLogo: currentCompany.logo ? `${currentCompany.logo.substring(0, 50)}...` : 'empty',
        formDataLogo: formData.logo ? `${formData.logo.substring(0, 50)}...` : 'empty'
      });
      
      // Try to update company with logo - this ensures it's saved to the database
      // If the endpoint doesn't exist, the logo upload endpoint should have already saved it
      if (logoToSave || formData.companyName !== currentCompany.name) {
        try {
          const companyUpdateData: any = {
            name: formData.companyName || currentCompany.name,
          };
          
          if (logoToSave) {
            companyUpdateData.logo = logoToSave;
          }
          
          console.log('[BusinessProfile] Updating company with data:', {
            name: companyUpdateData.name,
            hasLogo: !!companyUpdateData.logo
          });
          
          const companyResponse = await api.put(`/companies/${currentCompany.id}`, companyUpdateData);
          
          // Update the store with the response data
          if (companyResponse.data?.company) {
            const updatedCompany = companyResponse.data.company;
            console.log('[BusinessProfile] Company updated from API:', {
              id: updatedCompany.id,
              name: updatedCompany.name,
              hasLogo: !!updatedCompany.logo
            });
            setCurrentCompany(updatedCompany);
            
            // Update the company in the companies array
            const updatedCompanies = companies.map((c) =>
              c.id === updatedCompany.id ? updatedCompany : c
            );
            setCompanies(updatedCompanies);
          } else {
            // If no response, update store with our data
            const updatedCompany = { ...currentCompany, ...companyUpdateData };
            console.log('[BusinessProfile] Company updated locally (no API response):', {
              id: updatedCompany.id,
              name: updatedCompany.name,
              hasLogo: !!updatedCompany.logo
            });
            setCurrentCompany(updatedCompany);
            const updatedCompanies = companies.map((c) =>
              c.id === updatedCompany.id ? updatedCompany : c
            );
            setCompanies(updatedCompanies);
          }
        } catch (companyError: any) {
          console.error('[BusinessProfile] Error updating company:', companyError);
          // If company update endpoint doesn't exist, that's okay
          // The logo was already saved via the logo upload endpoint
          // Just update the store locally to ensure it persists
          if (logoToSave && logoToSave !== currentCompany.logo) {
            const updatedCompany = { ...currentCompany, logo: logoToSave };
            console.log('[BusinessProfile] Updating company logo in store (fallback):', {
              id: updatedCompany.id,
              hasLogo: !!updatedCompany.logo
            });
            setCurrentCompany(updatedCompany);
            const updatedCompanies = companies.map((c) =>
              c.id === updatedCompany.id ? updatedCompany : c
            );
            setCompanies(updatedCompanies);
          }
        }
      }

      // Update business profile (exclude companyName and logo as they're handled above)
      const { companyName, logo, ...profileData } = formData;
      const response = await api.put(
        `/companies/${currentCompany.id}/profile`,
        profileData
      );
      setProfile(response.data.profile);
      
          // Ensure logo preview is set and persisted
          const finalLogo = formData.logo || currentCompany.logo || '';
          setLogoPreview(finalLogo || null);
          
          // Persist logo to localStorage as backup
          if (currentCompany?.id && finalLogo) {
            localStorage.setItem(`company-logo-${currentCompany.id}`, finalLogo);
          }
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'Profile saved successfully!',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to save profile',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentCompany) return;

    setDeleting(true);
    try {
      await api.delete(`/companies/${currentCompany.id}`);
      
      // Remove company from store
      const updatedCompanies = companies.filter((c) => c.id !== currentCompany.id);
      setCompanies(updatedCompanies);
      
      // Set current company to first remaining company or null
      if (updatedCompanies.length > 0) {
        setCurrentCompany(updatedCompanies[0]);
      } else {
        setCurrentCompany(null);
      }
      
      setShowDeleteConfirm(false);
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'Company deleted successfully',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to delete company',
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!currentCompany) {
    return (
      <EmptyState
        icon="🏢"
        title="No company selected"
        description="Select a company from the sidebar to edit business profile"
      />
    );
  }

  if (loading) {
    return <div className="text-white/60">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Business Profile</h1>
          <p className="text-white/60">
            {currentCompany.name} — Company information and traction metrics
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400 hover:text-red-300"
          >
            Delete Company
          </Button>
        </div>
      </div>

      {/* Company Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Logo */}
          <div>
            <label className="block text-sm font-medium mb-2">Company Logo</label>
            <div className="flex items-start gap-4">
              {logoPreview && (
                <div className="flex-shrink-0 relative">
                  <img
                    src={logoPreview}
                    alt="Company logo"
                    className="w-20 h-20 object-contain rounded-lg border border-white/10 bg-white/5 p-2"
                    onError={() => setLogoPreview(null)}
                  />
                  <button
                    onClick={async () => {
                      if (!currentCompany || !logoPreview) return;
                      
                      setDeletingLogo(true);
                      try {
                        const response = await fetch(`/api/companies/${currentCompany.id}/logo`, {
                          method: 'DELETE',
                          credentials: 'include',
                        });
                        
                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error?.message || 'Failed to delete logo');
                        }
                        
                        const data = await response.json();
                        
                        // Clear logo from form and preview
                        setFormData((prev) => ({ ...prev, logo: '' }));
                        setLogoPreview(null);
                        
                        // Remove logo from localStorage
                        if (currentCompany?.id) {
                          localStorage.removeItem(`company-logo-${currentCompany.id}`);
                        }
                        
                        // Update the store with the new company data
                        const updatedCompany = data.company || { ...currentCompany, logo: null };
                        setCurrentCompany(updatedCompany);
                        
                        // Update the company in the companies array
                        const updatedCompanies = companies.map((c) =>
                          c.id === updatedCompany.id ? updatedCompany : c
                        );
                        setCompanies(updatedCompanies);
                        
                        setNotification({
                          isOpen: true,
                          title: 'Success',
                          message: 'Logo deleted successfully!',
                          type: 'success',
                        });
                      } catch (error: any) {
                        setNotification({
                          isOpen: true,
                          title: 'Error',
                          message: error.message || 'Failed to delete logo',
                          type: 'error',
                        });
                      } finally {
                        setDeletingLogo(false);
                      }
                    }}
                    disabled={deletingLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete logo"
                  >
                    ×
                  </button>
                </div>
              )}
              <div className="flex-1">
                <label className="block">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !currentCompany) return;
                    
                    setUploadingLogo(true);
                    try {
                      const formData = new FormData();
                      formData.append('logo', file);
                      
                      // Use fetch for file uploads to avoid axios Content-Type issues
                      const response = await fetch(`/api/companies/${currentCompany.id}/logo`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include',
                      });
                      
                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error?.message || 'Failed to upload logo');
                      }
                      
                      const data = await response.json();
                      
                      const logoUrl = data.logoUrl || data.company?.logo || '';
                      
                      // Update formData with the logo
                      setFormData((prev) => ({ ...prev, logo: logoUrl }));
                      setLogoPreview(logoUrl);
                      
                      // Store logo in localStorage as backup (keyed by company ID)
                      if (currentCompany?.id && logoUrl) {
                        localStorage.setItem(`company-logo-${currentCompany.id}`, logoUrl);
                      }
                      
                      // Update the store with the new company data
                      // Ensure the company object has the logo field
                      const updatedCompany = data.company || { ...currentCompany, logo: logoUrl };
                      if (!updatedCompany.logo) {
                        updatedCompany.logo = logoUrl;
                      }
                      
                      setCurrentCompany(updatedCompany);
                      
                      // Update the company in the companies array - ensure logo is included
                      const updatedCompanies = companies.map((c) => {
                        if (c.id === updatedCompany.id) {
                          return { ...updatedCompany, logo: updatedCompany.logo || logoUrl };
                        }
                        return c;
                      });
                      setCompanies(updatedCompanies);
                      
                      setNotification({
                        isOpen: true,
                        title: 'Success',
                        message: 'Logo uploaded successfully!',
                        type: 'success',
                      });
                    } catch (error: any) {
                      setNotification({
                        isOpen: true,
                        title: 'Error',
                        message: error.message || 'Failed to upload logo',
                        type: 'error',
                      });
                    } finally {
                      setUploadingLogo(false);
                      // Reset file input
                      e.target.value = '';
                    }
                  }}
                    className="block w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploadingLogo}
                  />
                </label>
                <p className="text-xs text-white/40 mt-1">
                  {uploadingLogo ? 'Uploading...' : 'Upload an image file (JPEG, PNG, GIF, WebP, or SVG). Max size: 5MB'}
                </p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Company Name</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="Company name..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Mission Statement</label>
            <textarea
              value={formData.mission}
              onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="Company mission..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">About Us</label>
            <textarea
              value={formData.about}
              onChange={(e) => setFormData({ ...formData, about: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="Company description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Project Status</label>
            <select
              value={formData.projectStatus}
              onChange={(e) => setFormData({ ...formData, projectStatus: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 [&>option]:bg-[#0F0F0F] [&>option]:text-white"
            >
              <option value="">Select status...</option>
              <option value="Production">Production</option>
              <option value="Beta">Beta</option>
              <option value="Alpha">Alpha</option>
              <option value="Development">Development</option>
              <option value="Idea">Idea</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Traction & Metrics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Traction & Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Total Customers</label>
              <input
                type="number"
                value={formData.totalCustomers}
                onChange={(e) =>
                  setFormData({ ...formData, totalCustomers: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Monthly Revenue</label>
              <input
                type="number"
                step="0.01"
                value={formData.monthlyRevenue}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyRevenue: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">MoM Growth (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.momGrowth}
                onChange={(e) =>
                  setFormData({ ...formData, momGrowth: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Retention Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.retentionRate}
                onChange={(e) =>
                  setFormData({ ...formData, retentionRate: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Team Size</label>
              <input
                type="number"
                value={formData.teamSize}
                onChange={(e) =>
                  setFormData({ ...formData, teamSize: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Total Funding</label>
              <input
                type="number"
                step="0.01"
                value={formData.totalFunding}
                onChange={(e) =>
                  setFormData({ ...formData, totalFunding: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Key Achievements</label>
            <textarea
              value={formData.keyAchievements}
              onChange={(e) =>
                setFormData({ ...formData, keyAchievements: e.target.value })
              }
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="• Achievement 1&#10;• Achievement 2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Market & Competition */}
      <Card>
        <CardHeader>
          <CardTitle>Market & Competition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Target Market</label>
            <textarea
              value={formData.targetMarket}
              onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="Target market description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Competitive Advantage</label>
            <textarea
              value={formData.competitiveAdvantage}
              onChange={(e) =>
                setFormData({ ...formData, competitiveAdvantage: e.target.value })
              }
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="• Advantage 1&#10;• Advantage 2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Key Competitors</label>
            <input
              type="text"
              value={formData.keyCompetitors}
              onChange={(e) => setFormData({ ...formData, keyCompetitors: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="Competitor 1, Competitor 2, Competitor 3"
            />
          </div>
        </CardContent>
      </Card>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-semibold mb-4 text-red-400">Delete Company</h2>
            <p className="text-white/80 mb-6">
              Are you sure you want to delete <strong>{currentCompany.name}</strong>? This action cannot be undone and will delete all associated data including:
            </p>
            <ul className="list-disc list-inside text-white/60 mb-6 space-y-1">
              <li>All financial transactions and statements</li>
              <li>All documents and files</li>
              <li>All team members and access</li>
              <li>All project boards and tasks</li>
              <li>All business profile data</li>
            </ul>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleting ? 'Deleting...' : 'Delete Company'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <NotificationModal
          isOpen={notification.isOpen}
          onClose={() => setNotification(null)}
          title={notification.title}
          message={notification.message}
          type={notification.type}
        />
      )}
    </div>
  );
}

