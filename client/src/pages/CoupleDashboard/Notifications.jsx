import React, { useState, useEffect } from 'react';
import CoupleDashboardLayout from '../../components/CoupleDashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, X, Bell, MessageSquare, Send, Calendar, Users, HelpCircle } from 'lucide-react';

export default function Notifications() {
  const { apiRequest } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [eventId, setEventId] = useState('');
  const [template, setTemplate] = useState('Dear {guestName}, you are cordially invited to our {eventName} at {venue} on {date} at {time}. See you there!');
  const [recipients, setRecipients] = useState('all');
  const [scheduledAt, setScheduledAt] = useState('');
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState('');

  // Pending Actions (e.g. WhatsApp send list)
  const [activePendingNotification, setActivePendingNotification] = useState(null);
  const [waLinks, setWaLinks] = useState({}); // maps guestId to waMeUrl

  const fetchData = async () => {
    setLoading(true);
    try {
      const notifRes = await apiRequest('/api/couple/notifications');
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data);
      }

      const eventsRes = await apiRequest('/api/couple/events');
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data);
      }

      const guestsRes = await apiRequest('/api/couple/guests?limit=1000');
      if (guestsRes.ok) {
        const data = await guestsRes.json();
        setGuests(data.guests || []);
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSchedule = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // If setting auto reminder minutes, calculate scheduled date relative to selected event
    let targetSchedule = scheduledAt;
    if (reminderMinutesBefore && eventId) {
      const selectedEvent = events.find(evt => evt.id === eventId);
      if (selectedEvent) {
        const eventDateStr = `${selectedEvent.date}T${convertTo24Hour(selectedEvent.time)}`;
        const eventDateObj = new Date(eventDateStr);
        // Subtract minutes
        const scheduleDateObj = new Date(eventDateObj.getTime() - parseInt(reminderMinutesBefore) * 60 * 1000);
        targetSchedule = scheduleDateObj.toISOString();
      } else {
        setError('Selected event not found for reminder subtraction.');
        return;
      }
    }

    if (!targetSchedule) {
      setError('Please provide a scheduled date and time.');
      return;
    }

    try {
      const res = await apiRequest('/api/couple/notifications', {
        method: 'POST',
        body: JSON.stringify({
          eventId: eventId || null,
          template,
          recipients,
          scheduledAt: targetSchedule,
          reminderMinutesBefore: reminderMinutesBefore ? parseInt(reminderMinutesBefore) : null
        })
      });
      if (res.ok) {
        setSuccess('Notification successfully scheduled!');
        setIsScheduleOpen(false);
        setEventId('');
        setTemplate('Dear {guestName}, you are cordially invited to our {eventName} at {venue} on {date} at {time}. See you there!');
        setRecipients('all');
        setScheduledAt('');
        setReminderMinutesBefore('');
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to schedule notification.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this scheduled notification?')) {
      return;
    }
    setError('');
    try {
      const res = await apiRequest(`/api/couple/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Scheduled notification cancelled.');
        fetchData();
      } else {
        setError('Failed to cancel notification.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  // Convert "10:00 AM" to "10:00" or "07:00 PM" to "19:00"
  const convertTo24Hour = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM' || modifier === 'pm') hours = parseInt(hours, 10) + 12;
    return `${hours}:${minutes}:00`;
  };

  const loadWhatsAppLinks = async (notification) => {
    setActivePendingNotification(notification);
    setWaLinks({});

    // Resolve guests invited to the event
    let targetGuests = guests.filter(g => {
      if (notification.recipients === 'bride-side') return g.side === 'Bride';
      if (notification.recipients === 'groom-side') return g.side === 'Groom';
      if (Array.isArray(notification.recipients)) return notification.recipients.includes(g.id);
      return true;
    });

    if (notification.eventId) {
      targetGuests = targetGuests.filter(g => g.inviteEvents && g.inviteEvents.includes(notification.eventId));
    }

    // Call API for each guest to generate wa.me link
    const links = {};
    for (const g of targetGuests) {
      try {
        const res = await apiRequest(`/api/couple/whatsapp-url/${notification.id}?guestId=${g.id}`);
        if (res.ok) {
          const data = await res.json();
          links[g.id] = data.waMeUrl;
        }
      } catch (err) {
        console.error(err);
      }
    }
    setWaLinks(links);
  };

  const handleSendAllWhatsApp = async () => {
    if (!activePendingNotification) return;

    const targetGuests = guests
      .filter(g => {
        if (activePendingNotification.recipients === 'bride-side') return g.side === 'Bride';
        if (activePendingNotification.recipients === 'groom-side') return g.side === 'Groom';
        return true;
      })
      .filter(g => !activePendingNotification.eventId || (g.inviteEvents && g.inviteEvents.includes(activePendingNotification.eventId)));

    let openedCount = 0;
    targetGuests.forEach(g => {
      const link = waLinks[g.id];
      if (link) {
        window.open(link, '_blank');
        openedCount++;
      }
    });

    if (openedCount === 0) {
      alert("No WhatsApp links generated yet. Please wait a moment.");
      return;
    }

    try {
      const res = await apiRequest(`/api/couple/notifications/${activePendingNotification.id}/sent`, {
        method: 'POST'
      });
      if (res.ok) {
        setSuccess('WhatsApp invitations shared! Notification status updated to Sent.');
        fetchData();
        setActivePendingNotification(null);
      } else {
        setError('Failed to update notification status on server.');
      }
    } catch (err) {
      setError('Network error updating status.');
    }
  };

  const getRecipientsLabel = (recipientsVal) => {
    if (recipientsVal === 'all') return 'All Guests';
    if (recipientsVal === 'bride-side') return "Bride's Side";
    if (recipientsVal === 'groom-side') return "Groom's Side";
    return 'Selected Guests';
  };

  return (
    <CoupleDashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-jost text-wedding-dark">Message Scheduler</h1>
          <p className="text-sm text-wedding-brown/70 mt-1">Broadcast WhatsApp invitations and reminders to your guest lists</p>
        </div>
        <button onClick={() => setIsScheduleOpen(true)} className="gold-button flex items-center gap-2 text-sm py-2">
          <Plus className="h-4 w-4" />
          Schedule Message
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

      {/* SCHEDULE MODAL */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsScheduleOpen(false)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-wedding-dark font-jost mb-6">Schedule Notification</h3>

            <form onSubmit={handleSchedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Channel</label>
                  <div className="wedding-input flex items-center gap-2 bg-green-50 text-green-800 border-green-200">
                    <MessageSquare className="h-4 w-4" /> WhatsApp only
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Recipients Group</label>
                  <select value={recipients} onChange={(e) => setRecipients(e.target.value)} className="wedding-input">
                    <option value="all">All Guests</option>
                    <option value="bride-side">Bride's Side</option>
                    <option value="groom-side">Groom's Side</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Associated Event</label>
                <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="wedding-input">
                  <option value="">No Event Link (General Announcement)</option>
                  {events.map(evt => (
                    <option key={evt.id} value={evt.id}>{evt.title}</option>
                  ))}
                </select>
              </div>

              {eventId && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-wedding-beige/25 border border-wedding-gold/10 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-wedding-brown/60 mb-1">Reminder Timing</label>
                    <select 
                      value={reminderMinutesBefore} 
                      onChange={(e) => { setReminderMinutesBefore(e.target.value); setScheduledAt(''); }}
                      className="wedding-input py-1 text-xs"
                    >
                      <option value="">Send at exact Date & Time below</option>
                      <option value="30">30 minutes before Event</option>
                      <option value="45">45 minutes before Event</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <p className="text-[10px] leading-relaxed text-wedding-brown/70 mt-4">
                      Automated reminder will sync schedule time relative to the event start.
                    </p>
                  </div>
                </div>
              )}

              {!reminderMinutesBefore && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Date & Time to Send</label>
                  <input 
                    type="datetime-local" 
                    required 
                    value={scheduledAt} 
                    onChange={(e) => setScheduledAt(e.target.value)} 
                    className="wedding-input" 
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70">Message Template</label>
                  <span className="text-[9px] text-wedding-brown/50 font-bold">Tokens: {"{guestName}"}, {"{eventName}"}, {"{venue}"}, {"{time}"}</span>
                </div>
                <textarea 
                  rows={4} 
                  required
                  value={template} 
                  onChange={(e) => setTemplate(e.target.value)} 
                  className="wedding-input text-xs"
                />
              </div>

              <button type="submit" className="gold-button w-full mt-4">Schedule Queue Broadcast</button>
            </form>
          </div>
        </div>
      )}

      {/* WHATSAPP CLICK-ACTION BROADCASTER MODAL */}
      {activePendingNotification && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-lg w-full relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setActivePendingNotification(null)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-wedding-dark font-jost mb-2">WhatsApp Queue Actions</h3>
            <p className="text-xs text-wedding-brown/70 mb-4">
              WhatsApp does not support background silent sending. Click "Send" below to open prefilled text in a new tab.
            </p>

            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex flex-col items-center text-center gap-3">
              <p className="text-xs text-green-800 font-semibold">
                Tip: You can open WhatsApp links for all guests in this list at once! (Please allow browser pop-ups).
              </p>
              <button 
                onClick={handleSendAllWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all shadow-md flex items-center gap-2 transform active:scale-95"
              >
                <Send className="h-4 w-4" />
                Send All at Once (Open All Tabs)
              </button>
            </div>

            <div className="space-y-3">
              {guests
                .filter(g => {
                  if (activePendingNotification.recipients === 'bride-side') return g.side === 'Bride';
                  if (activePendingNotification.recipients === 'groom-side') return g.side === 'Groom';
                  if (Array.isArray(activePendingNotification.recipients)) return activePendingNotification.recipients.includes(g.id);
                  return true;
                })
                .filter(g => !activePendingNotification.eventId || (g.inviteEvents && g.inviteEvents.includes(activePendingNotification.eventId)))
                .map(g => (
                  <div key={g.id} className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-wedding-gold/5 shadow-sm">
                    <div>
                      <p className="text-sm font-semibold text-wedding-dark">{g.name}</p>
                      <p className="text-xs text-wedding-brown/50 font-mono mt-0.5">{g.mobile}</p>
                    </div>
                    {waLinks[g.id] ? (
                      <a 
                        href={waLinks[g.id]} 
                        target="_blank" 
                        rel="noreferrer"
                        onClick={() => {
                          // Optionally, we can save/mark as sent locally, but this is a deep link trigger
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Send className="h-3 w-3" />
                        Send Now
                      </a>
                    ) : (
                      <span className="text-[10px] text-wedding-brown/40 italic">Generating...</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* QUEUE LISTING */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wedding-gold"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-bold font-jost text-wedding-dark mb-4">Message Queue Status</h3>
          {notifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-wedding-gold/10 p-6">
              <MessageSquare className="h-10 w-10 text-wedding-gold/40 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-wedding-dark">Queue is Empty</h3>
              <p className="text-sm text-wedding-brown/70 mt-1">Configure scheduled notifications for your wedding timeline events.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div key={notif.id} className="wedding-card bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                <div className="floral-corner-tl opacity-30"></div>
                
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-green-100 text-green-800">
                      WhatsApp
                    </span>
                    <span className="text-xs text-wedding-brown/50 font-medium">To: {getRecipientsLabel(notif.recipients)}</span>
                  </div>

                  <p className="text-sm font-medium text-wedding-dark font-mono italic p-2 bg-wedding-beige/10 rounded-lg max-w-2xl border border-wedding-gold/5 leading-relaxed">
                    "{notif.template}"
                  </p>

                  <div className="flex gap-4 text-[10px] font-bold text-wedding-brown/50 uppercase tracking-wider mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Scheduled: {new Date(notif.scheduledAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    notif.status === 'Sent'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : notif.status === 'Pending-Action'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                      : notif.status === 'Failed'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {notif.status}
                  </span>

                  {notif.status === 'Pending-Action' && notif.channel === 'WhatsApp' && (
                    <button 
                      onClick={() => loadWhatsAppLinks(notif)}
                      className="gold-button text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Send className="h-3 w-3" />
                      Send Queue
                    </button>
                  )}

                  {notif.status === 'Scheduled' && (
                    <button 
                      onClick={() => handleCancel(notif.id)}
                      className="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors"
                      title="Cancel Notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </CoupleDashboardLayout>
  );
}
