import React, { useState, useEffect } from 'react';
import CoupleDashboardLayout from '../../components/CoupleDashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Upload, Download, Eye, Trash2, FileText } from 'lucide-react';

export default function InvitationTemplates() {
  const { apiRequest, role } = useAuth();
  const [couple, setCouple] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/couple/profile');
      if (res.ok) {
        const data = await res.json();
        setCouple(data);
      } else {
        setError('Failed to load profile details.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleCardUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF templates are allowed.');
      return;
    }

    const formData = new FormData();
    formData.append('card', file);

    setError('');
    setSuccess('');
    setLoading(true);

    // Resolve client dynamic base URL
    const API_BASE = import.meta.env.PROD ? 'https://eventmanagment-e3qo.onrender.com' : '';

    try {
      const res = await fetch(`${API_BASE}/api/couple/invitation-cards/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('wedding_token')}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`${type === 'sahjode' ? 'Sahjode' : 'Sarva'} card template uploaded successfully!`);
        fetchProfile();
      } else {
        setError(data.error || 'Failed to upload card template.');
      }
    } catch (err) {
      setError('Network error uploading template.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardDelete = async (type) => {
    if (!confirm(`Are you sure you want to delete the ${type === 'sahjode' ? 'Sahjode' : 'Sarva'} invitation card template?`)) {
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await apiRequest(`/api/couple/invitation-cards/${type}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`${type === 'sahjode' ? 'Sahjode' : 'Sarva'} card template deleted.`);
        fetchProfile();
      } else {
        setError(data.error || 'Failed to delete template.');
      }
    } catch (err) {
      setError('Network error deleting template.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CoupleDashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-jost text-wedding-dark">Invitation PDF Cards</h1>
        <p className="text-sm text-wedding-brown/70 mt-1">Configure and manage digital card templates used for WhatsApp dispatches</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sahjode (Couple) Card */}
          <div className="wedding-card bg-white p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div className="floral-corner-tl opacity-35"></div>
            <div>
              <span className="inline-block text-[10px] font-bold tracking-widest uppercase bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full mb-3">
                Sahjode (Couple)
              </span>
              <h4 className="text-base font-semibold text-wedding-dark mb-1">Sahjode Invitation template</h4>
              
              {couple?.sahjodeCardUrl ? (
                <div className="space-y-1 mt-2">
                  <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                    ✓ PDF Card Uploaded
                  </p>
                  <p className="text-[10px] text-wedding-brown/60">
                    Uploaded By: <strong>{couple.sahjodeCardUploadedBy || 'Unknown'}</strong>
                  </p>
                  <p className="text-[10px] text-wedding-brown/60">
                    Uploaded Date: <strong>{couple.sahjodeCardUploadedAt ? new Date(couple.sahjodeCardUploadedAt).toLocaleString() : 'N/A'}</strong>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-wedding-brown/50 italic mt-2">No card template uploaded.</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {couple?.sahjodeCardUrl && (
                <>
                  <a 
                    href={couple.sahjodeCardUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="outline-button text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </a>
                  <a 
                    href={couple.sahjodeCardUrl} 
                    download={`sahjode_invitation_${couple.slug}.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="outline-button text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </>
              )}

              {role !== 'superadmin' && (
                <>
                  <label className="gold-button text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer select-none">
                    <Upload className="h-3.5 w-3.5" /> 
                    {couple?.sahjodeCardUrl ? 'Replace' : 'Upload PDF'}
                    <input 
                      type="file" 
                      accept=".pdf" 
                      className="hidden" 
                      onChange={(e) => handleCardUpload(e, 'sahjode')} 
                    />
                  </label>
                  {couple?.sahjodeCardUrl && (
                    <button 
                      onClick={() => handleCardDelete('sahjode')} 
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded-xl transition-colors border border-red-100"
                      title="Delete Template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Sarva (Entire Family) Card */}
          <div className="wedding-card bg-white p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div className="floral-corner-tl opacity-35"></div>
            <div>
              <span className="inline-block text-[10px] font-bold tracking-widest uppercase bg-purple-50 text-purple-800 px-2.5 py-0.5 rounded-full mb-3">
                Sarva (Family)
              </span>
              <h4 className="text-base font-semibold text-wedding-dark mb-1">Sarva Invitation template</h4>
              
              {couple?.sarvaCardUrl ? (
                <div className="space-y-1 mt-2">
                  <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                    ✓ PDF Card Uploaded
                  </p>
                  <p className="text-[10px] text-wedding-brown/60">
                    Uploaded By: <strong>{couple.sarvaCardUploadedBy || 'Unknown'}</strong>
                  </p>
                  <p className="text-[10px] text-wedding-brown/60">
                    Uploaded Date: <strong>{couple.sarvaCardUploadedAt ? new Date(couple.sarvaCardUploadedAt).toLocaleString() : 'N/A'}</strong>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-wedding-brown/50 italic mt-2">No card template uploaded.</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {couple?.sarvaCardUrl && (
                <>
                  <a 
                    href={couple.sarvaCardUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="outline-button text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </a>
                  <a 
                    href={couple.sarvaCardUrl} 
                    download={`sarva_invitation_${couple.slug}.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="outline-button text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </>
              )}

              {role !== 'superadmin' && (
                <>
                  <label className="gold-button text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer select-none">
                    <Upload className="h-3.5 w-3.5" /> 
                    {couple?.sarvaCardUrl ? 'Replace' : 'Upload PDF'}
                    <input 
                      type="file" 
                      accept=".pdf" 
                      className="hidden" 
                      onChange={(e) => handleCardUpload(e, 'sarva')} 
                    />
                  </label>
                  {couple?.sarvaCardUrl && (
                    <button 
                      onClick={() => handleCardDelete('sarva')} 
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded-xl transition-colors border border-red-100"
                      title="Delete Template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </CoupleDashboardLayout>
  );
}
