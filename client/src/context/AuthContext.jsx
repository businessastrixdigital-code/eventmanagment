import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('wedding_token'));
  const [role, setRole] = useState(localStorage.getItem('wedding_role'));
  const [subRole, setSubRole] = useState(localStorage.getItem('wedding_subrole'));
  const [loading, setLoading] = useState(true);
  const [supersededAlert, setSupersededAlert] = useState(false);

  // Sync token to Axios headers / Fetch configuration
  useEffect(() => {
    if (token) {
      localStorage.setItem('wedding_token', token);
    } else {
      localStorage.removeItem('wedding_token');
    }
  }, [token]);

  useEffect(() => {
    if (role) {
      localStorage.setItem('wedding_role', role);
    } else {
      localStorage.removeItem('wedding_role');
    }
  }, [role]);

  useEffect(() => {
    if (subRole) {
      localStorage.setItem('wedding_subrole', subRole);
    } else {
      localStorage.removeItem('wedding_subrole');
    }
  }, [subRole]);

  const apiRequest = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 401) {
        const data = await response.json().catch(() => ({}));
        if (data.code === 'SESSION_SUPERSEDED') {
          // Trigger alert of single session enforcement
          setSupersededAlert(true);
          logoutSilent();
          throw new Error(data.message || 'Session superseded by a new login.');
        } else if (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN') {
          logoutSilent();
        }
      }
      return response;
    } catch (err) {
      console.error('[API REQUEST ERROR]', err);
      throw err;
    }
  };

  const logoutSilent = () => {
    setUser(null);
    setToken(null);
    setRole(null);
    setSubRole(null);
    localStorage.removeItem('wedding_token');
    localStorage.removeItem('wedding_role');
    localStorage.removeItem('wedding_subrole');
  };

  const checkSession = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setRole(data.role);
        if (data.subRole) setSubRole(data.subRole);
      } else {
        logoutSilent();
      }
    } catch (err) {
      console.error('Session check failed', err);
      logoutSilent();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, [token]);

  const login = async (username, password, roleType, coupleSubRole = 'bride') => {
    try {
      let url, body;

      if (roleType === 'superadmin') {
        // Super Admin uses a separate, isolated login endpoint
        url = '/api/auth/admin/login';
        body = JSON.stringify({ email: username, password });
      } else {
        // Couple login
        url = '/api/auth/login';
        body = JSON.stringify({ username, password, subRole: coupleSubRole });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      // Check if force reset password is required
      if (data.mustReset) {
        return { mustReset: true, tempToken: data.token };
      }

      setToken(data.token);
      setRole(data.role);
      if (data.subRole) setSubRole(data.subRole);
      setUser(data.user);
      setSupersededAlert(false);

      return { success: true };
    } catch (err) {
      throw err;
    }
  };

  const otpRequest = async (mobile, coupleSlug) => {
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, coupleSlug })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request OTP.');
      }
      return data;
    } catch (err) {
      throw err;
    }
  };

  const otpVerify = async (mobile, otp, name) => {
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp, name })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed.');
      }

      setToken(data.token);
      setRole(data.role);
      setUser(data.user);
      setSupersededAlert(false);

      return { success: true };
    } catch (err) {
      throw err;
    }
  };

  const resetPassword = async (newPassword, tempToken) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed.');
      }
      return data;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      // Ignore network errors on logout
    }
    logoutSilent();
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      role,
      subRole,
      loading,
      supersededAlert,
      setSupersededAlert,
      login,
      otpRequest,
      otpVerify,
      resetPassword,
      logout,
      apiRequest
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
