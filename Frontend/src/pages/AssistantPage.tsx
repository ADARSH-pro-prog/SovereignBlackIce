import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  History,
  FileText,
  ExternalLink,
  Copy,
  FolderOpen,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
  GitCompare,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { INITIAL_ASSISTANT_MESSAGES } from '../data/demoData';
import { AssistantMessage } from '../types';
import { apiService } from '../services/api';

export const AssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLiveMode, backendStatus, documents, addToast } = useApp();

  const [messages, setMessages] = useState<AssistantMessage[]>(INITIAL_ASSISTANT_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [activeScope, setActiveScope] = useState('All Monitored Documents');
  const [useCurrentOnly, setUseCurrentOnly] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic scopes from actual documents
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
          message: 'FastAPI backend is disconnected. Check connection in Settings.',
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
        const errMsg = err instanceof Error ? err.message : 'QA Generation failed';
        addToast({ type: 'error', title: 'QA Error', message: errMsg });
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

    // Grounded mock answer based on prompt
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

      if (userText.toLowerCase().includes('retention') || userText.toLowerCase().includes('data')) {
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 pb-16">
      {/* Page Header & Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-[#263247] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
              Knowledge Assistant
            </h1>
            <span className="px-2 py-0.5 rounded bg-[#1E293B] text-[#3B82F6] text-xs font-mono font-medium border border-[#263247]">
              SOV-AI RAG
            </span>
          </div>
          <p className="text-sm text-[#94A3B8] mt-1">
            Ask questions about monitored documents and inspect the evidence behind every answer.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#263247] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
            <span className="font-mono text-[#94A3B8] uppercase">
              Grounded RAG v2.4 • 128 Monitored Docs
            </span>
          </div>

          <button
            onClick={() => setMessages([])}
            className="h-8 px-3 rounded-lg bg-[#1E293B] hover:bg-[#263247] text-xs text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263247] transition-colors"
          >
            Clear conversation
          </button>
        </div>
      </div>

      {/* Two-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Chat Stream & Composer */}
        <div className="lg:col-span-8 flex flex-col gap-5 min-w-0">
          {/* Scope Toolbar */}
          <div className="p-4 rounded-xl bg-[#111827] border border-[#263247] flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-[#64748B] mr-1">
                  Scope:
                </span>
                {scopes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setActiveScope(s)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      activeScope === s
                        ? 'bg-[#3B82F6] text-white shadow-sm'
                        : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Version toggle */}
              <label className="flex items-center gap-2 text-xs text-[#94A3B8] cursor-pointer select-none">
                <span>Use only current document versions</span>
                <input
                  type="checkbox"
                  checked={useCurrentOnly}
                  onChange={(e) => setUseCurrentOnly(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1E293B] text-[#3B82F6] focus:ring-0 focus:ring-offset-0"
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1A2438] text-[11px] text-[#64748B]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#14B8A6]" />
                <span>Index sync: 4m ago • Zero hallucination threshold active</span>
              </div>
              {isLiveMode ? (
                <span className="font-mono text-[#14B8A6] flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
                  [FASTAPI RAG LIVE]
                </span>
              ) : (
                <span className="font-mono text-[#F59E0B]">[DEMO DATA ACTIVE]</span>
              )}
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex flex-col gap-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${
                  msg.sender === 'user'
                    ? 'max-w-[85%] self-end flex-row-reverse'
                    : 'max-w-full'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    msg.sender === 'user'
                      ? 'bg-[#1E293B] text-[#3B82F6] border border-[#263247]'
                      : 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30'
                  }`}
                >
                  {msg.sender === 'user' ? 'SV' : <Shield className="w-4 h-4" />}
                </div>

                {/* Content Box */}
                <div
                  className={`flex flex-col gap-2 ${
                    msg.sender === 'user' ? 'items-end' : 'flex-1'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                    <span className="font-semibold text-[#94A3B8]">
                      {msg.sender === 'user' ? 'S. Vance (CISO)' : 'Sovereign Black Ice'}
                    </span>
                    <span>•</span>
                    {msg.sender === 'assistant' && (
                      <span className="text-[#14B8A6] flex items-center gap-1 font-medium">
                        <CheckCircle className="w-3 h-3" /> Grounded in Document
                      </span>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>

                  {msg.sender === 'user' ? (
                    <div className="p-3.5 rounded-2xl rounded-tr-none bg-[#1E293B] border border-[#263247] text-sm text-[#F8FAFC]">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl rounded-tl-none bg-[#111827] border border-[#263247] flex flex-col gap-4 text-sm leading-relaxed text-[#F8FAFC] shadow-sm">
                      <p>{msg.content}</p>

                      {/* Temporal Warning if present */}
                      {msg.temporalWarning && (
                        <div className="p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                          <div className="flex-1 text-xs">
                            <span className="font-semibold text-[#F8FAFC] block mb-0.5">
                              {msg.temporalWarning.message}
                            </span>
                            <div className="flex items-center gap-3 mt-2 text-[11px]">
                              <span className="text-[#EF4444] line-through">
                                {msg.temporalWarning.previousClaim}
                              </span>
                              <ArrowRight className="w-3 h-3 text-[#64748B]" />
                              <span className="text-[#14B8A6] font-semibold">
                                {msg.temporalWarning.currentClaim}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate('/documents/DOC-7704/compare')}
                            className="px-2.5 py-1 rounded bg-[#1E293B] border border-[#F59E0B]/40 text-xs text-[#F8FAFC] hover:bg-[#F59E0B]/20 whitespace-nowrap"
                          >
                            View Diff
                          </button>
                        </div>
                      )}

                      {/* Citations Box */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="space-y-2 mt-1">
                          {msg.citations.map((c, i) => (
                            <div
                              key={i}
                              className="p-3.5 rounded-xl bg-[#1E293B]/70 border border-[#263247] flex flex-col gap-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-[#3B82F6]" />
                                  <span className="text-xs font-semibold text-[#F8FAFC]">
                                    {c.documentTitle}
                                  </span>
                                  <span className="text-[10px] font-mono text-[#3B82F6] bg-[#111827] px-1.5 py-0.5 rounded border border-[#263247]">
                                    {c.version}
                                  </span>
                                  <span className="text-[10px] text-[#94A3B8]">
                                    {c.clause}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-[#14B8A6] bg-[#14B8A6]/10 px-2 py-0.5 rounded">
                                  {c.isCurrentVersion ? 'Current Source' : 'Archived Version'}
                                </span>
                              </div>

                              <div className="p-2.5 rounded bg-[#080D1D] border-l-2 border-[#14B8A6] font-mono text-xs text-[#94A3B8] leading-relaxed">
                                "{c.excerpt}"
                              </div>

                              <div className="flex items-center justify-between pt-1 text-[11px] text-[#64748B]">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => navigate(`/documents/${c.documentId}`)}
                                    className="text-[#3B82F6] hover:underline flex items-center gap-1"
                                  >
                                    <span>View Source ({c.documentId})</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                  <span>•</span>
                                  <span className="font-mono">{c.chunkId}</span>
                                </div>
                                <span className="font-mono text-[10px]">
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

          {/* RAG Chat Composer */}
          <div className="p-4 rounded-2xl bg-[#111827] border border-[#263247] shadow-xl flex flex-col gap-3">
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask a question about your documents... (e.g. travel expense limits, SLA terms, security breach window)"
              className="w-full bg-[#080D1D] rounded-xl p-3.5 text-xs text-[#F8FAFC] placeholder:text-[#64748B] border border-[#263247] focus:outline-none focus:border-[#3B82F6] resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    addToast({
                      type: 'info',
                      title: 'Attach Document',
                      message: 'Choose a source document to constrain retrieval scope.',
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1E293B] border border-[#263247] hover:bg-[#263247] text-xs text-[#94A3B8] hover:text-[#F8FAFC] flex items-center gap-1.5 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attach source</span>
                </button>

                <div className="text-[11px] text-[#64748B]">
                  Scope: <strong className="text-[#94A3B8]">{activeScope}</strong>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[#64748B] hidden sm:inline">
                  ⌘ Enter to send
                </span>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim() || isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-40 text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <span>{isSubmitting ? 'Retrieving...' : 'Send Query'}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1A2438] flex items-center justify-between text-[11px] text-[#64748B]">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#14B8A6]" />
                <span>
                  Grounding verified against cryptographic baseline. Unverified claims are strictly suppressed.
                </span>
              </div>
              <span className="font-mono text-[10px]">#0x82f..9c</span>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Grounding Evidence & Telemetry Panel */}
        <div className="lg:col-span-4 flex flex-col gap-5 sticky top-20">
          {/* Card 1: Active Answer Evidence */}
          <div className="bg-[#111827] border border-[#263247] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#263247]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#14B8A6]" />
                <h3 className="text-sm font-semibold text-[#F8FAFC]">
                  Grounding Evidence
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#14B8A6] bg-[#14B8A6]/10 px-2 py-0.5 rounded font-semibold uppercase">
                Verified & Ingested
              </span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#64748B] block">
                  Source Document
                </span>
                <span className="text-sm font-medium text-[#F8FAFC] block mt-0.5">
                  Employee Reimbursement Policy
                </span>
                <span className="text-[11px] font-mono text-[#3B82F6]">
                  Identifier: DOC-7704
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1A2438]">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#64748B]">
                    Department
                  </span>
                  <div className="text-xs text-[#94A3B8]">Human Resources</div>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#64748B]">
                    Version
                  </span>
                  <div className="text-xs text-[#14B8A6] font-mono font-medium">
                    v2.0 (Active)
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1A2438]">
                <span className="text-[10px] font-mono uppercase text-[#64748B] block">
                  Relevant Section & Chunk
                </span>
                <div className="text-xs text-[#F8FAFC] font-medium mt-0.5">
                  Clause 4.2 — Expense Submission Window
                </div>
                <div className="text-[11px] font-mono text-[#64748B]">
                  chunk-erp-42-v2 (Vector dim: 1536)
                </div>
              </div>

              <div className="pt-2 border-t border-[#1A2438]">
                <span className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">
                  Supporting Excerpt (Vector Anchor)
                </span>
                <div className="p-2.5 rounded bg-[#080D1D] border-l-2 border-[#3B82F6] font-mono text-[11px] text-[#F8FAFC] leading-relaxed">
                  Employees must submit reimbursement claims within 15 days of the expense.
                </div>
              </div>

              <div className="pt-2 border-t border-[#1A2438] flex items-center gap-2">
                <button
                  onClick={() => navigate('/documents/DOC-7704')}
                  className="flex-1 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#263247] border border-[#263247] text-xs font-medium text-[#F8FAFC] text-center"
                >
                  Open Document Details
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      'Employees must submit reimbursement claims within 15 days of the expense.'
                    );
                    addToast({
                      type: 'success',
                      title: 'Copied',
                      message: 'Verbatim excerpt copied to clipboard.',
                    });
                  }}
                  className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-[#263247] border border-[#263247] text-[#94A3B8]"
                  title="Copy Excerpt"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Related Claims & Mutation */}
          <div className="bg-[#111827] border border-[#263247] rounded-xl p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#263247]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-sm font-semibold text-[#F8FAFC]">
                  Related Claims & Mutation
                </h3>
              </div>
              <span className="text-[11px] text-[#F59E0B] font-mono">1 Changed Claim</span>
            </div>

            <div className="p-3 rounded-lg bg-[#080D1D] border border-[#263247] flex flex-col gap-2 text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#14B8A6] font-semibold">Current Claim (v2.0)</span>
                <span className="text-[#64748B] font-mono">15-day window</span>
              </div>
              <p className="text-[#F8FAFC]">"Submission deadline is 15 days."</p>

              <div className="pt-2 border-t border-[#1A2438] flex justify-between items-center text-[11px]">
                <span className="text-[#EF4444] font-semibold">Previous Claim (v1.0)</span>
                <span className="text-[#64748B] font-mono">30-day window</span>
              </div>
              <p className="text-[#64748B] line-through">"Submission deadline was 30 days."</p>

              <div className="pt-2 border-t border-[#1A2438] flex items-center justify-between text-[11px]">
                <span className="text-[#F59E0B]">Mutation: -50%</span>
                <span className="px-1.5 py-0.2 rounded bg-[#EF4444]/15 text-[#EF4444] font-mono">
                  3 Answers Flagged
                </span>
              </div>

              <button
                onClick={() => navigate('/documents/DOC-7704/compare')}
                className="mt-1 w-full py-1.5 rounded bg-[#1E293B] hover:bg-[#263247] text-xs text-[#F59E0B] font-medium flex items-center justify-center gap-1"
              >
                <span>View Change in Diff Engine</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 3: Suggested Questions */}
          <div className="bg-[#111827] border border-[#263247] rounded-xl p-5 flex flex-col gap-3 shadow-sm">
            <span className="text-xs font-semibold text-[#F8FAFC]">
              Related Questions in this Context
            </span>
            <div className="space-y-1.5 text-xs">
              {[
                'What documents are required for reimbursement?',
                'Who approves reimbursement claims?',
                'Can a late claim be submitted?',
                'What are the exceptions to the 15-day limit?',
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(q)}
                  className="w-full text-left p-2 rounded-lg bg-[#1E293B]/60 hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263247] transition-colors flex items-center justify-between group"
                >
                  <span className="truncate">{q}</span>
                  <Plus className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#3B82F6] shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Card 4: Guardrail Telemetry */}
          <div className="p-4 rounded-xl bg-[#080D1D] border border-[#263247] flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="uppercase tracking-wider font-semibold text-[#64748B]">
                Guardrail Telemetry
              </span>
              <span className="text-[#14B8A6] font-mono">99.4% CONF</span>
            </div>
            <div className="space-y-1 text-[#94A3B8] text-[11px]">
              <div className="flex justify-between">
                <span>Hallucination Guardrail:</span>
                <span className="font-mono text-[#14B8A6]">STRICT (ZERO TOLERANCE)</span>
              </div>
              <div className="flex justify-between">
                <span>Reranker Model:</span>
                <span className="font-mono text-[#F8FAFC]">bge-reranker-large</span>
              </div>
              <div className="p-2 rounded bg-[#111827] border border-[#263247] text-[10px] text-[#64748B] mt-1 leading-relaxed">
                <strong className="text-[#94A3B8]">Execution Rule:</strong> If no
                cryptographically verified supporting source is detected within
                threshold, output <em>"No supporting source found"</em> instead of
                speculative generation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
