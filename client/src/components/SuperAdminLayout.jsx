import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Home, Users, Languages, ClipboardList, LogOut } from 'lucide-react';

const dashboardTranslations = {
  en: {
    dashboard: 'Dashboard',
    couples_onboarding: 'Couples Onboarding',
    language_cms: 'Language Packs (CMS)',
    audit_logs: 'Audit Logs',
    sign_out: 'Sign Out',
    admin_panel: 'ADMIN PANEL',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    couples_onboarding: 'कपल्स ऑनबोर्डिंग',
    language_cms: 'भाषा पैक (CMS)',
    audit_logs: 'ऑडिट लॉग्स',
    sign_out: 'साइन आउट',
    admin_panel: 'एडमिन पैनल',
  },
  gu: {
    dashboard: 'ડેશબોર્ડ',
    couples_onboarding: 'કપલ્સ ઓનબોર્ડિંગ',
    language_cms: 'ભાષા પૅક (CMS)',
    audit_logs: 'ઓડિટ લોગ્સ',
    sign_out: 'સાઇન આઉટ',
    admin_panel: 'એડમિન પેનલ',
  }
};

export default function SuperAdminLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [lang, setLang] = useState(localStorage.getItem('dashboard_lang') || 'en');

  const translations = dashboardTranslations[lang] || dashboardTranslations.en;

  const menuItems = [
    { name: translations.dashboard, path: '/super-admin', icon: Home },
    { name: translations.couples_onboarding, path: '/super-admin/couples', icon: Users },
    { name: translations.language_cms, path: '/super-admin/languages', icon: Languages },
    { name: translations.audit_logs, path: '/super-admin/logs', icon: ClipboardList },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-wedding-beige flex flex-col md:flex-row">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-wedding-cream border-b md:border-b-0 md:border-r border-wedding-gold/20 flex flex-col p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-8 justify-center md:justify-start">
          <Heart className="h-6 w-6 text-wedding-gold fill-wedding-gold/20" />
          <h2 className="text-xl font-bold font-jost text-wedding-dark tracking-wider">
            {translations.admin_panel}
          </h2>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
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
            Language / भाषा / ભાષા
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
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
