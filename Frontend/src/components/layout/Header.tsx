import React, { useState } from 'react';







import { useLocation, Link } from 'react-router-dom';







import {







  Search,







  Bell,







  HelpCircle,







  Shield,







  Server,







  Sparkles,







  AlertTriangle,







  ChevronRight,







  Command,







  Wifi,







} from 'lucide-react';







import { useApp } from '../../context/AppContext';







export const Header: React.FC = () => {







  const location = useLocation();







  const {







    isLiveMode,







    setIsLiveMode,







    setIsSearchModalOpen,







    backendStatus,







    reviews,







  } = useApp();







  const [showNotifications, setShowNotifications] = useState(false);







  const [showHelp, setShowHelp] = useState(false);







  // Breadcrumbs







  const path = location.pathname;







  let pageName = 'Impact Assessment';







  let section = 'Document Lineage';







  if (path === '/') {







    section = 'Governance';







    pageName = 'Overview';







  } else if (path.startsWith('/documents')) {







    section = 'Governance';







    pageName = path.includes('/compare')







      ? 'Compare Versions'







      : 'Documents';







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







  const pendingReviews = reviews.filter(







    (review) => review.status === 'Pending'







  );







  return (







    <header className="fixed top-0 left-[248px] right-0 h-[76px] z-30 px-7 flex items-center justify-between border-b border-[#3A3445] bg-gradient-to-r from-[#17151F]/98 via-[#211B2B]/98 to-[#18171F]/98 backdrop-blur-2xl shadow-[0_12px_36px_rgba(20,16,28,0.24)] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_16%\_0%,rgba(183,243,74,0.16),transparent_25%),radial-gradient(circle_at_82%\_0%,rgba(244,114,182,0.11),transparent_24%)]">

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#A3E635]/85 via-[#A78BFA]/80 to-[#F472B6]/90 shadow-[0_0_16px_rgba(244,114,182,0.28)]" />







      {/* LEFT — Breadcrumb */}







      <div className="relative z-10 flex items-center gap-3 min-w-0">







        <div className="relative w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#A3E635] via-[#C4B5FD] to-[#F472B6] border border-white/15 flex items-center justify-center shadow-[0_8px_22px_rgba(163,230,53,0.16)]">







          <Shield className="w-4 h-4 text-[#17151F]" />







        </div>







        <div className="flex flex-col">







          <div className="flex items-center gap-1.5 text-[11px]">







            <span className="text-[#AAA2B5] font-medium">







              {section}







            </span>







            <ChevronRight className="w-3 h-3 text-[#6F687A]" />







            <span className="text-[#F8F7FB] font-bold">







              {pageName}







            </span>







          </div>







          <div className="flex items-center gap-1.5 mt-0.5">







            <span className="w-1.5 h-1.5 rounded-full bg-[#A3E635]" />







            <span className="text-[9px] uppercase tracking-[0.14em] font-semibold text-[#AAA2B5]">







              Knowledge Integrity Console







            </span>







          </div>







        </div>







      </div>







      {/* RIGHT */}







      <div className="relative z-10 flex items-center gap-3">







        {/* Search */}







        <button







          onClick={() => setIsSearchModalOpen(true)}







          className="group relative w-[310px] h-10 pl-10 pr-14 bg-white/[0.07] border border-white/10 hover:border-[#A78BFA]/55 rounded-[14px] text-xs text-left text-[#B8B1C3] flex items-center transition-all duration-300 shadow-[0_5px_16px_rgba(41,35,61,0.045)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(41,35,61,0.07)]"







        >







          <Search className="w-4 h-4 absolute left-3.5 text-[#8F879B] group-hover:text-[#C4B5FD] transition-colors" />







          <span className="truncate">







            Search knowledge, answers, alerts...







          </span>







          <kbd className="absolute right-2.5 h-6 px-2 rounded-lg bg-white/[0.08] border border-white/10 text-[9px] font-mono text-[#C9C2D2] flex items-center gap-1 shadow-sm">







            <Command className="w-2.5 h-2.5" />







            K







          </kbd>







        </button>







        {/* Demo / Live switch */}







        <div className="flex items-center bg-white/[0.06] border border-white/10 rounded-[14px] p-1 shadow-[0_5px_16px_rgba(41,35,61,0.045)] backdrop-blur-xl">







          {/* Demo */}







          <button







            type="button"







            onClick={() => setIsLiveMode(false)}







            className={`h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all duration-200 ${







              !isLiveMode







                ? 'bg-gradient-to-r from-[#FFF7ED] to-[#FDF2F8] text-[#C76A00] border border-[#FED7AA] shadow-sm'







                : 'text-[#AAA2B5] border border-transparent hover:bg-white/[0.06] hover:text-white'







            }`}







            title="Use illustrative demo data"







          >







            <Sparkles className="w-3.5 h-3.5" />







            Demo







          </button>







          {/* Live */}







          <button







            type="button"







            onClick={() => setIsLiveMode(true)}







            className={`h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all duration-200 ${







              isLiveMode







                ? backendStatus.isConnected







                  ? 'bg-gradient-to-r from-[#F7FEE7] to-[#FCE7F3] text-[#4D7C0F] border border-[#D9F99D] shadow-sm'







                  : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] shadow-sm'







                : 'text-[#AAA2B5] border border-transparent hover:bg-white/[0.06] hover:text-white'







            }`}







            title="Connect to local FastAPI backend"







          >







            <Server className="w-3.5 h-3.5" />







            <span>Live</span>







            <span







              className={`w-1.5 h-1.5 rounded-full ${







                backendStatus.isConnected







                  ? 'bg-[#84CC16]'







                  : 'bg-[#EF4444]'







              }`}







            />







          </button>







        </div>







        {/* Connection indicator */}







        {isLiveMode && backendStatus.isConnected && (







          <div







            className="hidden xl:flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-gradient-to-r from-[#A3E635]/15 to-[#A3E635]/5 border border-[#A3E635]/30 shadow-sm"







            title="FastAPI backend connected"







          >







            <Wifi className="w-3.5 h-3.5 text-[#65A30D]" />







            <span className="text-[9px] font-mono font-bold text-[#65A30D]">







              {backendStatus.latencyMs ?? 18}ms







            </span>







          </div>







        )}







        {/* Notifications */}







        <div className="relative">







          <button







            onClick={() => {







              setShowNotifications(!showNotifications);







              setShowHelp(false);







            }}







            className="relative w-10 h-10 flex items-center justify-center rounded-[13px] border border-white/10 bg-white/[0.06] text-[#C5BECE] hover:text-[#DB2777] hover:bg-gradient-to-br hover:from-[#F472B6]/15 hover:to-[#A3E635]/10 hover:border-[#F472B6]/35 transition-all duration-300 shadow-[0_5px_16px_rgba(73,55,94,0.05)] hover:-translate-y-0.5"







            title="Notifications"







          >







            <Bell className="w-4 h-4" />







            {pendingReviews.length > 0 && (







              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">







                {pendingReviews.length}







              </span>







            )}







          </button>







          {/* Notifications Dropdown */}







          {showNotifications && (







            <div className="absolute right-0 mt-3 w-[340px] bg-gradient-to-br from-white/98 via-[#FFF9FC]/98 to-[#F7FEE7]/95 border border-white rounded-[20px] shadow-[0_24px_70px_rgba(73,55,94,0.16)] p-3 z-50 animate-in fade-in duration-150 backdrop-blur-2xl">







              <div className="flex items-center justify-between px-1 pb-3 border-b border-[#F1ECE7]">







                <div>







                  <span className="text-xs font-bold text-[#29233D] block">







                    Integrity Alerts







                  </span>







                  <span className="text-[9px] text-[#938DA2]">







                    Human review & knowledge triage







                  </span>







                </div>







                <span className="px-2 py-1 rounded-lg bg-[#FFF7ED] text-[#D97706] text-[9px] font-bold border border-[#FED7AA]">







                  {pendingReviews.length} pending







                </span>







              </div>







              <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">







                {pendingReviews.length === 0 ? (







                  <div className="py-8 text-center">







                    <div className="w-10 h-10 mx-auto rounded-full bg-[#F7FEE7] border border-[#D9F99D] flex items-center justify-center">







                      <Shield className="w-4 h-4 text-[#65A30D]" />







                    </div>







                    <p className="text-xs font-semibold text-[#29233D] mt-2">







                      Queue is clear







                    </p>







                    <p className="text-[10px] text-[#938DA2] mt-1">







                      No pending integrity reviews.







                    </p>







                  </div>







                ) : (







                  pendingReviews.map((rev) => (







                    <Link







                      key={rev.id}







                      to="/reviews"







                      onClick={() => setShowNotifications(false)}







                      className="block p-3 rounded-xl bg-[#FFFDF8] border border-transparent hover:border-[#FDE68A] hover:bg-[#FFFBEB] transition-all"







                    >







                      <div className="flex items-center gap-2 text-xs font-semibold text-[#29233D]">







                        <div className="w-7 h-7 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center shrink-0">







                          <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />







                        </div>







                        <span className="truncate">







                          {rev.documentTitle}







                        </span>







                      </div>







                      <p className="text-[10px] text-[#716A7C] mt-1.5 ml-9 line-clamp-2">







                        {rev.issueSummary}







                      </p>







                      <span className="text-[9px] text-[#938DA2] mt-1 ml-9 block">







                        {rev.createdAt}







                      </span>







                    </Link>







                  ))







                )}







              </div>







              <Link







                to="/reviews"







                onClick={() => setShowNotifications(false)}







                className="mt-3 block text-center py-2.5 rounded-xl bg-gradient-to-r from-[#BEF264] via-[#D9F99D] to-[#F9A8D4] border border-white text-[10px] font-black text-[#29233D] hover:brightness-95 transition-all shadow-sm"







              >







                Open Human Review Center →







              </Link>







            </div>







          )}







        </div>







        {/* Help */}







        <div className="relative">







          <button







            onClick={() => {







              setShowHelp(!showHelp);







              setShowNotifications(false);







            }}







            className="w-10 h-10 flex items-center justify-center rounded-[13px] border border-white/10 bg-white/[0.06] text-[#C5BECE] hover:text-[#7C3AED] hover:bg-gradient-to-br hover:from-[#A78BFA]/15 hover:to-[#F472B6]/10 hover:border-[#A78BFA]/35 transition-all duration-300 shadow-[0_5px_16px_rgba(73,55,94,0.05)] hover:-translate-y-0.5"







            title="Architecture & Help"







          >







            <HelpCircle className="w-4 h-4" />







          </button>







          {showHelp && (







            <div className="absolute right-0 mt-3 w-[350px] bg-gradient-to-br from-white/98 via-[#FAF8FF]/98 to-[#FFF7FB]/95 border border-white rounded-[20px] shadow-[0_24px_70px_rgba(73,55,94,0.16)] p-4 z-50 animate-in fade-in duration-150 backdrop-blur-2xl">







              <div className="flex items-center gap-3">







                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D9F99D] to-[#F9A8D4] flex items-center justify-center">







                  <Shield className="w-5 h-5 text-[#29233D]" />







                </div>







                <div>







                  <h4 className="text-sm font-bold text-[#29233D]">







                    Sovereign Black Ice







                  </h4>







                  <span className="text-[9px] uppercase tracking-wider text-[#938DA2]">







                    Knowledge Integrity Layer







                  </span>







                </div>







              </div>







              <p className="text-[11px] text-[#716A7C] mt-4 leading-relaxed">







                A detected source-document change is not automatically







                treated as an incorrect AI answer. Black Ice identifies







                divergent claims, maps downstream RAG answers, and







                surfaces evidence for human review.







              </p>







              <div className="mt-4 p-3 rounded-xl bg-[#FAF9F7] border border-[#EEE8E1] text-[10px] text-[#716A7C] space-y-2">







                <div className="flex justify-between">







                  <span>Backend</span>







                  <code className="text-[#65A30D] font-semibold">







                    127.0.0.1:8000







                  </code>







                </div>







                <div className="flex justify-between">







                  <span>API</span>







                  <code className="text-[#DB2777] font-semibold">







                    FastAPI







                  </code>







                </div>







                <div className="flex justify-between">







                  <span>Local AI</span>







                  <code className="text-[#29233D] font-semibold">







                    Ollama







                  </code>







                </div>







                <div className="flex justify-between">







                  <span>Cloud AI</span>







                  <code className="text-[#65A30D] font-semibold">







                    Not required







                  </code>







                </div>







              </div>







            </div>







          )}







        </div>







        {/* Divider */}







        <div className="h-6 w-px bg-white/10 mx-0.5" />







        {/* Avatar */}







        <div







          className="relative w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#F472B6] via-[#C4B5FD] to-[#A3E635] border border-white/15 shadow-[0_7px_22px_rgba(244,114,182,0.18)] flex items-center justify-center text-[11px] font-black text-[#29233D]"







          title="S. Vance"







        >







          SV







          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#A3E635] border-2 border-[#17151F]" />







        </div>







      </div>







    </header>







  );







};
