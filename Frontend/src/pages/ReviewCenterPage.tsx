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

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-panel border border-line rounded-[10px] p-6 relative overflow-hidden ">

        <div className="max-w-3xl space-y-1">

          <div className="flex items-center gap-2.5 flex-wrap">

            <h1 className="display text-[40px] leading-none text-ink">

              Human Review Center

            </h1>

            <span className="px-2 py-0.5 rounded bg-raised text-muted text-xs font-mono border border-line">

              {isLiveMode ? 'LIVE API GATE' : '[DEMO DATA]'}

            </span>

          </div>

          <p className="text-xs text-muted leading-relaxed">

            Investigate detected changes, review claim mutations, and resolve

            potentially affected downstream AI answers. Automated silently

            rewritten answers are strictly suppressed by protocol.

          </p>

        </div>

        {/* Search & Export in header */}

        <div className="flex items-center gap-2.5 flex-wrap">

          <div className="relative w-64">

            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-0.5/2 text-muted" />

            <input

              type="text"

              value={filterQuery}

              onChange={(e) => setFilterQuery(e.target.value)}

              placeholder="Search review items..."

              className="w-full h-9 pl-9 pr-3 rounded-lg bg-raised border border-line text-xs text-ink placeholder:text-muted focus:outline-none focus:border-line-strong"

            />

          </div>

        </div>

      </div>

      {/* Summary Metric Strip */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        <div className="chart-card flex h-[132px] flex-col justify-between px-5 py-4">

          <div className="flex items-center justify-between">

            <span className="label-mono">

              Pending Review

            </span>

          </div>

          <div>

            <div className="font-mono text-[34px] font-medium leading-none tracking-tight tabular-nums text-ink">

              {reviews.filter((r) => r.status === 'Pending').length}

            </div>

            <div className="text-xs text-amber mt-0.5">Awaiting auditor sign-off</div>

          </div>

        </div>

        <div className="chart-card flex h-[132px] flex-col justify-between px-5 py-4">

          <div className="flex items-center justify-between">

            <span className="label-mono">

              In Progress

            </span>

          </div>

          <div>

            <div className="font-mono text-[34px] font-medium leading-none tracking-tight tabular-nums text-ink">

              {reviews.filter((r) => r.status === 'In Progress').length}

            </div>

            <div className="text-xs text-muted mt-0.5">Under active investigation</div>

          </div>

        </div>

        <div className="chart-card flex h-[132px] flex-col justify-between px-5 py-4">

          <div className="flex items-center justify-between">

            <span className="label-mono">

              Resolved

            </span>

          </div>

          <div>

            <div className="font-mono text-[34px] font-medium leading-none tracking-tight tabular-nums text-ink">

              {reviews.filter((r) => r.status === 'Resolved').length}

            </div>

            <div className="text-xs text-ice mt-0.5">Signed off</div>

          </div>

        </div>

        <div className="chart-card flex h-[132px] flex-col justify-between px-5 py-4">

          <div className="flex items-center justify-between">

            <span className="label-mono">

              Escalated

            </span>

          </div>

          <div>

            <div className="font-mono text-[34px] font-medium leading-none tracking-tight tabular-nums text-red">

              {reviews.filter((r) => r.status === 'Escalated').length}

            </div>

            <div className="text-xs text-red/80 mt-0.5">Held for escalation</div>

          </div>

        </div>

      </div>

      {/* Filter Toolbar */}

      <div className="bg-panel border border-line rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">

        {/* Status Tabs */}

        <div className="flex items-center gap-1.5">

          {['All', 'Pending', 'In Progress', 'Resolved', 'Escalated'].map((st) => (

            <button

              key={st}

              onClick={() => setFilterStatus(st)}

              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${

                filterStatus === st

                  ? ' bg-ice text-void shadow-sm'

                  : 'text-muted hover:text-ink hover:bg-raised'

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

            className="h-8 px-2.5 rounded-lg bg-raised border border-line text-xs text-muted focus:outline-none"

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

            className="text-xs text-ice hover:underline px-1"

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

            <span className="font-semibold text-ink">

              Review Queue ({filteredQueue.length})

            </span>

            <span className="text-ice font-mono text-xs flex items-center gap-1">

              <span className="w-1.5 h-1.5 rounded-full bg-ice animate-pulse" />

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

                      ? ' bg-raised border-2 border-line-strong shadow-lg'

                      : 'bg-panel border border-line hover:border-line-strong hover:shadow-md'

                  }`}

                >

                  {isSelected && (

                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-ice rounded-l" />

                  )}

                  <div className="flex items-start justify-between gap-2 mb-1.5">

                    <div className="font-semibold text-xs text-ink truncate">

                      {item.documentTitle}

                    </div>

                    <span className="text-xs font-mono text-muted shrink-0 bg-raised px-1.5 py-0.5 rounded border border-line">

                      {item.documentId}

                    </span>

                  </div>

                  <p className="text-xs text-muted line-clamp-2 leading-relaxed mb-3">

                    {item.issueSummary}

                  </p>

                  <div className="flex items-center gap-2 flex-wrap mb-3 text-xs">

                    <span

                      className={`px-2 py-0.5 rounded font-semibold uppercase text-xs ${

                        item.severity === 'High'

                          ? 'bg-red/15 text-red border border-red/30'

                          : item.severity === 'Medium'

                          ? 'bg-amber/15 text-amber border border-amber/30'

                          : 'bg-raised text-muted'

                      }`}

                    >

                      {item.severity} Severity

                    </span>

                    <span className="px-2 py-0.5 rounded bg-raised text-muted border border-line">

                      {item.affectedAnswers.length} affected answers

                    </span>

                    <span className="text-muted ml-auto">{item.createdAt}</span>

                  </div>

                  <div className="pt-2 border-t border-line flex items-center justify-between text-xs">

                    <StatusBadge status={item.status} size="sm" />

                    <span className="text-muted text-xs">

                      Assignee: <strong className="text-muted">{item.assignee}</strong>

                    </span>

                  </div>

                </div>

              );

            })}

          </div>

        </div>

        {/* Right Panel (7 cols): Selected Review Details */}

        {!selectedReview ? (

          <div className="lg:col-span-7 bg-panel border border-line rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 shadow-sm min-h-[400px]">

            <ShieldCheck className="w-12 h-12 text-ice" />

            <h2 className="text-lg font-bold text-ink">Review Queue Clear</h2>

            <p className="text-xs text-muted max-w-md">

              No knowledge drift alerts or affected copilot answers are currently awaiting auditor review.

            </p>

            <button

              onClick={() => navigate('/dashboard/documents')}

              className="mt-2 px-4 py-2 rounded-lg bg-ice text-void text-xs font-semibold hover:brightness-95 transition-all shadow-sm"

            >

              Inspect Documents

            </button>

          </div>

        ) : (

          <div className="lg:col-span-7 bg-panel border border-line rounded-xl p-6 flex flex-col gap-6 shadow-sm">

            {/* Item Header & Metadata Bar */}

            <div className="pb-4 border-b border-line flex flex-col gap-3">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <h2 className="text-lg font-bold text-ink">

                  {selectedReview.documentTitle} — Policy Drift Review

                </h2>

                <div className="flex items-center gap-2">

                  <StatusBadge status={selectedReview.status} size="sm" />

                  <span className="px-2 py-0.5 rounded bg-raised text-xs font-mono text-muted border border-line">

                    {selectedReview.versionShift}

                  </span>

                </div>

              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted pt-1">

                <div>

                  <span className="text-xs text-muted block">Document</span>

                  <span className="text-ink font-medium">{selectedReview.documentId}</span>

                </div>

                <div>

                  <span className="text-xs text-muted block">Lineage Hash</span>

                  <span className="font-mono text-ice truncate block">{selectedReview.lineageHash}</span>

                </div>

                <div>

                  <span className="text-xs text-muted block">Assignee</span>

                  <span className="text-ink">{selectedReview.assignee}</span>

                </div>

                <div>

                  <span className="text-xs text-muted block">Resolution SLA</span>

                  <span className="text-red font-medium">{selectedReview.timeRemainingSla}</span>

                </div>

              </div>

            </div>

          {/* Section 1: What Changed (Claim Mutation) */}

          <div className="space-y-3">

            <div className="flex items-center justify-between text-xs">

              <span className="font-semibold text-muted">

                1. What Changed (Semantic Claim Mutation)

              </span>

              <span className="text-xs font-mono text-muted">AST Diff Line 42</span>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              <div className="p-3.5 rounded-xl bg-panel border border-line flex flex-col justify-between">

                <span className="text-xs text-muted mb-1">

                  Baseline Claim (v1.0)

                </span>

                <p className="text-xs text-muted leading-relaxed">

                  "{selectedReview.claimMutation?.previousClaim || 'Employees must submit within 30 days.'}"

                </p>

              </div>

              <div className="p-3.5 rounded-xl bg-panel border border-line-strong flex flex-col justify-between">

                <span className="text-xs text-ice mb-1">

                  Current Claim (v2.0 Active)

                </span>

                <p className="text-xs text-ink leading-relaxed">

                  "{selectedReview.claimMutation?.currentClaim || 'Employees must submit within 15 days.'}"

                </p>

              </div>

            </div>

            <div className="p-3 rounded-lg bg-raised border border-line flex items-center justify-between text-xs text-muted">

              <div>

                <strong className="text-ink">Extracted Shift:</strong>{' '}

                {selectedReview.claimMutation?.temporalDelta || 'Temporal window contracted by 15 calendar days (-50%).'}

              </div>

              <span className="font-mono text-ice">99.4% confidence</span>

            </div>

          </div>

          {/* Section 2: Why it was flagged */}

          <div className="p-4 rounded-xl bg-amber/10 border border-amber/30 flex flex-col gap-2 text-xs">

            <div className="flex items-center gap-2 text-amber font-semibold">

              <Shield className="w-4 h-4" />

              <span>Sovereign Protocol Blast Radius Advisory</span>

            </div>

            <p className="text-muted leading-relaxed">

              Three previously generated corporate copilot answers cite the superseded 30-day

              window baseline. If left unmitigated, employees relying on cached agent answers

              may submit claims between day 16 and day 30, which the financial ledger will reject.

            </p>

            <div className="text-xs text-muted flex items-center gap-1.5 pt-1">

              <Lock className="w-3.5 h-3.5 text-amber" />

              <span>Automated purge disabled by governance lock • Auditor validation mandatory</span>

            </div>

          </div>

          {/* Section 3: Potentially Affected Copilot Answers */}

          <div className="space-y-3">

            <div className="flex items-center justify-between text-xs">

              <span className="font-semibold text-muted">

                3. Potentially Affected Copilot Answers ({selectedReview.affectedAnswers.length})

              </span>

            </div>

            <div className="space-y-2">

              {selectedReview.affectedAnswers.map((ans) => (

                <div

                  key={ans.id}

                  className="p-3.5 rounded-xl bg-panel border border-line flex flex-col gap-2 text-xs"

                >

                  <div className="flex items-center justify-between">

                    <span className="font-semibold text-ink">

                      "{ans.queryPrompt}"

                    </span>

                    <StatusBadge status={ans.impactStatus} size="sm" />

                  </div>

                  <div className="text-xs text-muted">Agent: {ans.agentName}</div>

                  <div className="p-2 rounded bg-panel font-mono text-xs text-red">

                    Superseded Output: "{ans.cachedAnswer}"

                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1 text-xs">

                    <button

                      onClick={() => navigate('/dashboard/impact')}

                      className="text-ice hover:underline"

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

                      className="text-ice hover:underline"

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

            <span className="font-semibold text-xs text-muted">

              4. Auditor Evaluation Notes & Disposition

            </span>

            <textarea

              rows={3}

              value={auditorNotes}

              onChange={(e) => setAuditorNotes(e.target.value)}

              placeholder="Add auditor evaluation notes, remediation rationale, or compliance exemption details..."

              className="w-full bg-panel border border-line rounded-xl p-3 text-xs text-ink placeholder:text-muted focus:outline-none focus:border-line-strong"

            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">

              <div>

                <label className="text-xs text-muted block mb-1">

                  Assignee Lead

                </label>

                <select

                  value={assigneeLead}

                  onChange={(e) => setAssigneeLead(e.target.value)}

                  className="w-full h-8 px-2.5 rounded-lg bg-panel border border-line text-xs text-ink"

                >

                  <option>S. Vance (CISO / AI Safety Lead)</option>

                  <option>E. Kowalski (HR-Ops)</option>

                  <option>Compliance Committee Pool</option>

                </select>

              </div>

              <div>

                <label className="text-xs text-muted block mb-1">

                  Disposition State

                </label>

                <select

                  value={dispositionState}

                  onChange={(e) => setDispositionState(e.target.value)}

                  className="w-full h-8 px-2.5 rounded-lg bg-panel border border-line text-xs text-ink"

                >

                  <option>Status: Ready for Decision</option>

                  <option>Status: Further Legal Review Required</option>

                  <option>Status: False Positive Candidate</option>

                </select>

              </div>

            </div>

            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer mt-1">

              <input

                type="checkbox"

                checked={logToImmutableLedger}

                onChange={(e) => setLogToImmutableLedger(e.target.checked)}

                className="w-4 h-4 rounded bg-panel text-ice"

              />

              <span>Log decision and evidence hash into immutable cryptographic audit trail (SEC-EAL6)</span>

            </label>

          </div>

          {/* Collapsible Timeline */}

          <div className="border border-line rounded-xl p-3 bg-panel">

            <button

              onClick={() => setIsTimelineOpen(!isTimelineOpen)}

              className="w-full flex items-center justify-between text-xs text-muted hover:text-ink"

            >

              <div className="flex items-center gap-2">

                <History className="w-4 h-4 text-muted" />

                <span>Audit Trail & Provenance Timeline ({selectedReview.reviewHistory.length} events)</span>

              </div>

              <ChevronDown

                className={`w-4 h-4 transition-transform ${

                  isTimelineOpen ? 'rotate-180' : ''

                }`}

              />

            </button>

            {isTimelineOpen && (

              <div className="mt-3 pt-3 border-t border-line space-y-2 text-xs">

                {selectedReview.reviewHistory.map((h, i) => (

                  <div key={i} className="flex items-start gap-2.5 text-xs">

                    <span className="text-muted font-mono shrink-0 w-16">

                      {h.timestamp}

                    </span>

                    <span className="w-1.5 h-1.5 rounded-full bg-ice mt-1 shrink-0" />

                    <div className="min-w-0">

                      <span className="text-ink font-medium">{h.action}</span>

                      <span className="text-muted ml-2">by {h.actor}</span>

                      <p className="text-muted mt-0.5">{h.details}</p>

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

      <div className="fixed bottom-0 left-[232px] right-0 min-h-16 bg-panel border-t border-line z-30 px-7 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 ">

        <div className="flex items-center gap-2.5">

          <button

            onClick={() => setConfirmAction('escalate')}

            className="h-9 px-3.5 rounded-lg bg-red/10 border border-red/30 text-xs font-medium text-red hover:bg-red hover:text-ink transition-colors flex items-center gap-1.5"

          >

            <Gavel className="w-3.5 h-3.5" />

            <span>Escalate to Committee</span>

          </button>

          <button

            onClick={() => setConfirmAction('dismiss')}

            className="h-9 px-3.5 rounded-lg bg-raised border border-line text-xs font-medium text-muted hover:text-ink hover:bg-line-strong transition-colors flex items-center gap-1.5"

          >

            <XCircle className="w-3.5 h-3.5" />

            <span>Dismiss (False Positive)</span>

          </button>

        </div>

        <div className="flex items-center gap-3">

          <div className="text-xs text-right text-muted hidden xl:block">

            <div>Audit ID: <strong className="font-mono text-ink">AUD-88219</strong></div>

            <div>Human verification required before answers change</div>

          </div>

          <button

            onClick={() => setConfirmAction('refresh_answers')}

            className="h-9 px-4 rounded-lg bg-raised border border-line-strong text-xs font-medium text-ice hover:bg-ice/10 transition-colors flex items-center gap-2"

          >

            <RotateCw className="w-3.5 h-3.5" />

            <span>Refresh Affected Answers (3)</span>

          </button>

          <button

            onClick={() => setConfirmAction('mark_reviewed')}

            className="h-9 px-5 rounded-lg bg-ice hover:brightness-95 text-xs font-semibold text-void transition-all flex items-center gap-2 shadow-lg "

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
