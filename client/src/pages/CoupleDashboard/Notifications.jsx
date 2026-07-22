import React, { useState, useEffect } from 'react';
import CoupleDashboardLayout from '../../components/CoupleDashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, Trash2, X, Bell, MessageSquare, Send, Calendar, Users, HelpCircle, FileText, 
  CheckCircle, Clock, AlertTriangle, RefreshCw, Copy, Check, Filter, Layers, Edit, Sparkles 
} from 'lucide-react';

export default function Notifications() {
  const { apiRequest, role, user } = useAuth();
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'scheduled' | 'reminders' | 'broadcast' | 'logs'
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [guests, setGuests] = useState([]);
  const [couple, setCouple] = useState(null);
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [messageReminders, setMessageReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Template Form Dialog
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [messageType, setMessageType] = useState('Invitation');
  const [templateAudience, setTemplateAudience] = useState('all');
  const [messageContent, setMessageContent] = useState('');
  const [autoAttachInvitation, setAutoAttachInvitation] = useState(false);
  const [isTemplateActive, setIsTemplateActive] = useState(true);

  // Reminder Form Dialog
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [reminderEventId, setReminderEventId] = useState('');
  const [reminderTemplateId, setReminderTemplateId] = useState('');
  const [reminderTiming, setReminderTiming] = useState('1_day_before');
  const [customMinutesBefore, setCustomMinutesBefore] = useState('60');
  const [isReminderEnabled, setIsReminderEnabled] = useState(true);

  // Broadcast / Schedule Form Dialog
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleEventId, setScheduleEventId] = useState('');
  const [scheduleTemplateText, setScheduleTemplateText] = useState('');
  const [scheduleRecipients, setScheduleRecipients] = useState('all');
  const [selectedGuestIds, setSelectedGuestIds] = useState([]);
  const [scheduledAt, setScheduledAt] = useState('');

  // WhatsApp Pending Send List Modal
  const [activePendingNotification, setActivePendingNotification] = useState(null);
  const [waLinks, setWaLinks] = useState({});
  const [selectedSendGuests, setSelectedSendGuests] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notifRes, eventsRes, guestsRes, coupleRes, templatesRes, remindersRes] = await Promise.all([
        apiRequest('/api/couple/notifications'),
        apiRequest('/api/couple/events'),
        apiRequest('/api/couple/guests?limit=1000'),
        apiRequest('/api/couple/profile'),
        apiRequest('/api/couple/message-templates'),
        apiRequest('/api/couple/message-reminders')
      ]);

      if (notifRes.ok) setNotifications(await notifRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (guestsRes.ok) {
        const gData = await guestsRes.json();
        setGuests(gData.guests || []);
      }
      if (coupleRes.ok) setCouple(await coupleRes.json());
      if (templatesRes.ok) {
        const tData = await templatesRes.json();
        setMessageTemplates(tData.data || []);
      }
      if (remindersRes.ok) {
        const rData = await remindersRes.json();
        setMessageReminders(rData.data || []);
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

  // Summary Counts
  const upcomingScheduledCount = notifications.filter(n => n.status === 'Scheduled').length;
  const pendingRemindersCount = notifications.filter(n => n.status === 'Pending-Action').length;
  const todayCount = notifications.filter(n => {
    if (!n.scheduledAt) return false;
    const d = new Date(n.scheduledAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;
  const failedDeliveriesCount = notifications.filter(n => n.status === 'Failed').length;

  // --- MESSAGE TEMPLATES CRUD ---
  const openTemplateModal = (templateToEdit = null) => {
    if (templateToEdit) {
      setEditingTemplateId(templateToEdit.id);
      setTemplateName(templateToEdit.templateName || '');
      setMessageType(templateToEdit.messageType || 'Invitation');
      setTemplateAudience(templateToEdit.audience || 'all');
      setMessageContent(templateToEdit.messageContent || '');
      setAutoAttachInvitation(!!templateToEdit.autoAttachInvitation);
      setIsTemplateActive(templateToEdit.isActive !== false);
    } else {
      setEditingTemplateId(null);
      setTemplateName('');
      setMessageType('Invitation');
      setTemplateAudience('all');
      setMessageContent('Dear {{guestName}}, you are cordially invited to {{eventName}} at {{venue}} on {{eventDate}} at {{eventTime}}. Portal: {{guestPortal}}');
      setAutoAttachInvitation(false);
      setIsTemplateActive(true);
    }
    setIsTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      templateName,
      messageType,
      audience: templateAudience,
      messageContent,
      autoAttachInvitation,
      isActive: isTemplateActive
    };

    try {
      const url = editingTemplateId 
        ? `/api/couple/message-templates/${editingTemplateId}`
        : '/api/couple/message-templates';
      const method = editingTemplateId ? 'PUT' : 'POST';

      const res = await apiRequest(url, { method, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Template ${editingTemplateId ? 'updated' : 'created'} successfully.`);
        setIsTemplateDialogOpen(false);
        fetchData();
      } else {
        setError(data.message || data.error || 'Failed to save template.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await apiRequest(`/api/couple/message-templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Template deleted.');
        fetchData();
      } else {
        setError('Failed to delete template.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleToggleTemplateStatus = async (id, currentStatus) => {
    try {
      const res = await apiRequest(`/api/couple/message-templates/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  // --- EVENT REMINDERS CRUD ---
  const openReminderModal = (reminderToEdit = null) => {
    if (reminderToEdit) {
      setEditingReminderId(reminderToEdit.id);
      setReminderEventId(reminderToEdit.eventId || '');
      setReminderTemplateId(reminderToEdit.templateId || '');
      setReminderTiming(reminderToEdit.timing || '1_day_before');
      setCustomMinutesBefore(reminderToEdit.customMinutesBefore ? String(reminderToEdit.customMinutesBefore) : '60');
      setIsReminderEnabled(reminderToEdit.isEnabled !== false);
    } else {
      setEditingReminderId(null);
      setReminderEventId(events[0]?.id || '');
      setReminderTemplateId(messageTemplates[0]?.id || '');
      setReminderTiming('1_day_before');
      setCustomMinutesBefore('60');
      setIsReminderEnabled(true);
    }
    setIsReminderDialogOpen(true);
  };

  const handleSaveReminder = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      eventId: reminderEventId,
      templateId: reminderTemplateId,
      timing: reminderTiming,
      customMinutesBefore: reminderTiming === 'custom' ? parseInt(customMinutesBefore, 10) : null,
      isEnabled: isReminderEnabled
    };

    try {
      const res = await apiRequest('/api/couple/message-reminders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Event reminder configured.');
        setIsReminderDialogOpen(false);
        fetchData();
      } else {
        setError(data.message || data.error || 'Failed to save reminder.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleDeleteReminder = async (id) => {
    if (!confirm('Are you sure you want to delete this event reminder configuration?')) return;
    try {
      const res = await apiRequest(`/api/couple/message-reminders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Reminder configuration deleted.');
        fetchData();
      } else {
        setError('Failed to delete reminder.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  // --- BROADCAST / SCHEDULE MESSAGES ---
  const handleScheduleBroadcast = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!scheduledAt) {
      setError('Scheduled date & time is required.');
      return;
    }

    try {
      const res = await apiRequest('/api/couple/notifications', {
        method: 'POST',
        body: JSON.stringify({
          eventId: scheduleEventId || null,
          template: scheduleTemplateText,
          recipients: scheduleRecipients === 'selected' ? selectedGuestIds : scheduleRecipients,
          scheduledAt
        })
      });

      if (res.ok) {
        setSuccess('Broadcast message scheduled successfully!');
        setIsScheduleOpen(false);
        setScheduleEventId('');
        setScheduleTemplateText('');
        setScheduleRecipients('all');
        setSelectedGuestIds([]);
        setScheduledAt('');
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to schedule broadcast.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleCancelNotification = async (id) => {
    if (!confirm('Cancel this scheduled notification?')) return;
    try {
      const res = await apiRequest(`/api/couple/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Scheduled notification cancelled.');
        fetchData();
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  // --- WHATSAPP DEEP-LINK DISPATCH ---
  const loadWhatsAppLinks = async (notification) => {
    setError('');
    setSuccess('');

    let targetGuests = guests.filter(g => {
      if (notification.recipients === 'HOST_A' || notification.recipients === 'bride-side') {
        return g.hostGroup === 'HOST_A' || g.side === 'Bride';
      }
      if (notification.recipients === 'HOST_B' || notification.recipients === 'groom-side') {
        return g.hostGroup === 'HOST_B' || g.side === 'Groom';
      }
      if (Array.isArray(notification.recipients)) return notification.recipients.includes(g.id);
      return true;
    });

    if (notification.eventId) {
      targetGuests = targetGuests.filter(g => g.inviteEvents && g.inviteEvents.includes(notification.eventId));
    }

    setActivePendingNotification(notification);
    setWaLinks({});

    const initialSelection = {};
    targetGuests.forEach(g => { initialSelection[g.id] = true; });
    setSelectedSendGuests(initialSelection);

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

  const handleMarkNotificationSent = async (id) => {
    try {
      const res = await apiRequest(`/api/couple/notifications/${id}/sent`, { method: 'POST' });
      if (res.ok) {
        setSuccess('Notification marked as sent.');
        setActivePendingNotification(null);
        fetchData();
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const insertPlaceholder = (tag) => {
    setMessageContent(prev => `${prev} ${tag}`);
  };

  return (
    <CoupleDashboardLayout>
      {/* HEADER & TITLE */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-jost text-wedding-dark">Communication Center</h1>
          <p className="text-sm text-wedding-brown/70 mt-1">Manage templates, automated reminders, broadcast messages, and delivery logs</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => openTemplateModal()} className="gold-button flex items-center gap-2 text-xs py-2 px-4">
            <Plus className="h-4 w-4" /> Create Template
          </button>
          <button onClick={() => setIsScheduleOpen(true)} className="outline-button flex items-center gap-2 text-xs py-2 px-4">
            <Send className="h-4 w-4" /> Send Broadcast
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl text-sm text-red-700 mb-6">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-xl text-sm text-green-700 mb-6">
          {success}
        </div>
      )}

      {/* DASHBOARD SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="wedding-card bg-white p-5 flex items-center gap-4 border border-wedding-gold/10 shadow-sm">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/60">Scheduled Messages</p>
            <h3 className="text-2xl font-bold font-jost text-wedding-dark mt-0.5">{upcomingScheduledCount}</h3>
          </div>
        </div>

        <div className="wedding-card bg-white p-5 flex items-center gap-4 border border-wedding-gold/10 shadow-sm">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/60">Pending Action Queue</p>
            <h3 className="text-2xl font-bold font-jost text-amber-600 mt-0.5">{pendingRemindersCount}</h3>
          </div>
        </div>

        <div className="wedding-card bg-white p-5 flex items-center gap-4 border border-wedding-gold/10 shadow-sm">
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/60">Today's Notifications</p>
            <h3 className="text-2xl font-bold font-jost text-purple-600 mt-0.5">{todayCount}</h3>
          </div>
        </div>

        <div className="wedding-card bg-white p-5 flex items-center gap-4 border border-wedding-gold/10 shadow-sm">
          <div className="p-3.5 bg-red-50 text-red-600 rounded-2xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/60">Failed Deliveries</p>
            <h3 className="text-2xl font-bold font-jost text-red-600 mt-0.5">{failedDeliveriesCount}</h3>
          </div>
        </div>
      </div>

      {/* WORKSPACE NAVIGATION TABS */}
      <div className="flex border-b border-wedding-gold/20 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'border-wedding-gold text-wedding-gold bg-wedding-gold/5 rounded-t-xl'
              : 'border-transparent text-wedding-brown/70 hover:text-wedding-dark'
          }`}
        >
          <FileText className="h-4 w-4" /> Message Templates ({messageTemplates.length})
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'scheduled'
              ? 'border-wedding-gold text-wedding-gold bg-wedding-gold/5 rounded-t-xl'
              : 'border-transparent text-wedding-brown/70 hover:text-wedding-dark'
          }`}
        >
          <Clock className="h-4 w-4" /> Scheduled Queue ({notifications.filter(n => n.status !== 'Sent').length})
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'reminders'
              ? 'border-wedding-gold text-wedding-gold bg-wedding-gold/5 rounded-t-xl'
              : 'border-transparent text-wedding-brown/70 hover:text-wedding-dark'
          }`}
        >
          <Bell className="h-4 w-4" /> Event Reminders ({messageReminders.length})
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'broadcast'
              ? 'border-wedding-gold text-wedding-gold bg-wedding-gold/5 rounded-t-xl'
              : 'border-transparent text-wedding-brown/70 hover:text-wedding-dark'
          }`}
        >
          <Send className="h-4 w-4" /> Broadcast Messages
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'border-wedding-gold text-wedding-gold bg-wedding-gold/5 rounded-t-xl'
              : 'border-transparent text-wedding-brown/70 hover:text-wedding-dark'
          }`}
        >
          <Layers className="h-4 w-4" /> Delivery Logs ({notifications.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wedding-gold"></div>
        </div>
      ) : (
        <>
          {/* TAB 1: MESSAGE TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold font-jost text-wedding-dark">Reusable Message Templates</h3>
                <button onClick={() => openTemplateModal()} className="gold-button text-xs py-1.5 px-3 flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add New Template
                </button>
              </div>

              {messageTemplates.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-wedding-gold/10 p-6">
                  <FileText className="h-10 w-10 text-wedding-gold/40 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-wedding-dark">No Templates Configured</h3>
                  <p className="text-sm text-wedding-brown/70 mt-1 mb-4">Create reusable notification templates with dynamic placeholder tags.</p>
                  <button onClick={() => openTemplateModal()} className="gold-button text-xs">Create First Template</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {messageTemplates.map((tpl) => (
                    <div key={tpl.id} className="wedding-card bg-white p-6 relative overflow-hidden flex flex-col justify-between border border-wedding-gold/15">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-wedding-gold/10 text-wedding-dark px-2.5 py-0.5 rounded-full">
                            {tpl.messageType}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tpl.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {tpl.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-wedding-dark font-jost mb-2">{tpl.templateName}</h4>
                        <p className="text-xs text-wedding-brown/80 font-mono bg-wedding-beige/25 p-3 rounded-xl border border-wedding-gold/10 mb-4 whitespace-pre-line leading-relaxed">
                          {tpl.messageContent}
                        </p>
                        {tpl.autoAttachInvitation && (
                          <span className="inline-block text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                            ✓ Auto Attach PDF Invitation Enabled
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-wedding-gold/10 pt-4 mt-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-wedding-brown">
                          <input 
                            type="checkbox" 
                            checked={!!tpl.isActive} 
                            onChange={() => handleToggleTemplateStatus(tpl.id, tpl.isActive)}
                            className="accent-wedding-gold rounded" 
                          />
                          Enable Template
                        </label>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openTemplateModal(tpl)} className="p-1.5 hover:bg-wedding-beige rounded-lg text-wedding-brown">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteTemplate(tpl.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCHEDULED MESSAGES */}
          {activeTab === 'scheduled' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold font-jost text-wedding-dark">Scheduled & Action Queue</h3>
                <button onClick={() => setIsScheduleOpen(true)} className="gold-button text-xs py-1.5 px-3 flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Schedule Broadcast
                </button>
              </div>

              {notifications.filter(n => n.status !== 'Sent').length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-wedding-gold/10 p-6">
                  <Clock className="h-10 w-10 text-wedding-gold/40 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-wedding-dark">Queue is Empty</h3>
                  <p className="text-sm text-wedding-brown/70 mt-1">No pending or upcoming scheduled notifications.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.filter(n => n.status !== 'Sent').map((notif) => (
                    <div key={notif.id} className="wedding-card bg-white p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-wedding-gold/15">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            notif.status === 'Pending-Action' ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {notif.status}
                          </span>
                          <span className="text-xs text-wedding-brown/60">
                            Scheduled: <strong>{new Date(notif.scheduledAt).toLocaleString()}</strong>
                          </span>
                        </div>
                        <p className="text-xs text-wedding-dark font-medium line-clamp-2">{notif.template}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {notif.status === 'Pending-Action' && (
                          <button onClick={() => loadWhatsAppLinks(notif)} className="gold-button text-xs py-1.5 px-3 flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" /> Open WhatsApp Links
                          </button>
                        )}
                        <button onClick={() => handleCancelNotification(notif.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-xl">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EVENT REMINDERS */}
          {activeTab === 'reminders' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold font-jost text-wedding-dark">Automated Event Reminders</h3>
                <button onClick={() => openReminderModal()} className="gold-button text-xs py-1.5 px-3 flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Configure Event Reminder
                </button>
              </div>

              {messageReminders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-wedding-gold/10 p-6">
                  <Bell className="h-10 w-10 text-wedding-gold/40 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-wedding-dark">No Event Reminders Configured</h3>
                  <p className="text-sm text-wedding-brown/70 mt-1 mb-4">Set up automated reminders for Haldi, Sangeet, Wedding, or Reception sub-events.</p>
                  <button onClick={() => openReminderModal()} className="gold-button text-xs">Configure First Reminder</button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-wedding-gold/15 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-wedding-beige/30 text-wedding-brown font-semibold uppercase tracking-wider border-b border-wedding-gold/15">
                        <th className="p-4">Event</th>
                        <th className="p-4">Message Template</th>
                        <th className="p-4">Timing</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Last Trigger</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-wedding-gold/10 text-wedding-dark">
                      {messageReminders.map((rem) => {
                        const evt = events.find(e => e.id === rem.eventId);
                        const tpl = messageTemplates.find(t => t.id === rem.templateId);
                        return (
                          <tr key={rem.id} className="hover:bg-wedding-beige/10">
                            <td className="p-4 font-bold">{evt ? evt.title : rem.eventId}</td>
                            <td className="p-4">{tpl ? tpl.templateName : rem.templateId}</td>
                            <td className="p-4 font-mono font-medium">
                              {rem.timing === '7_days_before' && '7 Days Before'}
                              {rem.timing === '3_days_before' && '3 Days Before'}
                              {rem.timing === '1_day_before' && '1 Day Before'}
                              {rem.timing === '2_hours_before' && '2 Hours Before'}
                              {rem.timing === '30_mins_before' && '30 Minutes Before'}
                              {rem.timing === 'custom' && `${rem.customMinutesBefore} Mins Before`}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                rem.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {rem.isEnabled ? (rem.status || 'Active') : 'Disabled'}
                              </span>
                            </td>
                            <td className="p-4 text-wedding-brown/70">
                              {rem.lastTriggeredAt ? new Date(rem.lastTriggeredAt).toLocaleString() : 'Not triggered yet'}
                            </td>
                            <td className="p-4 text-right">
                              <button onClick={() => handleDeleteReminder(rem.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BROADCAST MESSAGES */}
          {activeTab === 'broadcast' && (
            <div className="wedding-card bg-white p-6 border border-wedding-gold/15 max-w-2xl mx-auto">
              <h3 className="text-xl font-bold font-jost text-wedding-dark mb-4">Send Broadcast Message</h3>
              <form onSubmit={handleScheduleBroadcast} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Target Event (Optional)</label>
                  <select value={scheduleEventId} onChange={(e) => setScheduleEventId(e.target.value)} className="wedding-input text-xs">
                    <option value="">General / All Timeline Events</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.title} ({e.date})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Select Active Template</label>
                  <select 
                    onChange={(e) => {
                      const selectedTpl = messageTemplates.find(t => t.id === e.target.value);
                      if (selectedTpl) setScheduleTemplateText(selectedTpl.messageContent);
                    }} 
                    className="wedding-input text-xs"
                  >
                    <option value="">-- Choose Template --</option>
                    {messageTemplates.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.templateName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Message Content</label>
                  <textarea 
                    rows={4} 
                    required 
                    value={scheduleTemplateText} 
                    onChange={(e) => setScheduleTemplateText(e.target.value)} 
                    className="wedding-input text-xs font-mono"
                    placeholder="Enter broadcast message body..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Target Audience</label>
                  <select value={scheduleRecipients} onChange={(e) => setScheduleRecipients(e.target.value)} className="wedding-input text-xs">
                    <option value="all">All Guests ({guests.length})</option>
                    <option value="selected">Selected Guests Only</option>
                  </select>
                </div>

                {scheduleRecipients === 'selected' && (
                  <div className="max-h-48 overflow-y-auto border border-wedding-gold/15 p-3 rounded-xl bg-wedding-beige/10 space-y-2 text-xs">
                    {guests.map(g => (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={selectedGuestIds.includes(g.id)} 
                          onChange={(e) => {
                            if (e.target.checked) setSelectedGuestIds([...selectedGuestIds, g.id]);
                            else setSelectedGuestIds(selectedGuestIds.filter(id => id !== g.id));
                          }}
                          className="accent-wedding-gold"
                        />
                        <span>{g.name} ({g.mobile})</span>
                      </label>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Schedule Date & Time</label>
                  <input 
                    type="datetime-local" 
                    required 
                    value={scheduledAt} 
                    onChange={(e) => setScheduledAt(e.target.value)} 
                    className="wedding-input text-xs" 
                  />
                </div>

                <button type="submit" className="gold-button w-full mt-2">
                  Schedule Broadcast
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: DELIVERY LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold font-jost text-wedding-dark">Notification Delivery Logs</h3>
              {notifications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-wedding-gold/10 p-6">
                  <Layers className="h-10 w-10 text-wedding-gold/40 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-wedding-dark">No Notification Logs</h3>
                  <p className="text-sm text-wedding-brown/70 mt-1">Logs will appear as messages are scheduled and sent.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-wedding-gold/15 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-wedding-beige/30 text-wedding-brown font-semibold uppercase tracking-wider border-b border-wedding-gold/15">
                        <th className="p-4">Message Content / Template</th>
                        <th className="p-4">Recipients</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Scheduled / Sent Time</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-wedding-gold/10 text-wedding-dark">
                      {notifications.map((notif) => (
                        <tr key={notif.id} className="hover:bg-wedding-beige/10">
                          <td className="p-4 max-w-xs font-mono font-medium truncate">{notif.template}</td>
                          <td className="p-4 font-bold">
                            {notif.recipients === 'all' ? `All Guests (${guests.length})` : String(notif.recipients)}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              notif.status === 'Sent' ? 'bg-green-100 text-green-800' :
                              notif.status === 'Pending-Action' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                              notif.status === 'Failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {notif.status}
                            </span>
                          </td>
                          <td className="p-4 text-wedding-brown/70">
                            {new Date(notif.scheduledAt).toLocaleString()}
                          </td>
                          <td className="p-4 text-right">
                            {notif.status === 'Pending-Action' && (
                              <button onClick={() => loadWhatsAppLinks(notif)} className="gold-button text-[10px] py-1 px-2">
                                Open Links
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT TEMPLATE DIALOG */}
      {isTemplateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-lg w-full relative max-h-[90vh] overflow-y-auto animate-fade-in">
            <button onClick={() => setIsTemplateDialogOpen(false)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-wedding-dark font-jost mb-6">
              {editingTemplateId ? 'Edit Message Template' : 'Create Message Template'}
            </h3>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Template Name</label>
                <input 
                  type="text" 
                  required 
                  value={templateName} 
                  onChange={(e) => setTemplateName(e.target.value)} 
                  className="wedding-input text-xs" 
                  placeholder="e.g. Invitation Reminder"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Message Type</label>
                <select value={messageType} onChange={(e) => setMessageType(e.target.value)} className="wedding-input text-xs">
                  <option value="Invitation">Invitation</option>
                  <option value="Reminder">Reminder</option>
                  <option value="Announcement">Announcement</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70">Message Content</label>
                  <span className="text-[9px] text-wedding-gold font-bold">Click chip to add placeholder</span>
                </div>
                <textarea 
                  rows={4} 
                  required 
                  value={messageContent} 
                  onChange={(e) => setMessageContent(e.target.value)} 
                  className="wedding-input text-xs font-mono"
                  placeholder="Dear {{guestName}}, you are invited..."
                />
                
                {/* PLACEHOLDER CHIPS */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['{{guestName}}', '{{functionName}}', '{{eventName}}', '{{eventDate}}', '{{eventTime}}', '{{venue}}', '{{googleMap}}', '{{guestPortal}}'].map(chip => (
                    <button 
                      key={chip} 
                      type="button" 
                      onClick={() => insertPlaceholder(chip)} 
                      className="text-[10px] font-mono bg-wedding-gold/10 hover:bg-wedding-gold/25 text-wedding-dark px-2 py-0.5 rounded-md border border-wedding-gold/20"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-wedding-beige/25 border border-wedding-gold/10 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-wedding-dark block">Auto Attach Invitation Card</span>
                  <span className="text-[10px] text-wedding-brown/60">Attach Sahjode or Sarva PDF based on guest type</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={autoAttachInvitation} 
                  onChange={(e) => setAutoAttachInvitation(e.target.checked)} 
                  className="accent-wedding-gold h-4 w-4 cursor-pointer" 
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-wedding-beige/25 border border-wedding-gold/10 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-wedding-dark block">Active Template State</span>
                  <span className="text-[10px] text-wedding-brown/60">Enable template for scheduling</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={isTemplateActive} 
                  onChange={(e) => setIsTemplateActive(e.target.checked)} 
                  className="accent-wedding-gold h-4 w-4 cursor-pointer" 
                />
              </div>

              <button type="submit" className="gold-button w-full mt-4">
                {editingTemplateId ? 'Save Changes' : 'Create Template'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURE REMINDER DIALOG */}
      {isReminderDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-lg w-full relative max-h-[90vh] overflow-y-auto animate-fade-in">
            <button onClick={() => setIsReminderDialogOpen(false)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-wedding-dark font-jost mb-6">Configure Event Reminder</h3>

            <form onSubmit={handleSaveReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Select Sub-Event</label>
                <select value={reminderEventId} onChange={(e) => setReminderEventId(e.target.value)} className="wedding-input text-xs" required>
                  {events.map(evt => <option key={evt.id} value={evt.id}>{evt.title} ({evt.date} @ {evt.time})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Select Message Template</label>
                <select value={reminderTemplateId} onChange={(e) => setReminderTemplateId(e.target.value)} className="wedding-input text-xs" required>
                  {messageTemplates.filter(t => t.isActive).map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.templateName} ({tpl.messageType})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Reminder Timing Preset</label>
                <select value={reminderTiming} onChange={(e) => setReminderTiming(e.target.value)} className="wedding-input text-xs">
                  <option value="7_days_before">7 Days Before</option>
                  <option value="3_days_before">3 Days Before</option>
                  <option value="1_day_before">1 Day Before</option>
                  <option value="2_hours_before">2 Hours Before</option>
                  <option value="30_mins_before">30 Minutes Before</option>
                  <option value="custom">Custom Minutes Before</option>
                </select>
              </div>

              {reminderTiming === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Custom Minutes Before Event</label>
                  <input 
                    type="number" 
                    min="1" 
                    required 
                    value={customMinutesBefore} 
                    onChange={(e) => setCustomMinutesBefore(e.target.value)} 
                    className="wedding-input text-xs" 
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-wedding-beige/25 border border-wedding-gold/10 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-wedding-dark block">Enable Reminder</span>
                  <span className="text-[10px] text-wedding-brown/60">Automate trigger when timeline threshold is reached</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={isReminderEnabled} 
                  onChange={(e) => setIsReminderEnabled(e.target.checked)} 
                  className="accent-wedding-gold h-4 w-4 cursor-pointer" 
                />
              </div>

              <button type="submit" className="gold-button w-full mt-4">
                Save Reminder Rule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE BROADCAST DIALOG */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-lg w-full relative max-h-[90vh] overflow-y-auto animate-fade-in">
            <button onClick={() => setIsScheduleOpen(false)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-wedding-dark font-jost mb-6">Schedule Notification Broadcast</h3>

            <form onSubmit={handleScheduleBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Event Reference (Optional)</label>
                <select value={scheduleEventId} onChange={(e) => setScheduleEventId(e.target.value)} className="wedding-input text-xs">
                  <option value="">General Broadcast</option>
                  {events.map(evt => <option key={evt.id} value={evt.id}>{evt.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Template Content</label>
                <textarea 
                  rows={4} 
                  required 
                  value={scheduleTemplateText} 
                  onChange={(e) => setScheduleTemplateText(e.target.value)} 
                  className="wedding-input text-xs font-mono"
                  placeholder="Dear {{guestName}}, ..." 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Target Recipients</label>
                <select value={scheduleRecipients} onChange={(e) => setScheduleRecipients(e.target.value)} className="wedding-input text-xs">
                  <option value="all">All Guests ({guests.length})</option>
                  <option value="HOST_A">Bride Side Family</option>
                  <option value="HOST_B">Groom Side Family</option>
                  <option value="selected">Selected Guests</option>
                </select>
              </div>

              {scheduleRecipients === 'selected' && (
                <div className="max-h-40 overflow-y-auto border border-wedding-gold/15 p-2 rounded-xl bg-wedding-beige/10 space-y-1.5 text-xs">
                  {guests.map(g => (
                    <label key={g.id} className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={selectedGuestIds.includes(g.id)} 
                        onChange={(e) => {
                          if (e.target.checked) setSelectedGuestIds([...selectedGuestIds, g.id]);
                          else setSelectedGuestIds(selectedGuestIds.filter(id => id !== g.id));
                        }}
                        className="accent-wedding-gold"
                      />
                      <span>{g.name} ({g.mobile})</span>
                    </label>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Scheduled Date & Time</label>
                <input 
                  type="datetime-local" 
                  required 
                  value={scheduledAt} 
                  onChange={(e) => setScheduledAt(e.target.value)} 
                  className="wedding-input text-xs" 
                />
              </div>

              <button type="submit" className="gold-button w-full mt-4">Schedule Notification</button>
            </form>
          </div>
        </div>
      )}

      {/* PENDING WHATSAPP RECIPIENTS MODAL */}
      {activePendingNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border-2 border-wedding-gold shadow-wedding max-w-2xl w-full relative max-h-[90vh] overflow-y-auto animate-fade-in">
            <button onClick={() => setActivePendingNotification(null)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-2xl font-bold text-wedding-dark font-jost mb-1">Send WhatsApp Messages</h3>
            <p className="text-xs text-wedding-brown/70 mb-6">
              Click each guest link below to launch a prefilled WhatsApp chat with automatically attached invitation details.
            </p>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {guests
                .filter(g => {
                  if (activePendingNotification.recipients === 'HOST_A' || activePendingNotification.recipients === 'bride-side') return g.hostGroup === 'HOST_A';
                  if (activePendingNotification.recipients === 'HOST_B' || activePendingNotification.recipients === 'groom-side') return g.hostGroup === 'HOST_B';
                  if (Array.isArray(activePendingNotification.recipients)) return activePendingNotification.recipients.includes(g.id);
                  return true;
                })
                .map(g => (
                  <div key={g.id} className="p-3.5 bg-white border border-wedding-gold/20 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-wedding-dark">{g.name}</h4>
                      <p className="text-xs text-wedding-brown/60 font-mono">{g.mobile} ({g.invitationType || 'Sahjode'})</p>
                    </div>

                    {waLinks[g.id] ? (
                      <a 
                        href={waLinks[g.id]} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Send on WhatsApp
                      </a>
                    ) : (
                      <span className="text-xs text-wedding-brown/40 italic">Generating link...</span>
                    )}
                  </div>
                ))}
            </div>

            <div className="flex justify-between items-center border-t border-wedding-gold/15 pt-6 mt-6">
              <button 
                onClick={() => handleMarkNotificationSent(activePendingNotification.id)} 
                className="gold-button text-xs py-2 px-4 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" /> Mark Entire Queue as Complete
              </button>
              <button 
                onClick={() => setActivePendingNotification(null)} 
                className="outline-button text-xs py-2 px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </CoupleDashboardLayout>
  );
}
