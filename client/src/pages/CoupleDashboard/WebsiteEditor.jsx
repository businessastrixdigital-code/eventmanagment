import React, { useState, useEffect } from 'react';
import CoupleDashboardLayout from '../../components/CoupleDashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Sliders, Eye, EyeOff, Save, LayoutGrid, Check, RefreshCw, Smartphone, Monitor } from 'lucide-react';

export default function WebsiteEditor() {
  const { apiRequest, user } = useAuth();
  
  // Design configuration state
  const [sections, setSections] = useState([]);
  const [colors, setColors] = useState({
    background: '#F5EFE6',
    primary: '#6B4423',
    heading: '#4A2C17',
    accent: '#C9A66B',
    card: '#FBF7F0'
  });
  const [activeTemplate, setActiveTemplate] = useState('classic');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' | 'mobile'
  const [coverPhoto, setCoverPhoto] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);

  const defaultSections = [
    { id: 'hero', name: 'Hero Cover & Timer', visible: true },
    { id: 'story', name: 'Our Story Bio', visible: true },
    { id: 'timeline', name: 'Events Timeline', visible: true },
    { id: 'gallery', name: 'Photo Gallery', visible: true },
    { id: 'rsvp', name: 'RSVP Access Portal', visible: true },
    { id: 'wishes', name: 'Wishes Wall', visible: true }
  ];

  const defaultColors = {
    background: '#F5EFE6',
    primary: '#6B4423',
    heading: '#4A2C17',
    accent: '#C9A66B',
    card: '#FBF7F0'
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/couple/profile');
      if (res.ok) {
        const data = await res.json();
        const config = data.themeConfig || {};
        
        // Initialize with defaults if values are missing
        setSections(config.sections && config.sections.length > 0 ? config.sections : defaultSections);
        setColors(config.colors && Object.keys(config.colors).length > 0 ? config.colors : defaultColors);
        setActiveTemplate(config.activeTemplate || 'classic');
        setCoverPhoto(data.coverPhoto || '');
      } else {
        setError('Failed to fetch theme configuration.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('coverPhoto', file);

    setError('');
    setSuccess('');
    setUploadingCover(true);

    try {
      const res = await fetch('/api/couple/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('wedding_token')}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setCoverPhoto(data.couple.coverPhoto);
        setSuccess('Cover photo updated successfully! The live preview is refreshed.');
        
        // Force refresh iframe preview
        const iframe = document.querySelector('iframe');
        if (iframe) iframe.src = iframe.src;
      } else {
        setError(data.error || 'Failed to upload cover photo.');
      }
    } catch (err) {
      setError('Network error uploading cover photo.');
    } finally {
      setUploadingCover(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleToggleSection = (index) => {
    const updated = [...sections];
    updated[index].visible = !updated[index].visible;
    setSections(updated);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setSections(updated);
  };

  const handleMoveDown = (index) => {
    if (index === sections.length - 1) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setSections(updated);
  };

  const handleColorChange = (key, value) => {
    setColors(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveConfig = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await apiRequest('/api/couple/website-config', {
        method: 'PUT',
        body: JSON.stringify({ sections, colors, activeTemplate })
      });
      if (res.ok) {
        setSuccess('Website design layout saved successfully! The live site is updated.');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save config.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  return (
    <CoupleDashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-jost text-wedding-dark">Website Layout Editor</h1>
          <p className="text-sm text-wedding-brown/70 mt-1">Drag-and-drop sections ordering, toggle visibility, and adjust palettes</p>
        </div>
        <button onClick={handleSaveConfig} className="gold-button flex items-center gap-2 text-sm py-2">
          <Save className="h-4 w-4" />
          Publish Website
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl text-sm text-red-700 mb-8">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-xl text-sm text-green-700 mb-8">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wedding-gold"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Design Controls Column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Cover Photo Customization */}
            <div className="wedding-card bg-white">
              <h3 className="text-md font-bold font-jost text-wedding-dark mb-3">Cover Background Image</h3>
              {coverPhoto ? (
                <div className="relative rounded-2xl overflow-hidden h-32 mb-3 border border-wedding-gold/10">
                  <img src={coverPhoto} alt="Cover Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20"></div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-wedding-gold/20 p-6 text-center text-xs text-wedding-brown/40 mb-3 italic">
                  No cover photo selected. Upload one to serve as your wedding banner!
                </div>
              )}
              <div className="relative">
                <input 
                  type="file" 
                  id="cover-photo-input"
                  accept="image/*" 
                  onChange={handleCoverUpload}
                  disabled={uploadingCover}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <button type="button" className="gold-button w-full text-xs py-2 block text-center pointer-events-none" disabled={uploadingCover}>
                  {uploadingCover ? 'Uploading Banner...' : 'Choose Banner Image'}
                </button>
              </div>
            </div>
            {/* Color Palette customization */}
            <div className="wedding-card bg-white">
              <h3 className="text-md font-bold font-jost text-wedding-dark mb-4">Color Palette</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-wedding-beige/25 p-2 rounded-xl border border-wedding-gold/5">
                  <span className="text-xs font-semibold text-wedding-brown">Background Beige</span>
                  <input 
                    type="color" 
                    value={colors.background || '#F5EFE6'}
                    onChange={(e) => handleColorChange('background', e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border-0"
                  />
                </div>

                <div className="flex justify-between items-center bg-wedding-beige/25 p-2 rounded-xl border border-wedding-gold/5">
                  <span className="text-xs font-semibold text-wedding-brown">Warm Brown Primary</span>
                  <input 
                    type="color" 
                    value={colors.primary || '#6B4423'}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border-0"
                  />
                </div>

                <div className="flex justify-between items-center bg-wedding-beige/25 p-2 rounded-xl border border-wedding-gold/5">
                  <span className="text-xs font-semibold text-wedding-brown">Deep Brown Heading</span>
                  <input 
                    type="color" 
                    value={colors.heading || '#4A2C17'}
                    onChange={(e) => handleColorChange('heading', e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border-0"
                  />
                </div>

                <div className="flex justify-between items-center bg-wedding-beige/25 p-2 rounded-xl border border-wedding-gold/5">
                  <span className="text-xs font-semibold text-wedding-brown">Soft Gold Accent</span>
                  <input 
                    type="color" 
                    value={colors.accent || '#C9A66B'}
                    onChange={(e) => handleColorChange('accent', e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border-0"
                  />
                </div>

                <div className="flex justify-between items-center bg-wedding-beige/25 p-2 rounded-xl border border-wedding-gold/5">
                  <span className="text-xs font-semibold text-wedding-brown">Cream Cards</span>
                  <input 
                    type="color" 
                    value={colors.card || '#FBF7F0'}
                    onChange={(e) => handleColorChange('card', e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border-0"
                  />
                </div>
              </div>
            </div>

            {/* Reorder and Toggle sections list */}
            <div className="wedding-card bg-white">
              <h3 className="text-md font-bold font-jost text-wedding-dark mb-4">Page Section Order</h3>
              
              <div className="space-y-2">
                {sections.map((sect, idx) => (
                  <div key={sect.id} className="flex justify-between items-center bg-wedding-beige/20 p-3 rounded-2xl border border-wedding-gold/10">
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => handleToggleSection(idx)} 
                        className={`p-1.5 rounded-lg transition-colors ${
                          sect.visible ? 'text-wedding-gold hover:bg-wedding-beige' : 'text-gray-300 hover:bg-gray-100'
                        }`}
                        title={sect.visible ? 'Hide section' : 'Show section'}
                      >
                        {sect.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <span className={`text-xs font-bold ${sect.visible ? 'text-wedding-dark' : 'text-wedding-brown/40 line-through'}`}>
                        {sect.name}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <button 
                        type="button" 
                        disabled={idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        className="p-1 hover:bg-wedding-beige rounded text-wedding-brown/70 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button 
                        type="button"
                        disabled={idx === sections.length - 1}
                        onClick={() => handleMoveDown(idx)}
                        className="p-1 hover:bg-wedding-beige rounded text-wedding-brown/70 disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Frame/Preview Column */}
          <div className="lg:col-span-8 flex flex-col items-center">
            {/* Mode selection buttons */}
            <div className="flex bg-wedding-cream border border-wedding-gold/25 rounded-full p-1 mb-4 shadow-sm">
              <button 
                onClick={() => setPreviewMode('desktop')}
                className={`px-4 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  previewMode === 'desktop' ? 'bg-wedding-brown text-wedding-cream' : 'text-wedding-brown/70'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </button>
              <button 
                onClick={() => setPreviewMode('mobile')}
                className={`px-4 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  previewMode === 'mobile' ? 'bg-wedding-brown text-wedding-cream' : 'text-wedding-brown/70'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
              </button>
            </div>

            {/* Frame Wrapper */}
            <div className={`border-8 border-wedding-dark rounded-[36px] overflow-hidden bg-white shadow-wedding-lg transition-all duration-300 ${
              previewMode === 'mobile' ? 'w-80 h-[560px]' : 'w-full h-[560px]'
            }`}>
              {/* Iframe targetting the public URL path */}
              {user?.slug ? (
                <iframe 
                  src={`/invite/${user.slug}`} 
                  title="Wedding Invite Preview" 
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-wedding-brown/40 italic">
                  Iframe loading...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </CoupleDashboardLayout>
  );
}
