import React, { Suspense, lazy, useMemo, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useScroll, useMotionValue } from 'motion/react';
import { usePopOnScroll } from './popOnScroll';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/ToastContainer';
import { GlobalSearchModal } from '../ui/GlobalSearchModal';
import { useApp } from '../../context/AppContext';
import { ExternalLink, WifiOff } from 'lucide-react';

// Same black-ice scene as the landing page, in its calmer ambient mode. Own chunk.
const Crystal = lazy(() => import('../../landing/Crystal'));

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

export const AppLayout: React.FC = () => {
  const { isLiveMode, backendStatus } = useApp();

  const backendOffline = isLiveMode && !backendStatus.isConnected;
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  usePopOnScroll(mainRef, location.pathname);
  const { scrollYProgress } = useScroll();
  const calm = useMotionValue(0);
  const webgl = useMemo(hasWebGL, []);

  return (
    <div className="dash relative flex min-h-screen overflow-x-hidden bg-void text-ink">
      {webgl && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-60">
          <Suspense fallback={null}>
            <Crystal page={scrollYProgress} story={calm} entering={false} ambient />
          </Suspense>
          {/* keeps the content side calm and legible */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(6_8_13/0.88)_0%,rgb(6_8_13/0.62)_45%,rgb(6_8_13/0.4)_75%,rgb(6_8_13/0.15)_100%)]" />
        </div>
      )}
      <Sidebar />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col pl-[232px]">
        <Header />

        <main ref={mainRef} className="relative min-h-screen w-full pt-16">
          {backendOffline && (
            <div
              role="status"
              className="flex items-center justify-between gap-4 border-b border-red/25 bg-red/[0.06] px-8 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3 text-sm">
                <WifiOff className="h-4 w-4 shrink-0 text-red" />
                <span className="text-ink">Live backend unavailable.</span>
                <span className="truncate text-ink-2">
                  Nothing answered at <code className="text-ink">{backendStatus.baseUrl}</code>. Start the backend or
                  switch to Demo.
                </span>
              </div>
              <a
                href={`${backendStatus.baseUrl}/docs`}
                target="_blank"
                rel="noreferrer"
                className="hidden shrink-0 items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink lg:flex"
              >
                API docs <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          <div className="relative px-8 pb-16 pt-8">
            <div className="relative mx-auto max-w-[1360px]">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      <ToastContainer />
      <GlobalSearchModal />
    </div>
  );
};
