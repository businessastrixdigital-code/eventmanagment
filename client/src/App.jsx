import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Import Pages
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import CoupleManagement from './pages/SuperAdmin/CoupleManagement';
import LanguageCMS from './pages/SuperAdmin/LanguageCMS';
import AuditLogs from './pages/SuperAdmin/AuditLogs';

import CoupleOverview from './pages/CoupleDashboard/Overview';
import CoupleEvents from './pages/CoupleDashboard/Events';
import CoupleGuests from './pages/CoupleDashboard/Guests';
import CoupleNotifications from './pages/CoupleDashboard/Notifications';
import CoupleInvitationTemplates from './pages/CoupleDashboard/InvitationTemplates';
import CouplePhotos from './pages/CoupleDashboard/Photos';
import CoupleWebsiteEditor from './pages/CoupleDashboard/WebsiteEditor';
import CoupleSettings from './pages/CoupleDashboard/Settings';
import CoupleCustomMessages from './pages/CoupleDashboard/CustomMessages';

import PublicInvitation from './pages/PublicWebsite/InvitationPage';

// Route Guards
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, role, loading, supersededAlert, setSupersededAlert } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wedding-beige">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-wedding-gold"></div>
      </div>
    );
  }

  if (supersededAlert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wedding-beige p-4">
        <div className="bg-wedding-cream p-8 rounded-3xl border border-wedding-gold/20 shadow-wedding text-center max-w-sm">
          <h3 className="text-xl font-bold text-wedding-dark mb-4">Session Logged Out</h3>
          <p className="text-sm text-wedding-brown/70 mb-6">
            A new login to this account was detected on another device or session. To protect account lockdown, you have been logged out.
          </p>
          <button onClick={() => setSupersededAlert(false)} className="gold-button">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function RootRoutes() {
  return (
    <Routes>
      {/* Public / Auth */}
      <Route path="/login" element={<Login />} />

      {/* Super Admin Section */}
      <Route path="/super-admin" element={
        <ProtectedRoute allowedRoles={['superadmin']}>
          <SuperAdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/super-admin/couples" element={
        <ProtectedRoute allowedRoles={['superadmin']}>
          <CoupleManagement />
        </ProtectedRoute>
      } />
      <Route path="/super-admin/languages" element={
        <ProtectedRoute allowedRoles={['superadmin']}>
          <LanguageCMS />
        </ProtectedRoute>
      } />
      <Route path="/super-admin/logs" element={
        <ProtectedRoute allowedRoles={['superadmin']}>
          <AuditLogs />
        </ProtectedRoute>
      } />

      {/* Couple Admin Dashboard Section */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['couple']}>
          <CoupleOverview />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/events" element={
        <ProtectedRoute allowedRoles={['couple']}>
          <CoupleEvents />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/guests" element={
        <ProtectedRoute allowedRoles={['couple']}>
          <CoupleGuests />
        </ProtectedRoute>
      } />

      <Route path="/dashboard/notifications" element={
        <ProtectedRoute allowedRoles={['couple']}>
          <CoupleNotifications />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/invitation-templates" element={
        <ProtectedRoute allowedRoles={['couple']}>
          <CoupleInvitationTemplates />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/photos" element={
        <ProtectedRoute allowedRoles={['couple']}>
          <CouplePhotos />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/website-editor" element={
        <ProtectedRoute allowedRoles={['couple']}>
          <CoupleWebsiteEditor />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/settings" element={
        <ProtectedRoute allowedRoles={['couple']}>
          <CoupleSettings />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/custom-messages" element={
        <ProtectedRoute allowedRoles={['couple']}>
          <CoupleCustomMessages />
        </ProtectedRoute>
      } />

      {/* Public Wedding & Invitation Sites */}
      <Route path="/invite/:coupleSlug" element={<PublicInvitation />} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <RootRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
