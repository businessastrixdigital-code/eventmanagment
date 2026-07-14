import React, { useState, useEffect } from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { useAuth } from '../../context/AuthContext';
import { Edit3, Save, Globe } from 'lucide-react';

export default function LanguageCMS() {
  const { apiRequest } = useAuth();
  const [languages, setLanguages] = useState([]);
  const [selectedLang, setSelectedLang] = useState(null);
  const [editableStrings, setEditableStrings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLanguages = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/superadmin/languages');
      if (res.ok) {
        const data = await res.json();
        setLanguages(data);
        if (data.length > 0 && !selectedLang) {
          setSelectedLang(data[0]);
          setEditableStrings(data[0].strings || {});
        }
      } else {
        setError('Failed to fetch language packs.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLanguages();
  }, []);

  const handleSelectLanguage = (lang) => {
    setSelectedLang(lang);
    setEditableStrings(lang.strings || {});
    setError('');
    setSuccess('');
  };

  const handleStringChange = (key, value) => {
    setEditableStrings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveStrings = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await apiRequest(`/api/superadmin/languages/${selectedLang.code}`, {
        method: 'PUT',
        body: JSON.stringify({ strings: editableStrings })
      });
      if (res.ok) {
        setSuccess(`Successfully updated ${selectedLang.label} translations!`);
        fetchLanguages();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save translations.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  return (
    <SuperAdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-jost text-wedding-dark">Language Packs CMS</h1>
          <p className="text-sm text-wedding-brown/70 mt-1">Manage global translation packs for invitation subdomains</p>
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

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wedding-gold"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Language selector sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-wedding-brown/50 mb-3 px-2">Languages</h3>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelectLanguage(lang)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  selectedLang?.code === lang.code
                    ? 'bg-wedding-cream text-wedding-brown border border-wedding-gold/30 shadow-sm'
                    : 'bg-white hover:bg-wedding-beige/20 text-wedding-brown/70 border border-transparent'
                }`}
              >
                <Globe className="h-4 w-4 text-wedding-gold" />
                {lang.label}
                <span className="ml-auto font-mono text-xs text-wedding-brown/40">{lang.code.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {/* Translation Editor list */}
          <div className="lg:col-span-3">
            {selectedLang && (
              <div className="bg-wedding-cream rounded-3xl border border-wedding-gold/15 p-6 shadow-wedding">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold font-jost text-wedding-dark">{selectedLang.label} Strings</h3>
                    <p className="text-xs text-wedding-brown/60 mt-0.5">Edit dictionary for site widgets</p>
                  </div>
                  <button onClick={handleSaveStrings} className="gold-button flex items-center gap-2 text-xs py-2">
                    <Save className="h-4 w-4" />
                    Save Translations
                  </button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {Object.keys(editableStrings).map((key) => (
                    <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center bg-white p-3 rounded-xl border border-wedding-gold/5">
                      <span className="font-mono text-xs font-bold text-wedding-brown/60 break-all select-all">
                        {key}
                      </span>
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={editableStrings[key] || ''}
                          onChange={(e) => handleStringChange(key, e.target.value)}
                          className="wedding-input py-1.5 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
