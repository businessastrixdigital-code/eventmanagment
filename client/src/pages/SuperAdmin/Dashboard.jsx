import React, { useState, useEffect } from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { useAuth } from '../../context/AuthContext';
import { Users, Calendar, Award, Database, MessageCircle, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const { apiRequest } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/api/superadmin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.counts);
      } else {
        setError('Failed to fetch platform metrics.');
      }
    } catch (err) {
      setError('Connection error. Could not connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <SuperAdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-jost text-wedding-dark">Platform Overview</h1>
          <p className="text-sm text-wedding-brown/70 mt-1">Live metrics across all onboarded events</p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="outline-button flex items-center gap-2 text-sm py-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl text-sm text-red-700 mb-8">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="wedding-card h-32 animate-pulse bg-wedding-cream/50"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="wedding-card flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/50">Total Couples</p>
              <h3 className="text-2xl font-bold font-jost text-wedding-dark mt-1">{metrics?.couples || 0}</h3>
            </div>
          </div>

          <div className="wedding-card flex items-center gap-4">
            <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/50">Active Events</p>
              <h3 className="text-2xl font-bold font-jost text-wedding-dark mt-1">{metrics?.events || 0}</h3>
            </div>
          </div>

          <div className="wedding-card flex items-center gap-4">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/50">Total Guests</p>
              <h3 className="text-2xl font-bold font-jost text-wedding-dark mt-1">{metrics?.guests || 0}</h3>
            </div>
          </div>

          <div className="wedding-card flex items-center gap-4">
            <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/50">Storage Used</p>
              <h3 className="text-2xl font-bold font-jost text-wedding-dark mt-1">{metrics?.storageUsedMB || 0} MB</h3>
            </div>
          </div>

          <div className="wedding-card flex items-center gap-4 md:col-span-2">
            <div className="p-4 bg-pink-50 text-pink-600 rounded-2xl">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-wedding-brown/50">Wishes Posted</p>
              <h3 className="text-2xl font-bold font-jost text-wedding-dark mt-1">{metrics?.wishes || 0}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Admin Notes card */}
      <div className="wedding-card mt-8 relative overflow-hidden">
        <div className="px-4 py-2">
          <h3 className="text-lg font-bold font-jost text-wedding-dark mb-3">Super Admin Guidelines</h3>
          <ul className="text-sm text-wedding-brown/80 space-y-2 list-disc list-inside">
            <li>Review audit logs regularly to monitor resets and updates.</li>
            <li>Maintain language pack strings carefully; any additions will update all couple subdomains instantly.</li>
            <li>Premium plans raise guest count limits and enable private photo album access controls.</li>
          </ul>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
