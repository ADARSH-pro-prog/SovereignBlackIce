import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  HelpCircle,
  Shield,
  Radio,
  Server,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const location = useLocation();
  const { isLiveMode, setIsLiveMode, setIsSearchModalOpen, backendStatus, reviews } =
    useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Compute breadcrumbs
  const path = location.pathname;
  let pageName = 'Impact Assessment';
  let section = 'Document Lineage';

  if (path.startsWith('/documents')) {
    section = 'Governance';
    pageName = path.includes('/compare') ? 'Compare Versions' : 'Documents';
  } else if (path.startsWith('/assistant')) {
    section = 'Governance';
    pageName = 'Knowledge Assistant';
  } else if (path.startsWith('/impact')) {
    section = 'Governance';
    pageName = 'Impact Analysis';
  } else if (path.startsWith('/reviews')) {
    section = 'Governance';
    pageName = 'Review Center';
  } else if (path.startsWith('/audit')) {
    section = 'Governance';
    pageName = 'Audit Log';
  } else if (path.startsWith('/settings')) {
    section = 'System';
    pageName = 'Settings & Diagnostics';
  }

  const pendingReviews = reviews.filter((r) => r.status === 'Pending');

  return (
    <header className="fixed top-0 left-[248px] right-0 h-[68px] bg-[#0B1020]/95 backdrop-blur-md border-b border-[#263247] z-30 px-7 flex items-center justify-between">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <Shield className="w-4 h-4 text-[#64748B]" />
        <span className="text-[#64748B]">{section}</span>
        <span className="text-[#263247]">/</span>
        <span className="text-[#F8FAFC] font-semibold text-sm">{pageName}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Global Search Bar Trigger */}
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="relative w-[320px] h-9 pl-9 pr-12 bg-[#111827] border border-[#263247] hover:border-[#3B82F6]/50 rounded-lg text-xs text-left text-[#64748B] flex items-center transition-colors group"
        >
          <Search className="w-4 h-4 absolute left-3 text-[#64748B] group-hover:text-[#94A3B8]" />
          <span className="truncate">Search documents, answers, alerts...</span>
          <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded bg-[#1E293B] border border-[#263247] text-[10px] font-mono text-[#94A3B8]">
            ⌘K
          </kbd>
        </button>

        {/* Live / Demo Mode Switcher */}
        <div className="flex items-center bg-[#111827] border border-[#263247] rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setIsLiveMode(false)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
              !isLiveMode
                ? 'bg-[#1E293B] text-[#F8FAFC] shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
            title="Use illustrative demo data"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Demo Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setIsLiveMode(true)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
              isLiveMode
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
            title="Connect to local FastAPI backend (127.0.0.1:8000)"
          >
            <Server className="w-3.5 h-3.5" />
            <span>Live Mode</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                backendStatus.isConnected ? 'bg-[#14B8A6]' : 'bg-[#EF4444]'
              }`}
            />
          </button>
        </div>

        {/* Notification Bell with Badge */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-[#263247] bg-[#111827] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#94A3B8] transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-[#F8FAFC] text-[10px] font-bold flex items-center justify-center leading-none">
              {pendingReviews.length || 3}
            </span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#111827] border border-[#263247] rounded-xl shadow-2xl p-3 z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-[#263247]">
                <span className="text-xs font-semibold text-[#F8FAFC]">
                  Integrity Alerts & Triage
                </span>
                <span className="text-[10px] text-[#94A3B8]">
                  {pendingReviews.length} pending
                </span>
              </div>
              <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
                {pendingReviews.map((rev) => (
                  <Link
                    key={rev.id}
                    to="/reviews"
                    onClick={() => setShowNotifications(false)}
                    className="block p-2 rounded-lg bg-[#1E293B]/60 hover:bg-[#1E293B] transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#F8FAFC]">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                      <span className="truncate">{rev.documentTitle}</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-2">
                      {rev.issueSummary}
                    </p>
                    <span className="text-[10px] text-[#64748B] mt-1 block">
                      {rev.createdAt}
                    </span>
                  </Link>
                ))}
              </div>
              <Link
                to="/reviews"
                onClick={() => setShowNotifications(false)}
                className="mt-2 block text-center py-1.5 rounded bg-[#1E293B] text-xs text-[#3B82F6] hover:underline"
              >
                View Human Review Center
              </Link>
            </div>
          )}
        </div>

        {/* Help Menu */}
        <div className="relative">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#263247] bg-[#111827] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#94A3B8] transition-colors"
            title="Architecture & Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {showHelp && (
            <div className="absolute right-0 mt-2 w-80 bg-[#111827] border border-[#263247] rounded-xl shadow-2xl p-4 z-50 animate-in fade-in duration-150">
              <h4 className="text-sm font-semibold text-[#F8FAFC]">
                Sovereign Black Ice
              </h4>
              <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                Core principle: A detected source document change is never
                automatically treated as an incorrect answer. The system identifies
                divergent claims, maps downstream RAG answers, and facilitates human
                auditor triage.
              </p>
              <div className="mt-3 pt-3 border-t border-[#263247] text-[11px] text-[#64748B] space-y-1">
                <div>Backend Target: <code className="text-[#3B82F6]">127.0.0.1:8000</code></div>
                <div>FastAPI Swagger: <code className="text-[#3B82F6]">/docs</code></div>
                <div>Local LLM: Ollama (Zero cloud AI requirement)</div>
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-[1px] bg-[#263247]" />

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#1E293B] border border-[#263247] flex items-center justify-center text-xs font-semibold text-white">
            SV
          </div>
        </div>
      </div>
    </header>
  );
};
