import React, { useState, useEffect } from 'react';
import CoupleDashboardLayout from '../../components/CoupleDashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Edit, X, Calendar, MapPin, Sparkles } from 'lucide-react';

export default function Events() {
  const { apiRequest } = useAuth();
  const [events, setEvents] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Fields
  const [type, setType] = useState('Wedding');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageFile, setCoverImageFile] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const [resEvents, resReminders] = await Promise.all([
        apiRequest('/api/couple/events'),
        apiRequest('/api/couple/message-reminders')
      ]);

      if (resEvents.ok) {
        const data = await resEvents.json();
        setEvents(data);
      }
      if (resReminders.ok) {
        const rData = await resReminders.json();
        setReminders(rData.data || []);
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('type', type);
    formData.append('title', title);
    formData.append('date', date);
    formData.append('time', time);
    formData.append('venue', venue);
    formData.append('mapLink', mapLink);
    formData.append('dressCode', dressCode);
    formData.append('description', description);
    if (coverImageFile) {
      formData.append('coverImage', coverImageFile);
    }

    const API_BASE = import.meta.env.PROD ? 'https://eventmanagment-e3qo.onrender.com' : '';

    try {
      const res = await fetch(`${API_BASE}/api/couple/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('wedding_token')}`
        },
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess('Event created successfully!');
        setIsCreateOpen(false);
        // Clear
        setTitle('');
        setDate('');
        setTime('');
        setVenue('');
        setMapLink('');
        setDressCode('');
        setDescription('');
        setCoverImageFile(null);
        fetchEvents();
      } else {
        setError(data.error || 'Failed to create event.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('type', type);
    formData.append('title', title);
    formData.append('date', date);
    formData.append('time', time);
    formData.append('venue', venue);
    formData.append('mapLink', mapLink);
    formData.append('dressCode', dressCode);
    formData.append('description', description);
    if (coverImageFile) {
      formData.append('coverImage', coverImageFile);
    }

    const API_BASE = import.meta.env.PROD ? 'https://eventmanagment-e3qo.onrender.com' : '';

    try {
      const res = await fetch(`${API_BASE}/api/couple/events/${editingId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('wedding_token')}`
        },
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess('Event updated successfully!');
        setIsEditOpen(false);
        fetchEvents();
      } else {
        setError(data.error || 'Failed to update event.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this event? This will also remove associated guest RSVPs for this event.')) {
      return;
    }
    setError('');
    try {
      const res = await apiRequest(`/api/couple/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Event deleted.');
        fetchEvents();
      } else {
        setError('Failed to delete event.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const openEditModal = (evt) => {
    setEditingId(evt.id);
    setType(evt.type);
    setTitle(evt.title);
    setDate(evt.date);
    setTime(evt.time);
    setVenue(evt.venue);
    setMapLink(evt.mapLink || '');
    setDressCode(evt.dressCode || '');
    setDescription(evt.description || '');
    setCoverImageFile(null);
    setIsEditOpen(true);
  };

  return (
    <CoupleDashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-jost text-wedding-dark">Manage Events</h1>
          <p className="text-sm text-wedding-brown/70 mt-1">Configure Haldi, Sangeet, Wedding, and Reception sub-events</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="gold-button flex items-center gap-2 text-sm py-2">
          <Plus className="h-4 w-4" />
          Add Event
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

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsCreateOpen(false)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-wedding-dark font-jost mb-6">Create New Sub-Event</h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Event Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="wedding-input">
                    <option value="Haldi">Haldi</option>
                    <option value="Sangeet">Sangeet</option>
                    <option value="Mehendi">Mehendi</option>
                    <option value="Engagement">Engagement</option>
                    <option value="Wedding">Wedding</option>
                    <option value="Reception">Reception</option>
                    <option value="Custom">Custom Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Title Name</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="wedding-input" placeholder="e.g. Sangeet & Dance" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Date</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="wedding-input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Time</label>
                  <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="wedding-input" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Venue Address</label>
                <input type="text" required value={venue} onChange={(e) => setVenue(e.target.value)} className="wedding-input" placeholder="Resort Lawn, Hotel, etc." />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Map Link (Google Maps URI)</label>
                <input type="url" value={mapLink} onChange={(e) => setMapLink(e.target.value)} className="wedding-input" placeholder="https://maps.google.com/..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Dress Code</label>
                  <input type="text" value={dressCode} onChange={(e) => setDressCode(e.target.value)} className="wedding-input" placeholder="e.g. Bright Yellow" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Cover Photo (Optional)</label>
                  <input type="file" onChange={(e) => setCoverImageFile(e.target.files[0])} className="text-xs mt-1.5 block w-full text-wedding-brown" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Description / Notes</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="wedding-input" placeholder="Details about itinerary..." />
              </div>

              <button type="submit" className="gold-button w-full mt-4">Save Event</button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsEditOpen(false)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-wedding-dark font-jost mb-6">Edit Sub-Event</h3>

            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Event Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="wedding-input">
                    <option value="Haldi">Haldi</option>
                    <option value="Sangeet">Sangeet</option>
                    <option value="Mehendi">Mehendi</option>
                    <option value="Engagement">Engagement</option>
                    <option value="Wedding">Wedding</option>
                    <option value="Reception">Reception</option>
                    <option value="Custom">Custom Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Title Name</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="wedding-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Date</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="wedding-input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Time</label>
                  <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="wedding-input" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Venue Address</label>
                <input type="text" required value={venue} onChange={(e) => setVenue(e.target.value)} className="wedding-input" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Map Link (Google Maps URI)</label>
                <input type="url" value={mapLink} onChange={(e) => setMapLink(e.target.value)} className="wedding-input" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Dress Code</label>
                  <input type="text" value={dressCode} onChange={(e) => setDressCode(e.target.value)} className="wedding-input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Cover Photo (Optional)</label>
                  <input type="file" onChange={(e) => setCoverImageFile(e.target.files[0])} className="text-xs mt-1.5 block w-full text-wedding-brown" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Description / Notes</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="wedding-input" />
              </div>

              <button type="submit" className="gold-button w-full mt-4">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wedding-gold"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-white rounded-3xl border border-wedding-gold/10 p-6">
              <Calendar className="h-10 w-10 text-wedding-gold/40 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-wedding-dark">No Events Listed</h3>
              <p className="text-sm text-wedding-brown/70 mt-1 mb-4">You have not created any wedding timeline events yet.</p>
              <button onClick={() => setIsCreateOpen(true)} className="gold-button">Add Event</button>
            </div>
          ) : (
            events.map((evt) => (
              <div key={evt.id} className="wedding-card bg-white flex flex-col justify-between overflow-hidden relative group">
                {evt.coverImage && (
                  <div className="h-40 -mx-6 -mt-6 mb-4 overflow-hidden relative">
                    <img src={evt.coverImage} alt={evt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"></div>
                    <span className="absolute bottom-3 left-4 text-xs font-bold text-white bg-wedding-brown/75 px-2.5 py-1 rounded-full border border-white/20">
                      {evt.type}
                    </span>
                  </div>
                )}

                <div className={evt.coverImage ? '' : 'pt-4'}>
                  {!evt.coverImage && (
                    <span className="inline-block text-[10px] font-bold tracking-widest uppercase text-wedding-gold border border-wedding-gold/25 px-2.5 py-0.5 rounded-full mb-3">
                      {evt.type}
                    </span>
                  )}
                  <h3 className="text-xl font-bold font-jost text-wedding-dark mb-2">{evt.title}</h3>
                  <p className="text-xs text-wedding-brown/70 leading-relaxed mb-4">{evt.description || 'Join us to celebrate...'}</p>

                  <div className="space-y-2 text-xs text-wedding-brown/80 font-medium bg-wedding-beige/25 p-3 rounded-xl mb-4 border border-wedding-gold/5">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-wedding-gold" />
                      <span>{evt.date} @ {evt.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-wedding-gold" />
                      <span>{evt.venue}</span>
                    </div>
                    {evt.dressCode && (
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-wedding-gold" />
                        <span>Dress Code: <strong className="text-wedding-dark">{evt.dressCode}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* EVENT REMINDERS INTEGRATION */}
                  <div className="bg-wedding-beige/20 border border-wedding-gold/10 p-3 rounded-xl mb-4 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-wedding-dark">
                      <span>Event Reminders</span>
                      <span className="text-[10px] text-wedding-brown/60">
                        {reminders.filter(r => r.eventId === evt.id).length} Configured
                      </span>
                    </div>
                    {reminders.filter(r => r.eventId === evt.id).length === 0 ? (
                      <p className="text-[11px] text-wedding-brown/50 italic">No reminder schedule configured for this event.</p>
                    ) : (
                      reminders.filter(r => r.eventId === evt.id).map(r => (
                        <div key={r.id} className="text-[11px] bg-white p-2 rounded-lg border border-wedding-gold/10 flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-wedding-dark block">
                              Schedule: {r.timing === '7_days_before' ? '7 Days Before' : r.timing === '3_days_before' ? '3 Days Before' : r.timing === '1_day_before' ? '1 Day Before' : r.timing === '2_hours_before' ? '2 Hours Before' : r.timing === '30_mins_before' ? '30 Mins Before' : `${r.customMinutesBefore} Mins Before`}
                            </span>
                            <span className="text-[10px] text-wedding-brown/60 block">
                              Last Trigger: {r.lastTriggeredAt ? new Date(r.lastTriggeredAt).toLocaleString() : 'Not triggered yet'}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${r.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {r.isEnabled ? (r.status || 'Active') : 'Disabled'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-wedding-gold/10 pt-4 mt-auto">
                  {evt.mapLink && (
                    <a href={evt.mapLink} target="_blank" rel="noreferrer" className="outline-button text-xs py-1.5 px-3 mr-auto">
                      View Map
                    </a>
                  )}
                  <button onClick={() => openEditModal(evt)} className="p-2 hover:bg-wedding-beige rounded-xl text-wedding-brown transition-colors">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(evt.id)} className="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </CoupleDashboardLayout>
  );
}
