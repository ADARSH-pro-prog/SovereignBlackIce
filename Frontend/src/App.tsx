/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DocumentDetailsPage } from './pages/DocumentDetailsPage';
import { VersionComparisonPage } from './pages/VersionComparisonPage';
import { AssistantPage } from './pages/AssistantPage';
import { ImpactAnalysisPage } from './pages/ImpactAnalysisPage';
import { ReviewCenterPage } from './pages/ReviewCenterPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';

// Landing is code-split so three.js never reaches the dashboard bundle.
const LandingPage = lazy(() => import('./landing/LandingPage'));

const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthChecking } = useApp();

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#0C0B0E] flex flex-col items-center justify-center gap-3 text-[#F8F7F4]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#BEF264] border-t-transparent" />
        <span className="text-xs uppercase tracking-widest text-[#8D8992]">
          Verifying Session...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicLoginRoute() {
  const { isAuthenticated, isAuthChecking } = useApp();

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#0C0B0E] flex flex-col items-center justify-center gap-3 text-[#F8F7F4]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#BEF264] border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage />;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AppProvider>
          <Routes>
            <Route
              path="/"
              element={
                <Suspense fallback={<div className="min-h-screen bg-void" />}>
                  <LandingPage />
                </Suspense>
              }
            />
            <Route path="/login" element={<PublicLoginRoute />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="overview" element={<Navigate to="/dashboard" replace />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="documents/:id" element={<DocumentDetailsPage />} />
              <Route path="documents/:id/compare" element={<VersionComparisonPage />} />
              <Route path="compare" element={<VersionComparisonPage />} />
              <Route path="assistant" element={<AssistantPage />} />
              <Route path="impact" element={<ImpactAnalysisPage />} />
              <Route path="reviews" element={<ReviewCenterPage />} />
              <Route path="audit" element={<AuditLogPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
