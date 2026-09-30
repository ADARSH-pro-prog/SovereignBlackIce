/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
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

export default function App() {
  return (
    <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Suspense fallback={<div className="min-h-screen bg-void" />}>
                <LandingPage />
              </Suspense>
            }
          />
          <Route
            path="/dashboard"
            element={
              // Provider lives here so the landing page never talks to the backend.
              <AppProvider>
                <AppLayout />
              </AppProvider>
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
    </BrowserRouter>
  );
}
