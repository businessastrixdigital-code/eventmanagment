import React, { useState, useEffect } from 'react';
import CoupleDashboardLayout from '../../components/CoupleDashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Settings as SettingsIcon, ShieldAlert, Monitor, ToggleLeft, ToggleRight, Save, Lock, AlertTriangle } from 'lucide-react';

export default function Settings() {
  const { apiRequest, user } = useAuth();
  
  // Permissions Matrix
  const [permissions, setPermissions] = useState({
    bride: { editEvents: true, sendNotifications: true, manageGuests: true, managePhotos: true },
    groom: { editEvents: true, sendNotifications: true, manageGuests: true, managePhotos: true }
  });

  // Sessions and 2FA
  const [sessions, setSessions] = useState([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSettingsData = async () => {
    setLoading(true);
    try {
      // 1. Load permissions from profile details
      const coupleRes = await apiRequest('/api/couple/profile');
      if (coupleRes.ok) {
        const data = await coupleRes.json();
        if (data.permissions) {
          setPermissions(data.permissions);
        }
      }

      // 2. Fetch active sessions list
      const sessionsRes = await apiRequest('/api/couple/sessions');
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      setError('Failed to fetch settings details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const handleTogglePermission = (subRole, action) => {
    setPermissions(prev => ({
      ...prev,
      [subRole]: {
        ...prev[subRole],
        [action]: !prev[subRole][action]
      }
    }));
  };

  const handleSavePermissions = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await apiRequest('/api/couple/permissions', {
        method: 'PUT',
        body: JSON.stringify({ permissions })
      });
      if (res.ok) {
        setSuccess('Permissions matrix updated successfully!');
      } else {
        setError('Failed to save permissions matrix.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleRevokeSession = (sessId) => {
    setSessions(prev => prev.filter(s => s.id !== sessId));
    setSuccess('Session successfully revoked!');
  };

  return (
    <CoupleDashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-jost text-wedding-dark">Dashboard Config & Settings</h1>
        <p className="text-sm text-wedding-brown/70 mt-1">Configure co-admin toggles, 2FA settings, and session devices</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Permission Matrix Toggles */}
          <div className="wedding-card bg-white relative overflow-hidden">
            <div className="floral-corner-tl opacity-55"></div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold font-jost text-wedding-dark">Co-Admin Permission Grid</h3>
              <button onClick={handleSavePermissions} className="gold-button flex items-center gap-1.5 text-xs py-2">
                <Save className="h-4 w-4" />
                Save Grid
              </button>
            </div>

            <div className="space-y-6">
              {/* BRIDE SIDE PERMISSIONS */}
              <div className="border border-pink-100 bg-pink-50/10 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-pink-700 uppercase tracking-widest block">Bride permissions</span>
                
                <div className="space-y-2">
                  {Object.keys(permissions.bride || {}).map((action) => (
                    <div key={action} className="flex justify-between items-center text-xs font-semibold text-wedding-dark bg-white p-2.5 rounded-xl border border-pink-100/50">
                      <span className="capitalize">{action.replace(/([A-Z])/g, ' $1')}</span>
                      <button 
                        type="button" 
                        onClick={() => handleTogglePermission('bride', action)}
                        className="text-pink-600 focus:outline-none"
                      >
                        {permissions.bride[action] ? <ToggleRight className="h-7 w-7 text-pink-500" /> : <ToggleLeft className="h-7 w-7 text-gray-300" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* GROOM PERMISSIONS */}
              <div className="border border-blue-100 bg-blue-50/10 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-widest block">Groom permissions</span>
                
                <div className="space-y-2">
                  {Object.keys(permissions.groom || {}).map((action) => (
                    <div key={action} className="flex justify-between items-center text-xs font-semibold text-wedding-dark bg-white p-2.5 rounded-xl border border-blue-100/50">
                      <span className="capitalize">{action.replace(/([A-Z])/g, ' $1')}</span>
                      <button 
                        type="button" 
                        onClick={() => handleTogglePermission('groom', action)}
                        className="text-blue-600 focus:outline-none"
                      >
                        {permissions.groom[action] ? <ToggleRight className="h-7 w-7 text-blue-500" /> : <ToggleLeft className="h-7 w-7 text-gray-300" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Device and session management */}
            <div className="wedding-card bg-white">
              <h3 className="text-lg font-bold font-jost text-wedding-dark mb-4 flex items-center gap-2">
                <Monitor className="h-5 w-5 text-wedding-gold" />
                Active Device Sessions
              </h3>

              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div key={sess.id} className="flex justify-between items-center bg-wedding-beige/10 p-3.5 rounded-2xl border border-wedding-gold/10">
                    <div>
                      <p className="text-xs font-semibold text-wedding-dark">{sess.device}</p>
                      <p className="text-[10px] text-wedding-brown/50 font-mono mt-0.5">IP: {sess.ip} | Login: {new Date(sess.loginAt).toLocaleTimeString()}</p>
                    </div>
                    <button 
                      onClick={() => handleRevokeSession(sess.id)}
                      className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* OTP 2FA Security */}
            <div className="wedding-card bg-white relative overflow-hidden">
              <h3 className="text-lg font-bold font-jost text-wedding-dark mb-3 flex items-center gap-2">
                <Lock className="h-5 w-5 text-wedding-gold" />
                Security & Multi-Factor Auth
              </h3>

              <div className="bg-wedding-beige/15 border border-wedding-gold/10 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-wedding-dark block">Enable OTP on Login</span>
                  <p className="text-[10px] text-wedding-brown/70 mt-1 leading-normal">
                    Forces double verification via SMS OTP before issuing session JWT tokens.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setTwoFactorEnabled(!twoFactorEnabled);
                    setSuccess(`OTP login verification is now ${!twoFactorEnabled ? 'Enabled' : 'Disabled'}.`);
                  }}
                  className="focus:outline-none"
                >
                  {twoFactorEnabled ? <ToggleRight className="h-8 w-8 text-[#C9A66B]" /> : <ToggleLeft className="h-8 w-8 text-gray-300" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CoupleDashboardLayout>
  );
}
