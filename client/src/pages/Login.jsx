import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Heart, UserCheck, Sparkles } from 'lucide-react';
import { flushSync } from 'react-dom';

export default function Login() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Tabs: 'couple' | 'superadmin'
  const [role, setRole] = useState('couple');
  const [subRole, setSubRole] = useState('bride'); // 'bride' | 'groom' for couples

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Forced password reset states
  const [mustReset, setMustReset] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleCoupleOrAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password, role, subRole);
      
      if (result.mustReset) {
        setMustReset(true);
        setTempToken(result.tempToken);
        setSuccess('First login detected! Please set a new secure password.');
      } else {
        flushSync(() => {
          if (role === 'superadmin') {
            navigate('/super-admin');
          } else {
            navigate('/dashboard');
          }
        });
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };



  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(newPassword, tempToken);
      setMustReset(false);
      setTempToken('');
      setSuccess('Password updated successfully! Please log in again.');
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-wedding-beige py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle mandala background circles */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#C9A66B]/5 rounded-full filter blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#6B4423]/5 rounded-full filter blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full space-y-8 bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding relative">
        
        <div className="text-center" style={{ margin: '0px' }}>
          <Heart className="mx-auto h-12 w-12 text-wedding-gold fill-wedding-gold/10" />
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-wedding-dark font-jost">
            ELEGANCE
          </h2>
          <p className="mt-2 text-sm text-wedding-brown/70">
            Wedding & Event Management Platform
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-xl text-sm text-green-700">
            {success}
          </div>
        )}

        {/* FORCED PASSWORD RESET SCREEN */}
        {mustReset ? (
          <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
            <div className="rounded-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-wedding-brown mb-1">
                  Enter New Secure Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="wedding-input"
                  placeholder="New password"
                />
              </div>
            </div>

            <div>
              <button type="submit" disabled={loading} className="w-full gold-button">
                Update & Reset Password
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* ROLE TAB BUTTONS */}
            <div className="flex border-b border-wedding-gold/20">
              <button
                onClick={() => { setRole('couple'); setError(''); setSuccess(''); }}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 text-center transition-colors ${
                  role === 'couple'
                    ? 'border-wedding-brown text-wedding-brown'
                    : 'border-transparent text-wedding-brown/50 hover:text-wedding-brown'
                }`}
              >
                Couple Login
              </button>
              <button
                onClick={() => { setRole('superadmin'); setError(''); setSuccess(''); }}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 text-center transition-colors ${
                  role === 'superadmin'
                    ? 'border-wedding-brown text-wedding-brown'
                    : 'border-transparent text-wedding-brown/50 hover:text-wedding-brown'
                }`}
              >
                Super Admin
              </button>
            </div>

            {/* COUPLE LOGIN FORM */}
            {role === 'couple' && (
              <form className="mt-8 space-y-6" onSubmit={handleCoupleOrAdminLogin}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="wedding-input"
                      placeholder="e.g. 9876543210"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="wedding-input"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">
                      Access Role
                    </label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-wedding-brown font-medium">
                        <input
                          type="radio"
                          name="subrole"
                          value="bride"
                          checked={subRole === 'bride'}
                          onChange={() => setSubRole('bride')}
                          className="accent-wedding-brown"
                        />
                        Bride Panel
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-wedding-brown font-medium">
                        <input
                          type="radio"
                          name="subrole"
                          value="groom"
                          checked={subRole === 'groom'}
                          onChange={() => setSubRole('groom')}
                          className="accent-wedding-brown"
                        />
                        Groom Panel
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <button type="submit" disabled={loading} className="w-full gold-button flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Enter Dashboard
                  </button>
                </div>
              </form>
            )}

            {/* SUPER ADMIN LOGIN FORM */}
            {role === 'superadmin' && (
              <form className="mt-8 space-y-6" onSubmit={handleCoupleOrAdminLogin}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="wedding-input"
                      placeholder="admin@wedding.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="wedding-input"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <button type="submit" disabled={loading} className="w-full gold-button flex items-center justify-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Admin Login
                  </button>
                </div>
              </form>
            )}

          </>
        )}
      </div>
    </div>
  );
}
