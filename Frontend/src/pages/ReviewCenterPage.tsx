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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#111827] border border-[#263247] rounded-xl p-6 relative overflow-hidden">
        <div className="max-w-3xl space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
              Human Review Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/30 text-[#14B8A6] text-xs font-semibold uppercase font-mono">
              SOVEREIGN TRIAGE GATE
            </span>
            <span className="px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] text-xs font-mono border border-[#263247]">
              {isLiveMode ? 'LIVE API GATE' : '[DEMO DATA]'}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Investigate detected changes, review claim mutations, and resolve
            potentially affected downstream AI answers. Automated silently
            rewritten answers are strictly suppressed by protocol.
          </p>
        </div>

        {/* Search & Export in header */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search review items..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>
      </div>

      {/* Summary Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-4 bg-[#111827] border border-[#263247] rounded-xl flex flex-col justify-between h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
              Pending Review
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] text-[10px] font-semibold">
              Action Req
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC]">
              {reviews.filter((r) => r.status === 'Pending').length}
            </div>
            <div className="text-xs text-[#F59E0B] mt-0.5">Awaiting auditor sign-off</div>
          </div>
        </div>

        <div className="p-4 bg-[#111827] border border-[#263247] rounded-xl flex flex-col justify-between h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
              In Progress
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#3B82F6]/15 text-[#3B82F6] text-[10px] font-semibold">
              Active
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC]">
              {reviews.filter((r) => r.status === 'In Progress').length}
            </div>
            <div className="text-xs text-[#94A3B8] mt-0.5">Under active investigation</div>
          </div>
        </div>

        <div className="p-4 bg-[#111827] border border-[#263247] rounded-xl flex flex-col justify-between h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
              Resolved
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#14B8A6]/15 text-[#14B8A6] text-[10px] font-semibold">
              Closed
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC]">
              {reviews.filter((r) => r.status === 'Resolved').length}
            </div>
            <div className="text-xs text-[#14B8A6] mt-0.5">94.7% SLA Validated</div>
          </div>
        </div>

        <div className="p-4 bg-[#111827] border border-[#263247] rounded-xl flex flex-col justify-between h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
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
      <div className="bg-[#111827] border border-[#263247] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5">
          {['All', 'Pending', 'In Progress', 'Resolved', 'Escalated'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === st
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'
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
            className="h-8 px-2.5 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#94A3B8] focus:outline-none"
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
            className="text-xs text-[#3B82F6] hover:underline px-1"
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
            <span className="font-semibold text-[#F8FAFC]">
              Review Queue ({filteredQueue.length})
            </span>
            <span className="text-[#14B8A6] font-mono text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
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
                      ? 'bg-[#111827] border-2 border-[#3B82F6] shadow-lg'
                      : 'bg-[#111827] border border-[#263247] hover:border-[#3B82F6]/50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3B82F6] rounded-l" />
                  )}

                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="font-semibold text-xs text-[#F8FAFC] truncate">
                      {item.documentTitle}
                    </div>
                    <span className="text-[10px] font-mono text-[#64748B] shrink-0 bg-[#1E293B] px-1.5 py-0.5 rounded border border-[#263247]">
                      {item.documentId}
                    </span>
                  </div>

                  <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed mb-3">
                    {item.issueSummary}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap mb-3 text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold uppercase text-[10px] ${
                        item.severity === 'High'
                          ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                          : item.severity === 'Medium'
                          ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
                          : 'bg-[#1E293B] text-[#94A3B8]'
                      }`}
                    >
                      {item.severity} Severity
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] border border-[#263247]">
                      {item.affectedAnswers.length} affected answers
                    </span>
                    <span className="text-[#64748B] ml-auto">{item.createdAt}</span>
                  </div>

                  <div className="pt-2 border-t border-[#1A2438] flex items-center justify-between text-xs">
                    <StatusBadge status={item.status} size="sm" />
                    <span className="text-[#64748B] text-[11px]">
                      Assignee: <strong className="text-[#94A3B8]">{item.assignee}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel (7 cols): Selected Review Details */}
        {!selectedReview ? (
          <div className="lg:col-span-7 bg-[#111827] border border-[#263247] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 shadow-sm min-h-[400px]">
            <ShieldCheck className="w-12 h-12 text-[#14B8A6]" />
            <h2 className="text-lg font-bold text-[#F8FAFC]">Review Queue Clear</h2>
            <p className="text-xs text-[#94A3B8] max-w-md">
              No knowledge drift alerts or affected copilot answers are currently awaiting auditor review.
            </p>
            <button
              onClick={() => navigate('/documents')}
              className="mt-2 px-4 py-2 rounded-lg bg-[#3B82F6] text-white text-xs font-medium hover:bg-blue-600 transition-colors"
            >
              Inspect Documents
            </button>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-[#111827] border border-[#263247] rounded-xl p-6 flex flex-col gap-6 shadow-sm">
            {/* Item Header & Metadata Bar */}
            <div className="pb-4 border-b border-[#263247] flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-[#F8FAFC]">
                  {selectedReview.documentTitle} — Policy Drift Review
                </h2>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedReview.status} size="sm" />
                  <span className="px-2 py-0.5 rounded bg-[#1E293B] text-xs font-mono text-[#94A3B8] border border-[#263247]">
                    {selectedReview.versionShift}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#94A3B8] pt-1">
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase block">Document</span>
                  <span className="text-[#F8FAFC] font-medium">{selectedReview.documentId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase block">Lineage Hash</span>
                  <span className="font-mono text-[#3B82F6] truncate block">{selectedReview.lineageHash}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase block">Assignee</span>
                  <span className="text-[#F8FAFC]">{selectedReview.assignee}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase block">Resolution SLA</span>
                  <span className="text-[#EF4444] font-medium">{selectedReview.timeRemainingSla}</span>
                </div>
              </div>
            </div>

          {/* Section 1: What Changed (Claim Mutation) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[#94A3B8]">
                1. What Changed (Semantic Claim Mutation)
              </span>
              <span className="text-[10px] font-mono text-[#64748B]">AST Diff Line 42</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#080D1D] border border-[#263247] flex flex-col justify-between">
                <span className="text-[10px] font-mono text-[#64748B] uppercase mb-1">
                  Baseline Claim (v1.0)
                </span>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  "{selectedReview.claimMutation?.previousClaim || 'Employees must submit within 30 days.'}"
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080D1D] border border-[#14B8A6]/40 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-[#14B8A6] uppercase mb-1">
                  Current Claim (v2.0 Active)
                </span>
                <p className="text-xs text-[#F8FAFC] leading-relaxed">
                  "{selectedReview.claimMutation?.currentClaim || 'Employees must submit within 15 days.'}"
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#1E293B] border border-[#263247] flex items-center justify-between text-xs text-[#94A3B8]">
              <div>
                <strong className="text-[#F8FAFC]">Extracted Shift:</strong>{' '}
                {selectedReview.claimMutation?.temporalDelta || 'Temporal window contracted by 15 calendar days (-50%).'}
              </div>
              <span className="font-mono text-[#14B8A6]">99.4% confidence</span>
            </div>
          </div>

          {/* Section 2: Why it was flagged */}
          <div className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#F59E0B] font-semibold">
              <Shield className="w-4 h-4" />
              <span>Sovereign Protocol Blast Radius Advisory</span>
            </div>
            <p className="text-[#94A3B8] leading-relaxed">
              Three previously generated corporate copilot answers cite the superseded 30-day
              window baseline. If left unmitigated, employees relying on cached agent answers
              may submit claims between day 16 and day 30, which the financial ledger will reject.
            </p>
            <div className="text-[11px] text-[#64748B] flex items-center gap-1.5 pt-1">
              <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Automated purge disabled by governance lock • Auditor validation mandatory</span>
            </div>
          </div>

          {/* Section 3: Potentially Affected Copilot Answers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[#94A3B8]">
                3. Potentially Affected Copilot Answers ({selectedReview.affectedAnswers.length})
              </span>
            </div>

            <div className="space-y-2">
              {selectedReview.affectedAnswers.map((ans) => (
                <div
                  key={ans.id}
                  className="p-3.5 rounded-xl bg-[#080D1D] border border-[#263247] flex flex-col gap-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#F8FAFC]">
                      "{ans.queryPrompt}"
                    </span>
                    <StatusBadge status={ans.impactStatus} size="sm" />
                  </div>
                  <div className="text-[11px] text-[#64748B]">Agent: {ans.agentName}</div>
                  <div className="p-2 rounded bg-[#111827] font-mono text-[11px] text-[#EF4444]">
                    Superseded Output: "{ans.cachedAnswer}"
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-1 text-[11px]">
                    <button
                      onClick={() => navigate('/impact')}
                      className="text-[#3B82F6] hover:underline"
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
                      className="text-[#14B8A6] hover:underline"
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
            <span className="font-semibold uppercase tracking-wider text-xs text-[#94A3B8]">
              4. Auditor Evaluation Notes & Disposition
            </span>

            <textarea
              rows={3}
              value={auditorNotes}
              onChange={(e) => setAuditorNotes(e.target.value)}
              placeholder="Add auditor evaluation notes, remediation rationale, or compliance exemption details..."
              className="w-full bg-[#080D1D] border border-[#263247] rounded-xl p-3 text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#3B82F6]"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] uppercase font-mono text-[#64748B] block mb-1">
                  Assignee Lead
                </label>
                <select
                  value={assigneeLead}
                  onChange={(e) => setAssigneeLead(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#080D1D] border border-[#263247] text-xs text-[#F8FAFC]"
                >
                  <option>S. Vance (CISO / AI Safety Lead)</option>
                  <option>E. Kowalski (HR-Ops)</option>
                  <option>Compliance Committee Pool</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-[#64748B] block mb-1">
                  Disposition State
                </label>
                <select
                  value={dispositionState}
                  onChange={(e) => setDispositionState(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#080D1D] border border-[#263247] text-xs text-[#F8FAFC]"
                >
                  <option>Status: Ready for Decision</option>
                  <option>Status: Further Legal Review Required</option>
                  <option>Status: False Positive Candidate</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-[#94A3B8] cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={logToImmutableLedger}
                onChange={(e) => setLogToImmutableLedger(e.target.checked)}
                className="w-4 h-4 rounded bg-[#080D1D] text-[#3B82F6]"
              />
              <span>Log decision and evidence hash into immutable cryptographic audit trail (SEC-EAL6)</span>
            </label>
          </div>

          {/* Collapsible Timeline */}
          <div className="border border-[#263247] rounded-xl p-3 bg-[#080D1D]">
            <button
              onClick={() => setIsTimelineOpen(!isTimelineOpen)}
              className="w-full flex items-center justify-between text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#64748B]" />
                <span>Audit Trail & Provenance Timeline ({selectedReview.reviewHistory.length} events)</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  isTimelineOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isTimelineOpen && (
              <div className="mt-3 pt-3 border-t border-[#1A2438] space-y-2 text-xs">
                {selectedReview.reviewHistory.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[11px]">
                    <span className="text-[#64748B] font-mono shrink-0 w-16">
                      {h.timestamp}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[#F8FAFC] font-medium">{h.action}</span>
                      <span className="text-[#64748B] ml-2">by {h.actor}</span>
                      <p className="text-[#94A3B8] mt-0.5">{h.details}</p>
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
      <div className="fixed bottom-0 left-[248px] right-0 h-16 bg-[#0B1020]/95 backdrop-blur-md border-t border-[#263247] z-30 px-7 flex flex-col sm:flex-row items-center justify-between gap-3">
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
            className="h-9 px-3.5 rounded-lg bg-[#1E293B] border border-[#263247] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#263247] transition-colors flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Dismiss (False Positive)</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] text-right text-[#64748B] hidden xl:block">
            <div>Audit ID: <strong className="font-mono text-[#F8FAFC]">AUD-88219</strong></div>
            <div>Sovereign Protocol 12-B Human Verification Requirement</div>
          </div>

          <button
            onClick={() => setConfirmAction('refresh_answers')}
            className="h-9 px-4 rounded-lg bg-[#1E293B] border border-[#3B82F6]/50 text-xs font-medium text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-colors flex items-center gap-2"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh Affected Answers (3)</span>
          </button>

          <button
            onClick={() => setConfirmAction('mark_reviewed')}
            className="h-9 px-5 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-xs font-semibold text-white transition-colors flex items-center gap-2 shadow-lg shadow-[#3B82F6]/20"
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
