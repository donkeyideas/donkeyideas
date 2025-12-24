'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';

export default function DeckBuilderPage() {
  const { currentCompany } = useAppStore();
  const [generating, setGenerating] = useState(false);
  const [deck, setDeck] = useState<any>(null);
  const [decks, setDecks] = useState<any[]>([]);
  const [selectedSlide, setSelectedSlide] = useState<any>(null);
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      loadDecks();
    }
  }, [currentCompany]);

  const loadDecks = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const response = await api.get(`/companies/${currentCompany.id}/decks`);
      setDecks(response.data.decks || []);
    } catch (error: any) {
      console.error('Failed to load decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDeck = async (deckId: string) => {
    if (!currentCompany) return;

    try {
      const response = await api.get(`/companies/${currentCompany.id}/decks/${deckId}`);
      setDeck(response.data.deck);
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to load deck');
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!currentCompany) return;
    if (!confirm('Are you sure you want to delete this deck?')) return;

    try {
      await api.delete(`/companies/${currentCompany.id}/decks/${deckId}`);
      setDecks(decks.filter(d => d.id !== deckId));
      if (deck?.id === deckId) {
        setDeck(null);
      }
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to delete deck');
    }
  };

  const handleGenerate = async () => {
    if (!currentCompany) return;

    setGenerating(true);
    try {
      const response = await api.post(
        `/companies/${currentCompany.id}/decks/generate`
      );
      setDeck(response.data.deck);
      loadDecks(); // Refresh deck list
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to generate deck');
    } finally {
      setGenerating(false);
    }
  };

  const handleSlideClick = (slide: any) => {
    setSelectedSlide(slide);
    setShowSlideModal(true);
  };

  const handleCustomize = () => {
    setShowCustomizeModal(true);
  };

  const handleEditSlide = (slide: any) => {
    setEditingSlide({ ...slide });
    setShowSlideModal(false);
    setShowCustomizeModal(true);
  };

  const handleSaveSlide = async () => {
    if (!editingSlide || !deck || !currentCompany) return;

    setSaving(true);
    try {
      // Update the slide in the deck
      const updatedContent = deck.content.map((slide: any) =>
        slide.number === editingSlide.number ? editingSlide : slide
      );

      // Save to database
      await api.put(`/companies/${currentCompany.id}/decks/${deck.id}`, {
        content: updatedContent,
      });

      // Update local state
      setDeck({ ...deck, content: updatedContent });
      setShowCustomizeModal(false);
      setEditingSlide(null);
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to save slide');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlide = () => {
    if (!deck) return;

    const newSlideNumber = deck.content.length + 1;
    const newSlide = {
      number: newSlideNumber,
      title: 'New Slide',
      content: ['Add your content here'],
    };

    setEditingSlide(newSlide);
    setShowCustomizeModal(true);
  };

  const handleDeleteSlide = async (slideNumber: number) => {
    if (!deck || !currentCompany) return;
    if (!confirm('Are you sure you want to delete this slide?')) return;

    try {
      const updatedContent = deck.content
        .filter((slide: any) => slide.number !== slideNumber)
        .map((slide: any, index: number) => ({
          ...slide,
          number: index + 1, // Renumber slides
        }));

      await api.put(`/companies/${currentCompany.id}/decks/${deck.id}`, {
        content: updatedContent,
      });

      setDeck({ ...deck, content: updatedContent });
      setShowCustomizeModal(false);
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to delete slide');
    }
  };

  const handleExportPDF = async () => {
    if (!deck || !currentCompany) return;
    
    try {
      const response = await api.post(
        `/companies/${currentCompany.id}/decks/${deck.id}/export/pdf`,
        {},
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${currentCompany.name}-pitch-deck.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert('PDF export feature coming soon!');
    }
  };

  const handleExportPPTX = async () => {
    if (!deck || !currentCompany) return;
    
    try {
      const response = await api.post(
        `/companies/${currentCompany.id}/decks/${deck.id}/export/pptx`,
        {},
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${currentCompany.name}-pitch-deck.pptx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert('PowerPoint export feature coming soon!');
    }
  };

  if (!currentCompany) {
    return (
      <EmptyState
        icon="🏢"
        title="No company selected"
        description="Select a company from the sidebar to generate a deck"
      />
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Deck Builder</h1>
          <p className="text-white/60">
            {currentCompany.name} — Generate world-class investor pitch decks
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'Generating...' : 'Generate Deck'}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-blue-400">AI-Powered Pitch Deck</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/80">
            Our AI creates investor-ready decks using your Business Profile, Financials, and
            Traction data. Following proven frameworks from successful startups.
          </p>
        </CardContent>
      </Card>

      {/* Existing Decks */}
      {decks.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Pitch Decks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map((deckItem) => (
                <div
                  key={deckItem.id}
                  className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold truncate">{deckItem.title}</h4>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeleteDeck(deckItem.id)}
                      className="text-red-400 border-red-500/30 hover:bg-red-500/10 ml-2"
                    >
                      ×
                    </Button>
                  </div>
                  <div className="text-sm text-white/60 mb-3">
                    {deckItem.content?.length || 0} slides
                  </div>
                  <div className="text-xs text-white/40 mb-3">
                    Created: {new Date(deckItem.createdAt).toLocaleDateString()}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleLoadDeck(deckItem.id)}
                    className="w-full"
                  >
                    {deck?.id === deckItem.id ? 'Current Deck' : 'Load Deck'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!deck ? (
        <EmptyState
          icon="🎴"
          title="No deck generated yet"
          description="Generate your first pitch deck using AI"
          action={
            <Button variant="primary" onClick={handleGenerate} disabled={generating}>
              Generate Deck
            </Button>
          }
        />
      ) : (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {deck.content.map((slide: any) => (
              <Card 
                key={slide.number} 
                className="cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => handleSlideClick(slide)}
              >
                <CardContent className="p-4">
                  <div className="text-xs text-white/40 mb-2">Slide {slide.number}</div>
                  <div className="font-semibold mb-2">{slide.title}</div>
                  <div className="text-xs text-white/60">
                    {slide.content[0] || 'Content preview'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleCustomize}>
              Customize
            </Button>
            <Button variant="secondary" onClick={handleExportPDF}>
              Export PDF
            </Button>
            <Button variant="secondary" onClick={handleExportPPTX}>
              Export PPTX
            </Button>
          </div>
        </div>
      )}

      {/* Slide Detail Modal */}
      {showSlideModal && selectedSlide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  Slide {selectedSlide.number}: {selectedSlide.title}
                </h2>
                <button
                  onClick={() => setShowSlideModal(false)}
                  className="text-white/60 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h3 className="font-semibold mb-3 text-blue-400">{selectedSlide.title}</h3>
                  <div className="space-y-2">
                    {selectedSlide.content.map((item: string, index: number) => (
                      <div key={index} className="text-white/80">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-white/40">
                  💡 This is a preview of your slide content. Use the Customize button to edit and style your deck.
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setShowSlideModal(false)}>
                  Close
                </Button>
                <Button variant="secondary" onClick={() => handleEditSlide(selectedSlide)}>
                  Edit Slide
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customization Modal */}
      {showCustomizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  {editingSlide ? `Edit Slide ${editingSlide.number}` : 'Customize Deck'}
                </h2>
                <button
                  onClick={() => {
                    setShowCustomizeModal(false);
                    setEditingSlide(null);
                  }}
                  className="text-white/60 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>

              {editingSlide ? (
                /* Single Slide Editor */
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Slide Title</label>
                    <input
                      type="text"
                      value={editingSlide.title}
                      onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Slide Content</label>
                    <div className="space-y-2">
                      {editingSlide.content.map((item: string, index: number) => (
                        <div key={index} className="flex gap-2">
                          <textarea
                            value={item}
                            onChange={(e) => {
                              const newContent = [...editingSlide.content];
                              newContent[index] = e.target.value;
                              setEditingSlide({ ...editingSlide, content: newContent });
                            }}
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 min-h-[80px]"
                            placeholder="Enter slide content..."
                          />
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const newContent = editingSlide.content.filter((_: any, i: number) => i !== index);
                              setEditingSlide({ ...editingSlide, content: newContent });
                            }}
                            className="px-3 py-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingSlide({
                            ...editingSlide,
                            content: [...editingSlide.content, 'New content point'],
                          });
                        }}
                        className="w-full"
                      >
                        + Add Content Point
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="secondary"
                      onClick={() => handleDeleteSlide(editingSlide.number)}
                      className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                    >
                      Delete Slide
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowCustomizeModal(false);
                          setEditingSlide(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button variant="primary" onClick={handleSaveSlide} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Slide'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Deck Overview */
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Deck Overview</h3>
                    <Button variant="primary" onClick={handleAddSlide}>
                      + Add New Slide
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {deck?.content.map((slide: any) => (
                      <div
                        key={slide.number}
                        className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-blue-500/30 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs text-white/40">Slide {slide.number}</span>
                              <h4 className="font-semibold">{slide.title}</h4>
                            </div>
                            <div className="text-sm text-white/60">
                              {slide.content.slice(0, 2).map((item: string, index: number) => (
                                <div key={index} className="truncate">
                                  {item}
                                </div>
                              ))}
                              {slide.content.length > 2 && (
                                <div className="text-white/40">
                                  +{slide.content.length - 2} more points
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditSlide(slide)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDeleteSlide(slide.number)}
                              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => setShowCustomizeModal(false)}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

