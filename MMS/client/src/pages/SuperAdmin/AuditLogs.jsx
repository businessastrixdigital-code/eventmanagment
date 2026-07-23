import React, { useState, useEffect } from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { useAuth } from '../../context/AuthContext';
import { ClipboardList, ShieldAlert } from 'lucide-react';

export default function AuditLogs() {
  const { apiRequest } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/superadmin/logs?page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setPages(data.pages);
      } else {
        setError('Failed to fetch audit trails.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <SuperAdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-jost text-wedding-dark">System Audit Logs</h1>
        <p className="text-sm text-wedding-brown/70 mt-1">Immutable ledger tracking super admin and partner dashboard operations</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl text-sm text-red-700 mb-8">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wedding-gold"></div>
        </div>
      ) : (
        <div className="bg-wedding-cream rounded-3xl border border-wedding-gold/15 overflow-hidden shadow-wedding">
          <div className="overflow-x-auto font-poppins">
            <table className="min-w-full divide-y divide-wedding-gold/10">
              <thead className="bg-wedding-brown/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-wedding-brown/70">Timestamp</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-wedding-brown/70">Actor</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-wedding-brown/70">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-wedding-brown/70">Target Resource</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-wedding-brown/70">Audit Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wedding-gold/10 bg-white">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-wedding-brown/50 italic">
                      No logs available yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-wedding-beige/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-wedding-brown/80 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-wedding-brown/80 font-semibold font-mono">
                        {log.actorId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono ${
                          log.action.includes('DELETE')
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : log.action.includes('RESET')
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-wedding-brown/70 font-mono">
                        {log.targetId || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-wedding-dark">
                        {log.reason}
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
              <button 
                onClick={() => setPage(p => Math.max(p - 1, 1))} 
                disabled={page === 1}
                className="outline-button py-1 text-xs"
              >
                Previous
              </button>
              <span className="text-xs text-wedding-brown/70 font-medium">Page {page} of {pages}</span>
              <button 
                onClick={() => setPage(p => Math.min(p + 1, pages))} 
                disabled={page === pages}
                className="outline-button py-1 text-xs"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </SuperAdminLayout>
  );
}
