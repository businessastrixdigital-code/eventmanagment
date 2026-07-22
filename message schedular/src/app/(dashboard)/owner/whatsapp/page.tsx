'use client';

import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';

interface QueueJob {
  _id: string;
  recipient: string;
  templateName: string;
  templateVariables: Record<string, string>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextAttemptAt: string;
  error?: string;
  createdAt: string;
}

interface DeliveryLog {
  _id: string;
  recipient: string;
  templateName: string;
  status: 'sent' | 'failed';
  error?: string;
  createdAt: string;
}

export default function WhatsAppDashboard() {
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'logs'>('queue');

  const getWhatsAppWebLink = (job: QueueJob) => {
    const cleanPhone = job.recipient.replace(/[+\s-]/g, '');
    let text = '';

    if (job.templateName === 'guest_invitation') {
      const vars = job.templateVariables;
      text = `Hello ${vars.guestName || 'Guest'},\n\nYou are cordially invited to the wedding of *${vars.brideName || 'Bride'}* & *${vars.groomName || 'Groom'}* on *${vars.date || 'the wedding date'}*.\n\nPlease confirm your RSVP by visiting your personalized guest portal here:\n${vars.link || ''}\n\nWe look forward to celebrating with you!`;
    } else if (job.templateName === 'marriage_reminder') {
      const vars = job.templateVariables;
      text = `Dear ${vars.guestName || 'Guest'},\n\nThis is a friendly reminder that the wedding of *${vars.brideName || 'Bride'}* & *${vars.groomName || 'Groom'}* is approaching on *${vars.date || 'the wedding date'}* at *${vars.venue || 'Wedding Venue'}*.\n\nLooking forward to seeing you there!`;
    } else if (job.templateName === 'event_reminder') {
      const vars = job.templateVariables;
      text = `Dear ${vars.guestName || 'Guest'},\n\nThis is a quick reminder that the event *${vars.eventTitle || 'Event'}* is scheduled for *${vars.time || 'scheduled time'}*.\n\nSee you there!`;
    } else {
      text = `Hello ${job.templateVariables.guestName || 'Guest'},\n\nThis is a notification update regarding the wedding of ${job.templateVariables.brideName || 'Bride'} & ${job.templateVariables.groomName || 'Groom'}.`;
    }

    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  const loadData = async () => {
    try {
      const [qRes, lRes] = await Promise.all([
        fetch('/api/whatsapp/queue'),
        fetch('/api/whatsapp/logs'),
      ]);
      if (qRes.ok) setQueue(await qRes.json());
      if (lRes.ok) setLogs(await lRes.json());
    } catch (err) {
      console.error('Error fetching WhatsApp invites details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerProcess = async () => {
    setProcessing(true);
    setProcessResult(null);
    try {
      const res = await fetch('/api/whatsapp/process', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setProcessResult(data);
        loadData();
      } else {
        alert('Failed to process WhatsApp queue.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      processing: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      failed: 'bg-rose-50 text-rose-700 border-rose-200',
      sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return `text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${map[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-primary font-serif tracking-tight">
            WhatsApp Invitation Console
          </h2>
          <p className="mt-1 text-xs text-foreground/60">
            Monitor enqueued invitation broadcasts, view delivery logs, and manually process pending message triggers.
          </p>
        </div>
        <button
          onClick={triggerProcess}
          disabled={processing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/15 hover:opacity-95 transition-all duration-300 disabled:opacity-50 self-start sm:self-center"
        >
          {processing ? (
            <>
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing Queue…</span>
            </>
          ) : (
            <>
              <Icons.PlayCircle className="h-4 w-4" />
              <span>Process Pending Queue</span>
            </>
          )}
        </button>
      </div>

      {/* Process summary toast */}
      {processResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-800 flex items-start gap-3">
          <Icons.CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Queue Processing Completed!</p>
            <p className="text-[11px] text-emerald-700">
              Processed: <strong>{processResult.processed}</strong> · Completed: <strong>{processResult.completed}</strong> · Failed: <strong>{processResult.failed}</strong> · Retried: <strong>{processResult.retried}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-primary/10 gap-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'queue' ? 'border-primary text-primary font-bold' : 'border-transparent text-foreground/60 hover:text-primary'
          }`}
        >
          Enqueued Jobs ({queue.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'logs' ? 'border-primary text-primary font-bold' : 'border-transparent text-foreground/60 hover:text-primary'
          }`}
        >
          Delivery Audit Logs ({logs.length})
        </button>
      </div>

      {/* Content lists */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-primary/10 bg-white shadow-sm">
          <Icons.Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : activeTab === 'queue' ? (
        queue.length === 0 ? (
          <div className="text-center p-12 bg-white border border-primary/10 rounded-2xl shadow-sm italic text-foreground/45 text-xs">
            No enqueued WhatsApp messages pending delivery.
          </div>
        ) : (
          <div className="rounded-2xl border border-primary/10 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-primary/[0.02] border-b border-primary/5 text-primary/70 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Recipient</th>
                    <th className="p-4">Template</th>
                    <th className="p-4">Variables</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Attempts</th>
                    <th className="p-4">Next Scheduled Attempt</th>
                    <th className="p-4">Error details</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5 text-foreground/75">
                  {queue.map((job) => (
                    <tr key={job._id} className="hover:bg-primary/[0.01] transition-colors">
                      <td className="p-4 font-semibold">{job.recipient}</td>
                      <td className="p-4 font-mono text-[11px]">{job.templateName}</td>
                      <td className="p-4">
                        <div className="text-[10px] space-y-0.5 max-w-xs truncate">
                          {Object.entries(job.templateVariables).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="font-bold text-primary/60">{k}:</span> {v}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(job.status)}</td>
                      <td className="p-4 font-bold">{job.attempts} / {job.maxAttempts}</td>
                      <td className="p-4 text-foreground/50">
                        {new Date(job.nextAttemptAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-4 text-rose-600 font-semibold max-w-xs truncate" title={job.error}>
                        {job.error || '—'}
                      </td>
                      <td className="p-4 text-right">
                        <a
                          href={getWhatsAppWebLink(job)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white px-2.5 py-1 text-[10px] font-bold shadow-xs transition-all select-none"
                        >
                          <Icons.Send className="h-3 w-3" />
                          <span>Send Free</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : logs.length === 0 ? (
        <div className="text-center p-12 bg-white border border-primary/10 rounded-2xl shadow-sm italic text-foreground/45 text-xs">
          No delivery logs found.
        </div>
      ) : (
        <div className="rounded-2xl border border-primary/10 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-primary/[0.02] border-b border-primary/5 text-primary/70 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Template</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Logged At</th>
                  <th className="p-4">Error Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5 text-foreground/75">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-primary/[0.01] transition-colors">
                    <td className="p-4 font-semibold">{log.recipient}</td>
                    <td className="p-4 font-mono text-[11px]">{log.templateName}</td>
                    <td className="p-4">{getStatusBadge(log.status)}</td>
                    <td className="p-4 text-foreground/50">
                      {new Date(log.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-4 text-rose-600 font-semibold max-w-xs truncate" title={log.error}>
                      {log.error || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
