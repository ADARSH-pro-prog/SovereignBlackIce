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
    <div className="relative pb-20 text-ink">

      {/* DREAMY BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-panel">
        <div className="absolute -top-32 left-[18%] h-[520px] w-[520px] rounded-full bg-raised hidden" />
        <div className="absolute top-[18%] right-[-80px] h-[500px] w-[500px] rounded-full bg-raised hidden" />
        <div className="absolute bottom-[-180px] left-[35%] h-[600px] w-[600px] rounded-full bg-raised hidden" />
        <div className="absolute top-[48%] left-[-180px] h-[440px] w-[440px] rounded-full bg-raised hidden" />
      </div>

      {/* HERO */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="display text-[44px] leading-none text-ink">Knowledge assistant</h1>
          <p className="mt-3 max-w-2xl text-[15px] text-ink-2">
            Every answer cites the passage, version and hash it came from, and says so when that source has changed.
          </p>
        </div>
        <button type="button" onClick={() => setMessages([])} className="btn btn-ghost self-start lg:self-auto">
          Clear conversation
        </button>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">

        {/* LEFT */}
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-8">

          {/* SCOPE */}
          <section className="rounded-[10px] border border-line bg-panel p-4 ">

            <div className="flex flex-wrap items-center justify-between gap-4">

              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-bold text-muted">
                  Knowledge Scope
                </span>

                {scopes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setActiveScope(s)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      activeScope === s
                        ? 'border border-line-strong bg-raised text-ice shadow-sm'
                        : 'border border-line bg-panel text-muted hover:border-line-strong hover:bg-raised'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <label className="flex cursor-pointer select-none items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-xs text-muted">
                <LockKeyhole className="h-3.5 w-3.5 text-ice" />
                <span>Current versions only</span>

                <input
                  type="checkbox"
                  checked={useCurrentOnly}
                  onChange={(e) => setUseCurrentOnly(e.target.checked)}
                  className="h-4 w-4 accent-ice"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">

              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-ice" />
                <span>
                  Index synchronized • Cryptographic grounding active
                </span>
              </div>

              {isLiveMode ? (
                <span className="flex items-center gap-1.5 font-mono font-bold text-ice">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ice" />
                  FASTAPI RAG LIVE
                </span>
              ) : (
                <span className="rounded-full bg-amber/[0.07] px-2 py-1 font-mono font-bold text-amber">
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
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold shadow-sm ${
                    msg.sender === 'user'
                      ? 'border border-line-strong bg-raised text-ice'
                      : 'border border-line-strong bg-raised text-ice'
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

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-bold text-ink-2">
                      {msg.sender === 'user'
                        ? 'S. Vance (CISO)'
                        : 'Sovereign Black Ice'}
                    </span>

                    {msg.sender === 'assistant' && (
                      <span className="flex items-center gap-1 font-semibold text-ice">
                        <CheckCircle className="h-3 w-3" />
                        Grounded in Document
                      </span>
                    )}

                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {msg.sender === 'user' ? (

                    <div className="rounded-[10px] rounded-tr-md border border-line-strong bg-raised px-5 py-3.5 text-sm font-medium text-ink-2 ">
                      {msg.content}
                    </div>

                  ) : (

                    <div className="flex flex-col gap-4 rounded-[10px] rounded-tl-md border border-line bg-panel p-5 text-sm leading-7 text-ink-2 ">

                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-6 w-1 rounded-full bg-ice " />
                        <p className="font-medium">{msg.content}</p>
                      </div>

                      {/* WARNING */}
                      {msg.temporalWarning && (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber/30 bg-amber/[0.07] p-4">

                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />

                          <div className="flex-1 text-xs">
                            <span className="block font-bold text-amber">
                              {msg.temporalWarning.message}
                            </span>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-red line-through">
                                {msg.temporalWarning.previousClaim}
                              </span>

                              <ArrowRight className="h-3 w-3 text-muted" />

                              <span className="font-bold text-ice">
                                {msg.temporalWarning.currentClaim}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              navigate('/dashboard/documents/DOC-7704/compare')
                            }
                            className="rounded-xl border border-amber/30 bg-panel px-3 py-1.5 text-xs font-bold text-amber shadow-sm hover:bg-amber/[0.07]"
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
                              className="rounded-2xl border border-line bg-panel p-4"
                            >

                              <div className="flex flex-wrap items-center justify-between gap-2">

                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-raised">
                                    <FileText className="h-4 w-4 text-ice" />
                                  </div>

                                  <span className="text-xs font-bold text-ink">
                                    {c.documentTitle}
                                  </span>

                                  <span className="rounded-lg border border-line-strong bg-raised px-2 py-0.5 font-mono text-xs font-bold text-ice">
                                    {c.version}
                                  </span>
                                </div>

                                <span className="rounded-full border border-line-strong bg-raised px-2.5 py-1 font-mono text-xs font-bold text-ice">
                                  {c.isCurrentVersion
                                    ? '✓ CURRENT SOURCE'
                                    : 'ARCHIVED VERSION'}
                                </span>
                              </div>

                              <div className="mt-3 rounded-xl border-l-[3px] border-ice bg-panel px-4 py-3 font-mono text-xs leading-relaxed text-ink-2 shadow-sm">
                                “{c.excerpt}”
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/dashboard/documents/${c.documentId}`
                                      )
                                    }
                                    className="flex items-center gap-1 font-bold text-ice hover:text-ice"
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
          <section className="relative overflow-hidden rounded-[10px] border border-line bg-panel p-4 ">

            <div className="pointer-events-none absolute -bottom-20 -right-16 h-48 w-48 rounded-full bg-raised hidden" />
            <div className="pointer-events-none absolute -left-12 -top-20 h-44 w-44 rounded-full bg-raised hidden" />

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
                className="w-full resize-none rounded-2xl border border-line bg-panel p-4 text-sm leading-relaxed text-ink outline-none transition-all placeholder:text-ink-2 focus:border-line-strong focus:ring-4 focus:ring-line-strong"
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
                    className="flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-2 text-xs font-semibold text-muted transition-all hover:border-line-strong hover:bg-raised"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach source
                  </button>

                  <span className="text-xs text-muted">
                    Scope:{' '}
                    <strong className="text-ink-2">
                      {activeScope}
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim() || isSubmitting}
                  className="group flex items-center gap-2 rounded-xl bg-ice px-5 py-2.5 text-xs font-semibold text-void transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>
                    {isSubmitting ? 'Retrieving...' : 'Ask Black Ice'}
                  </span>

                  <Send className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">

                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-ice" />
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
          <section className="overflow-hidden rounded-[10px] border border-line bg-panel ">

            <div className=" bg-raised p-5">

              <div className="flex items-center justify-between border-b border-line pb-4">

                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-line-strong bg-panel">
                    <Shield className="h-4 w-4 text-ice" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Grounding Evidence
                    </h3>
                    <span className="text-xs text-muted">
                      Cryptographically anchored
                    </span>
                  </div>
                </div>

                <span className="rounded-full border border-line-strong bg-panel px-2.5 py-1 text-xs font-semibold text-ice">
                  Verified
                </span>
              </div>

              <div className="mt-4 space-y-4 text-xs">

                <div>
                  <span className="text-xs font-bold text-ink-2">
                    Source Document
                  </span>

                  <div className="mt-1 font-bold text-ink">
                    Employee Reimbursement Policy
                  </div>

                  <span className="font-mono text-xs text-ice">
                    DOC-7704
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">

                  <div className="rounded-xl border border-line bg-panel p-3">
                    <span className="text-xs font-bold text-ink-2">
                      Department
                    </span>
                    <div className="mt-1 font-semibold text-ink-2">
                      Human Resources
                    </div>
                  </div>

                  <div className="rounded-xl border border-line-strong bg-raised p-3">
                    <span className="text-xs font-bold text-ice">
                      Version
                    </span>
                    <div className="mt-1 font-mono font-bold text-ice">
                      v2.0 Active
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-ink-2">
                    Relevant Section
                  </span>

                  <div className="mt-1 font-bold text-ink-2">
                    Clause 4.2 — Expense Submission Window
                  </div>

                  <div className="font-mono text-xs text-ink-2">
                    chunk-erp-42-v2 • vector dim 1536
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-panel p-3 shadow-sm">
                  <span className="mb-2 block text-xs font-bold text-ink-2">
                    Supporting Evidence
                  </span>

                  <div className="border-l-[3px] border-ice pl-3 font-mono text-xs leading-relaxed text-ink-2">
                    Employees must submit reimbursement claims
                    within 15 days of the expense.
                  </div>
                </div>

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      navigate('/dashboard/documents/DOC-7704')
                    }
                    className="flex-1 rounded-xl border border-line-strong bg-raised py-2 text-xs font-bold text-ice transition-colors hover:bg-raised"
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
                    className="rounded-xl border border-line bg-panel p-2.5 text-muted hover:border-line-strong"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* MUTATION */}
          <section className="rounded-[10px] border border-amber/30 bg-panel p-5 ">

            <div className="flex items-center justify-between border-b border-amber/30 pb-3">

              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber" />

                <h3 className="text-sm font-semibold text-ink-2">
                  Claim Mutation
                </h3>
              </div>

              <span className="rounded-full bg-amber/[0.07] px-2 py-1 font-mono text-xs font-bold text-amber">
                1 CHANGED
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-amber/30 bg-panel p-4 text-xs">

              <div className="flex items-center justify-between">
                <span className="font-bold text-ice">
                  Current Claim · v2.0
                </span>
                <span className="font-mono text-muted">
                  15-day window
                </span>
              </div>

              <p className="mt-2 font-semibold text-ink-2">
                “Submission deadline is 15 days.”
              </p>

              <div className="my-3 border-t border-amber/30" />

              <div className="flex items-center justify-between">
                <span className="font-bold text-red">
                  Previous Claim · v1.0
                </span>

                <span className="font-mono text-muted">
                  30-day window
                </span>
              </div>

              <p className="mt-2 text-muted line-through">
                “Submission deadline was 30 days.”
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className="font-bold text-amber">
                  Mutation: −50%
                </span>

                <span className="rounded-lg bg-red/[0.07] px-2 py-1 font-mono text-xs font-bold text-red">
                  3 ANSWERS FLAGGED
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/dashboard/documents/DOC-7704/compare')
              }
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber/30 bg-panel py-2 text-xs font-bold text-amber transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              View Change in Diff Engine
              <ExternalLink className="h-3 w-3" />
            </button>
          </section>

          {/* SUGGESTIONS */}
          <section className="rounded-[10px] border border-line bg-panel p-5 ">

            <div className="mb-3 flex items-center gap-2">
              <WandSparkles className="h-4 w-4 text-ice" />

              <span className="text-xs font-semibold text-ink-2">
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
                  className="group flex w-full items-center justify-between rounded-xl border border-line bg-panel p-3 text-left text-xs font-medium text-ink-2 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:bg-raised hover:shadow-sm"
                >
                  <span>{q}</span>

                  <Plus className="h-3.5 w-3.5 shrink-0 text-ice transition-colors group-hover:text-ice" />
                </button>
              ))}
            </div>
          </section>

          {/* HOW ANSWERS ARE GROUNDED */}
          <section className="rounded-[10px] border border-line p-5 text-sm leading-relaxed text-ink-2">
            <div className="flex items-center gap-2 text-ink">
              <Database className="h-4 w-4 text-ice" /> How answers are grounded
            </div>
            <p className="mt-2">
              Unsupported claims are suppressed instead of being presented as verified knowledge. Answers built on a
              changed source carry a warning and a link to the diff.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};