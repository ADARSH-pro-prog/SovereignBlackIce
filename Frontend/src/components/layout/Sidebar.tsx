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
  Circle,
  MoreVertical,
  Radio,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { isLiveMode, backendStatus } = useApp();

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Documents', path: '/documents', icon: FileText },
    { label: 'AI Assistant', path: '/assistant', icon: Bot },
    { label: 'Impact Analysis', path: '/impact', icon: Network },
    { label: 'Review Center', path: '/reviews', icon: ShieldCheck },
    { label: 'Audit Log', path: '/audit', icon: History },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[248px] bg-[#0A0F1C] border-r border-[#263247] z-40 flex flex-col justify-between select-none">
      {/* Top Section: Logo & Nav */}
      <div className="flex flex-col">
        {/* Brand / Product Mark */}
        <div className="h-[68px] px-4 border-b border-[#263247] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#14B8A6] flex items-center justify-center shadow-md shadow-[#3B82F6]/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-xs tracking-wider text-[#F8FAFC] uppercase whitespace-nowrap">
                SOVEREIGN
              </span>
              <span className="text-[10px] tracking-widest text-[#94A3B8] uppercase font-mono">
                BLACK ICE
              </span>
            </div>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-[#1E293B] text-[10px] font-mono text-[#94A3B8] border border-[#263247]">
            v2.4
          </span>
        </div>

        {/* Section Label */}
        <div className="px-4 py-2 mt-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
            Governance Modules
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-all duration-150 relative ${
                    isActive
                      ? 'bg-[#3B82F6]/15 text-[#F8FAFC] border-l-[3px] border-[#3B82F6] shadow-sm'
                      : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC]'
                  }`
                }
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: System Status & User Profile */}
      <div className="p-3 border-t border-[#263247] flex flex-col gap-2.5 bg-[#080D1D]">
        {/* Connection & System Status Indicator */}
        <div className="bg-[#111827] border border-[#263247] rounded-lg p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveMode
                  ? backendStatus.isConnected
                    ? 'bg-[#14B8A6] animate-pulse ring-2 ring-[#14B8A6]/20'
                    : 'bg-[#EF4444]'
                  : 'bg-[#14B8A6] ring-2 ring-[#14B8A6]/20'
              }`}
            />
            <span className="font-medium text-[#94A3B8]">
              {isLiveMode ? 'Live Backend' : 'Demo State'}
            </span>
          </div>
          <span
            className={`font-mono text-[11px] font-medium ${
              isLiveMode
                ? backendStatus.isConnected
                  ? 'text-[#14B8A6]'
                  : 'text-[#EF4444]'
                : 'text-[#14B8A6]'
            }`}
          >
            {isLiveMode
              ? backendStatus.isConnected
                ? `${backendStatus.latencyMs ?? 18}ms`
                : 'Offline'
              : 'Nominal'}
          </span>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#111827] border border-[#263247]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#1E293B] border border-[#263247] flex items-center justify-center shrink-0 text-[#3B82F6] font-semibold text-xs">
              SV
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-[#F8FAFC] truncate">
                S. Vance, CISO
              </span>
              <span className="text-[10px] text-[#64748B] truncate">
                Security Directorate
              </span>
            </div>
          </div>
          <button
            className="text-[#64748B] hover:text-[#F8FAFC] p-1 transition-colors"
            title="User Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
