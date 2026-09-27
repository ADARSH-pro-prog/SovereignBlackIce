import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/ToastContainer';
import { GlobalSearchModal } from '../ui/GlobalSearchModal';
import { useApp } from '../../context/AppContext';
import { AlertCircle } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { isLiveMode, backendStatus } = useApp();

  return (
    <div className="min-h-screen bg-[#0B1020] text-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Wrapper */}
      <div className="pl-[248px] flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header />

        {/* Live Mode Backend Offline Warning Banner (if live mode active and backend is unreachable) */}
        {isLiveMode && !backendStatus.isConnected && (
          <div className="fixed top-[68px] left-[248px] right-0 z-20 bg-[#EF4444]/15 border-b border-[#EF4444]/40 px-7 py-2.5 flex items-center justify-between text-xs text-[#EF4444] backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Live Mode Active:</strong> Cannot connect to FastAPI
                backend at <code>{backendStatus.baseUrl}</code>. Please ensure your
                Python FastAPI server is running on port 8000 or switch to Demo Mode.
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#F8FAFC]">
              Swagger: {backendStatus.baseUrl}/docs
            </span>
          </div>
        )}

        {/* Main Content Area */}
        <main
          className={`w-full pt-[68px] ${
            isLiveMode && !backendStatus.isConnected ? 'mt-9' : ''
          } p-7 min-h-screen bg-[#0B1020]`}
        >
          <div className="max-w-[1440px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Global Search ⌘K Dialog */}
      <GlobalSearchModal />
    </div>
  );
};
