'use client';

import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import RoleGuard from '@/components/shared/role-guard';

interface InvitationRecord {
  _id: string;
  guestId: {
    _id: string;
    name: string;
    mobile: string;
    guestType: string;
    createdBy: string;
  };
  marriageId: string;
  invitedBy: string;
  invitationType: 'solo' | 'sahjode' | 'sarve' | 'sajode';
  pdfUrl?: string;
  status: 'pending' | 'sent' | 'delivered' | 'viewed' | 'failed';
  magicToken: string;
  sentAt?: string;
  viewedAt?: string;
  createdAt: string;
}

interface GuestRecord {
  _id: string;
  name: string;
  mobile: string;
  guestType: 'solo' | 'sahjode' | 'sarve' | 'sajode';
  createdBy: string;
  marriageId: string;
}

interface MarriageRecord {
  _id: string;
  brideName: string;
  groomName: string;
  marriageDate: string;
  soloCardUrl?: string;
  sajodeCardUrl?: string;
  sarveCardUrl?: string;
  invitationPdf?: string;
}

export default function InvitationsManagementPage() {
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [marriages, setMarriages] = useState<MarriageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSide, setSelectedSide] = useState('');

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Card configuration upload states
  const [activeMarriage, setActiveMarriage] = useState<MarriageRecord | null>(null);
  const [uploadingCard, setUploadingCard] = useState<string | null>(null);

  // Preview Dialog States
  const [previewInvite, setPreviewInvite] = useState<InvitationRecord | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Detail Modal States
  const [detailInvite, setDetailInvite] = useState<InvitationRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load Initial Metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [marriageRes, guestsRes] = await Promise.all([
          fetch('/api/marriages'),
          fetch('/api/guests?limit=1000') // Fetch all guests to match those without invites yet
        ]);

        if (marriageRes.ok) {
          const data = await marriageRes.json();
          setMarriages(data);
          if (data.length > 0) setActiveMarriage(data[0]);
        }

        if (guestsRes.ok) {
          const json = await guestsRes.json();
          setGuests(json.data.list || []);
        }
      } catch (err) {
        console.error('Failed to load initial metadata:', err);
      }
    }
    loadMetadata();
  }, [refreshTrigger]);

  // Load Invitations List
  useEffect(() => {
    async function loadInvitations() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (selectedType) params.append('invitationType', selectedType);
        if (selectedStatus) params.append('status', selectedStatus);

        const res = await fetch(`/api/v1/invitations?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to retrieve invitations registry.');

        const json = await res.json();
        setInvitations(json.data || []);
      } catch (err: any) {
        setError(err.message || 'Error occurred.');
      } finally {
        setLoading(false);
      }
    }
    loadInvitations();
  }, [selectedType, selectedStatus, refreshTrigger]);

  // Handle PDF Card Template Upload
  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'solo' | 'sajode' | 'sarve') => {
    const file = e.target.files?.[0];
    if (!file || !activeMarriage) return;

    setUploadingCard(type);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // 1. Upload to assets CDN
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload PDF file.');

      const fileUrl = uploadData.url;

      // 2. Patch Marriage Settings with card URL
      const patchPayload = {
        soloCardUrl: type === 'solo' ? fileUrl : activeMarriage.soloCardUrl,
        sajodeCardUrl: type === 'sajode' ? fileUrl : activeMarriage.sajodeCardUrl,
        sarveCardUrl: type === 'sarve' ? fileUrl : activeMarriage.sarveCardUrl,
      };

      const patchRes = await fetch(`/api/marriages/${activeMarriage._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      });

      if (!patchRes.ok) throw new Error('Failed to update wedding card metadata configuration.');

      alert(`${type.toUpperCase()} Card PDF uploaded successfully!`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      alert(err.message || 'Error uploading card template.');
    } finally {
      setUploadingCard(null);
    }
  };

  // Dispatch single guest invite
  const handleSendInvite = async (guestId: string) => {
    try {
      const res = await fetch('/api/v1/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation.');
      alert('Invitation provisioned successfully.');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Dispatch All Invitations
  const handleSendAll = async () => {
    if (!confirm('Are you sure you want to provision invitations for ALL guests in the registry?')) return;
    try {
      const res = await fetch('/api/v1/invitations/send-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitations.');
      alert(`Invitations processed successfully!\nImported/Sent: ${data.data.successCount}\nFailed: ${data.data.failedCount}`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Bulk Actions
  const handleBulkSendSelected = async () => {
    if (selectedIds.length === 0) return;
    let success = 0;
    for (const inviteId of selectedIds) {
      const invite = invitations.find((i) => i._id === inviteId);
      if (invite) {
        try {
          await fetch('/api/v1/invitations/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guestId: invite.guestId._id }),
          });
          success++;
        } catch (err) {
          console.error(err);
        }
      }
    }
    alert(`Bulk Send completed: ${success} of ${selectedIds.length} successfully enqueued.`);
    setSelectedIds([]);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleBulkRegenerateSelected = async () => {
    if (selectedIds.length === 0) return;
    let success = 0;
    for (const inviteId of selectedIds) {
      try {
        const res = await fetch('/api/v1/invitations/regenerate-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitationId: inviteId }),
        });
        if (res.ok) success++;
      } catch (err) {
        console.error(err);
      }
    }
    alert(`Bulk Regeneration completed: ${success} of ${selectedIds.length} links renewed.`);
    setSelectedIds([]);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Regenerate Magic Link Action
  const handleRegenerateLink = async (invitationId: string) => {
    try {
      const res = await fetch('/api/v1/invitations/regenerate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to renew link.');
      alert('Access login link renewed successfully.');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Check check-box triggers
  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.length === invitations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invitations.map((i) => i._id));
    }
  };

  // Filter list by search query and owner side checks
  const filteredInvitations = invitations.filter((invite) => {
    const guest = invite.guestId;
    if (!guest) return false;

    // Search query match
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        guest.name.toLowerCase().includes(q) ||
        guest.mobile.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // Owner Side filter
    if (selectedSide) {
      const side = selectedSide === 'bride' ? 'Bride Side' : 'Groom Side';
      // Mapped by guest inviter side
      const guestSide = guest.createdBy === activeMarriage?.brideName ? 'Bride Side' : 'Groom Side';
      if (guestSide !== side) return false;
    }

    return true;
  });

  return (
    <RoleGuard allowedRoles={['owner_admin']}>
      <div className="space-y-6">
        {/* Banner Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-primary font-serif tracking-tight">
              Invitation Dispatch & Templates
            </h2>
            <p className="mt-1 text-xs text-foreground/60">
              Manage invitation card PDF templates, verify delivery statuses, and audit magic access links.
            </p>
          </div>
          <button
            onClick={handleSendAll}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all"
          >
            <Icons.Send className="h-4 w-4" />
            <span>Send All Invitations</span>
          </button>
        </div>

        {/* Card Template Configuration Uploader */}
        {activeMarriage && (
          <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider font-serif">Wedding Card PDF Templates</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { title: 'Solo Category Card', key: 'solo', current: activeMarriage.soloCardUrl || activeMarriage.invitationPdf },
                { title: 'Sajode (Couple) Card', key: 'sajode', current: activeMarriage.sajodeCardUrl || activeMarriage.invitationPdf },
                { title: 'Sarve (Family) Card', key: 'sarve', current: activeMarriage.sarveCardUrl || activeMarriage.invitationPdf },
              ].map((card, idx) => (
                <div key={idx} className="border border-primary/10 rounded-xl p-4 space-y-3 bg-primary/[0.01]">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-primary text-xs">{card.title}</span>
                    {card.current ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">Configured</span>
                    ) : (
                      <span className="text-[9px] bg-gray-100 text-foreground/50 px-2 py-0.5 rounded font-bold uppercase">Empty</span>
                    )}
                  </div>

                  <p className="text-[10px] text-foreground/50 truncate max-w-xs">
                    {card.current ? card.current.substring(card.current.lastIndexOf('/') + 1) : 'No template card PDF linked.'}
                  </p>

                  <div className="flex gap-2 pt-1 text-[10px]">
                    <label className="flex-1 text-center bg-white border border-primary/10 text-primary py-2 rounded-lg font-bold cursor-pointer hover:bg-primary/5 transition-all">
                      <span>{uploadingCard === card.key ? 'Uploading...' : 'Upload PDF'}</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => handleCardUpload(e, card.key as any)}
                        disabled={uploadingCard !== null}
                      />
                    </label>
                    {card.current && (
                      <a
                        href={card.current}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center bg-primary text-white py-2 rounded-lg font-bold"
                      >
                        View Template
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters and Bulk Actions Header */}
        <div className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search query */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search guest invitations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-primary/10 bg-background/30 pl-9 pr-4 py-2.5 text-xs text-foreground placeholder-foreground/45 focus:border-primary focus:outline-none transition-colors"
              />
              <Icons.Search className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-foreground/45" />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-xl border border-primary/10 bg-background/30 px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none transition-colors bg-white h-[38px]"
              >
                <option value="">All Categories</option>
                <option value="solo">Solo</option>
                <option value="sahjode">Sajode (Couple)</option>
                <option value="sarve">Sarve (Family)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-xl border border-primary/10 bg-background/30 px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none transition-colors bg-white h-[38px]"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending Reply</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="viewed">Viewed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Side Filter */}
            <div>
              <select
                value={selectedSide}
                onChange={(e) => setSelectedSide(e.target.value)}
                className="w-full rounded-xl border border-primary/10 bg-background/30 px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none transition-colors bg-white h-[38px]"
              >
                <option value="">All Owner Sides</option>
                <option value="bride">Bride Admin Side</option>
                <option value="groom">Groom Admin Side</option>
              </select>
            </div>
          </div>

          {/* Bulk Action Controls */}
          {selectedIds.length > 0 && (
            <div className="flex gap-2 p-2 bg-primary/5 rounded-xl border border-primary/10 text-xs items-center justify-between">
              <span className="font-bold text-primary pl-2">{selectedIds.length} invitations selected</span>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkSendSelected}
                  className="bg-primary text-white px-3.5 py-1.5 rounded-lg font-bold"
                >
                  Send Selected
                </button>
                <button
                  onClick={handleBulkRegenerateSelected}
                  className="bg-white border border-primary/10 text-primary px-3.5 py-1.5 rounded-lg font-bold"
                >
                  Regenerate Link Selected
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="flex h-40 items-center justify-center animate-pulse">
              <Icons.Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="text-red-500 text-xs py-4">{error}</p>
          ) : filteredInvitations.length === 0 ? (
            <p className="text-xs text-foreground/45 italic py-6 text-center">No invitations configured in this workspace.</p>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-primary/10 text-foreground/50 font-bold">
                    <th className="py-3 px-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredInvitations.length}
                        onChange={handleSelectAllToggle}
                        className="rounded"
                      />
                    </th>
                    <th className="py-3">Guest Name</th>
                    <th className="py-3">Mobile</th>
                    <th className="py-3">Type</th>
                    <th className="py-3">Owner Side</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Sent Date</th>
                    <th className="py-3">Viewed Date</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvitations.map((invite) => {
                    const guest = invite.guestId;
                    const isBrideSide = guest?.createdBy === activeMarriage?.brideName || true;
                    return (
                      <tr key={invite._id} className="border-b border-primary/5 hover:bg-primary/[0.01]">
                        <td className="py-3.5 px-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(invite._id)}
                            onChange={() => handleSelectToggle(invite._id)}
                            className="rounded"
                          />
                        </td>
                        <td className="py-3.5 font-semibold text-primary">{guest?.name || 'Unknown'}</td>
                        <td className="py-3.5 font-mono">{guest?.mobile || '—'}</td>
                        <td className="py-3.5 capitalize">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            invite.invitationType === 'solo' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {invite.invitationType === 'sahjode' ? 'Sajode' : invite.invitationType}
                          </span>
                        </td>
                        <td className="py-3.5 text-foreground/60">{isBrideSide ? 'Bride Side' : 'Groom Side'}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize ${
                            invite.status === 'viewed' ? 'bg-emerald-100 text-emerald-800' : 'bg-primary/10 text-primary'
                          }`}>
                            {invite.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-foreground/60">
                          {invite.sentAt ? new Date(invite.sentAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3.5 text-foreground/60">
                          {invite.viewedAt ? new Date(invite.viewedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3.5 text-right space-x-3">
                          <button
                            onClick={() => {
                              setPreviewInvite(invite);
                              setIsPreviewOpen(true);
                            }}
                            className="text-primary hover:underline font-bold"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleSendInvite(guest._id)}
                            className="text-primary hover:underline font-bold"
                          >
                            Send
                          </button>
                          <button
                            onClick={() => handleRegenerateLink(invite._id)}
                            className="text-primary hover:underline font-bold"
                          >
                            Renew
                          </button>
                          <button
                            onClick={() => {
                              setDetailInvite(invite);
                              setIsDetailOpen(true);
                            }}
                            className="text-primary hover:underline font-bold"
                          >
                            Details
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

        {/* INVITATION PREVIEW MODAL */}
        {isPreviewOpen && previewInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-primary/10 bg-white p-6 shadow-lg space-y-6">
              <div className="flex justify-between items-center border-b border-primary/10 pb-3">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider font-serif">Invitation Card Preview</h3>
                <button onClick={() => setIsPreviewOpen(false)} className="text-foreground/45 hover:text-foreground">
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-primary/[0.02] border border-primary/10 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Guest Name:</span>
                    <span className="font-bold text-primary">{previewInvite.guestId.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Category:</span>
                    <span className="font-bold text-primary capitalize">{previewInvite.invitationType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">PDF Template Card:</span>
                    <span className="font-bold text-primary truncate max-w-xs">{previewInvite.pdfUrl ? 'Configured PDF' : 'Default Card'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Magic Link (Masked):</span>
                    <span className="font-mono font-bold text-[10px] text-foreground/40">https://.../invite/[token-hidden]</span>
                  </div>
                </div>

                {previewInvite.pdfUrl && (
                  <iframe src={previewInvite.pdfUrl} className="w-full h-48 border border-primary/10 rounded-xl" />
                )}

                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="w-full bg-primary text-white py-2.5 rounded-xl text-center font-bold text-xs"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INVITATION DETAILS MODAL */}
        {isDetailOpen && detailInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-primary/10 bg-white p-6 shadow-lg space-y-6">
              <div className="flex justify-between items-center border-b border-primary/10 pb-3">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider font-serif">Invitation Audit Details</h3>
                <button onClick={() => setIsDetailOpen(false)} className="text-foreground/45 hover:text-foreground">
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Invitation ID:</span>
                    <span className="font-mono text-foreground">{detailInvite._id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Magic Token Hash:</span>
                    <span className="font-mono text-[9px] text-foreground/45">{detailInvite.magicToken.substring(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Delivery Status:</span>
                    <span className="font-bold text-primary capitalize">{detailInvite.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Date Sent:</span>
                    <span>{detailInvite.sentAt ? new Date(detailInvite.sentAt).toLocaleString() : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Date Viewed:</span>
                    <span>{detailInvite.viewedAt ? new Date(detailInvite.viewedAt).toLocaleString() : '—'}</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="w-full bg-primary text-white py-2.5 rounded-xl text-center font-bold text-xs"
                >
                  Close Audit Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
