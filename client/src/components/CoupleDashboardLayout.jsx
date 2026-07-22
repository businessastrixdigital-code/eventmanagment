import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Heart, Home, Calendar, Users, FileText, Bell, Image, Sliders, Settings, LogOut, Radio, AlertCircle, MessageSquare
} from 'lucide-react';

const coupleTranslations = {
  en: {
    overview: 'Overview',
    events_plan: 'Events Plan',
    guest_list: 'Guest List & RSVPs',
    rsvp_builder: 'RSVP Form Builder',
    message_scheduler: 'Message Scheduler',
    photo_gallery: 'Photo Gallery',
    website_design: 'Website Design',
    settings: 'Permissions & Settings',
    sign_out: 'Sign Out',
    dashboard: 'DASHBOARD',
    logged_in: 'Logged in',
    invite_link_label: 'Your Wedding Invite Link',
    language_label: 'Language / भाषा / ભાષા',
    card_templates: 'Invitation Cards',
    custom_messages: 'Custom Messages',
  },
  hi: {
    overview: 'अवलोकन',
    events_plan: 'कार्यक्रम योजना',
    guest_list: 'अतिथि सूची और आरएसवीपी',
    rsvp_builder: 'आरएसवीपी फॉर्म बिल्डर',
    message_scheduler: 'संदेश अनुसूचक',
    photo_gallery: 'फोटो गैलरी',
    website_design: 'वेबसाइट डिज़ाइन',
    settings: 'अनुमतियां और सेटिंग्स',
    sign_out: 'साइन आउट',
    dashboard: 'डैशबोर्ड',
    logged_in: 'लॉग इन',
    invite_link_label: 'आपकी शादी का आमंत्रण लिंक',
    language_label: 'भाषा / Language / ભાષા',
    card_templates: 'निमंत्रण पत्र',
    custom_messages: 'कस्टम संदेश',
  },
  gu: {
    overview: 'વિહંગાવલોકન',
    events_plan: 'પ્રસંગ આયોજન',
    guest_list: 'મહેમાન યાદી અને આરએસવીપી',
    rsvp_builder: 'આરએસવીપી ફોર્મ બિલ્ડર',
    message_scheduler: 'સંદેશ શેડ્યૂલર',
    photo_gallery: 'ફોટો ગેલેરી',
    website_design: 'વેબસાઇટ ડિઝાઇન',
    settings: 'પરવાનગીઓ અને સેટિંગ્સ',
    sign_out: 'સાઇન આઉટ',
    dashboard: 'ડેશબોર્ડ',
    logged_in: 'લૉગ ઇન',
    invite_link_label: 'તમારી લગ્ન આમંત્રણ લિંક',
    language_label: 'ભાષા / Language / भाषा',
    card_templates: 'આમંત્રણ પત્રિકા',
    custom_messages: 'કસ્ટમ સંદેશ',
  }
};

