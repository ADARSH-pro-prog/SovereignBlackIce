import React from 'react';



import { Outlet } from 'react-router-dom';



import { Sidebar } from './Sidebar';



import { Header } from './Header';



import { ToastContainer } from '../ui/ToastContainer';



import { GlobalSearchModal } from '../ui/GlobalSearchModal';



import { useApp } from '../../context/AppContext';



import {



  AlertCircle,



  Server,



  ExternalLink,



  ShieldCheck,



  WifiOff,



} from 'lucide-react';







export const AppLayout: React.FC = () => {



  const { isLiveMode, backendStatus } = useApp();







  const backendOffline = isLiveMode && !backendStatus.isConnected;







  return (



    <div className="relative flex min-h-screen overflow-x-hidden bg-[#F2EFF6] text-[#29233D]">

      <style>{`
        @keyframes sbiAuroraLime {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-70px, 55px, 0) scale(1.08); }
        }
        @keyframes sbiAuroraPink {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(90px, -55px, 0) scale(1.10); }
        }
        @keyframes sbiAuroraViolet {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1.02); }
          50% { transform: translate3d(55px, 70px, 0) scale(1.12); }
        }
        @keyframes sbiAuroraBrand {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .82; }
          50% { transform: translate3d(-45px, 50px, 0) scale(1.10); opacity: 1; }
        }
        @keyframes sbiAuroraBlue {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(65px, 35px, 0) scale(1.07); }
        }

        .sbi-aurora {
          will-change: transform;
          transform-origin: center;
        }
        .sbi-aurora-lime {
          animation: sbiAuroraLime 24s ease-in-out infinite;
        }
        .sbi-aurora-pink {
          animation: sbiAuroraPink 28s ease-in-out infinite;
        }
        .sbi-aurora-violet {
          animation: sbiAuroraViolet 32s ease-in-out infinite;
        }
        .sbi-aurora-blue {
          animation: sbiAuroraBlue 26s ease-in-out infinite;
        }
        .sbi-aurora-brand {
          animation: sbiAuroraBrand 30s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .sbi-aurora {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>








      {/* =========================================================



          GLOBAL AMBIENT CANVAS



      ========================================================== */}



      <div className="pointer-events-none fixed inset-0 overflow-hidden">







        {/* Main pearl wash */}



        <div className="absolute inset-0 bg-[linear-gradient(135deg,#F4F1F7_0%,#F1EEF5_46%,#F3F1F6_72%,#F5F3F7_100%)]" />







        {/* Lemon glow */}



        <div className="sbi-aurora sbi-aurora-lime absolute -right-[120px] top-[10px] h-[560px] w-[560px] rounded-full bg-[#D9F99D]/20 blur-[120px]" />







        {/* Baby pink glow */}



        <div className="sbi-aurora sbi-aurora-pink absolute bottom-[-180px] left-[80px] h-[620px] w-[620px] rounded-full bg-[#F9A8D4]/18 blur-[135px]" />







        {/* Lavender glow */}



        <div className="sbi-aurora sbi-aurora-violet absolute left-[35%] top-[17%] h-[560px] w-[560px] rounded-full bg-[#6D4AFF]/18 blur-[125px]" />







        {/* Secondary lime glow */}



        <div className="sbi-aurora sbi-aurora-blue absolute left-[14%] top-[8%] h-[380px] w-[380px] rounded-full bg-[#93C5FD]/18 blur-[105px]" />

        {/* Electric violet brand anchor */}
        <div className="sbi-aurora sbi-aurora-brand absolute right-[17%] top-[9%] h-[320px] w-[320px] rounded-full bg-[#7C3AED]/14 blur-[100px]" />







        {/* Technical grid */}



        <div



          className="absolute inset-0 opacity-[0.075]"



          style={{



            backgroundImage:



              'linear-gradient(rgba(105,92,125,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(105,92,125,0.035) 1px, transparent 1px)',



            backgroundSize: '42px 42px',



          }}



        />







        {/* Fine noise-like dots */}



        <div



          className="absolute inset-0 opacity-[0.055]"



          style={{



            backgroundImage:



              'radial-gradient(circle, rgba(41,35,61,0.12) 0.7px, transparent 0.8px)',



            backgroundSize: '24px 24px',



          }}



        />







        {/* Top atmospheric highlight */}



        <div className="absolute left-[248px] right-0 top-[76px] h-[380px] bg-[radial-gradient(circle_at_16%_8%,rgba(163,230,53,0.13),transparent_29%),radial-gradient(circle_at_46%_2%,rgba(109,74,255,0.22),transparent_31%),radial-gradient(circle_at_68%_5%,rgba(147,197,253,0.18),transparent_28%),radial-gradient(circle_at_86%_10%,rgba(236,72,153,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.30),rgba(240,236,245,0.04),transparent)]" />



      </div>







      {/* =========================================================



          SIDEBAR



      ========================================================== */}



      <Sidebar />







      {/* =========================================================



          MAIN APPLICATION AREA



      ========================================================== */}



      <div className="relative z-10 flex min-w-0 flex-1 flex-col pl-[248px]">







        <Header />







        {/* =======================================================



            BACKEND OFFLINE WARNING



        ======================================================== */}



        {backendOffline && (



          <div className="fixed left-[248px] right-0 top-[76px] z-20 px-7 pt-3">







            <div className="mx-auto max-w-[1440px]">







              <div className="relative min-h-[52px] overflow-hidden rounded-[18px] border border-[#FECACA]/90 bg-white/85 px-4 py-2.5 shadow-[0_12px_35px_rgba(239,68,68,0.10)] backdrop-blur-2xl">







                {/* warning glow */}



                <div className="pointer-events-none absolute -left-10 top-1/2 h-24 w-32 -translate-y-1/2 rounded-full bg-[#FEE2E2]/80 blur-2xl" />







                <div className="pointer-events-none absolute right-[15%] top-1/2 h-20 w-28 -translate-y-1/2 rounded-full bg-[#FCE7F3]/50 blur-2xl" />







                <div className="relative flex items-center justify-between gap-4">







                  {/* LEFT */}



                  <div className="flex min-w-0 items-center gap-3">







                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FECACA] bg-gradient-to-br from-[#FEF2F2] to-white">







                      <div className="absolute inset-0 rounded-xl bg-[#EF4444]/10 blur-md" />







                      <WifiOff className="relative h-4 w-4 text-[#DC2626]" />



                    </div>







                    <div className="min-w-0">







                      <div className="flex items-center gap-2">







                        <span className="text-[11px] font-black text-[#991B1B]">



                          Live backend unavailable



                        </span>







                        <span className="rounded-md border border-[#FECACA] bg-[#FEE2E2]/70 px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-[0.13em] text-[#DC2626]">



                          Connection Alert



                        </span>



                      </div>







                      <p className="mt-0.5 truncate text-[9.5px] text-[#A95C5C]">



                        FastAPI at{' '}



                        <code className="font-mono font-bold text-[#991B1B]">



                          {backendStatus.baseUrl}



                        </code>{' '}



                        could not be reached. Start the backend or switch to Demo



                        Mode.



                      </p>



                    </div>



                  </div>







                  {/* RIGHT */}



                  <div className="hidden shrink-0 items-center gap-2 lg:flex">







                    <div className="flex h-8 items-center gap-2 rounded-xl border border-[#FECACA] bg-white/80 px-3 shadow-sm">



                      <Server className="h-3.5 w-3.5 text-[#DC2626]" />







                      <span className="font-mono text-[9px] font-bold text-[#991B1B]">



                        :8000



                      </span>



                    </div>







                    <a



                      href={`${backendStatus.baseUrl}/docs`}



                      target="_blank"



                      rel="noreferrer"



                      className="flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#EF4444] to-[#E11D48] px-3 text-[9px] font-bold text-white shadow-[0_6px_16px_rgba(239,68,68,0.18)] transition-all hover:-translate-y-0.5 hover:brightness-105"



                    >



                      Swagger



                      <ExternalLink className="h-3 w-3" />



                    </a>



                  </div>



                </div>



              </div>



            </div>



          </div>



        )}







        {/* =======================================================



            MAIN CONTENT CANVAS



        ======================================================== */}



        <main



          className={`relative min-h-screen w-full pt-[76px] ${



            backendOffline ? 'mt-[68px]' : ''



          }`}



        >







          {/* Top pearl wash */}



          <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white/20 to-transparent" />







          {/* ===============================================



              DECORATIVE AMBIENT ELEMENTS



          ================================================ */}







          {/* top-right glow */}



          <div className="pointer-events-none absolute right-[4%] top-[95px] h-[170px] w-[170px] rounded-full bg-[#F9A8D4]/16 blur-[72px]" />







          {/* top-left lime glow */}



          <div className="pointer-events-none absolute left-[3%] top-[150px] h-[180px] w-[180px] rounded-full bg-[#D9F99D]/15 blur-[82px]" />







          {/* tiny security nodes */}



          <div className="pointer-events-none absolute right-[6.5%] top-[118px] flex items-center gap-2">







            <span className="h-1.5 w-1.5 rounded-full bg-[#A3E635] shadow-[0_0_9px_rgba(163,230,53,0.75)]" />







            <span className="h-px w-7 bg-gradient-to-r from-[#A3E635]/50 to-transparent" />



          </div>







          <div className="pointer-events-none absolute right-[4.5%] top-[157px] flex items-center gap-2">







            <span className="h-1 w-1 rounded-full bg-[#F472B6]/80 shadow-[0_0_7px_rgba(244,114,182,0.55)]" />







            <span className="h-px w-4 bg-gradient-to-r from-[#F472B6]/40 to-transparent" />



          </div>







          {/* =====================================================



              PAGE WORKSPACE



          ====================================================== */}



          <div className="relative z-10 p-7">







            <div className="relative mx-auto max-w-[1440px]">







              {/* Very subtle workspace aura */}



              <div className="pointer-events-none absolute -inset-5 -z-10 rounded-[36px] bg-gradient-to-br from-white/20 via-[#6D4AFF]/[0.025] to-[#EC4899]/[0.035] blur-2xl" />







              {/* top system status accent */}



              <div className="mb-4 flex items-center justify-end">







                <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/55 px-3 py-1.5 shadow-[0_4px_16px_rgba(73,55,94,0.04)] backdrop-blur-xl">







                  <ShieldCheck className="h-3 w-3 text-[#65A30D]" />







                  <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#938DA2]">



                    Knowledge Integrity Workspace



                  </span>







                  <span className="h-1.5 w-1.5 rounded-full bg-[#A3E635] shadow-[0_0_6px_rgba(163,230,53,0.8)]" />



                </div>



              </div>







              {/* Actual route page */}



              <Outlet />







              {/* Bottom system signature */}



              <div className="mt-10 flex items-center justify-center pb-2">







                <div className="flex items-center gap-3 text-[7.5px] font-semibold uppercase tracking-[0.16em] text-[#B0A9B6]">







                  <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#D9D2DE]" />







                  <span>



                    Sovereign Black Ice



                  </span>







                  <span className="h-1 w-1 rounded-full bg-[#A3E635]" />







                  <span>



                    Local-First Integrity Layer



                  </span>







                  <span className="h-px w-10 bg-gradient-to-r from-[#D9D2DE] to-transparent" />



                </div>



              </div>



            </div>



          </div>



        </main>



      </div>







      {/* =========================================================



          GLOBAL UI LAYERS



      ========================================================== */}



      <ToastContainer />



      <GlobalSearchModal />



    </div>



  );



};
