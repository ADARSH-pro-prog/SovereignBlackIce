import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  FileText,
  ExternalLink,
  Copy,
  Shield,
  Sparkles,
  Plus,
  ArrowRight,
  WandSparkles,
  Database,
  LockKeyhole,
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import { INITIAL_ASSISTANT_MESSAGES } from '../data/demoData';
import { AssistantMessage } from '../types';
import { apiService } from '../services/api';

export const AssistantPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    isLiveMode,
    backendStatus,
    documents,
    addToast,
  } = useApp();

  const [messages, setMessages] =
    useState<AssistantMessage[]>(INITIAL_ASSISTANT_MESSAGES);

  const [inputText, setInputText] = useState('');
  const [activeScope, setActiveScope] =
    useState('All Monitored Documents');
  const [useCurrentOnly, setUseCurrentOnly] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scopes = [
    'All Monitored Documents',
    ...Array.from(new Set(documents.map((d) => d.title))),
  ].slice(0, 6);

  const handleSend = async () => {
    if (!inputText.trim() || isSubmitting) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: 'Just now',
      content: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSubmitting(true);

    if (isLiveMode) {
      if (!backendStatus.isConnected) {
        addToast({
          type: 'error',
          title: 'Backend Offline',
          message:
            'FastAPI backend is disconnected. Check connection in Settings.',
        });

        const botMsg: AssistantMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          content: `Unable to query knowledge base: FastAPI backend is currently unreachable at ${backendStatus.baseUrl}. Please start the backend server with 'uvicorn app.main:app --port 8000'.`,
        };

        setMessages((prev) => [...prev, botMsg]);
        setIsSubmitting(false);
        return;
      }

      try {
        const targetDoc = documents.find(
          (d) => d.title === activeScope || d.id === activeScope
        );

        const res = await apiService.askAssistant({
          question: userText,
          documentId: targetDoc?.id,
          strictCurrentVersion: useCurrentOnly,
          scope: activeScope,
        });

        const botMsg: AssistantMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          content: res.answer,
          citations: res.citations,
          temporalWarning: res.temporalWarning,
        };

        setMessages((prev) => [...prev, botMsg]);
        setIsSubmitting(false);
        return;
      } catch (err: unknown) {
        const errMsg =
          err instanceof Error ? err.message : 'QA Generation failed';

        addToast({
          type: 'error',
          title: 'QA Error',
          message: errMsg,
        });

        const botMsg: AssistantMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          content: `Error from backend QA service: ${errMsg}`,
        };

        setMessages((prev) => [...prev, botMsg]);
        setIsSubmitting(false);
        return;
      }
    }

    // Demo-mode grounded response
    setTimeout(() => {
      let content =
        'According to the active institutional documents, non-travel business expenditure submissions must be finalized within 15 calendar days of incurring the expense (Clause §4.2). Manager and C-level approvals are required for any post-window exceptions.';

      let citations: AssistantMessage['citations'] = [
        {
          documentId: 'DOC-7704',
          documentTitle: 'Employee Reimbursement Policy',
          version: 'v2.0 (Active)',
          clause: '§ 4.2 Reimbursement Submission Window',
          chunkId: 'chunk-erp-42-v2',
          sha256: '0x4419b9f89e22...',
          excerpt:
            'Employees must submit reimbursement claims within 15 days of the expense. Claims must include valid receipts and manager approval.',
          isCurrentVersion: true,
        },
      ];

      if (
        userText.toLowerCase().includes('retention') ||
        userText.toLowerCase().includes('data')
      ) {
        content =
          'Per Data Retention Policy v2.4 (effective Sep 25, 2026), customer telemetry and event logs are strictly retained for a maximum of 90 calendar days before automated purge cycles.';

        citations = [
          {
            documentId: 'DOC-5120',
            documentTitle: 'Data Retention Policy',
            version: 'v2.4 (Active)',
            clause: '§ 3.2 Telemetry Retention Window',
            chunkId: 'chunk-ret-32-v2',
            sha256: '0xc89104271891...',
            excerpt:
              'Customer telemetry event logs are retained for 90 calendar days across active storage partitions.',
            isCurrentVersion: true,
          },
        ];
      }

      const botMsg: AssistantMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        timestamp: 'Just now',
        content,
        citations,
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsSubmitting(false);
    }, 900);
  };

  return (
    <div className="relative pb-20 text-[#29233D]">

      {/* DREAMY BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#FFFDF9]">
        <div className="absolute -top-32 left-[18%] h-[520px] w-[520px] rounded-full bg-[#D9F99D]/35 blur-[110px]" />
        <div className="absolute top-[18%] right-[-80px] h-[500px] w-[500px] rounded-full bg-[#F9A8D4]/25 blur-[120px]" />
        <div className="absolute bottom-[-180px] left-[35%] h-[600px] w-[600px] rounded-full bg-[#DDD6FE]/30 blur-[130px]" />
        <div className="absolute top-[48%] left-[-180px] h-[440px] w-[440px] rounded-full bg-[#E0F2FE]/40 blur-[120px]" />
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#FFF9FC] to-[#F7FEE7] px-6 py-6 shadow-[0_25px_80px_rgba(73,55,94,0.10)] lg:px-8">

        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#D9F99D]/55 blur-3xl" />
        <div className="pointer-events-none absolute right-[18%] top-[-80px] h-52 w-52 rounded-full bg-[#FBCFE8]/45 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">

          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-[#D9F99D] bg-[#F7FEE7] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#65A30D]">
                <Sparkles className="h-3 w-3" />
                Sovereign Intelligence
              </span>

              <span className="rounded-full border border-[#FBCFE8] bg-[#FDF2F8] px-3 py-1 text-[10px] font-semibold text-[#DB2777]">
                Grounded RAG
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D9F99D] bg-gradient-to-br from-[#ECFCCB] to-[#FCE7F3] shadow-[0_10px_30px_rgba(163,230,53,0.18)]">
                <WandSparkles className="h-6 w-6 text-[#6B21A8]" />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-[-0.035em] text-[#29233D]">
                  Knowledge Assistant
                </h1>

                <p className="mt-1 max-w-2xl text-sm text-[#756D82]">
                  Ask your knowledge base anything — every answer is grounded,
                  traceable and integrity-aware.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            <div className="flex items-center gap-2 rounded-2xl border border-[#D9F99D] bg-white/75 px-4 py-2.5 shadow-sm backdrop-blur-xl">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#A3E635] opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#84CC16]" />
              </span>

              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#A09AAA]">
                  Integrity Engine
                </div>
                <div className="text-xs font-bold text-[#4D7C0F]">
                  Grounded & Verified
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMessages([])}
              className="rounded-2xl border border-[#E9E4DD] bg-white/80 px-4 py-3 text-xs font-semibold text-[#6F687C] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#F9A8D4] hover:shadow-md"
            >
              Clear conversation
            </button>
          </div>
        </div>
      </section>

      {/* MAIN WORKSPACE */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">

        {/* LEFT */}
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-8">

          {/* SCOPE */}
          <section className="rounded-[24px] border border-white/80 bg-white/75 p-4 shadow-[0_15px_50px_rgba(73,55,94,0.08)] backdrop-blur-xl">

            <div className="flex flex-wrap items-center justify-between gap-4">

              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#938DA2]">
                  Knowledge Scope
                </span>

                {scopes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setActiveScope(s)}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all ${
                      activeScope === s
                        ? 'border border-[#D9F99D] bg-gradient-to-r from-[#ECFCCB] to-[#FCE7F3] text-[#4D7C0F] shadow-sm'
                        : 'border border-[#EEE9F0] bg-white text-[#756D82] hover:border-[#F9A8D4] hover:bg-[#FFF8FC]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <label className="flex cursor-pointer select-none items-center gap-2 rounded-xl border border-[#E9E4DD] bg-[#FFFDF9] px-3 py-2 text-[11px] text-[#756D82]">
                <LockKeyhole className="h-3.5 w-3.5 text-[#84CC16]" />
                <span>Current versions only</span>

                <input
                  type="checkbox"
                  checked={useCurrentOnly}
                  onChange={(e) => setUseCurrentOnly(e.target.checked)}
                  className="h-4 w-4 accent-[#84CC16]"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1EDF2] pt-3 text-[10px] text-[#938DA2]">

              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-[#65A30D]" />
                <span>
                  Index synchronized • Cryptographic grounding active
                </span>
              </div>

              {isLiveMode ? (
                <span className="flex items-center gap-1.5 font-mono font-bold text-[#65A30D]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#84CC16]" />
                  FASTAPI RAG LIVE
                </span>
              ) : (
                <span className="rounded-full bg-[#FFF7ED] px-2 py-1 font-mono font-bold text-[#D97706]">
                  DEMO DATA ACTIVE
                </span>
              )}
            </div>
          </section>

          {/* CHAT */}
          <div className="flex flex-col gap-6">

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${
                  msg.sender === 'user'
                    ? 'max-w-[88%] self-end flex-row-reverse'
                    : 'max-w-full'
                }`}
              >

                {/* AVATAR */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-black shadow-sm ${
                    msg.sender === 'user'
                      ? 'border border-[#FBCFE8] bg-gradient-to-br from-[#FCE7F3] to-[#EDE9FE] text-[#9D174D]'
                      : 'border border-[#D9F99D] bg-gradient-to-br from-[#ECFCCB] to-white text-[#4D7C0F]'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    'SV'
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                </div>

                <div
                  className={`flex flex-col gap-2 ${
                    msg.sender === 'user' ? 'items-end' : 'flex-1'
                  }`}
                >

                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#938DA2]">
                    <span className="font-bold text-[#655E72]">
                      {msg.sender === 'user'
                        ? 'S. Vance (CISO)'
                        : 'Sovereign Black Ice'}
                    </span>

                    {msg.sender === 'assistant' && (
                      <span className="flex items-center gap-1 font-semibold text-[#65A30D]">
                        <CheckCircle className="h-3 w-3" />
                        Grounded in Document
                      </span>
                    )}

                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {msg.sender === 'user' ? (

                    <div className="rounded-[20px] rounded-tr-md border border-[#FBCFE8] bg-gradient-to-br from-[#FDF2F8] via-white to-[#F5F3FF] px-5 py-3.5 text-sm font-medium text-[#3D354B] shadow-[0_10px_30px_rgba(219,39,119,0.08)]">
                      {msg.content}
                    </div>

                  ) : (

                    <div className="flex flex-col gap-4 rounded-[24px] rounded-tl-md border border-white/90 bg-white/80 p-5 text-sm leading-7 text-[#453D52] shadow-[0_18px_55px_rgba(73,55,94,0.10)] backdrop-blur-xl">

                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-6 w-1 rounded-full bg-gradient-to-b from-[#A3E635] via-[#F9A8D4] to-[#C4B5FD]" />
                        <p className="font-medium">{msg.content}</p>
                      </div>

                      {/* WARNING */}
                      {msg.temporalWarning && (
                        <div className="flex items-start gap-3 rounded-2xl border border-[#FDE68A] bg-gradient-to-r from-[#FFFBEB] to-[#FFF7ED] p-4">

                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />

                          <div className="flex-1 text-xs">
                            <span className="block font-bold text-[#92400E]">
                              {msg.temporalWarning.message}
                            </span>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="text-[#DC2626] line-through">
                                {msg.temporalWarning.previousClaim}
                              </span>

                              <ArrowRight className="h-3 w-3 text-[#A8A29E]" />

                              <span className="font-bold text-[#65A30D]">
                                {msg.temporalWarning.currentClaim}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              navigate('/documents/DOC-7704/compare')
                            }
                            className="rounded-xl border border-[#FDE68A] bg-white px-3 py-1.5 text-[10px] font-bold text-[#B45309] shadow-sm hover:bg-[#FFFBEB]"
                          >
                            View Diff
                          </button>
                        </div>
                      )}

                      {/* CITATIONS */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="space-y-3">

                          {msg.citations.map((c, i) => (
                            <div
                              key={i}
                              className="rounded-2xl border border-[#E8E3EC] bg-gradient-to-br from-[#FFFDF9] via-white to-[#F7FEE7]/50 p-4"
                            >

                              <div className="flex flex-wrap items-center justify-between gap-2">

                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECFCCB]">
                                    <FileText className="h-4 w-4 text-[#65A30D]" />
                                  </div>

                                  <span className="text-xs font-bold text-[#342D40]">
                                    {c.documentTitle}
                                  </span>

                                  <span className="rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] px-2 py-0.5 font-mono text-[9px] font-bold text-[#7C3AED]">
                                    {c.version}
                                  </span>
                                </div>

                                <span className="rounded-full border border-[#D9F99D] bg-[#F7FEE7] px-2.5 py-1 font-mono text-[9px] font-bold text-[#4D7C0F]">
                                  {c.isCurrentVersion
                                    ? '✓ CURRENT SOURCE'
                                    : 'ARCHIVED VERSION'}
                                </span>
                              </div>

                              <div className="mt-3 rounded-xl border-l-[3px] border-[#A3E635] bg-white px-4 py-3 font-mono text-[11px] leading-relaxed text-[#655E72] shadow-sm">
                                “{c.excerpt}”
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#938DA2]">

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/documents/${c.documentId}`
                                      )
                                    }
                                    className="flex items-center gap-1 font-bold text-[#7C3AED] hover:text-[#DB2777]"
                                  >
                                    View Source ({c.documentId})
                                    <ExternalLink className="h-3 w-3" />
                                  </button>

                                  <span>•</span>
                                  <span>{c.clause}</span>
                                </div>

                                <span className="font-mono">
                                  SHA: {c.sha256}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* COMPOSER */}
          <section className="relative overflow-hidden rounded-[26px] border border-white/90 bg-white/85 p-4 shadow-[0_22px_70px_rgba(73,55,94,0.12)] backdrop-blur-xl">

            <div className="pointer-events-none absolute -bottom-20 -right-16 h-48 w-48 rounded-full bg-[#F9A8D4]/25 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 -top-20 h-44 w-44 rounded-full bg-[#D9F99D]/35 blur-3xl" />

            <div className="relative">

              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    (e.metaKey || e.ctrlKey)
                  ) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Sovereign Black Ice about your knowledge base..."
                className="w-full resize-none rounded-2xl border border-[#E8E3EC] bg-[#FFFDFB]/90 p-4 text-sm leading-relaxed text-[#342D40] outline-none transition-all placeholder:text-[#B1AAB8] focus:border-[#C4B5FD] focus:ring-4 focus:ring-[#EDE9FE]/60"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">

                <div className="flex flex-wrap items-center gap-2">

                  <button
                    type="button"
                    onClick={() => {
                      addToast({
                        type: 'info',
                        title: 'Attach Document',
                        message:
                          'Choose a source document to constrain retrieval scope.',
                      });
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-[#E9E4DD] bg-white px-3 py-2 text-[11px] font-semibold text-[#756D82] transition-all hover:border-[#F9A8D4] hover:bg-[#FFF8FC]"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach source
                  </button>

                  <span className="text-[10px] text-[#938DA2]">
                    Scope:{' '}
                    <strong className="text-[#655E72]">
                      {activeScope}
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim() || isSubmitting}
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#A3E635] via-[#BEF264] to-[#F9A8D4] px-5 py-2.5 text-xs font-black text-[#29233D] shadow-[0_10px_25px_rgba(163,230,53,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_15px_35px_rgba(244,114,182,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>
                    {isSubmitting ? 'Retrieving...' : 'Ask Black Ice'}
                  </span>

                  <Send className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1EDF2] pt-3 text-[10px] text-[#938DA2]">

                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#65A30D]" />
                  Grounding verified against cryptographic baseline.
                </div>

                <span className="font-mono">
                  CTRL / ⌘ + ENTER
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT PANEL */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:col-span-4">

          {/* EVIDENCE */}
          <section className="overflow-hidden rounded-[24px] border border-white/90 bg-white/80 shadow-[0_18px_55px_rgba(73,55,94,0.10)] backdrop-blur-xl">

            <div className="bg-gradient-to-r from-[#F7FEE7] via-white to-[#FDF2F8] p-5">

              <div className="flex items-center justify-between border-b border-[#EDE8EF] pb-4">

                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D9F99D] bg-white">
                    <Shield className="h-4 w-4 text-[#65A30D]" />
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-[#342D40]">
                      Grounding Evidence
                    </h3>
                    <span className="text-[9px] text-[#938DA2]">
                      Cryptographically anchored
                    </span>
                  </div>
                </div>

                <span className="rounded-full border border-[#D9F99D] bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-[#4D7C0F]">
                  Verified
                </span>
              </div>

              <div className="mt-4 space-y-4 text-xs">

                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#AAA3B0]">
                    Source Document
                  </span>

                  <div className="mt-1 font-bold text-[#342D40]">
                    Employee Reimbursement Policy
                  </div>

                  <span className="font-mono text-[10px] text-[#7C3AED]">
                    DOC-7704
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">

                  <div className="rounded-xl border border-[#EEE9F0] bg-white/80 p-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#AAA3B0]">
                      Department
                    </span>
                    <div className="mt-1 font-semibold text-[#655E72]">
                      Human Resources
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#D9F99D] bg-[#F7FEE7] p-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#84A52A]">
                      Version
                    </span>
                    <div className="mt-1 font-mono font-bold text-[#4D7C0F]">
                      v2.0 Active
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#AAA3B0]">
                    Relevant Section
                  </span>

                  <div className="mt-1 font-bold text-[#453D52]">
                    Clause 4.2 — Expense Submission Window
                  </div>

                  <div className="font-mono text-[9px] text-[#AAA3B0]">
                    chunk-erp-42-v2 • vector dim 1536
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E9E4DD] bg-white p-3 shadow-sm">
                  <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-[#AAA3B0]">
                    Supporting Evidence
                  </span>

                  <div className="border-l-[3px] border-[#A3E635] pl-3 font-mono text-[11px] leading-relaxed text-[#655E72]">
                    Employees must submit reimbursement claims
                    within 15 days of the expense.
                  </div>
                </div>

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      navigate('/documents/DOC-7704')
                    }
                    className="flex-1 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] py-2 text-[11px] font-bold text-[#6D28D9] transition-colors hover:bg-[#EDE9FE]"
                  >
                    Open Document Details
                  </button>

                  <button
                    type="button"
                    title="Copy Excerpt"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        'Employees must submit reimbursement claims within 15 days of the expense.'
                      );

                      addToast({
                        type: 'success',
                        title: 'Copied',
                        message:
                          'Verbatim excerpt copied to clipboard.',
                      });
                    }}
                    className="rounded-xl border border-[#E9E4DD] bg-white p-2.5 text-[#756D82] hover:border-[#F9A8D4]"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* MUTATION */}
          <section className="rounded-[24px] border border-[#FDE68A]/80 bg-gradient-to-br from-white via-[#FFFBEB] to-[#FFF7ED] p-5 shadow-[0_18px_50px_rgba(245,158,11,0.08)]">

            <div className="flex items-center justify-between border-b border-[#FDE68A]/60 pb-3">

              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#D97706]" />

                <h3 className="text-sm font-black text-[#453D52]">
                  Claim Mutation
                </h3>
              </div>

              <span className="rounded-full bg-[#FEF3C7] px-2 py-1 font-mono text-[9px] font-bold text-[#B45309]">
                1 CHANGED
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-[#FDE68A] bg-white/80 p-4 text-xs">

              <div className="flex items-center justify-between">
                <span className="font-bold text-[#65A30D]">
                  Current Claim · v2.0
                </span>
                <span className="font-mono text-[#938DA2]">
                  15-day window
                </span>
              </div>

              <p className="mt-2 font-semibold text-[#453D52]">
                “Submission deadline is 15 days.”
              </p>

              <div className="my-3 border-t border-[#F1E7D0]" />

              <div className="flex items-center justify-between">
                <span className="font-bold text-[#DC2626]">
                  Previous Claim · v1.0
                </span>

                <span className="font-mono text-[#938DA2]">
                  30-day window
                </span>
              </div>

              <p className="mt-2 text-[#938DA2] line-through">
                “Submission deadline was 30 days.”
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className="font-bold text-[#D97706]">
                  Mutation: −50%
                </span>

                <span className="rounded-lg bg-[#FEF2F2] px-2 py-1 font-mono text-[9px] font-bold text-[#DC2626]">
                  3 ANSWERS FLAGGED
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/documents/DOC-7704/compare')
              }
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#FDE68A] bg-white py-2 text-[11px] font-bold text-[#B45309] transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              View Change in Diff Engine
              <ExternalLink className="h-3 w-3" />
            </button>
          </section>

          {/* SUGGESTIONS */}
          <section className="rounded-[24px] border border-white/90 bg-gradient-to-br from-white via-[#FDF2F8]/50 to-[#F5F3FF]/70 p-5 shadow-[0_16px_45px_rgba(73,55,94,0.08)]">

            <div className="mb-3 flex items-center gap-2">
              <WandSparkles className="h-4 w-4 text-[#DB2777]" />

              <span className="text-xs font-black text-[#453D52]">
                Explore this knowledge
              </span>
            </div>

            <div className="space-y-2">
              {[
                'What documents are required for reimbursement?',
                'Who approves reimbursement claims?',
                'Can a late claim be submitted?',
                'What are the exceptions to the 15-day limit?',
              ].map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(q)}
                  className="group flex w-full items-center justify-between rounded-xl border border-[#EDE8EF] bg-white/80 p-3 text-left text-[11px] font-medium text-[#655E72] transition-all hover:-translate-y-0.5 hover:border-[#F9A8D4] hover:bg-white hover:shadow-sm"
                >
                  <span>{q}</span>

                  <Plus className="h-3.5 w-3.5 shrink-0 text-[#C4B5FD] transition-colors group-hover:text-[#DB2777]" />
                </button>
              ))}
            </div>
          </section>

          {/* TRUST TELEMETRY */}
          <section className="relative overflow-hidden rounded-[24px] border border-[#D9F99D] bg-gradient-to-br from-[#F7FEE7] via-white to-[#FDF2F8] p-5 shadow-[0_18px_50px_rgba(163,230,53,0.10)]">

            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#F9A8D4]/25 blur-2xl" />

            <div className="relative">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#65A30D]" />

                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#655E72]">
                    Trust Telemetry
                  </span>
                </div>

                <span className="font-mono text-[10px] font-black text-[#65A30D]">
                  99.4% CONF
                </span>
              </div>

              <div className="mt-4 space-y-2 text-[10px]">

                <div className="flex justify-between rounded-xl bg-white/70 px-3 py-2">
                  <span className="text-[#938DA2]">
                    Hallucination Guardrail
                  </span>
                  <span className="font-mono font-bold text-[#65A30D]">
                    STRICT
                  </span>
                </div>

                <div className="flex justify-between rounded-xl bg-white/70 px-3 py-2">
                  <span className="text-[#938DA2]">
                    Integrity Verification
                  </span>
                  <span className="font-mono font-bold text-[#7C3AED]">
                    ACTIVE
                  </span>
                </div>

                <div className="flex justify-between rounded-xl bg-white/70 px-3 py-2">
                  <span className="text-[#938DA2]">
                    Source Provenance
                  </span>
                  <span className="font-mono font-bold text-[#DB2777]">
                    TRACEABLE
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white bg-white/60 p-3 text-[9px] leading-relaxed text-[#756D82]">
                <strong className="text-[#453D52]">
                  Sovereign rule:
                </strong>{' '}
                unsupported claims are suppressed instead of being
                presented as verified knowledge.
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};