import React, { useState, useEffect } from 'react';
import CoupleDashboardLayout from '../../components/CoupleDashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Plus, Trash2, Eye, EyeOff, ShieldAlert, Sparkles, Check, X, Camera, Image as ImageIcon } from 'lucide-react';

export default function Photos() {
  const { apiRequest } = useAuth();
  const socket = useSocket();

  // Active Tab: 'gallery' | 'requests'
  const [activeTab, setActiveTab] = useState('gallery');

  const [photos, setPhotos] = useState([]);
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload States
  const [uploadFile, setUploadFile] = useState(null);
  const [eventId, setEventId] = useState('');
  const [privacy, setPrivacy] = useState('Public');
  const [isUploading, setIsUploading] = useState(false);

  const fetchPhotosAndRequests = async () => {
    setLoading(true);
    try {
      const photosRes = await apiRequest('/api/couple/photos');
      if (photosRes.ok) {
        const data = await photosRes.json();
        setPhotos(data);
      }

      const reqRes = await apiRequest('/api/couple/photo-requests');
      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(data);
      }

      const eventsRes = await apiRequest('/api/couple/events');
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data);
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotosAndRequests();
  }, []);

  // Socket listener for real-time photo requests!
  useEffect(() => {
    if (!socket) return;

    socket.on('live-photo-request', () => {
      // Re-fetch requests from DB to show live update
      apiRequest('/api/couple/photo-requests')
        .then(res => res.json())
        .then(data => setRequests(data))
        .catch(err => console.error(err));
    });

    return () => {
      socket.off('live-photo-request');
    };
  }, [socket]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select an image file to upload.');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('photo', uploadFile);
    formData.append('privacy', privacy);
    if (eventId) {
      formData.append('eventId', eventId);
    }

    const API_BASE = import.meta.env.PROD ? 'https://eventmanagment-e3qo.onrender.com' : '';

    try {
      const res = await fetch(`${API_BASE}/api/couple/photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('wedding_token')}`
        },
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess('Photo uploaded successfully!');
        setUploadFile(null);
        setEventId('');
        setPrivacy('Public');
        // Clear file input manually
        document.getElementById('photo-input').value = '';
        fetchPhotosAndRequests();
      } else {
        setError(data.error || 'Failed to upload photo.');
      }
    } catch (err) {
      setError('Network upload error.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdatePrivacy = async (photoId, currentPrivacy) => {
    const nextPrivacy = currentPrivacy === 'Public' ? 'Approved-guests-only' : currentPrivacy === 'Approved-guests-only' ? 'Private' : 'Public';
    setError('');
    try {
      const res = await apiRequest(`/api/couple/photos/${photoId}`, {
        method: 'PUT',
        body: JSON.stringify({ privacy: nextPrivacy })
      });
      if (res.ok) {
        fetchPhotosAndRequests();
      } else {
        setError('Failed to update privacy settings.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm('Are you sure you want to delete this photo from the gallery?')) {
      return;
    }
    setError('');
    try {
      const res = await apiRequest(`/api/couple/photos/${photoId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Photo deleted.');
        fetchPhotosAndRequests();
      } else {
        setError('Failed to delete photo.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleRequestAction = async (requestId, status) => {
    setError('');
    setSuccess('');
    try {
      const res = await apiRequest(`/api/couple/photo-requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setSuccess(`Photo access request has been ${status.toLowerCase()}!`);
        fetchPhotosAndRequests();
      } else {
        setError('Failed to process request.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  return (
    <CoupleDashboardLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-jost text-wedding-dark">Photo & Gallery Management</h1>
          <p className="text-sm text-wedding-brown/70 mt-1">Upload event photos and manage guest access permissions</p>
        </div>
        
        {/* Toggle tabs */}
        <div className="flex bg-wedding-cream border border-wedding-gold/25 rounded-full p-1 self-start">
          <button
            onClick={() => { setActiveTab('gallery'); setError(''); setSuccess(''); }}
            className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'gallery'
                ? 'bg-wedding-brown text-wedding-cream shadow-sm'
                : 'text-wedding-brown/70 hover:text-wedding-brown'
            }`}
          >
            Photos Gallery
          </button>
          <button
            onClick={() => { setActiveTab('requests'); setError(''); setSuccess(''); }}
            className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-wedding-brown text-wedding-cream shadow-sm'
                : 'text-wedding-brown/70 hover:text-wedding-brown'
            }`}
          >
            Access Requests
            {requests.filter(r => r.status === 'Pending').length > 0 && (
              <span className="bg-red-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                {requests.filter(r => r.status === 'Pending').length}
              </span>
            )}
          </button>
        </div>
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

      {/* GALLERY TAB */}
      {activeTab === 'gallery' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Uploader Card */}
          <div className="lg:col-span-1">
            <div className="wedding-card bg-white relative overflow-hidden">
              <div className="floral-corner-tl opacity-55"></div>
              <h3 className="text-lg font-bold font-jost text-wedding-dark mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5 text-wedding-gold" />
                Upload Photo
              </h3>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Select File</label>
                  <input 
                    type="file" 
                    id="photo-input"
                    required
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="text-xs mt-1 block w-full text-wedding-brown file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-wedding-beige/40 file:text-wedding-brown hover:file:bg-wedding-beige/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Link to Event</label>
                  <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="wedding-input py-1.5 text-xs">
                    <option value="">General Photo (No event)</option>
                    {events.map(evt => (
                      <option key={evt.id} value={evt.id}>{evt.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Privacy Level</label>
                  <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} className="wedding-input py-1.5 text-xs">
                    <option value="Public">Public (Anyone can view)</option>
                    <option value="Approved-guests-only">Approved Guests Only (Requires OTP Request)</option>
                    <option value="Private">Private (Admins only)</option>
                  </select>
                </div>

                <button type="submit" disabled={isUploading} className="gold-button w-full mt-4 flex items-center justify-center gap-2">
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </button>
              </form>
            </div>
          </div>

          {/* Photo Listing Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wedding-gold"></div>
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-wedding-gold/10 p-6">
                <ImageIcon className="h-10 w-10 text-wedding-gold/40 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-wedding-dark">Gallery is Empty</h3>
                <p className="text-sm text-wedding-brown/70 mt-1">Your wedding guest book gallery doesn't have any images yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {photos.map((ph) => {
                  const associatedEvent = events.find(e => e.id === ph.eventId);
                  return (
                    <div key={ph.id} className="bg-white border border-wedding-gold/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-wedding transition-shadow duration-300 flex flex-col justify-between group">
                      <div className="h-44 overflow-hidden relative">
                        <img src={ph.url} alt="Gallery item" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <span className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          ph.privacy === 'Public' 
                            ? 'bg-green-500 text-white' 
                            : ph.privacy === 'Approved-guests-only' 
                            ? 'bg-amber-500 text-white' 
                            : 'bg-red-500 text-white'
                        }`}>
                          {ph.privacy}
                        </span>
                      </div>

                      <div className="p-3 space-y-2">
                        <p className="text-[10px] text-wedding-brown/50 font-bold uppercase">
                          Uploaded By: <span className="text-wedding-dark">{ph.uploadedBy}</span>
                        </p>
                        {associatedEvent && (
                          <p className="text-xs font-semibold text-wedding-gold font-jost truncate">
                            Event: {associatedEvent.title}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 border-t border-wedding-gold/5 p-2 bg-wedding-beige/5">
                        <button 
                          onClick={() => handleUpdatePrivacy(ph.id, ph.privacy)}
                          className="p-1.5 hover:bg-wedding-beige rounded-lg text-wedding-brown transition-colors text-xs flex items-center gap-1 font-semibold"
                          title="Click to cycle privacy levels"
                        >
                          {ph.privacy === 'Public' ? <Eye className="h-3.5 w-3.5 text-green-600" /> : <EyeOff className="h-3.5 w-3.5 text-amber-600" />}
                          Privacy
                        </button>
                        <button 
                          onClick={() => handleDeletePhoto(ph.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors ml-auto"
                          title="Delete photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REQUESTS ACCESS TAB */}
      {activeTab === 'requests' && (
        <div className="bg-wedding-cream rounded-3xl border border-wedding-gold/15 overflow-hidden shadow-wedding">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-wedding-gold/10 bg-white">
              <thead className="bg-wedding-brown/5 text-wedding-brown/80 text-xs font-semibold uppercase">
                <tr>
                  <th className="px-6 py-4 text-left">Guest Name</th>
                  <th className="px-6 py-4 text-left">Phone Number</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wedding-gold/10 text-sm">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-wedding-brown/50 italic">
                      No photo access requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-wedding-beige/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-wedding-dark">
                        {r.Guest?.name || 'Unknown Guest'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-wedding-brown/80 font-mono">
                        {r.Guest?.mobile || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.status === 'Approved'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : r.status === 'Denied'
                            ? 'bg-red-50 text-red-800'
                            : 'bg-amber-50 text-amber-800 animate-pulse'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        {r.status === 'Pending' ? (
                          <>
                            <button 
                              onClick={() => handleRequestAction(r.id, 'Approved')}
                              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold flex inline-items items-center gap-1 transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button 
                              onClick={() => handleRequestAction(r.id, 'Denied')}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold flex inline-items items-center gap-1 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                              Deny
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-wedding-brown/40 italic">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </CoupleDashboardLayout>
  );
}
