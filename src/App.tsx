import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar/Sidebar';
import { UsersPage } from './pages/Users/UsersPage';
import { SitesPage } from './pages/Sites/SitesPage';
import { LeadershipReport } from './pages/Reports/LeadershipReport';
import { ComplianceReport } from './pages/Reports/ComplianceReport';
import { EligibilityReport } from './pages/Reports/EligibilityReport';
import CCBHCTracker from './pages/CCBHCTracker/CCBHCTracker';
import './styles/globals.css';
import './styles/workflow-utils.css';
import './App.css';

const WorkflowsLanding = lazy(() => import('./pages/Workflows/WorkflowsLanding'));
const WorkflowComposer = lazy(() => import('./pages/Workflows/WorkflowComposer'));
const WorkflowDetail = lazy(() => import('./pages/Workflows/WorkflowDetail'));

function AppContent() {
  const location = useLocation();
  // Workflow sub-pages manage their own scroll — need overflow:hidden on wrapper
  const isFullHeight = location.pathname !== '/workflows'
    && location.pathname.startsWith('/workflows');
  return (
    <div className={`app-content${isFullHeight ? ' app-content--full-height' : ''}`}>
      <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/users" replace />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/leadership-report" element={<LeadershipReport />} />
          <Route path="/compliance-report" element={<ComplianceReport />} />
          <Route path="/eligibility-report" element={<EligibilityReport />} />
          <Route path="/ccbhc-tracker" element={<CCBHCTracker />} />
          <Route path="/workflows" element={<WorkflowsLanding />} />
          <Route path="/workflows/new" element={<WorkflowComposer />} />
          <Route path="/workflows/:id" element={<WorkflowDetail />} />
          <Route path="/workflows/:id/edit" element={<WorkflowComposer />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <div className="app-main">
          <header className="app-header" />
          <AppContent />
        </div>
      </div>
    </BrowserRouter>
  );
}
