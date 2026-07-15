import React, { useState, useEffect } from 'react';
import CoupleDashboardLayout from '../../components/CoupleDashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Edit, X, Upload, Search, Users, Download, HelpCircle, Check, AlertCircle } from 'lucide-react';

export default function Guests() {
  const { apiRequest, user } = useAuth();
  
  // Data States
  const [guests, setGuests] = useState([]);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [search, setSearch] = useState('');
  
  // Success/Error Feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [hostGroup, setHostGroup] = useState('HOST_A');
  const [group, setGroup] = useState('Friends');
  const [invitedEventIds, setInvitedEventIds] = useState([]);
  const [csvText, setCsvText] = useState('');
  const [invitationType, setInvitationType] = useState('Sahjode');
  const [invitationTypeFilter, setInvitationTypeFilter] = useState('');

  const fetchGuestsAndEvents = async () => {
    setLoading(true);
    try {
      // 1. Fetch Events for RSVP matrix
      const eventsRes = await apiRequest('/api/couple/events');
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
      }

      // 2. Fetch Guests (paginated + search)
      const guestsRes = await apiRequest(`/api/couple/guests?page=${page}&limit=20&search=${search}&invitationType=${invitationTypeFilter}`);
      if (guestsRes.ok) {
        const guestsData = await guestsRes.json();
        setGuests(guestsData.guests || []);
        setTotal(guestsData.total || 0);
        setPages(guestsData.pages || 1);
      } else {
        setError('Failed to fetch guest list.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuestsAndEvents();
  }, [page, search, invitationTypeFilter]);

  const handleAddGuest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await apiRequest('/api/couple/guests', {
        method: 'POST',
        body: JSON.stringify({ name, mobile, email, hostGroup, group, inviteEvents: invitedEventIds, invitationType })
      });
      if (res.ok) {
        setSuccess(`Guest "${name}" added!`);
        setIsAddOpen(false);
        // Clear
        setName('');
        setMobile('');
        setEmail('');
        setHostGroup('HOST_A');
        setGroup('Friends');
        setInvitedEventIds([]);
        setInvitationType('Sahjode');
        fetchGuestsAndEvents();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add guest.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleEditGuest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await apiRequest(`/api/couple/guests/${editingGuest.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          name, 
          mobile, 
          email, 
          hostGroup, 
          group, 
          inviteEvents: invitedEventIds,
          invitationType,
          // Retain existing RSVPs unless changed
          rsvpStatus: editingGuest.rsvpStatus 
        })
      });
      if (res.ok) {
        setSuccess('Guest updated successfully.');
        setIsEditOpen(false);
        setEditingGuest(null);
        fetchGuestsAndEvents();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update guest.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleDeleteGuest = async (id) => {
    if (!confirm('Are you sure you want to remove this guest from the invitation list?')) {
      return;
    }
    setError('');
    try {
      const res = await apiRequest(`/api/couple/guests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Guest removed.');
        fetchGuestsAndEvents();
      } else {
        setError('Failed to delete guest.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await apiRequest('/api/couple/guests/bulk', {
        method: 'POST',
        body: JSON.stringify({ csvText })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || 'Import successful!');
        setIsBulkOpen(false);
        setCsvText('');
        fetchGuestsAndEvents();
      } else {
        setError(data.error || 'Bulk upload failed.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleFileChange = (e) => {
    setError('');
    setSuccess('');
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvText(text);
      setSuccess(`Successfully loaded "${file.name}"! Click "Process Guest List" to import.`);
    };
    reader.readAsText(file);
  };

  const toggleEventInvite = (eventId) => {
    setInvitedEventIds(prev => 
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const openEditModal = (guest) => {
    setEditingGuest(guest);
    setName(guest.name);
    setMobile(guest.mobile);
    setEmail(guest.email || '');
    setHostGroup(guest.hostGroup || 'HOST_A');
    setGroup(guest.group);
    setInvitedEventIds(guest.inviteEvents || []);
    setInvitationType(guest.invitationType || 'Sahjode');
    setIsEditOpen(true);
  };

  const exportCSVTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,mobile,email,hostGroup,group\nJane Doe,9876543210,jane@example.com,HOST_A,Family\nJohn Smith,9123456789,john@example.com,HOST_B,Friends";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "guests_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fast inline RSVP toggler for easy admin management
  const toggleInlineRsvp = async (guest, eventId, currentStatus) => {
    const nextStatus = currentStatus === 'Yes' ? 'No' : currentStatus === 'No' ? 'Pending' : 'Yes';
    const updatedRsvp = {
      ...guest.rsvpStatus,
      [eventId]: nextStatus
    };

    try {
      const res = await apiRequest(`/api/couple/guests/${guest.id}`, {
        method: 'PUT',
        body: JSON.stringify({ rsvpStatus: updatedRsvp })
      });
      if (res.ok) {
        fetchGuestsAndEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <CoupleDashboardLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-jost text-wedding-dark">Guest List & RSVPs</h1>
          <p className="text-sm text-wedding-brown/70 mt-1">Onboard guests, manage invitations, and track RSVP matrix</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSVTemplate} className="outline-button flex items-center gap-2 text-xs py-2 px-3">
            <Download className="h-4 w-4" />
            CSV Template
          </button>
          <button onClick={() => setIsBulkOpen(true)} className="outline-button flex items-center gap-2 text-xs py-2 px-3">
            <Upload className="h-4 w-4" />
            Bulk CSV Import
          </button>
          <button onClick={() => {
            setHostGroup(user?.hostGroup || 'HOST_A');
            setIsAddOpen(true);
          }} className="gold-button flex items-center gap-2 text-xs py-2 px-3">
            <Plus className="h-4 w-4" />
            Add Guest
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

      {/* FILTER SEARCH BAR & DROPDOWN */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="wedding-card bg-white p-4 flex-1 flex gap-4 items-center">
          <Search className="h-5 w-5 text-wedding-gold shrink-0" />
          <input 
            type="text" 
            placeholder="Search guests by name..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border-none bg-transparent w-full focus:outline-none text-wedding-dark placeholder-wedding-brown/40"
          />
        </div>
        <div className="wedding-card bg-white p-4 flex items-center shrink-0 min-w-[200px]">
          <select
            value={invitationTypeFilter}
            onChange={(e) => { setInvitationTypeFilter(e.target.value); setPage(1); }}
            className="w-full bg-transparent border-none focus:outline-none text-sm font-semibold text-wedding-dark cursor-pointer"
          >
            <option value="">All Invitation Types</option>
            <option value="Sahjode">Sahjode (Couple)</option>
            <option value="Sarva">Sarva (Entire Family)</option>
          </select>
        </div>
      </div>

      {/* BULK CSV IMPORT MODAL */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-lg w-full relative">
            <button onClick={() => setIsBulkOpen(false)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-wedding-dark font-jost mb-4">Bulk Import Guests</h3>
            <p className="text-xs text-wedding-brown/70 mb-4 leading-relaxed">
              Paste comma-separated rows. Required headers: <strong className="text-wedding-dark">name</strong> and <strong className="text-wedding-dark">mobile</strong>. 
              Optional headers: email, side, group.
            </p>

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-2">Upload Excel / CSV File</label>
                <div className="border-2 border-dashed border-wedding-gold/20 hover:border-wedding-gold/45 rounded-2xl p-4 text-center hover:bg-wedding-beige/10 transition-all cursor-pointer relative group">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange} 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  <Upload className="h-6 w-6 text-wedding-gold group-hover:text-wedding-brown mx-auto mb-2 transition-colors" />
                  <p className="text-xs font-semibold text-wedding-dark group-hover:text-wedding-brown transition-colors">Click or Drag CSV file here</p>
                  <p className="text-[10px] text-wedding-brown/50 mt-1">Accepts standard .csv files exported from Excel</p>
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-wedding-gold/10"></div>
                <span className="flex-shrink mx-4 text-[10px] text-wedding-brown/40 uppercase font-bold">Or Paste Raw CSV Data Below</span>
                <div className="flex-grow border-t border-wedding-gold/10"></div>
              </div>

              <textarea 
                rows={5} 
                required
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="name,mobile,email,hostGroup,group&#10;Karan Sharma,9999911111,karan@gmail.com,HOST_B,Friends&#10;Asha Patel,8888822222,,HOST_A,Family"
                className="wedding-input font-mono text-xs"
              />
              <button type="submit" className="gold-button w-full">Process Guest List</button>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL ADD MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-md w-full relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsAddOpen(false)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-wedding-dark font-jost mb-6">Add New Guest</h3>

            <form onSubmit={handleAddGuest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Full Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="wedding-input" placeholder="Guest Name" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Mobile number</label>
                <input type="text" required value={mobile} onChange={(e) => setMobile(e.target.value)} className="wedding-input" placeholder="e.g. 9876543210" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Invitation Type</label>
                <select value={invitationType} onChange={(e) => setInvitationType(e.target.value)} className="wedding-input" required>
                  <option value="Sahjode">Sahjode (Couple)</option>
                  <option value="Sarva">Sarva (Entire Family)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Host Group</label>
                  {user?.hostGroup ? (
                    <input 
                      type="text" 
                      readOnly 
                      value={user.hostGroup === 'HOST_B' ? (user.hostGroupBName || 'Groom Family') : (user.hostGroupAName || 'Bride Family')} 
                      className="wedding-input bg-wedding-beige/10 cursor-not-allowed font-medium text-wedding-dark"
                    />
                  ) : (
                    <select value={hostGroup} onChange={(e) => setHostGroup(e.target.value)} className="wedding-input">
                      <option value="HOST_A">{user?.hostGroupAName || 'HOST A'}</option>
                      <option value="HOST_B">{user?.hostGroupBName || 'HOST B'}</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Tag Group</label>
                  <select value={group} onChange={(e) => setGroup(e.target.value)} className="wedding-input">
                    <option value="Family">Family</option>
                    <option value="Friends">Friends</option>
                    <option value="VIP">VIP</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Event check list */}
              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-2">Invite to Events</label>
                <div className="space-y-2 border border-wedding-gold/15 bg-white rounded-xl p-3 max-h-40 overflow-y-auto">
                  {events.length === 0 ? (
                    <p className="text-xs text-wedding-brown/50 italic">No events created yet.</p>
                  ) : (
                    events.map(evt => (
                      <label key={evt.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-wedding-dark hover:text-wedding-brown">
                        <input 
                          type="checkbox" 
                          checked={invitedEventIds.includes(evt.id)}
                          onChange={() => toggleEventInvite(evt.id)}
                          className="accent-wedding-brown"
                        />
                        {evt.title}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button type="submit" className="gold-button w-full mt-4">Save Guest</button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-md w-full relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setIsEditOpen(false); setEditingGuest(null); }} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-wedding-dark font-jost mb-6">Edit Guest Details</h3>

            <form onSubmit={handleEditGuest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Full Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="wedding-input" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Mobile number</label>
                <input type="text" required value={mobile} onChange={(e) => setMobile(e.target.value)} className="wedding-input" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Invitation Type</label>
                <select value={invitationType} onChange={(e) => setInvitationType(e.target.value)} className="wedding-input" required>
                  <option value="Sahjode">Sahjode (Couple)</option>
                  <option value="Sarva">Sarva (Entire Family)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Host Group</label>
                  {user?.hostGroup ? (
                    <input 
                      type="text" 
                      readOnly 
                      value={user.hostGroup === 'HOST_B' ? (user.hostGroupBName || 'Groom Family') : (user.hostGroupAName || 'Bride Family')} 
                      className="wedding-input bg-wedding-beige/10 cursor-not-allowed font-medium text-wedding-dark"
                    />
                  ) : (
                    <select value={hostGroup} onChange={(e) => setHostGroup(e.target.value)} className="wedding-input">
                      <option value="HOST_A">{user?.hostGroupAName || 'HOST A'}</option>
                      <option value="HOST_B">{user?.hostGroupBName || 'HOST B'}</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Tag Group</label>
                  <select value={group} onChange={(e) => setGroup(e.target.value)} className="wedding-input">
                    <option value="Family">Family</option>
                    <option value="Friends">Friends</option>
                    <option value="VIP">VIP</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Event check list */}
              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-2">Invite to Events</label>
                <div className="space-y-2 border border-wedding-gold/15 bg-white rounded-xl p-3 max-h-40 overflow-y-auto">
                  {events.map(evt => (
                    <label key={evt.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-wedding-dark hover:text-wedding-brown">
                      <input 
                        type="checkbox" 
                        checked={invitedEventIds.includes(evt.id)}
                        onChange={() => toggleEventInvite(evt.id)}
                        className="accent-wedding-brown"
                      />
                      {evt.title}
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="gold-button w-full mt-4">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* GUEST MATRIX TABLE */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wedding-gold"></div>
        </div>
      ) : (
        <div className="bg-wedding-cream rounded-3xl border border-wedding-gold/15 overflow-hidden shadow-wedding">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-wedding-gold/10">
              <thead className="bg-wedding-brown/5 text-wedding-brown/80 text-xs font-semibold uppercase">
                <tr>
                  <th className="px-6 py-4 text-left">Guest Name & Host Group</th>
                  <th className="px-6 py-4 text-left">Phone & Group</th>
                  <th className="px-6 py-4 text-left">Invitation Type</th>
                  {/* Dynamic Event Columns for RSVP status */}
                  {events.map(evt => (
                    <th key={evt.id} className="px-4 py-4 text-center font-jost normal-case truncate max-w-[120px]" title={evt.title}>
                      {evt.title}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wedding-gold/10 bg-white text-sm">
                {guests.length === 0 ? (
                  <tr>
                    <td colSpan={5 + events.length} className="px-6 py-12 text-center text-wedding-brown/50 italic">
                      No guests onboarded. Click "Add Guest" or import via CSV to start!
                    </td>
                  </tr>
                ) : (
                  guests.map((g) => (
                    <tr key={g.id} className="hover:bg-wedding-beige/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-semibold text-wedding-dark">{g.name}</p>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                          (g.hostGroup === 'HOST_B' || g.side === 'Groom') ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-pink-50 text-pink-700 border border-pink-200'
                        }`}>
                          {(g.hostGroup === 'HOST_B' || g.side === 'Groom') ? (user?.hostGroupBName || 'Groom Family') : (user?.hostGroupAName || 'Bride Family')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-mono text-xs text-wedding-brown/80">{g.mobile}</p>
                        <span className="text-[10px] text-wedding-brown/50 font-bold uppercase">{g.group}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          g.invitationType === 'Sarva'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {g.invitationType || 'Sahjode'}
                        </span>
                      </td>

                      {/* Render event columns status */}
                      {events.map(evt => {
                        const isInvited = g.inviteEvents && g.inviteEvents.includes(evt.id);
                        const rsvpVal = g.rsvpStatus ? g.rsvpStatus[evt.id] : 'Pending';

                        return (
                          <td key={evt.id} className="px-4 py-4 whitespace-nowrap text-center">
                            {isInvited ? (
                              <button 
                                onClick={() => toggleInlineRsvp(g, evt.id, rsvpVal || 'Pending')}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all border ${
                                  rsvpVal === 'Yes'
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : rsvpVal === 'No'
                                    ? 'bg-red-50 border-red-200 text-red-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                }`}
                                title="Click to cycle RSVP status manually"
                              >
                                {rsvpVal || 'Pending'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-300 italic font-medium">Not Invited</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                        <button onClick={() => openEditModal(g)} className="p-2 hover:bg-wedding-beige rounded-xl text-wedding-brown transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteGuest(g.id)} className="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-wedding-brown/5 border-t border-wedding-gold/10">
              <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} className="outline-button py-1 text-xs">
                Previous
              </button>
              <span className="text-xs text-wedding-brown/70 font-medium">Page {page} of {pages} (Total: {total})</span>
              <button onClick={() => setPage(p => Math.min(p + 1, pages))} disabled={page === pages} className="outline-button py-1 text-xs">
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </CoupleDashboardLayout>
  );
}
