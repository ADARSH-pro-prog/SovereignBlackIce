import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Search, Bell, HelpCircle, Server, AlertTriangle, ChevronRight, Command, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const location = useLocation();
  const { isLiveMode, setIsLiveMode, setIsSearchModalOpen, backendStatus, reviews } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Breadcrumbs
  const path = location.pathname;
  let pageName = 'Impact Assessment';
  let section = 'Document Lineage';
  if (path === '/dashboard') {
    section = 'Governance';
    pageName = 'Overview';
  } else if (path.startsWith('/dashboard/documents')) {
    section = 'Governance';
    pageName = path.includes('/compare') ? 'Compare Versions' : 'Documents';
  } else if (path.startsWith('/dashboard/assistant')) {
    section = 'Governance';
    pageName = 'Knowledge Assistant';
  } else if (path.startsWith('/dashboard/impact')) {
    section = 'Governance';
    pageName = 'Impact Analysis';
  } else if (path.startsWith('/dashboard/reviews')) {
    section = 'Governance';
    pageName = 'Review Center';
  } else if (path.startsWith('/dashboard/audit')) {
    section = 'Governance';
    pageName = 'Audit Log';
  } else if (path.startsWith('/dashboard/settings')) {
    section = 'System';
    pageName = 'Settings & Diagnostics';
  }

  const pendingReviews = reviews.filter((review) => review.status === 'Pending');

  const iconBtn =
    'relative flex h-9 w-9 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-raised hover:text-ink';
  const popover =
    'absolute right-0 top-full z-50 mt-2 w-[360px] rounded-[10px] border border-line-strong bg-panel p-2 shadow-xl animate-[reveal_220ms_cubic-bezier(0.22,1,0.36,1)_both]';

  return (
    <header className="fixed left-[232px] right-0 top-0 z-30 flex h-16 items-center justify-between gap-6 border-b border-line bg-void/55 px-8 backdrop-blur-xl">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="text-muted">{section}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted/60" />
        <span className="truncate text-ink">{pageName}</span>
      </nav>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          type="button"
          onClick={() => setIsSearchModalOpen(true)}
          className="group relative hidden h-9 w-[300px] items-center rounded-md border border-line bg-panel pl-9 pr-14 text-left text-sm text-muted transition-colors hover:border-line-strong hover:text-ink-2 md:flex"
        >
          <Search className="absolute left-3 h-4 w-4 text-muted transition-colors group-hover:text-ink-2" />
          <span className="truncate">Search documents, reviews, events…</span>
          <kbd className="absolute right-2 flex h-5 items-center gap-0.5 rounded border border-line-strong px-1.5 text-xs text-muted">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        {/* Demo / Live switch */}
        <div role="radiogroup" aria-label="Data source" className="flex h-9 items-center rounded-md border border-line bg-panel p-0.5">
          <button
            type="button"
            role="radio"
            aria-checked={!isLiveMode}
            onClick={() => setIsLiveMode(false)}
            className={`flex h-8 items-center gap-1.5 rounded-[5px] px-3 text-sm transition-colors ${
              !isLiveMode ? 'bg-raised text-amber' : 'text-muted hover:text-ink'
            }`}
            title="Use illustrative demo data"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Demo
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isLiveMode}
            onClick={() => setIsLiveMode(true)}
            className={`flex h-8 items-center gap-1.5 rounded-[5px] px-3 text-sm transition-colors ${
              isLiveMode ? (backendStatus.isConnected ? 'bg-raised text-ice' : 'bg-raised text-red') : 'text-muted hover:text-ink'
            }`}
            title="Connect to local FastAPI backend"
          >
            <Server className="h-3.5 w-3.5" />
            Live
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${backendStatus.isConnected ? 'bg-ice' : 'bg-red'}`}
            />
          </button>
        </div>

        <span aria-hidden className="mx-1 h-5 w-px bg-line-strong" />

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowHelp(false);
            }}
            className={iconBtn}
            title="Pending reviews"
            aria-expanded={showNotifications}
            aria-label={`Pending reviews: ${pendingReviews.length}`}
          >
            <Bell className="h-4 w-4" />
            {pendingReviews.length > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[11px] font-semibold leading-none text-void">
                {pendingReviews.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className={popover}>
              <div className="flex items-center justify-between px-2 pb-2 pt-1">
                <span className="text-sm font-medium text-ink">Waiting for review</span>
                <span className="text-xs text-amber">{pendingReviews.length} pending</span>
              </div>
              <div className="max-h-72 overflow-y-auto border-t border-line pt-1">
                {pendingReviews.length === 0 ? (
                  <p className="px-2 py-8 text-center text-sm text-muted">Queue is clear. No pending reviews.</p>
                ) : (
                  pendingReviews.map((rev) => (
                    <Link
                      key={rev.id}
                      to="/dashboard/reviews"
                      onClick={() => setShowNotifications(false)}
                      className="flex gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-raised"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink">{rev.documentTitle}</span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-ink-2">{rev.issueSummary}</span>
                        <span className="mt-1 block font-mono text-xs text-muted">{rev.createdAt}</span>
                      </span>
                    </Link>
                  ))
                )}
              </div>
              <Link
                to="/dashboard/reviews"
                onClick={() => setShowNotifications(false)}
                className="mt-1 block rounded-md border-t border-line px-2 py-2.5 text-center text-sm text-ice transition-colors hover:bg-raised"
              >
                Open Review Center
              </Link>
            </div>
          )}
        </div>

        {/* Help */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowHelp(!showHelp);
              setShowNotifications(false);
            }}
            className={iconBtn}
            title="How Black Ice works"
            aria-expanded={showHelp}
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {showHelp && (
            <div className={`${popover} p-4`}>
              <h4 className="display text-[22px] italic text-ink">Black Ice</h4>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                A changed source is not automatically a wrong answer. Black Ice finds the claims that diverged, maps the
                RAG answers that cited them, and puts the evidence in front of a human.
              </p>
              <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
                {[
                  ['Backend', <code key="b" className="font-mono text-xs text-ink">{backendStatus.baseUrl}</code>],
                  ['API', 'FastAPI'],
                  ['Local model', 'Ollama'],
                  ['Cloud AI', 'Not required'],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between py-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