export default function CoupleDashboardLayout({ children }) {
  const { user, subRole, logout, apiRequest } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [permissions, setPermissions] = useState({
    editEvents: true,
    sendNotifications: true,
    manageGuests: true,
    managePhotos: true
  });

  const [alerts, setAlerts] = useState([]);
  const [lang, setLang] = useState(localStorage.getItem('dashboard_lang') || 'en');

  useEffect(() => {
    const handleLangChange = () => {
      setLang(localStorage.getItem('dashboard_lang') || 'en');
    };
    window.addEventListener('dashboard-lang-changed', handleLangChange);
    return () => {
      window.removeEventListener('dashboard-lang-changed', handleLangChange);
    };
  }, []);

  // Fetch couple permissions on mount
  useEffect(() => {
    if (user?.permissions && subRole) {
      setPermissions(user.permissions[subRole] || {});
    }
  }, [user, subRole]);

  // Set up socket listeners for live RSVP and photo request tickers
  useEffect(() => {
    if (!socket) return;

    socket.on('live-rsvp', (data) => {
      const msg = `Live RSVP: ${data.name} updated RSVP status!`;
      setAlerts(prev => [
        { id: Date.now(), text: msg, type: 'info' },
        ...prev.slice(0, 4)
      ]);
    });

    socket.on('live-photo-request', (data) => {
      const msg = `Photo Access Request: Guest "${data.guestName}" is requesting access to restricted albums.`;
      setAlerts(prev => [
        { id: Date.now(), text: msg, type: 'warning' },
        ...prev.slice(0, 4)
      ]);
    });

    socket.on('whatsapp-pending-action', (data) => {
      const msg = `WhatsApp Queue: A scheduled message is ready to send.`;
      setAlerts(prev => [
        { id: Date.now(), text: msg, type: 'whatsapp' },
        ...prev.slice(0, 4)
      ]);
    });

    return () => {
      socket.off('live-rsvp');
      socket.off('live-photo-request');
      socket.off('whatsapp-pending-action');
    };
  }, [socket]);

  const translations = coupleTranslations[lang] || coupleTranslations.en;

  const menuItems = [
    { name: translations.overview, path: '/dashboard', icon: Home, show: true },
    { name: translations.events_plan, path: '/dashboard/events', icon: Calendar, show: permissions.editEvents },
    { name: translations.guest_list, path: '/dashboard/guests', icon: Users, show: permissions.manageGuests },
    { name: translations.card_templates, path: '/dashboard/invitation-templates', icon: FileText, show: permissions.editEvents },
    { name: translations.message_scheduler, path: '/dashboard/notifications', icon: Bell, show: permissions.sendNotifications },
    { name: translations.photo_gallery, path: '/dashboard/photos', icon: Image, show: permissions.managePhotos },
    { name: translations.website_design, path: '/dashboard/website-editor', icon: Sliders, show: permissions.editEvents },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return (
    <div className="min-h-screen bg-wedding-beige flex flex-col md:flex-row relative">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-wedding-cream border-b md:border-b-0 md:border-r border-wedding-gold/20 flex flex-col p-6 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
          <Heart className="h-6 w-6 text-wedding-gold fill-wedding-gold/20" />
          <h2 className="text-xl font-bold font-jost text-wedding-dark tracking-wider">
            {translations.dashboard}
          </h2>
        </div>
        <p className="text-[10px] text-center md:text-left text-wedding-brown/50 font-bold uppercase tracking-wider mb-8">
          {translations.logged_in}: <span className="text-[#C9A66B]">{subRole?.toUpperCase()}</span>
        </p>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            if (!item.show) return null;
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-wedding-brown text-wedding-cream shadow-sm'
                    : 'text-wedding-brown/70 hover:bg-wedding-brown/5 hover:text-wedding-brown'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Language Selection */}
        <div className="mt-4 border-t border-wedding-gold/20 pt-4">
          <label className="block text-[10px] font-bold text-wedding-brown/50 uppercase tracking-wider mb-2">
            {translations.language_label}
          </label>
          <select
            value={lang}
            onChange={(e) => {
              const selected = e.target.value;
              setLang(selected);
              localStorage.setItem('dashboard_lang', selected);
              window.dispatchEvent(new Event('dashboard-lang-changed'));
            }}
            className="w-full bg-white border border-wedding-gold/30 rounded-xl px-3 py-2 text-xs font-semibold text-wedding-dark focus:outline-none cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="gu">ગુજરાતી (Gujarati)</option>
          </select>
        </div>

        {/* Public invite link copy */}
        {user?.slug && (
          <div className="mt-4 p-3 bg-white border border-wedding-gold/10 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-wedding-brown/50 block mb-1">{translations.invite_link_label}</span>
            <a 
              href={`/invite/${user.slug}`} 
              target="_blank" 
              rel="noreferrer"
              className="text-xs font-semibold text-wedding-gold hover:underline truncate block"
            >
              /invite/{user.slug}
            </a>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="mt-6 flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all w-full text-left"
        >
          <LogOut className="h-4 w-4" />
          {translations.sign_out}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {/* Live Notification Alerts Ticker */}
        {alerts.length > 0 && (
          <div className="fixed bottom-5 right-5 z-50 w-full max-w-sm space-y-2">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 rounded-2xl border shadow-lg flex justify-between items-start gap-2.5 animate-fade-in ${
                  alert.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : alert.type === 'whatsapp'
                    ? 'bg-green-50 border-green-200 text-green-900 font-medium'
                    : 'bg-white border-wedding-gold/20 text-wedding-dark'
                }`}
              >
                <div className="flex gap-2.5 items-start">
                  <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${
                    alert.type === 'warning' ? 'text-amber-600' : alert.type === 'whatsapp' ? 'text-green-600' : 'text-wedding-gold'
                  }`} />
                  <div>
                    <span className="text-xs font-bold block">
                      {alert.type === 'warning' ? 'ACCESS REQUEST' : alert.type === 'whatsapp' ? 'WHATSAPP ACTION' : 'LIVE EVENT'}
                    </span>
                    <p className="text-xs mt-0.5 leading-normal">{alert.text}</p>
                  </div>
                </div>
                <button onClick={() => removeAlert(alert.id)} className="text-wedding-brown/40 hover:text-wedding-brown text-xs font-bold font-mono">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
