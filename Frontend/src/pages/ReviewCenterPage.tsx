import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {

  ShieldCheck,

  AlertTriangle,

  History,

  FileText,

  ExternalLink,

  RotateCw,

  Gavel,

  XCircle,

  CheckCircle2,

  Lock,

  ArrowRight,

  ChevronDown,

  Filter,

  UserCheck,

  Search,

  Check,

  Shield,

} from 'lucide-react';

import { StatusBadge } from '../components/ui/StatusBadge';

import { ConfirmDialog } from '../components/ui/ConfirmDialog';

import { useApp } from '../context/AppContext';

import { ReviewItem } from '../types';

export const ReviewCenterPage: React.FC = () => {

  const navigate = useNavigate();

  const { reviews, updateReviewDecision, addToast, isLiveMode } = useApp();

  const [selectedReviewId, setSelectedReviewId] = useState<string>(

    reviews[0]?.id || 'REV-4201'

  );

  const [filterStatus, setFilterStatus] = useState<string>('Pending');

  const [filterSeverity, setFilterSeverity] = useState<string>('All');

  const [filterQuery, setFilterQuery] = useState<string>('');

  // Decision Form State

  const [auditorNotes, setAuditorNotes] = useState<string>(

    'Confirmed temporal contraction in Clause 4.2. Downstream Slack and Finance agents require cache invalidation and prompt reranking against v2.0 baseline.'

  );

  const [assigneeLead, setAssigneeLead] = useState<string>('S. Vance (CISO / AI Safety Lead)');

  const [dispositionState, setDispositionState] = useState<string>('Status: Ready for Decision');

  const [logToImmutableLedger, setLogToImmutableLedger] = useState<boolean>(true);

  const [isTimelineOpen, setIsTimelineOpen] = useState<boolean>(false);

  // Confirmation Modals

  const [confirmAction, setConfirmAction] = useState<

    'mark_reviewed' | 'refresh_answers' | 'dismiss' | 'escalate' | null

  >(null);

  const selectedReview: ReviewItem | undefined =

    reviews.find((r) => r.id === selectedReviewId) || reviews[0];

  const filteredQueue = reviews.filter((r) => {

    const matchesStatus =

      filterStatus === 'All' ? true : r.status === filterStatus;

    const matchesSeverity =

      filterSeverity === 'All' ? true : r.severity === filterSeverity;

    const matchesQuery =

      r.documentTitle.toLowerCase().includes(filterQuery.toLowerCase()) ||

      r.issueSummary.toLowerCase().includes(filterQuery.toLowerCase()) ||

      r.id.toLowerCase().includes(filterQuery.toLowerCase());

    return matchesStatus && matchesSeverity && matchesQuery;

  });

  const handleExecuteDecision = async () => {

    if (!confirmAction || !selectedReview) return;

    await updateReviewDecision(

      selectedReview.id,

      confirmAction,

      auditorNotes,

      assigneeLead

    );

    setConfirmAction(null);

  };

  return (

    <div className="flex flex-col gap-6 animate-in fade-in duration-200 pb-28">

      {/* Page Header */}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gradient-to-br from-white via-[#FFF7FB] to-[#F7FEE7] border border-white/90 rounded-[24px] p-6 relative overflow-hidden shadow-[0_18px_55px_rgba(73,55,94,0.09)]">

        <div className="max-w-3xl space-y-1">

          <div className="flex items-center gap-2.5 flex-wrap">

            <h1 className="text-2xl font-bold tracking-tight text-[#29233D]">

              Human Review Center

            </h1>

            <span className="px-2.5 py-0.5 rounded-full bg-[#F7FEE7] border border-[#D9F99D] text-[#65A30D] text-xs font-semibold uppercase font-mono">

              SOVEREIGN TRIAGE GATE

            </span>

            <span className="px-2 py-0.5 rounded bg-[#F7F3F8] text-[#756D82] text-xs font-mono border border-[#E8E3EC]">

              {isLiveMode ? 'LIVE API GATE' : '[DEMO DATA]'}

            </span>

          </div>

          <p className="text-xs text-[#756D82] leading-relaxed">

            Investigate detected changes, review claim mutations, and resolve

            potentially affected downstream AI answers. Automated silently

            rewritten answers are strictly suppressed by protocol.

          </p>

        </div>

        {/* Search & Export in header */}

        <div className="flex items-center gap-2.5 flex-wrap">

          <div className="relative w-64">

            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#938DA2]" />

            <input

              type="text"

              value={filterQuery}

              onChange={(e) => setFilterQuery(e.target.value)}

              placeholder="Search review items..."

              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F7F3F8] border border-[#E8E3EC] text-xs text-[#29233D] placeholder:text-[#938DA2] focus:outline-none focus:border-[#C4B5FD]"

            />

          </div>

        </div>

      </div>

      {/* Summary Metric Strip */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        <div className="p-4 bg-white/85 border border-[#E8E3EC] rounded-xl flex flex-col justify-between h-[120px]">

          <div className="flex items-center justify-between">

            <span className="text-[11px] uppercase tracking-wider text-[#756D82]">

              Pending Review

            </span>

            <span className="px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] text-[10px] font-semibold">

              Action Req

            </span>

          </div>

          <div>

            <div className="text-2xl font-bold font-mono text-[#29233D]">

              {reviews.filter((r) => r.status === 'Pending').length}

            </div>

            <div className="text-xs text-[#F59E0B] mt-0.5">Awaiting auditor sign-off</div>

          </div>

        </div>

        <div className="p-4 bg-white/85 border border-[#E8E3EC] rounded-xl flex flex-col justify-between h-[120px]">

          <div className="flex items-center justify-between">

            <span className="text-[11px] uppercase tracking-wider text-[#756D82]">

              In Progress

            </span>

            <span className="px-1.5 py-0.5 rounded bg-[#A3E635]/15 text-[#7C3AED] text-[10px] font-semibold">

              Active

            </span>

          </div>

          <div>

            <div className="text-2xl font-bold font-mono text-[#29233D]">

              {reviews.filter((r) => r.status === 'In Progress').length}

            </div>

            <div className="text-xs text-[#756D82] mt-0.5">Under active investigation</div>

          </div>

        </div>

        <div className="p-4 bg-white/85 border border-[#E8E3EC] rounded-xl flex flex-col justify-between h-[120px]">

          <div className="flex items-center justify-between">

            <span className="text-[11px] uppercase tracking-wider text-[#756D82]">

              Resolved

            </span>

            <span className="px-1.5 py-0.5 rounded bg-[#A3E635]/15 text-[#65A30D] text-[10px] font-semibold">

              Closed

            </span>

          </div>

          <div>

            <div className="text-2xl font-bold font-mono text-[#29233D]">

              {reviews.filter((r) => r.status === 'Resolved').length}

            </div>

            <div className="text-xs text-[#65A30D] mt-0.5">94.7% SLA Validated</div>

          </div>

        </div>

        <div className="p-4 bg-white/85 border border-[#E8E3EC] rounded-xl flex flex-col justify-between h-[120px]">

          <div className="flex items-center justify-between">

            <span className="text-[11px] uppercase tracking-wider text-[#756D82]">

              Escalated

            </span>

            <span className="px-1.5 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444] text-[10px] font-semibold">

              Hold

            </span>

          </div>

          <div>

            <div className="text-2xl font-bold font-mono text-[#EF4444]">

              {reviews.filter((r) => r.status === 'Escalated').length}

            </div>

            <div className="text-xs text-[#EF4444]/80 mt-0.5">L3 Legal Hold</div>

          </div>

        </div>

      </div>

      {/* Filter Toolbar */}

      <div className="bg-white/85 border border-[#E8E3EC] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">

        {/* Status Tabs */}

        <div className="flex items-center gap-1.5">

          {['All', 'Pending', 'In Progress', 'Resolved', 'Escalated'].map((st) => (

            <button

              key={st}

              onClick={() => setFilterStatus(st)}

              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${

                filterStatus === st

                  ? 'bg-gradient-to-r from-[#A3E635] to-[#F9A8D4] text-[#29233D] shadow-sm'

                  : 'text-[#756D82] hover:text-[#29233D] hover:bg-[#F7F3F8]'

              }`}

            >

              {st}

            </button>

          ))}

        </div>

        {/* Severity filter */}

        <div className="flex items-center gap-2">

          <select

            value={filterSeverity}

            onChange={(e) => setFilterSeverity(e.target.value)}

            className="h-8 px-2.5 rounded-lg bg-[#F7F3F8] border border-[#E8E3EC] text-xs text-[#756D82] focus:outline-none"

          >

            <option value="All">Severity: All</option>

            <option value="High">High Severity</option>

            <option value="Medium">Medium Severity</option>

            <option value="Low">Low Severity</option>

          </select>

          <button

            onClick={() => {

              setFilterStatus('All');

              setFilterSeverity('All');

              setFilterQuery('');

            }}

            className="text-xs text-[#7C3AED] hover:underline px-1"

          >

            Reset

          </button>

        </div>

      </div>

      {/* Two-Panel Split Layout */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Panel (5 cols): Review Queue */}

        <div className="lg:col-span-5 flex flex-col gap-3">

          <div className="flex items-center justify-between px-1 text-xs">

            <span className="font-semibold text-[#29233D]">

              Review Queue ({filteredQueue.length})

            </span>

            <span className="text-[#65A30D] font-mono text-[11px] flex items-center gap-1">

              <span className="w-1.5 h-1.5 rounded-full bg-[#A3E635] animate-pulse" />

              Live Queue

            </span>

          </div>

          <div className="flex flex-col gap-3">

            {filteredQueue.map((item) => {

              const isSelected = item.id === selectedReview.id;

              return (

                <div

                  key={item.id}

                  onClick={() => setSelectedReviewId(item.id)}

                  className={`relative p-4 rounded-xl cursor-pointer transition-all duration-150 ${

                    isSelected

                      ? 'bg-gradient-to-br from-[#F7FEE7] via-white to-[#FDF2F8] border-2 border-[#C4B5FD] shadow-lg'

                      : 'bg-white/85 border border-[#E8E3EC] hover:border-[#C4B5FD]/60 hover:shadow-md'

                  }`}

                >

                  {isSelected && (

                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#A3E635] rounded-l" />

                  )}

                  <div className="flex items-start justify-between gap-2 mb-1.5">

                    <div className="font-semibold text-xs text-[#29233D] truncate">

                      {item.documentTitle}

                    </div>

                    <span className="text-[10px] font-mono text-[#938DA2] shrink-0 bg-[#F7F3F8] px-1.5 py-0.5 rounded border border-[#E8E3EC]">

                      {item.documentId}

                    </span>

                  </div>

                  <p className="text-xs text-[#756D82] line-clamp-2 leading-relaxed mb-3">

                    {item.issueSummary}

                  </p>

                  <div className="flex items-center gap-2 flex-wrap mb-3 text-[11px]">

                    <span

                      className={`px-2 py-0.5 rounded font-semibold uppercase text-[10px] ${

                        item.severity === 'High'

                          ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'

                          : item.severity === 'Medium'

                          ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'

                          : 'bg-[#F7F3F8] text-[#756D82]'

                      }`}

                    >

                      {item.severity} Severity

                    </span>

                    <span className="px-2 py-0.5 rounded bg-[#F7F3F8] text-[#756D82] border border-[#E8E3EC]">

                      {item.affectedAnswers.length} affected answers

                    </span>

                    <span className="text-[#938DA2] ml-auto">{item.createdAt}</span>

                  </div>

                  <div className="pt-2 border-t border-[#F1EDF2] flex items-center justify-between text-xs">

                    <StatusBadge status={item.status} size="sm" />

                    <span className="text-[#938DA2] text-[11px]">

                      Assignee: <strong className="text-[#756D82]">{item.assignee}</strong>

                    </span>

                  </div>

                </div>

              );

            })}

          </div>

        </div>

        {/* Right Panel (7 cols): Selected Review Details */}

        {!selectedReview ? (

          <div className="lg:col-span-7 bg-white/85 border border-[#E8E3EC] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 shadow-sm min-h-[400px]">

            <ShieldCheck className="w-12 h-12 text-[#65A30D]" />

            <h2 className="text-lg font-bold text-[#29233D]">Review Queue Clear</h2>

            <p className="text-xs text-[#756D82] max-w-md">

              No knowledge drift alerts or affected copilot answers are currently awaiting auditor review.

            </p>

            <button

              onClick={() => navigate('/documents')}

              className="mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#A3E635] to-[#F9A8D4] text-[#29233D] text-xs font-semibold hover:brightness-95 transition-all shadow-sm"

            >

              Inspect Documents

            </button>

          </div>

        ) : (

          <div className="lg:col-span-7 bg-white/85 border border-[#E8E3EC] rounded-xl p-6 flex flex-col gap-6 shadow-sm">

            {/* Item Header & Metadata Bar */}

            <div className="pb-4 border-b border-[#E8E3EC] flex flex-col gap-3">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <h2 className="text-lg font-bold text-[#29233D]">

                  {selectedReview.documentTitle} — Policy Drift Review

                </h2>

                <div className="flex items-center gap-2">

                  <StatusBadge status={selectedReview.status} size="sm" />

                  <span className="px-2 py-0.5 rounded bg-[#F7F3F8] text-xs font-mono text-[#756D82] border border-[#E8E3EC]">

                    {selectedReview.versionShift}

                  </span>

                </div>

              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#756D82] pt-1">

                <div>

                  <span className="text-[10px] text-[#938DA2] uppercase block">Document</span>

                  <span className="text-[#29233D] font-medium">{selectedReview.documentId}</span>

                </div>

                <div>

                  <span className="text-[10px] text-[#938DA2] uppercase block">Lineage Hash</span>

                  <span className="font-mono text-[#7C3AED] truncate block">{selectedReview.lineageHash}</span>

                </div>

                <div>

                  <span className="text-[10px] text-[#938DA2] uppercase block">Assignee</span>

                  <span className="text-[#29233D]">{selectedReview.assignee}</span>

                </div>

                <div>

                  <span className="text-[10px] text-[#938DA2] uppercase block">Resolution SLA</span>

                  <span className="text-[#EF4444] font-medium">{selectedReview.timeRemainingSla}</span>

                </div>

              </div>

            </div>

          {/* Section 1: What Changed (Claim Mutation) */}

          <div className="space-y-3">

            <div className="flex items-center justify-between text-xs">

              <span className="font-semibold uppercase tracking-wider text-[#756D82]">

                1. What Changed (Semantic Claim Mutation)

              </span>

              <span className="text-[10px] font-mono text-[#938DA2]">AST Diff Line 42</span>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              <div className="p-3.5 rounded-xl bg-[#FFFDF9]/90 border border-[#E8E3EC] flex flex-col justify-between">

                <span className="text-[10px] font-mono text-[#938DA2] uppercase mb-1">

                  Baseline Claim (v1.0)

                </span>

                <p className="text-xs text-[#756D82] leading-relaxed">

                  "{selectedReview.claimMutation?.previousClaim || 'Employees must submit within 30 days.'}"

                </p>

              </div>

              <div className="p-3.5 rounded-xl bg-[#FFFDF9]/90 border border-[#D9F99D] flex flex-col justify-between">

                <span className="text-[10px] font-mono text-[#65A30D] uppercase mb-1">

                  Current Claim (v2.0 Active)

                </span>

                <p className="text-xs text-[#29233D] leading-relaxed">

                  "{selectedReview.claimMutation?.currentClaim || 'Employees must submit within 15 days.'}"

                </p>

              </div>

            </div>

            <div className="p-3 rounded-lg bg-[#F7F3F8] border border-[#E8E3EC] flex items-center justify-between text-xs text-[#756D82]">

              <div>

                <strong className="text-[#29233D]">Extracted Shift:</strong>{' '}

                {selectedReview.claimMutation?.temporalDelta || 'Temporal window contracted by 15 calendar days (-50%).'}

              </div>

              <span className="font-mono text-[#65A30D]">99.4% confidence</span>

            </div>

          </div>

          {/* Section 2: Why it was flagged */}

          <div className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex flex-col gap-2 text-xs">

            <div className="flex items-center gap-2 text-[#F59E0B] font-semibold">

              <Shield className="w-4 h-4" />

              <span>Sovereign Protocol Blast Radius Advisory</span>

            </div>

            <p className="text-[#756D82] leading-relaxed">

              Three previously generated corporate copilot answers cite the superseded 30-day

              window baseline. If left unmitigated, employees relying on cached agent answers

              may submit claims between day 16 and day 30, which the financial ledger will reject.

            </p>

            <div className="text-[11px] text-[#938DA2] flex items-center gap-1.5 pt-1">

              <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />

              <span>Automated purge disabled by governance lock • Auditor validation mandatory</span>

            </div>

          </div>

          {/* Section 3: Potentially Affected Copilot Answers */}

          <div className="space-y-3">

            <div className="flex items-center justify-between text-xs">

              <span className="font-semibold uppercase tracking-wider text-[#756D82]">

                3. Potentially Affected Copilot Answers ({selectedReview.affectedAnswers.length})

              </span>

            </div>

            <div className="space-y-2">

              {selectedReview.affectedAnswers.map((ans) => (

                <div

                  key={ans.id}

                  className="p-3.5 rounded-xl bg-[#FFFDF9]/90 border border-[#E8E3EC] flex flex-col gap-2 text-xs"

                >

                  <div className="flex items-center justify-between">

                    <span className="font-semibold text-[#29233D]">

                      "{ans.queryPrompt}"

                    </span>

                    <StatusBadge status={ans.impactStatus} size="sm" />

                  </div>

                  <div className="text-[11px] text-[#938DA2]">Agent: {ans.agentName}</div>

                  <div className="p-2 rounded bg-white/85 font-mono text-[11px] text-[#EF4444]">

                    Superseded Output: "{ans.cachedAnswer}"

                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1 text-[11px]">

                    <button

                      onClick={() => navigate('/impact')}

                      className="text-[#7C3AED] hover:underline"

                    >

                      View Vector Diff

                    </button>

                    <button

                      onClick={() => {

                        addToast({

                          type: 'info',

                          title: 'Answer Queued for Refresh',

                          message: `Scheduled reranking for ${ans.id}`,

                        });

                      }}

                      className="text-[#65A30D] hover:underline"

                    >

                      Queue Refresh

                    </button>

                  </div>

                </div>

              ))}

            </div>

          </div>

          {/* Section 4: Auditor Notes & Disposition */}

          <div className="space-y-3">

            <span className="font-semibold uppercase tracking-wider text-xs text-[#756D82]">

              4. Auditor Evaluation Notes & Disposition

            </span>

            <textarea

              rows={3}

              value={auditorNotes}

              onChange={(e) => setAuditorNotes(e.target.value)}

              placeholder="Add auditor evaluation notes, remediation rationale, or compliance exemption details..."

              className="w-full bg-[#FFFDF9]/90 border border-[#E8E3EC] rounded-xl p-3 text-xs text-[#29233D] placeholder:text-[#938DA2] focus:outline-none focus:border-[#C4B5FD]"

            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">

              <div>

                <label className="text-[10px] uppercase font-mono text-[#938DA2] block mb-1">

                  Assignee Lead

                </label>

                <select

                  value={assigneeLead}

                  onChange={(e) => setAssigneeLead(e.target.value)}

                  className="w-full h-8 px-2.5 rounded-lg bg-[#FFFDF9]/90 border border-[#E8E3EC] text-xs text-[#29233D]"

                >

                  <option>S. Vance (CISO / AI Safety Lead)</option>

                  <option>E. Kowalski (HR-Ops)</option>

                  <option>Compliance Committee Pool</option>

                </select>

              </div>

              <div>

                <label className="text-[10px] uppercase font-mono text-[#938DA2] block mb-1">

                  Disposition State

                </label>

                <select

                  value={dispositionState}

                  onChange={(e) => setDispositionState(e.target.value)}

                  className="w-full h-8 px-2.5 rounded-lg bg-[#FFFDF9]/90 border border-[#E8E3EC] text-xs text-[#29233D]"

                >

                  <option>Status: Ready for Decision</option>

                  <option>Status: Further Legal Review Required</option>

                  <option>Status: False Positive Candidate</option>

                </select>

              </div>

            </div>

            <label className="flex items-center gap-2 text-xs text-[#756D82] cursor-pointer mt-1">

              <input

                type="checkbox"

                checked={logToImmutableLedger}

                onChange={(e) => setLogToImmutableLedger(e.target.checked)}

                className="w-4 h-4 rounded bg-[#FFFDF9]/90 text-[#7C3AED]"

              />

              <span>Log decision and evidence hash into immutable cryptographic audit trail (SEC-EAL6)</span>

            </label>

          </div>

          {/* Collapsible Timeline */}

          <div className="border border-[#E8E3EC] rounded-xl p-3 bg-[#FFFDF9]/90">

            <button

              onClick={() => setIsTimelineOpen(!isTimelineOpen)}

              className="w-full flex items-center justify-between text-xs text-[#756D82] hover:text-[#29233D]"

            >

              <div className="flex items-center gap-2">

                <History className="w-4 h-4 text-[#938DA2]" />

                <span>Audit Trail & Provenance Timeline ({selectedReview.reviewHistory.length} events)</span>

              </div>

              <ChevronDown

                className={`w-4 h-4 transition-transform ${

                  isTimelineOpen ? 'rotate-180' : ''

                }`}

              />

            </button>

            {isTimelineOpen && (

              <div className="mt-3 pt-3 border-t border-[#F1EDF2] space-y-2 text-xs">

                {selectedReview.reviewHistory.map((h, i) => (

                  <div key={i} className="flex items-start gap-2.5 text-[11px]">

                    <span className="text-[#938DA2] font-mono shrink-0 w-16">

                      {h.timestamp}

                    </span>

                    <span className="w-1.5 h-1.5 rounded-full bg-[#A3E635] mt-1 shrink-0" />

                    <div className="min-w-0">

                      <span className="text-[#29233D] font-medium">{h.action}</span>

                      <span className="text-[#938DA2] ml-2">by {h.actor}</span>

                      <p className="text-[#756D82] mt-0.5">{h.details}</p>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </div>

        )}

      </div>

      {/* Pinned Bottom Decision Action Dock */}

      <div className="fixed bottom-0 left-[248px] right-0 min-h-16 bg-gradient-to-r from-[#FFFDF9]/95 via-[#FFF7FB]/95 to-[#F7FEE7]/95 backdrop-blur-xl border-t border-white/90 z-30 px-7 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_-10px_35px_rgba(73,55,94,0.08)]">

        <div className="flex items-center gap-2.5">

          <button

            onClick={() => setConfirmAction('escalate')}

            className="h-9 px-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-colors flex items-center gap-1.5"

          >

            <Gavel className="w-3.5 h-3.5" />

            <span>Escalate to Committee</span>

          </button>

          <button

            onClick={() => setConfirmAction('dismiss')}

            className="h-9 px-3.5 rounded-lg bg-[#F7F3F8] border border-[#E8E3EC] text-xs font-medium text-[#756D82] hover:text-[#29233D] hover:bg-[#EDE8EF] transition-colors flex items-center gap-1.5"

          >

            <XCircle className="w-3.5 h-3.5" />

            <span>Dismiss (False Positive)</span>

          </button>

        </div>

        <div className="flex items-center gap-3">

          <div className="text-[11px] text-right text-[#938DA2] hidden xl:block">

            <div>Audit ID: <strong className="font-mono text-[#29233D]">AUD-88219</strong></div>

            <div>Sovereign Protocol 12-B Human Verification Requirement</div>

          </div>

          <button

            onClick={() => setConfirmAction('refresh_answers')}

            className="h-9 px-4 rounded-lg bg-[#F7F3F8] border border-[#C4B5FD]/50 text-xs font-medium text-[#7C3AED] hover:bg-[#A3E635]/10 transition-colors flex items-center gap-2"

          >

            <RotateCw className="w-3.5 h-3.5" />

            <span>Refresh Affected Answers (3)</span>

          </button>

          <button

            onClick={() => setConfirmAction('mark_reviewed')}

            className="h-9 px-5 rounded-lg bg-gradient-to-r from-[#A3E635] to-[#F9A8D4] hover:brightness-95 text-xs font-semibold text-[#29233D] transition-all flex items-center gap-2 shadow-lg shadow-[#A3E635]/20"

          >

            <CheckCircle2 className="w-4 h-4" />

            <span>Mark as Reviewed & Commit</span>

          </button>

        </div>

      </div>

      {/* Confirmation Dialogs for Review Actions */}

      <ConfirmDialog

        isOpen={confirmAction === 'mark_reviewed'}

        onClose={() => setConfirmAction(null)}

        onConfirm={handleExecuteDecision}

        title="Commit Review Decision?"

        description="This will permanently mark this change as Reviewed, invalidate obsolete cached answers across all enterprise copilots, and append a signed record to the cryptographic audit log."

        confirmLabel="Confirm & Sign Off"

        type="success"

      />

      <ConfirmDialog

        isOpen={confirmAction === 'escalate'}

        onClose={() => setConfirmAction(null)}

        onConfirm={handleExecuteDecision}

        title="Escalate Review to Governance Committee?"

        description="This will put the affected knowledge items on compliance hold and alert senior legal risk officers."

        confirmLabel="Confirm Escalation"

        type="danger"

      />

      <ConfirmDialog

        isOpen={confirmAction === 'dismiss'}

        onClose={() => setConfirmAction(null)}

        onConfirm={handleExecuteDecision}

        title="Dismiss Alert as False Positive?"

        description="This marks the detected diff as non-impacting and preserves current production agent answers without regeneration."

        confirmLabel="Dismiss Alert"

        type="warning"

      />

      <ConfirmDialog

        isOpen={confirmAction === 'refresh_answers'}

        onClose={() => setConfirmAction(null)}

        onConfirm={handleExecuteDecision}

        title="Regenerate Affected Answers?"

        description="This schedules 3 copilot responses for re-indexing against active policy v2.0."

        confirmLabel="Schedule Refresh"

        type="primary"

      />

    </div>

  );

};
