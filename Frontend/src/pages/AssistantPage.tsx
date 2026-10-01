import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw,
  MessageSquare,
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

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeScope, setActiveScope] = useState('All Monitored Documents');
  const [useCurrentOnly, setUseCurrentOnly] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);

  // Scopes derived dynamically from active backend documents
  const scopes = useMemo(() => {
    return [
      'All Monitored Documents',
      ...Array.from(new Set(documents.map((d) => d.title))),
    ].slice(0, 6);
  }, [documents]);

  // Load real historical QA answers on mount in Live Mode, or demo messages in Demo Mode
  useEffect(() => {
    if (isLiveMode) {
      if (backendStatus.isConnected) {
        apiService
          .getHistoricalAnswers()
          .then((answers) => {
            if (answers && answers.length > 0) {
              const loadedMsgs: AssistantMessage[] = [];
              answers.forEach((ans) => {
                const dateStr = new Date(ans.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                loadedMsgs.push({
                  id: `user-${ans.id}`,
                  sender: 'user',
                  timestamp: dateStr,
                  content: ans.question,
                });
                loadedMsgs.push({
                  id: ans.id,
                  sender: 'assistant',
                  timestamp: dateStr,
                  content: ans.generated_answer,
                  citations: (ans.evidence_items || []).map((ev) => ({
                    documentId: ev.document_id,
                    documentTitle: ev.document_name || 'Monitored Policy',
                    version: ev.version_number ? `v${ev.version_number}.0` : 'v1.0',
                    clause: ev.claim_id
                      ? `Rule Claim #${ev.claim_id.slice(0, 8)}`
                      : `Passage Chunk #${ev.chunk_id?.slice(0, 8) || '1'}`,
                    chunkId: ev.chunk_id || 'chunk-1',
                    sha256: ev.id.slice(0, 16),
                    excerpt: ev.citation_text || 'Verified grounded passage excerpt.',
                    isCurrentVersion: ans.status === 'current',
                  })),
                  temporalWarning:
                    ans.status === 'potentially_outdated'
                      ? {
                          message:
                            ans.review_notes ||
                            'This answer cites an earlier document version that has been superseded by newer policy rules.',
                          previousVersion: 'v1.0',
                          previousClaim: 'Original Policy Rule',
                          currentVersion: 'v2.0',
                          currentClaim: 'Updated Policy Rule',
                        }
                      : undefined,
                });
              });
              setMessages(loadedMsgs);
            } else {
              setMessages([]);
            }
          })
          .catch((err) => {
            console.warn('Could not load historical QA answers:', err);
            setMessages([]);
          });
      } else {
        setMessages([]);
      }
    } else {
      setMessages(INITIAL_ASSISTANT_MESSAGES);
    }
  }, [isLiveMode, backendStatus.isConnected]);

  // Active evidence to display in the right grounding panel
  const activeMessage = useMemo(() => {
    if (selectedMsgId) {
      return messages.find((m) => m.id === selectedMsgId && m.sender === 'assistant');
    }
    // Default to the latest assistant message with citations
    return [...messages]
      .reverse()
      .find((m) => m.sender === 'assistant' && m.citations && m.citations.length > 0);
  }, [messages, selectedMsgId]);

  const activeCitation = useMemo(() => {
    if (!activeMessage?.citations || activeMessage.citations.length === 0) return null;
    return activeMessage.citations[0];
  }, [activeMessage]);

  const handleSend = async () => {
    if (!inputText.trim() || isSubmitting) return;

    const userText = inputText.trim();
    setInputText('');

    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: timeStr,
      content: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSubmitting(true);

    if (isLiveMode) {
      if (!backendStatus.isConnected) {
        addToast({
          type: 'error',
          title: 'Backend Offline',
          message: `FastAPI backend is currently offline at ${backendStatus.baseUrl}. Start server: uvicorn app.main:app --port 8000`,
        });

        const botMsg: AssistantMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          timestamp: timeStr,
          content: `Unable to query knowledge base: FastAPI backend is currently unreachable at ${backendStatus.baseUrl}. Please verify the server is running on port 8000.`,
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
          id: res.answerId || `bot-${Date.now()}`,
          sender: 'assistant',
          timestamp: timeStr,
          content: res.answer,
          citations: res.citations,
          temporalWarning: res.temporalWarning,
        };

        setMessages((prev) => [...prev, botMsg]);
        setSelectedMsgId(botMsg.id);

        if (res.citations && res.citations.length > 0) {
          addToast({
            type: 'success',
            title: 'Answer Grounded',
            message: `Synthesized with ${res.citations.length} evidence citation(s).`,
          });
        } else {
          addToast({
            type: 'info',
            title: 'No Direct Grounding Evidence',
            message: 'No evidence chunks exceeded similarity threshold for this query.',
          });
        }
      } catch (err: unknown) {
        const errMsg =
          err instanceof Error ? err.message : 'QA Generation failed';

        addToast({
          type: 'error',
          title: 'QA Generation Failed',
          message: errMsg,
        });

        const botMsg: AssistantMessage = {
          id: `bot-err-${Date.now()}`,
          sender: 'assistant',
          timestamp: timeStr,
          content: `Backend QA service reported an error: ${errMsg}`,
        };

        setMessages((prev) => [...prev, botMsg]);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Demo mode simulated response
    setTimeout(() => {
      let content =
        'According to the active institutional documents, non-travel business expenditure submissions must be finalized within 15 calendar days of incurring the expense (Clause §4.2). Manager and C-level approvals are required for any post-window exceptions.';

      let citations: AssistantMessage['citations'] = [
        {
          documentId: documents[0]?.id || 'DOC-DEMO',
          documentTitle: documents[0]?.title || 'Employee Reimbursement Policy',
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
          'Per Data Retention Policy (effective September 2026), customer telemetry and event logs are strictly retained for a maximum of 90 calendar days before automated purge cycles.';

        citations = [
          {
            documentId: documents[1]?.id || 'DOC-RET',
            documentTitle: documents[1]?.title || 'Data Retention Policy',
            version: 'v1.0 (Active)',
            clause: '§ 3.2 Telemetry Retention Window',
            chunkId: 'chunk-ret-32-v1',
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
        timestamp: timeStr,
        content,
        citations,
      };

      setMessages((prev) => [...prev, botMsg]);
      setSelectedMsgId(botMsg.id);
      setIsSubmitting(false);
    }, 800);
  };

  // Suggestions for exploratory queries
  const suggestions = useMemo(() => {
    if (documents.length > 0) {
      const firstDocTitle = documents[0].title;
      return [
        `How many days does an employee have to submit a reimbursement claim?`,
        `What are the daily meal allowances in ${firstDocTitle}?`,
        `What are the record retention requirements?`,
        `Are post-deadline exceptions permitted with manager justification?`,
      ];
    }
    return [
      'How many days does an employee have to submit a travel reimbursement claim?',
      'What are the maximum per diem limits?',
      'What are the mandatory audit record retention periods?',
      'What approval level is required for late submissions?',
    ];
  }, [documents]);

  return (
    <div className="relative pb-20 text-ink">
      {/* HEADER */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs text-muted font-mono">
            <span>Governance</span>
            <span>/</span>
            <span className="text-ice">Knowledge Assistant</span>
          </div>
          <h1 className="display text-[36px] md:text-[44px] leading-none text-ink">
            Knowledge Assistant
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] text-muted">
            Strict local RAG grounding. Every response cites the verbatim passage, version, and page number it came from.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setMessages([])}
            className="btn btn-ghost text-xs"
          >
            Clear conversation
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: CHAT & COMPOSER */}
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-8">
          {/* SCOPE SELECTOR */}
          <section className="rounded-[10px] border border-line bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-bold text-muted">
                  Knowledge Scope:
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
                  className="h-4 w-4 accent-ice cursor-pointer"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-ice" />
                <span>
                  {documents.length} document(s) in repository • Strict citation grounding active
                </span>
              </div>

              {isLiveMode ? (
                <span className="flex items-center gap-1.5 font-mono font-bold text-ice">
                  <span className={`h-1.5 w-1.5 rounded-full ${backendStatus.isConnected ? 'bg-ice animate-pulse' : 'bg-red'}`} />
                  {backendStatus.isConnected ? 'FASTAPI RAG LIVE' : 'BACKEND OFFLINE'}
                </span>
              ) : (
                <span className="rounded-full bg-amber/[0.07] px-2 py-0.5 font-mono font-bold text-amber">
                  DEMO DATA ACTIVE
                </span>
              )}
            </div>
          </section>

          {/* CHAT MESSAGES */}
          <div className="flex flex-col gap-6">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-line bg-panel p-8 text-center flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-raised border border-line-strong flex items-center justify-center text-ice">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">Ready for Grounded Inquiries</h3>
                  <p className="text-xs text-muted max-w-md mt-1">
                    Ask questions against your indexed institutional policies. Sovereign Black Ice searches local ChromaDB vectors and cites exact document passages.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => msg.sender === 'assistant' && setSelectedMsgId(msg.id)}
                  className={`flex gap-3.5 cursor-pointer transition-all ${
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
                        : selectedMsgId === msg.id
                          ? 'border border-ice bg-ice text-void'
                          : 'border border-line-strong bg-raised text-ice'
                    }`}
                  >
                    {msg.sender === 'user' ? 'ME' : <Shield className="h-4 w-4" />}
                  </div>

                  <div
                    className={`flex flex-col gap-2 ${
                      msg.sender === 'user' ? 'items-end' : 'flex-1'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="font-bold text-ink-2">
                        {msg.sender === 'user' ? 'Operator' : 'Sovereign Black Ice'}
                      </span>

                      {msg.sender === 'assistant' && (
                        <span className="flex items-center gap-1 font-semibold text-ice">
                          <CheckCircle className="h-3 w-3" />
                          Grounded Response
                        </span>
                      )}

                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {msg.sender === 'user' ? (
                      <div className="rounded-[10px] rounded-tr-md border border-line-strong bg-raised px-5 py-3.5 text-sm font-medium text-ink-2">
                        {msg.content}
                      </div>
                    ) : (
                      <div className={`flex flex-col gap-4 rounded-[10px] rounded-tl-md border bg-panel p-5 text-sm leading-7 text-ink-2 transition-all ${
                        selectedMsgId === msg.id ? 'border-ice shadow-sm' : 'border-line'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-6 w-1 rounded-full bg-ice shrink-0" />
                          <p className="font-medium text-ink leading-relaxed">{msg.content}</p>
                        </div>

                        {/* TEMPORAL WARNING */}
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
                            {msg.citations && msg.citations[0] && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/dashboard/documents/${msg.citations![0].documentId}/compare`);
                                }}
                                className="rounded-xl border border-amber/30 bg-panel px-3 py-1.5 text-xs font-bold text-amber shadow-sm hover:bg-amber/[0.07]"
                              >
                                View Diff
                              </button>
                            )}
                          </div>
                        )}

                        {/* CITATIONS CHIPS */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="space-y-3 pt-1 border-t border-line">
                            <div className="text-xs font-semibold text-muted flex items-center justify-between">
                              <span>Verified Citations ({msg.citations.length})</span>
                              <span className="text-[11px] text-ice">Click answer to inspect evidence →</span>
                            </div>

                            {msg.citations.map((c, i) => (
                              <div
                                key={i}
                                className="rounded-xl border border-line bg-raised/50 p-3.5 space-y-2"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-panel border border-line-strong">
                                      <FileText className="h-3.5 w-3.5 text-ice" />
                                    </div>
                                    <span className="text-xs font-bold text-ink">
                                      {c.documentTitle}
                                    </span>
                                    <span className="rounded bg-raised-2 px-2 py-0.5 font-mono text-[11px] font-bold text-ice border border-line-strong">
                                      {c.version}
                                    </span>
                                  </div>

                                  <span className="rounded-full border border-line-strong bg-panel px-2.5 py-0.5 font-mono text-[10px] font-bold text-ice">
                                    {c.isCurrentVersion ? '✓ CURRENT SOURCE' : 'ARCHIVED VERSION'}
                                  </span>
                                </div>

                                <div className="rounded-lg border-l-[3px] border-ice bg-panel px-3.5 py-2 font-mono text-xs leading-relaxed text-ink shadow-sm">
                                  “{c.excerpt}”
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted pt-1">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/dashboard/documents/${c.documentId}`);
                                      }}
                                      className="flex items-center gap-1 font-bold text-ice hover:underline"
                                    >
                                      View Source ({c.documentId.slice(0, 8)}...)
                                      <ExternalLink className="h-3 w-3" />
                                    </button>
                                    <span>•</span>
                                    <span>{c.clause}</span>
                                  </div>
                                  <span className="font-mono text-[10px]">
                                    Evidence ID: {c.sha256}
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
              ))
            )}

            {/* PROCESSING INDICATOR */}
            {isSubmitting && (
              <div className="flex gap-3.5 items-start">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-line-strong bg-raised text-ice">
                  <RefreshCw className="h-4 w-4 animate-spin text-ice" />
                </div>
                <div className="rounded-xl border border-line bg-panel p-4 text-xs text-muted flex items-center gap-3">
                  <span className="font-semibold text-ink">Retrieving ChromaDB vectors & generating grounded answer...</span>
                </div>
              </div>
            )}
          </div>

          {/* COMPOSER */}
          <section className="relative overflow-hidden rounded-[10px] border border-line bg-panel p-4">
            <div className="relative">
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Sovereign Black Ice about your knowledge base (e.g. 'How many days does an employee have to submit a reimbursement claim?')..."
                className="w-full resize-none rounded-2xl border border-line bg-panel p-4 text-sm leading-relaxed text-ink outline-none transition-all placeholder:text-muted focus:border-line-strong focus:ring-2 focus:ring-ice/20 disabled:opacity-50"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (documents.length > 0) {
                        const nextDoc = documents.find((d) => d.title !== activeScope);
                        if (nextDoc) setActiveScope(nextDoc.title);
                        else setActiveScope('All Monitored Documents');
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-2 text-xs font-semibold text-muted transition-all hover:border-line-strong hover:bg-raised"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach source
                  </button>

                  <span className="text-xs text-muted">
                    Scope: <strong className="text-ink">{activeScope}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim() || isSubmitting}
                  className="group flex items-center gap-2 rounded-xl bg-ice px-5 py-2.5 text-xs font-semibold text-void transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Retrieving...</span>
                    </>
                  ) : (
                    <>
                      <span>Ask Black Ice</span>
                      <Send className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-ice" />
                  Grounding verified against cryptographic baseline.
                </div>
                <span className="font-mono text-[11px]">CTRL / ⌘ + ENTER to submit</span>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: GROUNDING EVIDENCE & PROMPTS */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:col-span-4">
          {/* EVIDENCE SIDEBAR CARD */}
          <section className="overflow-hidden rounded-[10px] border border-line bg-panel">
            <div className="bg-raised p-5">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-line-strong bg-panel">
                    <Shield className="h-4 w-4 text-ice" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Grounding Evidence</h3>
                    <span className="text-xs text-muted">Cryptographically anchored</span>
                  </div>
                </div>

                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  activeCitation
                    ? 'border-line-strong bg-panel text-ice'
                    : 'border-line bg-panel text-muted'
                }`}>
                  {activeCitation ? 'Verified' : 'Standby'}
                </span>
              </div>

              {activeCitation ? (
                <div className="mt-4 space-y-4 text-xs">
                  <div>
                    <span className="text-xs font-bold text-muted block">Source Document</span>
                    <div className="mt-1 font-bold text-ink text-sm">
                      {activeCitation.documentTitle}
                    </div>
                    <span className="font-mono text-xs text-ice">
                      {activeCitation.documentId}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-line bg-panel p-3">
                      <span className="text-xs font-bold text-muted block">Provenance</span>
                      <div className="mt-1 font-semibold text-ink truncate">
                        Local Database
                      </div>
                    </div>

                    <div className="rounded-xl border border-line-strong bg-raised p-3">
                      <span className="text-xs font-bold text-ice block">Version</span>
                      <div className="mt-1 font-mono font-bold text-ice truncate">
                        {activeCitation.version}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-muted block">Relevant Section</span>
                    <div className="mt-1 font-semibold text-ink">
                      {activeCitation.clause}
                    </div>
                    <div className="font-mono text-[11px] text-muted truncate">
                      {activeCitation.chunkId}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line bg-panel p-3 shadow-sm">
                    <span className="mb-2 block text-xs font-bold text-muted">Supporting Evidence</span>
                    <div className="border-l-[3px] border-ice pl-3 font-mono text-xs leading-relaxed text-ink">
                      “{activeCitation.excerpt}”
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/documents/${activeCitation.documentId}`)}
                      className="flex-1 rounded-xl border border-line-strong bg-panel hover:bg-raised py-2 text-xs font-bold text-ice transition-colors"
                    >
                      Open Document Details
                    </button>

                    <button
                      type="button"
                      title="Copy Excerpt"
                      onClick={() => {
                        navigator.clipboard.writeText(activeCitation.excerpt);
                        addToast({
                          type: 'success',
                          title: 'Copied',
                          message: 'Verbatim excerpt copied to clipboard.',
                        });
                      }}
                      className="rounded-xl border border-line bg-panel p-2.5 text-muted hover:border-line-strong hover:text-ink transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted flex flex-col items-center justify-center gap-2">
                  <Database className="h-6 w-6 text-muted" />
                  <p className="font-medium text-ink">No Citation Active</p>
                  <p className="max-w-[220px]">
                    Submit a query to inspect the grounded evidence chunks and vector similarities.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* CLAIM MUTATION CARD (IF OUTDATED / SUPERSERDED) */}
          {activeMessage?.temporalWarning && activeCitation && (
            <section className="rounded-[10px] border border-amber/30 bg-panel p-5">
              <div className="flex items-center justify-between border-b border-amber/30 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber" />
                  <h3 className="text-sm font-semibold text-ink">Claim Mutation Warning</h3>
                </div>
                <span className="rounded-full bg-amber/[0.07] px-2 py-0.5 font-mono text-xs font-bold text-amber">
                  DRIFT DETECTED
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-amber/30 bg-panel p-4 text-xs space-y-3">
                <div>
                  <span className="font-bold text-ice block">Active Policy Rule:</span>
                  <p className="mt-1 font-semibold text-ink">
                    “{activeMessage.temporalWarning.currentClaim}”
                  </p>
                </div>

                <div className="border-t border-amber/20 pt-2">
                  <span className="font-bold text-red block">Superseded Baseline:</span>
                  <p className="mt-1 text-muted line-through">
                    “{activeMessage.temporalWarning.previousClaim}”
                  </p>
                </div>

                <p className="text-[11px] text-muted italic">
                  {activeMessage.temporalWarning.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/dashboard/documents/${activeCitation.documentId}/compare`)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber/30 bg-panel py-2 text-xs font-bold text-amber transition-all hover:bg-amber/10"
              >
                <span>View Change in Diff Engine</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </section>
          )}

          {/* EXPLORE SUGGESTIONS */}
          <section className="rounded-[10px] border border-line bg-panel p-5">
            <div className="mb-3 flex items-center gap-2">
              <WandSparkles className="h-4 w-4 text-ice" />
              <span className="text-xs font-semibold text-ink">
                Suggested Inquiries
              </span>
            </div>

            <div className="space-y-2">
              {suggestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(q)}
                  disabled={isSubmitting}
                  className="group flex w-full items-center justify-between rounded-xl border border-line bg-panel p-3 text-left text-xs font-medium text-ink transition-all hover:border-line-strong hover:bg-raised"
                >
                  <span className="pr-2">{q}</span>
                  <Plus className="h-3.5 w-3.5 shrink-0 text-ice transition-colors group-hover:text-ice" />
                </button>
              ))}
            </div>
          </section>

          {/* GROUNDING EXPLANATION */}
          <section className="rounded-[10px] border border-line p-5 text-sm leading-relaxed text-muted">
            <div className="flex items-center gap-2 text-ink font-semibold">
              <Database className="h-4 w-4 text-ice" /> How answers are grounded
            </div>
            <p className="mt-2 text-xs leading-relaxed">
              Unsupported claims are suppressed. Answers built on superseded document versions carry a temporal warning and a direct link to the semantic version diff.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};