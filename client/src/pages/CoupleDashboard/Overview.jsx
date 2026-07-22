import React, { useState, useEffect } from 'react';
import CoupleDashboardLayout from '../../components/CoupleDashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Users, FileText, CheckCircle, HelpCircle, XCircle, ArrowRight, Bell, Clock, Send, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Overview() {
  const { apiRequest, user, subRole } = useAuth();
  const socket = useSocket();
  
  const [stats, setStats] = useState({
    total: 0,
    yes: 0,
    no: 0,
    pending: 0
  });
  const [recentRsvps, setRecentRsvps] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [events, setEvents] = useState([]);
  const [commStats, setCommStats] = useState({ scheduled: 0, pendingReminders: 0, today: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch guest list for stats
      const guestsRes = await apiRequest('/api/couple/guests?limit=1000');
      if (guestsRes.ok) {
        const data = await guestsRes.json();
        const list = data.guests || [];
        
        let total = list.length;
        let yes = 0;
        let no = 0;
        let pending = 0;

        list.forEach(g => {
          const statuses = Object.values(g.rsvpStatus || {});
          if (statuses.includes('Yes')) {
            yes++;
          } else if (statuses.includes('No') && !statuses.includes('Pending')) {
            no++;
          } else {
            pending++;
          }
        });

        setStats({ total, yes, no, pending });
        
        const answered = list
          .filter(g => Object.keys(g.rsvpStatus || {}).length > 0)
          .slice(0, 5);
        setRecentRsvps(answered);
      }

      // 2. Fetch photo requests count
      const photoReqRes = await apiRequest('/api/couple/photo-requests');
      if (photoReqRes.ok) {
        const data = await photoReqRes.json();
        const pendingReqs = data.filter(r => r.status === 'Pending');
        setPendingRequestsCount(pendingReqs.length);
      }

      // 3. Fetch upcoming events
      const eventsRes = await apiRequest('/api/couple/events');
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.slice(0, 3));
      }

      // 4. Fetch Communication Center notification stats
      const notifRes = await apiRequest('/api/couple/notifications');
      if (notifRes.ok) {
        const notifs = await notifRes.json();
        const scheduled = notifs.filter(n => n.status === 'Scheduled').length;
        const pendingReminders = notifs.filter(n => n.status === 'Pending-Action').length;
        const today = notifs.filter(n => {
          if (!n.scheduledAt) return false;
          return new Date(n.scheduledAt).toDateString() === new Date().toDateString();
        }).length;
        const failed = notifs.filter(n => n.status === 'Failed').length;
        setCommStats({ scheduled, pendingReminders, today, failed });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Socket listener to update overview live!
  useEffect(() => {
    if (!socket) return;

    socket.on('live-rsvp', (newRsvp) => {
      // Refresh statistics and insert new RSVP into ticker
      fetchDashboardData();
    });

    socket.on('live-photo-request', () => {
      setPendingRequestsCount(prev => prev + 1);
    });

    return () => {
      socket.off('live-rsvp');
      socket.off('live-photo-request');
    };
  }, [socket]);

  return (
    <CoupleDashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-jost text-wedding-dark">
          Hello, {subRole === 'bride' ? user?.brideName : subRole === 'groom' ? user?.groomName : `${user?.brideName} & ${user?.groomName}`}
        </h1>
        <p className="text-sm text-wedding-brown/70 mt-1">Here is a quick look at your wedding invitation dashboard</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wedding-gold"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="wedding-card bg-white flex items-center gap-4">
              <div className="p-4 bg-wedding-beige text-wedding-brown rounded-2xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/50">Total Guests</p>
                <h3 className="text-2xl font-bold font-jost text-wedding-dark mt-0.5">{stats.total}</h3>
              </div>
            </div>

            <div className="wedding-card bg-white flex items-center gap-4">
              <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/50">Attending</p>
                <h3 className="text-2xl font-bold font-jost text-green-600 mt-0.5">{stats.yes}</h3>
              </div>
            </div>

            <div className="wedding-card bg-white flex items-center gap-4">
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/50">Declined</p>
                <h3 className="text-2xl font-bold font-jost text-red-600 mt-0.5">{stats.no}</h3>
              </div>
            </div>

            <div className="wedding-card bg-white flex items-center gap-4">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/50">Pending RSVP</p>
                <h3 className="text-2xl font-bold font-jost text-amber-600 mt-0.5">{stats.pending}</h3>
              </div>
            </div>
          </div>

          {/* Communication Center Overview Widget */}
          <div className="wedding-card bg-white p-6 border border-wedding-gold/15">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold font-jost text-wedding-dark">Communication Center</h3>
                <p className="text-xs text-wedding-brown/60">Overview of scheduled notifications, reminders, and delivery queue</p>
              </div>
              <Link to="/dashboard/notifications" className="text-xs font-bold text-wedding-gold hover:underline flex items-center gap-1">
                Open Center <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-blue-800 block">Scheduled</span>
                  <span className="text-lg font-bold text-blue-900">{commStats.scheduled}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center gap-3">
                <Bell className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-amber-800 block">Pending Reminders</span>
                  <span className="text-lg font-bold text-amber-900">{commStats.pendingReminders}</span>
                </div>
              </div>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center gap-3">
                <Send className="h-5 w-5 text-purple-600 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-purple-800 block">Today's Messages</span>
                  <span className="text-lg font-bold text-purple-900">{commStats.today}</span>
                </div>
              </div>

              <div className="p-3 bg-red-50/60 rounded-xl border border-red-100 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-red-800 block">Failed Deliveries</span>
                  <span className="text-lg font-bold text-red-900">{commStats.failed}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Live RSVP Ticker */}
            <div className="lg:col-span-2 wedding-card flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold font-jost text-wedding-dark">Live RSVP Ticker</h3>
                  <p className="text-xs text-wedding-brown/60">Updated in real-time via WebSockets</p>
                </div>
                <Link to="/dashboard/guests" className="text-xs font-bold text-[#C9A66B] flex items-center gap-1 hover:underline">
                  All Guests <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px]">
                {recentRsvps.length === 0 ? (
                  <p className="text-sm text-wedding-brown/50 italic text-center py-10">No RSVPs received yet.</p>
                ) : (
                  recentRsvps.map((rsvp) => {
                    const statusText = Object.entries(rsvp.rsvpStatus || {})
                      .map(([evtId, status]) => `${status}`)
                      .join(', ');
                    const attending = Object.values(rsvp.rsvpStatus || {}).includes('Yes');

                    return (
                      <div key={rsvp.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-wedding-gold/5 shadow-sm">
                        <div>
                          <p className="text-sm font-semibold text-wedding-dark">{rsvp.name}</p>
                          <p className="text-xs text-wedding-brown/60 mt-0.5">Mobile: {rsvp.mobile} | Group: {rsvp.group}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          attending ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        }`}>
                          {attending ? 'Attending' : 'Not Attending'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Actions & Pending Requests */}
            <div className="space-y-6">
              {/* Photo Access requests alert */}
              {pendingRequestsCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-amber-600 animate-ping"></span>
                    Photo Access Pending
                  </h4>
                  <p className="text-xs text-amber-800 mt-2 leading-relaxed">
                    There are {pendingRequestsCount} guests requesting access to view your restricted photo albums.
                  </p>
                  <Link to="/dashboard/photos" className="gold-button inline-block text-center w-full text-xs py-2 mt-4 font-bold">
                    Review Access Requests
                  </Link>
                </div>
              )}

              {/* Event schedule checklist */}
              <div className="wedding-card">
                <h3 className="text-sm font-bold text-wedding-dark uppercase tracking-wider mb-4">Wedding Timeline</h3>
                {events.length === 0 ? (
                  <p className="text-xs text-wedding-brown/50 italic">No events scheduled. Create events to launch timeline.</p>
                ) : (
                  <div className="space-y-4">
                    {events.map((evt) => (
                      <div key={evt.id} className="border-l-2 border-wedding-gold/40 pl-4 relative">
                        <div className="absolute w-2 h-2 rounded-full bg-wedding-gold -left-[5px] top-1"></div>
                        <p className="text-xs font-bold text-wedding-dark">{evt.title}</p>
                        <p className="text-[10px] text-wedding-brown/60 mt-0.5">{evt.date} @ {evt.time}</p>
                        <p className="text-[10px] text-wedding-brown/70 mt-1 truncate">{evt.venue}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </CoupleDashboardLayout>
  );
}
