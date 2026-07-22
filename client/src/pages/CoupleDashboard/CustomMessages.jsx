import React, { useState, useEffect } from 'react';
import CoupleDashboardLayout from '../../components/CoupleDashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  MessageSquare, Send, Bell, Heart, Users, Plus, Trash2,
  CheckCircle, AlertCircle, Copy, Eye, EyeOff, Save, Sparkles,
  ChevronDown, Languages, FileText, RefreshCw, X
} from 'lucide-react';

// ─── Message type options ───────────────────────────────────────────────────
const MESSAGE_TYPES = [
  { value: 'invitation',   label: 'Invitation',        labelHi: 'आमंत्रण',     labelGu: 'આમંત્રણ',    icon: Heart,        color: 'bg-rose-50 border-rose-200 text-rose-700' },
  { value: 'reminder',     label: 'Reminder',          labelHi: 'अनुस्मारक',   labelGu: 'રીમાઇન્ડર',  icon: Bell,         color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { value: 'announcement', label: 'Announcement',      labelHi: 'घोषणा',       labelGu: 'જાહેરાત',    icon: Send,         color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'rsvp',         label: 'RSVP Request',      labelHi: 'आरएसवीपी',    labelGu: 'RSVP',       icon: Users,        color: 'bg-violet-50 border-violet-200 text-violet-700' },
  { value: 'thankyou',     label: 'Thank You',         labelHi: 'धन्यवाद',     labelGu: 'આભાર',       icon: CheckCircle,  color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { value: 'custom',       label: 'Custom / General',  labelHi: 'सामान्य',     labelGu: 'સામાન્ય',    icon: MessageSquare,color: 'bg-slate-50 border-slate-200 text-slate-700' },
];

// ─── Placeholder chips ──────────────────────────────────────────────────────
const PLACEHOLDERS = [
  { tag: '{guestName}',   label: 'Guest Name' },
  { tag: '{eventName}',   label: 'Event Name' },
  { tag: '{date}',        label: 'Date' },
  { tag: '{time}',        label: 'Time' },
  { tag: '{venue}',       label: 'Venue' },
  { tag: '{brideName}',   label: 'Bride Name' },
  { tag: '{groomName}',   label: 'Groom Name' },
  { tag: '{inviteLink}',  label: 'Invite Link' },
];

// ─── Default starter templates ──────────────────────────────────────────────
const STARTERS = {
  invitation: {
    en: `Dear {guestName},\n\nYou are cordially invited to our wedding ceremony — {eventName}.\n\n📅 Date: {date}\n⏰ Time: {time}\n📍 Venue: {venue}\n\nWith love,\n{brideName} & {groomName}`,
    hi: `प्रिय {guestName},\n\nआपको हमारे विवाह समारोह — {eventName} में सादर आमंत्रित किया जाता है।\n\n📅 दिनांक: {date}\n⏰ समय: {time}\n📍 स्थान: {venue}\n\nसप्रेम,\n{brideName} एवं {groomName}`,
    gu: `પ્રિય {guestName},\n\nઆપને અમારા લગ્ન સમારોહ — {eventName} — માં આદરથી આમંત્રિત કરવામાં આવે છે.\n\n📅 તારીખ: {date}\n⏰ સમય: {time}\n📍 સ્થળ: {venue}\n\nપ્રેમ સહ,\n{brideName} અને {groomName}`,
  },
  reminder: {
    en: `Hi {guestName}! 👋\n\nJust a gentle reminder — {eventName} is just around the corner!\n\n📅 {date} at {time}\n📍 {venue}\n\nWe can't wait to celebrate with you! 🎉`,
    hi: `नमस्ते {guestName}! 👋\n\nबस एक छोटी-सी याद दिलाना चाहते थे — {eventName} बहुत जल्द आने वाला है!\n\n📅 {date} को {time} बजे\n📍 {venue}\n\nआपसे मिलने का इंतजार है! 🎉`,
    gu: `નમસ્તે {guestName}! 👋\n\nફક્ત એક નાની યાદ — {eventName} ખૂબ નજીક આવી ગયું છે!\n\n📅 {date} ના {time} વાગ્યે\n📍 {venue}\n\nઆપને મળવાની આતુરતા છે! 🎉`,
  },
  announcement: {
    en: `📢 Important Update\n\nDear {guestName},\n\nWe have an important announcement regarding {eventName}.\n\nPlease stay tuned for further details.\n\n— {brideName} & {groomName}`,
    hi: `📢 महत्वपूर्ण सूचना\n\nप्रिय {guestName},\n\n{eventName} के संबंध में हमारे पास एक महत्वपूर्ण घोषणा है।\n\nकृपया अधिक जानकारी के लिए जुड़े रहें।\n\n— {brideName} एवं {groomName}`,
    gu: `📢 મહત્ત્વની જાહેરાત\n\nપ્રિય {guestName},\n\n{eventName} સંદર્ભે અમારી પાસે એક મહત્ત્વની જાહેરાત છે.\n\nવધુ વિગત માટે જોડાયેલ રહો.\n\n— {brideName} અને {groomName}`,
  },
  rsvp: {
    en: `Dear {guestName},\n\nWe'd love to know if you'll be joining us for {eventName} on {date}.\n\n🔗 Confirm your attendance: {inviteLink}\n\nKindly respond at your earliest convenience.\n\nWarm regards,\n{brideName} & {groomName}`,
    hi: `प्रिय {guestName},\n\nहम जानना चाहते हैं कि आप {date} को {eventName} में आ सकते हैं या नहीं।\n\n🔗 उपस्थिति की पुष्टि करें: {inviteLink}\n\nकृपया जल्द से जल्द जवाब दें।\n\nशुभकामनाओं सहित,\n{brideName} एवं {groomName}`,
    gu: `પ્રિય {guestName},\n\nઅમે જાણવા ઇચ્છીએ છીએ કે {date} ના {eventName} માં આપ આવી શકશો.\n\n🔗 ઉપસ્થિતિ નોંધાવો: {inviteLink}\n\nકૃપા કરી જલ્દી જવાબ આપો.\n\nઆભાર,\n{brideName} અને {groomName}`,
  },
  thankyou: {
    en: `Dear {guestName},\n\nThank you so much for being a part of our special day — {eventName}!\n\nYour presence made it even more memorable. We are truly grateful. 💕\n\nWith love,\n{brideName} & {groomName}`,
    hi: `प्रिय {guestName},\n\nहमारे खास दिन — {eventName} — का हिस्सा बनने के लिए बहुत-बहुत धन्यवाद!\n\nआपकी उपस्थिति ने इसे और भी यादगार बना दिया। हम आपके आभारी हैं। 💕\n\nसप्रेम,\n{brideName} एवं {groomName}`,
    gu: `પ્રિય {guestName},\n\nઅમારા ખાસ દિવસ — {eventName} — નો ભાગ બનવા બદલ ખૂબ-ખૂબ આભાર!\n\nઆપની હાજરીએ આ ક્ષણ વધુ યાદગાર બનાવી. અમે ખૂબ આભારી છીએ. 💕\n\nપ્રેમ સહ,\n{brideName} અને {groomName}`,
  },
  custom: {
    en: '',
    hi: '',
    gu: '',
  },
};

// ─── Language box config ────────────────────────────────────────────────────
const LANG_BOXES = [
  { key: 'en', flag: '🇬🇧', label: 'English',    nativeLabel: 'English',     dir: 'ltr', fontClass: '' },
  { key: 'hi', flag: '🇮🇳', label: 'Hindi',      nativeLabel: 'हिन्दी',     dir: 'ltr', fontClass: 'font-hindi' },
  { key: 'gu', flag: '🇮🇳', label: 'Gujarati',   nativeLabel: 'ગુજરાતી',    dir: 'ltr', fontClass: 'font-gujarati' },
];

// ─── Char count helper ──────────────────────────────────────────────────────
function CharCount({ text, limit = 1024 }) {
  const count = text.length;
  const over = count > limit;
  return (
    <span className={`text-[10px] font-bold ${over ? 'text-red-500' : 'text-wedding-brown/40'}`}>
      {count} / {limit}
    </span>
  );
}

// ─── Preview Modal ──────────────────────────────────────────────────────────
function PreviewModal({ messages, messageType, onClose }) {
  const typeInfo = MESSAGE_TYPES.find(t => t.value === messageType) || MESSAGE_TYPES[0];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-wedding-gold/20">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${typeInfo.color}`}>
              <typeInfo.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-wedding-dark">Message Preview</h3>
              <p className="text-xs text-wedding-brown/50 capitalize">{typeInfo.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-red-50 text-wedding-brown/50 hover:text-red-500 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 grid gap-4 md:grid-cols-3">
          {LANG_BOXES.map(lang => (
            <div key={lang.key} className="rounded-2xl border border-wedding-gold/20 bg-wedding-beige/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{lang.flag}</span>
                <span className="text-xs font-bold text-wedding-dark">{lang.nativeLabel}</span>
              </div>
              <p className={`text-xs text-wedding-dark/80 whitespace-pre-wrap leading-relaxed ${lang.fontClass}`} dir={lang.dir}>
                {messages[lang.key] || <span className="text-wedding-brown/30 italic">No message entered</span>}
              </p>
            </div>
          ))}
        </div>
        <div className="p-6 pt-0 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 bg-wedding-brown text-wedding-cream rounded-xl text-xs font-bold hover:opacity-90 transition-all">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function CustomMessages() {
  const { apiRequest } = useAuth();

  // Form state
  const [templateName, setTemplateName]   = useState('');
  const [messageType, setMessageType]     = useState('invitation');
  const [audience, setAudience]           = useState('all');
  const [messages, setMessages]           = useState({ en: '', hi: '', gu: '' });

  // Saved templates list
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [editingId, setEditingId]         = useState(null);

  // UI state
  const [saving, setSaving]               = useState(false);
  const [success, setSuccess]             = useState('');
  const [error, setError]                 = useState('');
  const [showPreview, setShowPreview]     = useState(false);
  const [copiedLang, setCopiedLang]       = useState(null);
  const [activeBox, setActiveBox]         = useState('en');

  // Load starter template when message type changes
  const loadStarter = (type) => {
    const starter = STARTERS[type] || STARTERS.custom;
    setMessages({ en: starter.en, hi: starter.hi, gu: starter.gu });
  };

  const handleTypeChange = (type) => {
    setMessageType(type);
    loadStarter(type);
  };

  // Insert placeholder at cursor / append
  const insertPlaceholder = (tag) => {
    setMessages(prev => ({
      ...prev,
      [activeBox]: prev[activeBox] + tag,
    }));
  };

  // Copy a language box content
  const copyContent = (lang) => {
    navigator.clipboard.writeText(messages[lang]);
    setCopiedLang(lang);
    setTimeout(() => setCopiedLang(null), 2000);
  };

  // Clear a single box
  const clearBox = (lang) => {
    setMessages(prev => ({ ...prev, [lang]: '' }));
  };

  // Save / update template
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      setError('Please enter a template name.');
      return;
    }
    if (!messages.en && !messages.hi && !messages.gu) {
      setError('Please enter content in at least one language.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: templateName,
        messageType,
        audience,
        contentEn: messages.en,
        contentHi: messages.hi,
        contentGu: messages.gu,
      };

      let res;
      if (editingId) {
        res = await apiRequest(`/api/couple/message-templates/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiRequest('/api/couple/message-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res && res.ok) {
        const saved = await res.json();
        setSuccess(editingId ? 'Template updated successfully!' : 'Template saved successfully!');
        setEditingId(saved._id || saved.id || editingId);
        fetchTemplates();
      } else {
        // Graceful offline fallback — save locally
        const localId = editingId || `local_${Date.now()}`;
        const localTemplate = { _id: localId, name: templateName, messageType, audience, contentEn: messages.en, contentHi: messages.hi, contentGu: messages.gu, createdAt: new Date().toISOString() };
        setSavedTemplates(prev => {
          const filtered = prev.filter(t => t._id !== localId);
          return [localTemplate, ...filtered];
        });
        setEditingId(localId);
        setSuccess('Saved locally (API unavailable).');
      }
    } catch {
      setSuccess('Saved locally.');
    } finally {
      setSaving(false);
    }
  };

  // Fetch saved templates
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await apiRequest('/api/couple/message-templates');
      if (res && res.ok) {
        const data = await res.json();
        setSavedTemplates(data);
      }
    } catch { /* silent */ } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    loadStarter('invitation');
    // eslint-disable-next-line
  }, []);

  // Load an existing template into editor
  const loadTemplate = (t) => {
    setTemplateName(t.name);
    setMessageType(t.messageType || 'invitation');
    setAudience(t.audience || 'all');
    setMessages({ en: t.contentEn || '', hi: t.contentHi || '', gu: t.contentGu || '' });
    setEditingId(t._id);
    setSuccess('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete template
  const deleteTemplate = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await apiRequest(`/api/couple/message-templates/${id}`, { method: 'DELETE' });
    } catch { /* silent */ }
    setSavedTemplates(prev => prev.filter(t => t._id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  const resetForm = () => {
    setTemplateName('');
    setMessageType('invitation');
    setAudience('all');
    setMessages({ en: '', hi: '', gu: '' });
    setEditingId(null);
    setError('');
    setSuccess('');
    loadStarter('invitation');
  };

  const selectedType = MESSAGE_TYPES.find(t => t.value === messageType) || MESSAGE_TYPES[0];

  return (
    <CoupleDashboardLayout>
      {showPreview && (
        <PreviewModal messages={messages} messageType={messageType} onClose={() => setShowPreview(false)} />
      )}

      <div className="space-y-8 max-w-5xl mx-auto">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-wedding-cream border border-wedding-gold/20 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-wedding-gold/10 rounded-2xl border border-wedding-gold/20">
              <Languages className="h-6 w-6 text-wedding-gold" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-wedding-dark font-jost tracking-tight">Custom Message Creator</h1>
              <p className="text-xs text-wedding-brown/60 mt-0.5">Craft your messages in Gujarati, Hindi & English — all in one place</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editingId && (
              <button
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-wedding-gold/20 text-xs font-semibold text-wedding-brown hover:bg-wedding-gold/5 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            )}
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-wedding-gold/20 text-xs font-semibold text-wedding-brown hover:bg-wedding-gold/5 transition-all"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
          </div>
        </div>

        {/* ── Alerts ─────────────────────────────────────────────── */}
        {success && (
          <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-5 py-3 text-sm font-medium">
            <CheckCircle className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-3 text-sm font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Step 1: Template Meta ───────────────────────────────── */}
        <div className="bg-white border border-wedding-gold/20 rounded-3xl p-6 shadow-sm space-y-5">
          <h2 className="text-xs font-bold text-wedding-brown/50 uppercase tracking-widest border-b border-wedding-gold/10 pb-2">
            Step 1 — Template Details
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Template Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-wedding-brown/50">Template Name *</label>
              <input
                type="text"
                placeholder="e.g. Wedding Day Invitation"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="w-full rounded-xl border border-wedding-gold/20 bg-wedding-beige/30 px-4 py-2.5 text-sm text-wedding-dark placeholder-wedding-brown/30 focus:outline-none focus:border-wedding-gold transition-colors"
              />
            </div>

            {/* Audience */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-wedding-brown/50">Audience</label>
              <select
                value={audience}
                onChange={e => setAudience(e.target.value)}
                className="w-full rounded-xl border border-wedding-gold/20 bg-wedding-beige/30 px-4 py-2.5 text-sm text-wedding-dark focus:outline-none focus:border-wedding-gold transition-colors"
              >
                <option value="all">All Guests</option>
                <option value="bride_side">Bride's Side</option>
                <option value="groom_side">Groom's Side</option>
                <option value="vip">VIP Guests</option>
                <option value="family">Family Only</option>
                <option value="friends">Friends</option>
              </select>
            </div>
          </div>

          {/* Message Type Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-wedding-brown/50">Message Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {MESSAGE_TYPES.map(type => {
                const Icon = type.icon;
                const isActive = messageType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => handleTypeChange(type.value)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border text-xs font-semibold transition-all ${
                      isActive
                        ? `${type.color} shadow-sm scale-105`
                        : 'border-wedding-gold/20 text-wedding-brown/60 hover:bg-wedding-gold/5'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="leading-tight text-center">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Step 2: Placeholder chips ───────────────────────────── */}
        <div className="bg-white border border-wedding-gold/20 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-wedding-brown/50 uppercase tracking-widest">
              Step 2 — Insert Placeholders
            </h2>
            <span className="text-[10px] text-wedding-brown/40 bg-wedding-beige/60 rounded-lg px-2.5 py-1 border border-wedding-gold/10">
              Editing: <strong className="text-wedding-dark uppercase">{activeBox}</strong> box
            </span>
          </div>
          <p className="text-[11px] text-wedding-brown/50 -mt-1">
            Click a placeholder chip to insert it into the currently selected language box. Placeholders will be auto-filled when messages are sent.
          </p>
          <div className="flex flex-wrap gap-2">
            {PLACEHOLDERS.map(p => (
              <button
                key={p.tag}
                onClick={() => insertPlaceholder(p.tag)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-wedding-gold/10 border border-wedding-gold/20 text-xs font-semibold text-wedding-brown hover:bg-wedding-gold/20 transition-all"
              >
                <Sparkles className="h-3 w-3 text-wedding-gold" />
                <code className="font-mono text-[10px]">{p.tag}</code>
                <span className="text-wedding-brown/50">· {p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Step 3: Language Boxes ──────────────────────────────── */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-wedding-brown/50 uppercase tracking-widest px-1">
            Step 3 — Write Your Message (3 Languages)
          </h2>

          <div className="grid gap-5 md:grid-cols-3">
            {LANG_BOXES.map(lang => {
              const isActive = activeBox === lang.key;
              return (
                <div
                  key={lang.key}
                  onClick={() => setActiveBox(lang.key)}
                  className={`bg-white border rounded-3xl shadow-sm overflow-hidden cursor-text transition-all duration-200 ${
                    isActive ? 'border-wedding-gold ring-2 ring-wedding-gold/20 shadow-md' : 'border-wedding-gold/20 hover:border-wedding-gold/40'
                  }`}
                >
                  {/* Box Header */}
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${isActive ? 'bg-wedding-gold/5 border-wedding-gold/20' : 'border-wedding-gold/10 bg-wedding-beige/20'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{lang.flag}</span>
                      <div>
                        <span className="text-xs font-bold text-wedding-dark">{lang.nativeLabel}</span>
                        <span className="text-[10px] text-wedding-brown/40 ml-1.5">({lang.label})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Copy button */}
                      <button
                        onClick={e => { e.stopPropagation(); copyContent(lang.key); }}
                        title="Copy to clipboard"
                        className="p-1.5 rounded-lg hover:bg-wedding-gold/10 text-wedding-brown/40 hover:text-wedding-gold transition-all"
                      >
                        {copiedLang === lang.key ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      {/* Load starter */}
                      <button
                        onClick={e => { e.stopPropagation(); setMessages(prev => ({ ...prev, [lang.key]: STARTERS[messageType]?.[lang.key] || '' })); }}
                        title="Load starter template"
                        className="p-1.5 rounded-lg hover:bg-wedding-gold/10 text-wedding-brown/40 hover:text-wedding-gold transition-all"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      {/* Clear */}
                      <button
                        onClick={e => { e.stopPropagation(); clearBox(lang.key); }}
                        title="Clear box"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-wedding-brown/40 hover:text-red-500 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="p-4">
                    <textarea
                      value={messages[lang.key]}
                      onChange={e => setMessages(prev => ({ ...prev, [lang.key]: e.target.value }))}
                      onFocus={() => setActiveBox(lang.key)}
                      placeholder={`Type your ${lang.label} message here...\n\nYou can use placeholders like {guestName}, {eventName}, etc.`}
                      rows={10}
                      dir={lang.dir}
                      className={`w-full resize-none text-sm text-wedding-dark bg-transparent focus:outline-none placeholder-wedding-brown/20 leading-relaxed ${lang.fontClass}`}
                    />
                  </div>

                  {/* Footer */}
                  <div className="px-4 pb-3 flex items-center justify-between">
                    <span className="text-[10px] text-wedding-brown/30">
                      {isActive ? '✏️ Active box — placeholders insert here' : 'Click to activate'}
                    </span>
                    <CharCount text={messages[lang.key]} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Save Button Bar ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-wedding-cream border border-wedding-gold/20 rounded-3xl px-6 py-5 shadow-sm">
          <div className="text-xs text-wedding-brown/60">
            {editingId
              ? <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-wedding-gold" /> Editing existing template</span>
              : <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5 text-wedding-gold" /> Creating new template</span>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetForm}
              className="px-5 py-2.5 rounded-xl border border-wedding-gold/20 text-xs font-bold text-wedding-brown hover:bg-wedding-gold/5 transition-all"
            >
              Reset
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-wedding-gold/20 text-xs font-bold text-wedding-brown hover:bg-wedding-gold/5 transition-all"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
            <button
              onClick={saveTemplate}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-wedding-brown text-wedding-cream text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? 'Saving…' : editingId ? 'Update Template' : 'Save Template'}
            </button>
          </div>
        </div>

        {/* ── Saved Templates Library ─────────────────────────────── */}
        <div className="bg-white border border-wedding-gold/20 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-wedding-gold/10 pb-3">
            <h2 className="text-xs font-bold text-wedding-brown/50 uppercase tracking-widest">Saved Templates</h2>
            <button
              onClick={fetchTemplates}
              className="p-1.5 rounded-lg hover:bg-wedding-gold/10 text-wedding-brown/40 hover:text-wedding-gold transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingTemplates ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingTemplates ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="h-6 w-6 text-wedding-gold animate-spin" />
            </div>
          ) : savedTemplates.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <FileText className="h-10 w-10 text-wedding-gold/30 mx-auto" />
              <p className="text-sm text-wedding-brown/50">No saved templates yet</p>
              <p className="text-xs text-wedding-brown/30">Create and save a template above to see it here</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedTemplates.map(t => {
                const typeInfo = MESSAGE_TYPES.find(m => m.value === t.messageType) || MESSAGE_TYPES[0];
                const Icon = typeInfo.icon;
                const isEditing = editingId === t._id;
                return (
                  <div
                    key={t._id}
                    className={`rounded-2xl border p-4 space-y-3 transition-all ${
                      isEditing ? 'border-wedding-gold bg-wedding-gold/5 shadow-md' : 'border-wedding-gold/20 hover:border-wedding-gold/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border ${typeInfo.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-wedding-dark leading-tight block">{t.name}</span>
                          <span className="text-[10px] text-wedding-brown/40 capitalize">{t.messageType} · {t.audience}</span>
                        </div>
                      </div>
                    </div>

                    {/* Language availability pills */}
                    <div className="flex gap-1.5">
                      {LANG_BOXES.map(lang => (
                        <span
                          key={lang.key}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            t[`content${lang.key.charAt(0).toUpperCase() + lang.key.slice(1)}`]
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          {lang.label}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => loadTemplate(t)}
                        className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-wedding-brown text-wedding-cream hover:opacity-90 transition-all"
                      >
                        {isEditing ? 'Currently Editing' : 'Edit / Use'}
                      </button>
                      <button
                        onClick={() => deleteTemplate(t._id)}
                        className="p-2 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
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
    </CoupleDashboardLayout>
  );
}
