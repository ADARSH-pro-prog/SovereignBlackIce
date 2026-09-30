import React from 'react';

import { NavLink } from 'react-router-dom';

import {

  LayoutDashboard,

  FileText,

  Bot,

  Network,

  ShieldCheck,

  History,

  Settings,

  Shield,

  MoreVertical,

  Sparkles,
  Activity,
  LockKeyhole,
  LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { isLiveMode, backendStatus, user, logout } = useApp();

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : user?.email
      ? user.email.substring(0, 2).toUpperCase()
      : 'SB';

  const userName = user?.name || user?.email?.split('@')[0] || 'Sovereign Operator';
  const userSubtext = user?.email || 'Security Directorate';



  const navItems = [

    { label: 'Overview', path: '/', icon: LayoutDashboard },

    { label: 'Documents', path: '/documents', icon: FileText },

    { label: 'AI Assistant', path: '/assistant', icon: Bot },

    { label: 'Impact Analysis', path: '/impact', icon: Network },

    { label: 'Review Center', path: '/reviews', icon: ShieldCheck },

    { label: 'Audit Log', path: '/audit', icon: History },

    { label: 'Settings', path: '/settings', icon: Settings },

  ];



  const backendHealthy =

    !isLiveMode || backendStatus.isConnected;



  return (

    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[248px] select-none flex-col justify-between overflow-hidden border-r border-[#302F34] bg-[#171719]/98 shadow-[10px_0_40px_rgba(17,17,19,0.22)] backdrop-blur-2xl">



      {/* Ambient ombré background */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#A3E635]/08 blur-[75px]" />

        <div className="absolute -right-24 top-[25%] h-64 w-64 rounded-full bg-[#F472B6]/07 blur-[90px]" />

        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#C4B5FD]/06 blur-[85px]" />

      </div>



      {/* TOP */}

      <div className="relative flex flex-col">



        {/* BRAND */}

        <div className="relative flex h-[82px] items-center justify-between border-b border-[#302F34] bg-[#1B1B1E]/92 px-4 backdrop-blur-xl">



          <div className="flex items-center gap-3">



            {/* LOGO */}

            <div className="relative">



              <div className="absolute inset-0 rounded-[18px] bg-gradient-to-br from-[#BEF264] to-[#F9A8D4] opacity-40 blur-md" />



              <div className="relative flex h-11 w-11 items-center justify-center rounded-[17px] border border-[#3A393F] bg-gradient-to-br from-[#B7F34A] via-[#BFA8FF] to-[#F472B6] shadow-[0_8px_24px_rgba(163,230,53,0.22)]">

                <Shield className="h-[21px] w-[21px] text-[#171719]" />



                <div className="absolute inset-[6px] rounded-xl border border-white/20" />

              </div>



              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#171719] bg-[#F472B6]">

                <span className="h-1 w-1 rounded-full bg-white" />

              </span>

            </div>



            {/* NAME */}

            <div className="flex flex-col">



              <div className="flex items-center gap-1.5">

                <span className="text-[12px] font-black uppercase tracking-[0.13em] text-[#F8F7F4]">

                  Sovereign

                </span>



                <Sparkles className="h-3 w-3 text-[#F472B6]" />

              </div>



              <span className="bg-gradient-to-r from-[#B7F34A] via-[#BFA8FF] to-[#F472B6] bg-clip-text font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-transparent">

                Black Ice

              </span>

            </div>

          </div>



          {/* VERSION */}

          <div className="flex flex-col items-end gap-1">

            <span className="rounded-lg border border-[#41502A] bg-[#20251B]/90 px-2 py-0.5 font-mono text-[8px] font-black text-[#B7F34A]">

              v2.4

            </span>



            <span className="text-[7px] font-semibold uppercase tracking-widest text-[#77737E]">

              Sovereign AI

            </span>

          </div>

        </div>



        {/* SYSTEM LABEL */}

        <div className="px-4 pb-2 pt-5">



          <div className="flex items-center justify-between px-1">



            <div className="flex items-center gap-2">

              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#242327]">

                <Sparkles className="h-3 w-3 text-[#F472B6]" />

              </div>



              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8D8992]">

                Governance Modules

              </span>

            </div>



            <span className="h-1.5 w-1.5 rounded-full bg-[#A3E635] shadow-[0_0_8px_rgba(163,230,53,0.8)]" />

          </div>

        </div>



        {/* NAVIGATION */}

        <nav className="flex flex-col space-y-1 px-3">



          {navItems.map((item) => {

            const Icon = item.icon;



            return (

              <NavLink

                key={item.path}

                to={item.path}

                end={item.path === '/'}

                className={({ isActive }) =>

                  `group relative flex h-[46px] items-center gap-3 overflow-hidden rounded-[14px] border px-3.5 text-[12.5px] font-semibold transition-all duration-300 ${

                    isActive

                      ? 'border-[#3A393F] bg-[#252429] text-[#F8F7F4] shadow-[0_7px_18px_rgba(0,0,0,0.18)]'

                      : 'border-transparent text-[#B8B5BD] hover:translate-x-[2px] hover:border-[#343238] hover:bg-[#222126] hover:text-[#F8F7F4] hover:shadow-[0_5px_16px_rgba(0,0,0,0.12)]'

                  }`

                }

              >

                {({ isActive }) => (

                  <>

                    {/* active glow */}

                    {isActive && (

                      <>

                        <div className="pointer-events-none absolute -left-10 top-1/2 h-20 w-24 -translate-y-1/2 rounded-full bg-[#B7F34A]/08 blur-2xl" />



                        <div className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-gradient-to-b from-[#A3E635] to-[#F472B6]" />

                      </>

                    )}



                    {/* ICON */}

                    <div

                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] transition-all duration-300 ${

                        isActive

                          ? 'border border-[#3A393F] bg-[#2A292E] text-[#B7F34A] shadow-[0_4px_12px_rgba(0,0,0,0.12)]'

                          : 'text-[#8D8992] group-hover:bg-gradient-to-br group-hover:from-[#F7FEE7] group-hover:to-[#FDF2F8] group-hover:text-[#F472B6]'

                      }`}

                    >

                      <Icon className="h-[16px] w-[16px]" />

                    </div>



                    <span className="relative z-10">

                      {item.label}

                    </span>



                    {isActive && (

                      <div className="relative z-10 ml-auto flex items-center gap-1.5">



                        <span className="text-[7px] font-black uppercase tracking-wider text-[#77737E]">

                          Active

                        </span>



                        <span className="h-1.5 w-1.5 rounded-full bg-[#A3E635] shadow-[0_0_7px_rgba(163,230,53,0.8)]" />

                      </div>

                    )}

                  </>

                )}

              </NavLink>

            );

          })}

        </nav>



        {/* TRUST STRIP */}

        <div className="mx-3 mt-5 overflow-hidden rounded-[15px] border border-white/90 bg-gradient-to-r from-[#F7FEE7]/85 via-white/85 to-[#FDF2F8]/85 p-3 shadow-[0_8px_24px_rgba(73,55,94,0.05)] backdrop-blur-xl">



          <div className="flex items-center gap-2">



            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#41502A] bg-[#252527]">

              <LockKeyhole className="h-3.5 w-3.5 text-[#B7F34A]" />

            </div>



            <div className="min-w-0">

              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-[#D8D5DC]">

                Trust Layer

              </div>



              <div className="mt-0.5 text-[8px] text-[#8D8992]">

                Provenance • Integrity • Impact

              </div>

            </div>

          </div>



          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#302F34]">

            <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-[#A3E635] via-[#C4B5FD] to-[#F472B6]" />

          </div>

        </div>

      </div>



      {/* BOTTOM */}

      <div className="relative flex flex-col gap-2.5 border-t border-[#302F34] bg-[#151517]/90 p-3 backdrop-blur-xl">



        {/* BACKEND HEALTH */}

        <div className="relative overflow-hidden rounded-[16px] border border-[#343238] bg-[#202024] p-3 shadow-[0_7px_22px_rgba(73,55,94,0.06)]">



          <div

            className={`pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full blur-2xl ${

              backendHealthy

                ? 'bg-[#B7F34A]/08'

                : 'bg-[#EF4444]/08'

            }`}

          />



          <div className="relative flex items-center justify-between">



            <div className="flex items-center gap-2.5">



              {/* STATUS ICON */}

              <div

                className={`flex h-8 w-8 items-center justify-center rounded-[10px] border ${

                  backendHealthy

                    ? 'border-[#41502A] bg-[#20251B]'

                    : 'border-[#5A3035] bg-[#29191D]'

                }`}

              >

                <Activity

                  className={`h-4 w-4 ${

                    backendHealthy

                      ? 'text-[#B7F34A]'

                      : 'text-[#FB7185]'

                  }`}

                />

              </div>



              <div className="flex flex-col">

                <div className="flex items-center gap-1.5">



                  <span

                    className={`h-1.5 w-1.5 rounded-full ${

                      backendHealthy

                        ? 'bg-[#A3E635] shadow-[0_0_7px_rgba(163,230,53,0.8)]'

                        : 'bg-[#EF4444]'

                    }`}

                  />



                  <span className="text-[10px] font-black text-[#F8F7F4]">

                    {isLiveMode

                      ? 'Integrity Engine'

                      : 'Demo Environment'}

                  </span>

                </div>



                <span className="mt-0.5 text-[8px] text-[#8D8992]">

                  {isLiveMode

                    ? backendStatus.isConnected

                      ? 'FastAPI connection secured'

                      : 'Backend connection unavailable'

                    : 'Illustrative governance data'}

                </span>

              </div>

            </div>



            <div className="text-right">



              <div

                className={`font-mono text-[9px] font-black ${

                  backendHealthy

                    ? 'text-[#B7F34A]'

                    : 'text-[#FB7185]'

                }`}

              >

                {isLiveMode

                  ? backendStatus.isConnected

                    ? `${backendStatus.latencyMs ?? 18}ms`

                    : 'OFFLINE'

                  : 'NOMINAL'}

              </div>



              <div className="mt-0.5 text-[7px] uppercase tracking-wider text-[#77737E]">

                system health

              </div>

            </div>

          </div>

        </div>



        {/* PROFILE */}
        <div className="group flex items-center justify-between rounded-[16px] border border-[#343238] bg-[#202024]/96 p-2.5 shadow-[0_5px_18px_rgba(73,55,94,0.04)] transition-all duration-300 hover:border-[#F472B6]/45 hover:shadow-[0_8px_25px_rgba(244,114,182,0.08)]">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#F9A8D4] to-[#A3E635] opacity-30 blur-md" />

              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={userName}
                  className="relative h-9 w-9 shrink-0 rounded-xl border border-[#3A393F] object-cover shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#3A393F] bg-gradient-to-br from-[#F472B6] via-[#BFA8FF] to-[#B7F34A] text-xs font-black text-[#171719] shadow-sm">
                  {userInitials}
                </div>
              )}

              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#202024] bg-[#A3E635]" />
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[10.5px] font-black text-[#F8F7F4]" title={userName}>
                  {userName}
                </span>

                <ShieldCheck className="h-3 w-3 shrink-0 text-[#B7F34A]" />
              </div>

              <span className="truncate text-[8.5px] text-[#8D8992]" title={userSubtext}>
                {userSubtext}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8D8992] transition-all hover:bg-[#FB7185]/20 hover:text-[#FB7185]"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>



        {/* SECURITY FOOTER */}

        <div className="flex items-center justify-center gap-1.5 pb-0.5 text-[7.5px] font-semibold uppercase tracking-[0.14em] text-[#77737E]">

          <Shield className="h-2.5 w-2.5 text-[#84CC16]" />

          Local-first secure workspace

        </div>

      </div>

    </aside>

  );

};
