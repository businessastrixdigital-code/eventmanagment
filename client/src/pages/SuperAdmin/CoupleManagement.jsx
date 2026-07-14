import React, { useState, useEffect } from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Key, Edit, Eye, EyeOff, X, Copy, Check } from 'lucide-react';

export default function CoupleManagement() {
  const { apiRequest } = useAuth();
  const [couples, setCouples] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [revealedCredentials, setRevealedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  // Form Fields
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [mobile, setMobile] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [editingId, setEditingId] = useState('');

  // Bride & Groom individual accounts fields
  const [brideMobile, setBrideMobile] = useState('');
  const [brideUsername, setBrideUsername] = useState('');
  const [bridePassword, setBridePassword] = useState('');
  const [groomMobile, setGroomMobile] = useState('');
  const [groomUsername, setGroomUsername] = useState('');
  const [groomPassword, setGroomPassword] = useState('');
  const [commonPassword, setCommonPassword] = useState('');

  // Password visibility states
  const [showBridePass, setShowBridePass] = useState(false);
  const [showGroomPass, setShowGroomPass] = useState(false);
  const [showCommonPass, setShowCommonPass] = useState(false);

  // Support Mode Detail View
  const [selectedCoupleDetail, setSelectedCoupleDetail] = useState(null);

  // Auto-generation hooks
  useEffect(() => {
    if (brideMobile) {
      if (!mobile) setMobile(brideMobile);
      setBrideUsername(`bride_${brideMobile}`);
      setBridePassword(`${brideMobile}@${brideName ? brideName.replace(/\s+/g, '') : 'Bride'}`);
    }
  }, [brideMobile, brideName]);

  useEffect(() => {
    if (groomMobile) {
      setGroomUsername(`groom_${groomMobile}`);
      setGroomPassword(`${groomMobile}@${groomName ? groomName.replace(/\s+/g, '') : 'Groom'}`);
    }
  }, [groomMobile, groomName]);

  useEffect(() => {
    if (mobile) {
      setCommonPassword(`${mobile}@Common`);
    }
  }, [mobile]);

  const fetchCouples = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/superadmin/couples?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setCouples(data.couples);
        setTotal(data.total);
        setPages(data.pages);
      } else {
        setError('Failed to load couples.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouples();
  }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiRequest('/api/superadmin/couples', {
        method: 'POST',
        body: JSON.stringify({ 
          brideName, 
          groomName, 
          mobile, 
          weddingDate, 
          commonPassword,
          brideMobile,
          brideUsername,
          bridePassword,
          groomMobile,
          groomUsername,
          groomPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRevealedCredentials({
          tempPassword: data.tempPassword,
          bridePassword: data.bridePassword,
          groomPassword: data.groomPassword,
          couple: data.couple
        });
        setIsCreateOpen(false);
        // Clear fields
        setBrideName('');
        setGroomName('');
        setMobile('');
        setWeddingDate('');
        setBrideMobile('');
        setBrideUsername('');
        setBridePassword('');
        setGroomMobile('');
        setGroomUsername('');
        setGroomPassword('');
        setCommonPassword('');
        fetchCouples();
      } else {
        setError(data.error || 'Failed to create couple.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiRequest(`/api/superadmin/couples/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          brideName, 
          groomName, 
          mobile, 
          brideMobile,
          brideUsername,
          bridePassword,
          groomMobile,
          groomUsername,
          groomPassword,
          commonPassword,
          weddingDate 
        })
      });
      if (res.ok) {
        setIsEditOpen(false);
        setBrideName('');
        setGroomName('');
        setMobile('');
        setWeddingDate('');
        setBrideMobile('');
        setBrideUsername('');
        setBridePassword('');
        setGroomMobile('');
        setGroomUsername('');
        setGroomPassword('');
        setCommonPassword('');
        fetchCouples();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to edit couple.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this couple account? This action is permanent and deletes all associated events, guests, wishes, and photos.')) {
      return;
    }
    setError('');
    try {
      const res = await apiRequest(`/api/superadmin/couples/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCouples();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete couple.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleResetPassword = async (id) => {
    if (!confirm('Are you sure you want to reset passwords for this couple? They will be given new temporary passwords for common, bride, and groom accounts.')) {
      return;
    }
    setError('');
    try {
      const res = await apiRequest(`/api/superadmin/couples/${id}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setRevealedCredentials({
          tempPassword: data.tempPassword,
          bridePassword: data.bridePassword,
          groomPassword: data.groomPassword,
          couple: couples.find(c => c.id === id)
        });
      } else {
        setError(data.error || 'Failed to reset passwords.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleSupportView = async (id) => {
    setError('');
    try {
      const res = await apiRequest(`/api/superadmin/couples/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCoupleDetail(data);
        setIsViewOpen(true);
      } else {
        setError('Failed to load support detail.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openCreateModal = () => {
    setBrideName('');
    setGroomName('');
    setMobile('');
    setWeddingDate('');
    setBrideMobile('');
    setBrideUsername('');
    setBridePassword('');
    setGroomMobile('');
    setGroomUsername('');
    setGroomPassword('');
    setCommonPassword('');
    setShowBridePass(true); // default to visible in create
    setShowGroomPass(true);
    setShowCommonPass(true);
    setIsCreateOpen(true);
  };

  const openEditModal = (couple) => {
    setEditingId(couple.id);
    setBrideName(couple.brideName || '');
    setGroomName(couple.groomName || '');
    setMobile(couple.mobile || '');
    setBrideMobile(couple.brideMobile || '');
    setBrideUsername(couple.brideUsername || '');
    setGroomMobile(couple.groomMobile || '');
    setGroomUsername(couple.groomUsername || '');
    setWeddingDate(couple.weddingDate || '');
    setBridePassword('');
    setGroomPassword('');
    setCommonPassword('');
    setShowBridePass(false); // default to hidden in edit
    setShowGroomPass(false);
    setShowCommonPass(false);
    setIsEditOpen(true);
  };

  return (
    <SuperAdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-jost text-wedding-dark">Couple Onboarding</h1>
          <p className="text-sm text-wedding-brown/70 mt-1">Manage and provision wedding websites</p>
        </div>
        <button onClick={openCreateModal} className="gold-button flex items-center gap-2 text-sm py-2">
          <Plus className="h-4 w-4" />
          Onboard Couple
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl text-sm text-red-700 mb-8">
          {error}
        </div>
      )}

      {/* REVEAL CREDENTIALS MODAL */}
      {revealedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border-2 border-wedding-gold shadow-wedding max-w-2xl w-full relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-wedding-dark font-jost text-center mb-2">Accounts Credentials Generated</h3>
            <p className="text-xs text-red-600 font-semibold text-center mb-6">
              WARNING: Passwords are shown ONLY ONCE. Copy or save them now!
            </p>

            <div className="space-y-6">
              {/* Common Account */}
              <div className="bg-white border border-wedding-gold/20 rounded-2xl p-4">
                <span className="text-xs font-bold text-wedding-gold uppercase tracking-wider block mb-2">1. Common Account</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-wedding-brown/60">Username (Mobile)</span>
                    <div className="font-mono font-bold text-wedding-dark p-2 bg-wedding-beige/25 rounded-lg select-all">{revealedCredentials.couple?.mobile || mobile}</div>
                  </div>
                  <div>
                    <span className="text-xs text-wedding-brown/60 font-semibold">Password</span>
                    <div className="flex justify-between items-center bg-wedding-beige/25 rounded-lg p-2 font-mono font-bold text-wedding-dark select-all">
                      <span>{revealedCredentials.tempPassword}</span>
                      <button onClick={() => copyToClipboard(revealedCredentials.tempPassword)} className="text-wedding-gold hover:text-wedding-dark ml-2">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bride Account */}
              <div className="bg-white border border-wedding-gold/20 rounded-2xl p-4">
                <span className="text-xs font-bold text-wedding-gold uppercase tracking-wider block mb-2">2. Bride Account ({revealedCredentials.couple?.brideName})</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-wedding-brown/60">Username</span>
                    <div className="font-mono font-bold text-wedding-dark p-2 bg-wedding-beige/25 rounded-lg select-all">{revealedCredentials.couple?.brideUsername || brideUsername}</div>
                  </div>
                  <div>
                    <span className="text-xs text-wedding-brown/60 font-semibold">Password</span>
                    <div className="flex justify-between items-center bg-wedding-beige/25 rounded-lg p-2 font-mono font-bold text-wedding-dark select-all">
                      <span>{revealedCredentials.bridePassword}</span>
                      <button onClick={() => copyToClipboard(revealedCredentials.bridePassword)} className="text-wedding-gold hover:text-wedding-dark ml-2">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Groom Account */}
              <div className="bg-white border border-wedding-gold/20 rounded-2xl p-4">
                <span className="text-xs font-bold text-wedding-gold uppercase tracking-wider block mb-2">3. Groom Account ({revealedCredentials.couple?.groomName})</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-wedding-brown/60">Username</span>
                    <div className="font-mono font-bold text-wedding-dark p-2 bg-wedding-beige/25 rounded-lg select-all">{revealedCredentials.couple?.groomUsername || groomUsername}</div>
                  </div>
                  <div>
                    <span className="text-xs text-wedding-brown/60 font-semibold">Password</span>
                    <div className="flex justify-between items-center bg-wedding-beige/25 rounded-lg p-2 font-mono font-bold text-wedding-dark select-all">
                      <span>{revealedCredentials.groomPassword}</span>
                      <button onClick={() => copyToClipboard(revealedCredentials.groomPassword)} className="text-wedding-gold hover:text-wedding-dark ml-2">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {copied && <div className="text-center text-xs text-green-600 font-semibold mt-4">Copied to clipboard!</div>}

            <button onClick={() => setRevealedCredentials(null)} className="gold-button w-full mt-6">
              I Have Saved all Credentials
            </button>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-3xl w-full relative max-h-[90vh] overflow-y-auto animate-fade-in">
            <button onClick={() => setIsCreateOpen(false)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-2xl font-bold text-wedding-dark font-jost mb-6">Onboard Bride & Groom</h3>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* BRIDE SECTION */}
                <div className="space-y-4 bg-white/50 p-4 rounded-2xl border border-wedding-gold/10">
                  <h4 className="text-sm font-bold text-wedding-dark uppercase tracking-wider border-b border-wedding-gold/10 pb-1">Bride Details</h4>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Bride Name</label>
                    <input type="text" required value={brideName} onChange={(e) => setBrideName(e.target.value)} className="wedding-input" placeholder="e.g. Riya" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Bride Mobile Number</label>
                    <input type="text" required value={brideMobile} onChange={(e) => setBrideMobile(e.target.value)} className="wedding-input" placeholder="e.g. 9876543210" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Bride Username (Auto)</label>
                    <input type="text" required value={brideUsername} onChange={(e) => setBrideUsername(e.target.value)} className="wedding-input bg-wedding-beige/10 font-mono text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Bride Password (Auto)</label>
                    <div className="relative">
                      <input type={showBridePass ? "text" : "password"} required value={bridePassword} onChange={(e) => setBridePassword(e.target.value)} className="wedding-input bg-wedding-beige/10 font-mono text-sm pr-10" />
                      <button type="button" onClick={() => setShowBridePass(!showBridePass)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-wedding-brown/50 hover:text-wedding-brown">
                        {showBridePass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* GROOM SECTION */}
                <div className="space-y-4 bg-white/50 p-4 rounded-2xl border border-wedding-gold/10">
                  <h4 className="text-sm font-bold text-wedding-dark uppercase tracking-wider border-b border-wedding-gold/10 pb-1">Groom Details</h4>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Groom Name</label>
                    <input type="text" required value={groomName} onChange={(e) => setGroomName(e.target.value)} className="wedding-input" placeholder="e.g. Arjun" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Groom Mobile Number</label>
                    <input type="text" required value={groomMobile} onChange={(e) => setGroomMobile(e.target.value)} className="wedding-input" placeholder="e.g. 9510666325" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Groom Username (Auto)</label>
                    <input type="text" required value={groomUsername} onChange={(e) => setGroomUsername(e.target.value)} className="wedding-input bg-wedding-beige/10 font-mono text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Groom Password (Auto)</label>
                    <div className="relative">
                      <input type={showGroomPass ? "text" : "password"} required value={groomPassword} onChange={(e) => setGroomPassword(e.target.value)} className="wedding-input bg-wedding-beige/10 font-mono text-sm pr-10" />
                      <button type="button" onClick={() => setShowGroomPass(!showGroomPass)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-wedding-brown/50 hover:text-wedding-brown">
                        {showGroomPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* COMMON SETTINGS SECTION */}
              <div className="bg-white/50 p-4 rounded-2xl border border-wedding-gold/10 space-y-4">
                <h4 className="text-sm font-bold text-wedding-dark uppercase tracking-wider border-b border-wedding-gold/10 pb-1">Common Account & Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Common Account Username (Mobile)</label>
                    <input type="text" required value={mobile} onChange={(e) => setMobile(e.target.value)} className="wedding-input" placeholder="e.g. 9876543210" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Common Account Password (Auto)</label>
                    <div className="relative">
                      <input type={showCommonPass ? "text" : "password"} required value={commonPassword} onChange={(e) => setCommonPassword(e.target.value)} className="wedding-input bg-wedding-beige/10 font-mono text-sm pr-10" />
                      <button type="button" onClick={() => setShowCommonPass(!showCommonPass)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-wedding-brown/50 hover:text-wedding-brown">
                        {showCommonPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Wedding Date</label>
                    <input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} className="wedding-input" />
                  </div>
                </div>
              </div>

              <button type="submit" className="gold-button w-full mt-4 py-3 font-semibold tracking-wider">Create Account & Provision Portals</button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-3xl w-full relative max-h-[90vh] overflow-y-auto animate-fade-in">
            <button onClick={() => setIsEditOpen(false)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-2xl font-bold text-wedding-dark font-jost mb-6">Edit Couple Details</h3>

            <form onSubmit={handleEdit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* BRIDE EDIT */}
                <div className="space-y-4 bg-white/50 p-4 rounded-2xl border border-wedding-gold/10">
                  <h4 className="text-sm font-bold text-wedding-dark uppercase tracking-wider border-b border-wedding-gold/10 pb-1">Bride Details</h4>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Bride Name</label>
                    <input type="text" required value={brideName} onChange={(e) => setBrideName(e.target.value)} className="wedding-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Bride Mobile</label>
                    <input type="text" required value={brideMobile} onChange={(e) => setBrideMobile(e.target.value)} className="wedding-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Bride Username</label>
                    <input type="text" required value={brideUsername} onChange={(e) => setBrideUsername(e.target.value)} className="wedding-input font-mono text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Bride Password</label>
                    <div className="relative">
                      <input type={showBridePass ? "text" : "password"} value={bridePassword} onChange={(e) => setBridePassword(e.target.value)} className="wedding-input font-mono text-sm pr-10" placeholder="Leave blank to keep unchanged" />
                      <button type="button" onClick={() => setShowBridePass(!showBridePass)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-wedding-brown/50 hover:text-wedding-brown">
                        {showBridePass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* GROOM EDIT */}
                <div className="space-y-4 bg-white/50 p-4 rounded-2xl border border-wedding-gold/10">
                  <h4 className="text-sm font-bold text-wedding-dark uppercase tracking-wider border-b border-wedding-gold/10 pb-1">Groom Details</h4>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Groom Name</label>
                    <input type="text" required value={groomName} onChange={(e) => setGroomName(e.target.value)} className="wedding-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Groom Mobile</label>
                    <input type="text" required value={groomMobile} onChange={(e) => setGroomMobile(e.target.value)} className="wedding-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Groom Username</label>
                    <input type="text" required value={groomUsername} onChange={(e) => setGroomUsername(e.target.value)} className="wedding-input font-mono text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Groom Password</label>
                    <div className="relative">
                      <input type={showGroomPass ? "text" : "password"} value={groomPassword} onChange={(e) => setGroomPassword(e.target.value)} className="wedding-input font-mono text-sm pr-10" placeholder="Leave blank to keep unchanged" />
                      <button type="button" onClick={() => setShowGroomPass(!showGroomPass)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-wedding-brown/50 hover:text-wedding-brown">
                        {showGroomPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* COMMON EDIT */}
              <div className="bg-white/50 p-4 rounded-2xl border border-wedding-gold/10 space-y-4">
                <h4 className="text-sm font-bold text-wedding-dark uppercase tracking-wider border-b border-wedding-gold/10 pb-1">Common Account & Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Common Username / Mobile (Primary)</label>
                    <input type="text" required value={mobile} onChange={(e) => setMobile(e.target.value)} className="wedding-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Common Account Password</label>
                    <div className="relative">
                      <input type={showCommonPass ? "text" : "password"} value={commonPassword} onChange={(e) => setCommonPassword(e.target.value)} className="wedding-input font-mono text-sm pr-10" placeholder="Leave blank to keep unchanged" />
                      <button type="button" onClick={() => setShowCommonPass(!showCommonPass)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-wedding-brown/50 hover:text-wedding-brown">
                        {showCommonPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Wedding Date</label>
                    <input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} className="wedding-input" />
                  </div>
                </div>
              </div>

              <button type="submit" className="gold-button w-full mt-4 py-3 font-semibold tracking-wider">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* SUPPORT READ-ONLY DETAIL VIEW MODAL */}
      {isViewOpen && selectedCoupleDetail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding max-w-2xl w-full relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setIsViewOpen(false)} className="absolute top-4 right-4 text-wedding-brown/50 hover:text-wedding-brown">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-2xl font-bold text-wedding-dark font-jost mb-6">
              Support Mode: {selectedCoupleDetail.brideName} & {selectedCoupleDetail.groomName}
            </h3>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-wedding-gold/10">
                <div>
                  <p className="text-xs font-semibold uppercase text-wedding-brown/50">Wedding Slug</p>
                  <p className="text-sm font-medium mt-0.5">/invite/{selectedCoupleDetail.slug}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-wedding-brown/50">Mobile Contact</p>
                  <p className="text-sm font-medium mt-0.5">{selectedCoupleDetail.mobile}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-wedding-brown/50">Wedding Date</p>
                  <p className="text-sm font-medium mt-0.5">{selectedCoupleDetail.weddingDate || 'Not Set'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-wedding-dark uppercase tracking-wider mb-2">Events Configured</h4>
                {selectedCoupleDetail.Events?.length === 0 ? (
                  <p className="text-xs text-wedding-brown/60 italic">No events configured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCoupleDetail.Events?.map(evt => (
                      <div key={evt.id} className="text-xs bg-white p-3 rounded-lg border border-wedding-gold/5 flex justify-between">
                        <div>
                          <p className="font-semibold text-wedding-dark">{evt.title} ({evt.type})</p>
                          <p className="text-wedding-brown/70 mt-0.5">{evt.date} @ {evt.time}</p>
                        </div>
                        <p className="font-medium text-wedding-brown/80">{evt.venue}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Invitation Card Templates */}
              <div>
                <h4 className="font-bold text-sm text-wedding-dark uppercase tracking-wider mb-2">Invitation Templates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-wedding-gold/10 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">Sahjode Card</span>
                      {selectedCoupleDetail.sahjodeCardUrl ? (
                        <div className="mt-2 text-xs text-wedding-brown/75">
                          <p>Uploaded by: <strong>{selectedCoupleDetail.sahjodeCardUploadedBy || 'Unknown'}</strong></p>
                          <p className="mt-0.5">Date: <strong>{selectedCoupleDetail.sahjodeCardUploadedAt ? new Date(selectedCoupleDetail.sahjodeCardUploadedAt).toLocaleDateString() : 'N/A'}</strong></p>
                        </div>
                      ) : (
                        <p className="text-xs text-wedding-brown/50 italic mt-2">Not Uploaded</p>
                      )}
                    </div>
                    {selectedCoupleDetail.sahjodeCardUrl && (
                      <div className="mt-3 flex gap-2">
                        <a href={selectedCoupleDetail.sahjodeCardUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-wedding-gold hover:underline">
                          View PDF
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-wedding-gold/10 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-purple-800 bg-purple-50 px-2 py-0.5 rounded">Sarva Card</span>
                      {selectedCoupleDetail.sarvaCardUrl ? (
                        <div className="mt-2 text-xs text-wedding-brown/75">
                          <p>Uploaded by: <strong>{selectedCoupleDetail.sarvaCardUploadedBy || 'Unknown'}</strong></p>
                          <p className="mt-0.5">Date: <strong>{selectedCoupleDetail.sarvaCardUploadedAt ? new Date(selectedCoupleDetail.sarvaCardUploadedAt).toLocaleDateString() : 'N/A'}</strong></p>
                        </div>
                      ) : (
                        <p className="text-xs text-wedding-brown/50 italic mt-2">Not Uploaded</p>
                      )}
                    </div>
                    {selectedCoupleDetail.sarvaCardUrl && (
                      <div className="mt-3 flex gap-2">
                        <a href={selectedCoupleDetail.sarvaCardUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-wedding-gold hover:underline">
                          View PDF
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white p-3 rounded-lg border border-wedding-gold/5">
                  <p className="text-2xl font-bold font-jost text-wedding-dark">{selectedCoupleDetail.Guests?.length || 0}</p>
                  <p className="text-[10px] uppercase font-bold text-wedding-brown/50 mt-1">Guests List</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-wedding-gold/5">
                  <p className="text-2xl font-bold font-jost text-wedding-dark">{selectedCoupleDetail.Photos?.length || 0}</p>
                  <p className="text-[10px] uppercase font-bold text-wedding-brown/50 mt-1">Photos Uploaded</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-wedding-gold/5">
                  <p className="text-2xl font-bold font-jost text-wedding-dark">{selectedCoupleDetail.Wishes?.length || 0}</p>
                  <p className="text-[10px] uppercase font-bold text-wedding-brown/50 mt-1">Wishes Received</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COUPLES TABLE */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wedding-gold"></div>
        </div>
      ) : (
        <div className="bg-wedding-cream rounded-3xl border border-wedding-gold/15 overflow-hidden shadow-wedding">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-wedding-gold/10">
              <thead className="bg-wedding-brown/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-wedding-brown/70">Names</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-wedding-brown/70">Username (Mobile)</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-wedding-brown/70">Wedding Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-wedding-brown/70">Slug</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-wedding-brown/70">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wedding-gold/10 bg-white">
                {couples.map((couple) => (
                  <tr key={couple.id} className="hover:bg-wedding-beige/10 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-wedding-dark">
                      {couple.brideName} & {couple.groomName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-wedding-brown/80 font-mono">
                      {couple.mobile}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-wedding-brown/80">
                      {couple.weddingDate || 'Not Set'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-wedding-brown/80">
                      /invite/{couple.slug}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => handleSupportView(couple.id)} className="p-2 hover:bg-wedding-beige rounded-xl text-wedding-brown/70 transition-colors" title="Support Mode">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEditModal(couple)} className="p-2 hover:bg-wedding-beige rounded-xl text-wedding-brown/70 transition-colors" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleResetPassword(couple.id)} className="p-2 hover:bg-amber-50 rounded-xl text-amber-600 transition-colors" title="Reset Password">
                        <Key className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(couple.id)} className="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
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
