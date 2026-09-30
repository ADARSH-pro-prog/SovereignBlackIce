import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Bot, Network, ShieldCheck, History, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/** Crystalline mark: three tiers (source, claim, answer) joined by hairlines. */
export const BlackIceMark: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M4 6 12 12 20 7M4 6l8 12 8-11M12 12v6" stroke="currentColor" strokeOpacity=".45" strokeWidth="1" />
    <circle cx="4" cy="6" r="1.9" fill="currentColor" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    <circle cx="20" cy="7" r="1.6" fill="currentColor" />
    <circle cx="12" cy="18" r="1.3" fill="currentColor" fillOpacity=".7" />
  </svg>
);

export const Sidebar: React.FC = () => {
  const { isLiveMode, backendStatus } = useApp();

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Documents', path: '/dashboard/documents', icon: FileText },
    { label: 'AI Assistant', path: '/dashboard/assistant', icon: Bot },
    { label: 'Impact Analysis', path: '/dashboard/impact', icon: Network },
    { label: 'Review Center', path: '/dashboard/reviews', icon: ShieldCheck },
    { label: 'Audit Log', path: '/dashboard/audit', icon: History },
    { label: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  const backendHealthy = !isLiveMode || backendStatus.isConnected;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[232px] select-none flex-col justify-between border-r border-line bg-void/55 backdrop-blur-xl">
      <div className="flex flex-col">
        <Link
          to="/"
          className="flex h-16 items-center gap-2.5 border-b border-line px-5 text-ice transition-colors hover:text-ink"
          title="Back to the Black Ice overview page"
        >
          <img src="/logo-shield.png" alt="" className="h-8 w-auto" />
          <span className="flex items-baseline gap-1.5">
            <span className="display text-[21px] italic text-ink">Black Ice</span>
          </span>
        </Link>

        <nav className="flex flex-col gap-0.5 px-3 pt-4" aria-label="Main">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `group relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-200 ${
                    isActive ? 'bg-raised text-ink' : 'text-ink-2 hover:bg-panel hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span aria-hidden className="absolute -left-3 top-2 bottom-2 w-px bg-ice" />}
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? 'text-ice' : 'text-muted group-hover:text-ink-2'
                      }`}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="flex items-center gap-2 text-[13px] text-ink">
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${
              !isLiveMode ? 'bg-amber' : backendHealthy ? 'bg-ice' : 'bg-red animate-[breathe_1.6s_ease-in-out_infinite]'
            }`}
          />
          {isLiveMode ? (backendStatus.isConnected ? 'Engine connected' : 'Engine offline') : 'Demo data'}
          {isLiveMode && backendStatus.isConnected && backendStatus.latencyMs !== undefined && (
            <span className="ml-auto font-mono text-xs text-muted">{backendStatus.latencyMs}ms</span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">
          {isLiveMode
            ? backendStatus.isConnected
              ? 'Local FastAPI · nothing leaves this machine'
              : 'Start the backend to load live records'
            : 'Illustrative records, not your data'}
        </p>
      </div>
    </aside>
  );
};
