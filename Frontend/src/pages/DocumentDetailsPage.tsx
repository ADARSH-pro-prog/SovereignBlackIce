import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  GitCompare,
  ShieldAlert,
  ShieldCheck,
  History,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Download,
  Fingerprint,
  RefreshCw,
  Ban,
  Clock,
  CheckCircle,
  MoreVertical,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useApp } from '../context/AppContext';

export const DocumentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { documents, reviews, addToast, isLiveMode } = useApp();

  const [isQuarantineOpen, setIsQuarantineOpen] = useState(false);
  const [isFlushCacheOpen, setIsFlushCacheOpen] = useState(false);
  const [isIntegrityChecking, setIsIntegrityChecking] = useState(false);

  const doc =
    documents.find((d) => d.id === id) ||
    documents[0] || {
      id: 'DOC-7704',
      title: 'Employee Reimbursement Policy',
      department: 'Human Resources',
      currentVersion: 'v2.0',
      previousVersion: 'v1.0',
      lastModified: 'Today, 10:42 AM',
      integrityStatus: 'Review required',
      affectedAnswerCount: 3,
      lastAnalyzed: 'Just now',
      fileSize: '3.4 MB',
      fileType: 'pdf',
      owner: 'HR Operations Group (Lead: E. Kowalski)',
      repositorySource: 'Internal Policy Vault',
      classification: 'Restricted Classification',
      versions: [],
    };

  const liveAffectedAlerts = isLiveMode
    ? reviews.filter((r) => r.documentId === doc.id || r.documentName === doc.title)
    : [];

  const handleRunIntegrityCheck = () => {
    setIsIntegrityChecking(true);
    addToast({
      type: 'info',
      title: 'Integrity Check Initiated',
      message: `Running cryptographic hash validation on ${doc.id}...`,
    });

    setTimeout(() => {
      setIsIntegrityChecking(false);
      addToast({
        type: 'success',
        title: 'Integrity Check Finished',
        message: 'Cryptographic baseline verified. 1 clause divergence identified in v2.0.',
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 pb-16">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted mb-1">
            <Link to="/dashboard/documents" className="text-muted hover:text-ink">
              Documents
            </Link>
            <span>/</span>
            <span className="text-ice">{doc.id}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="display text-[40px] leading-none text-ink">
              {doc.title}
            </h1>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-ice/10 text-ice text-xs font-medium border border-ice/30">
                <span className="w-1.5 h-1.5 rounded-full bg-ice animate-pulse" />
                {doc.currentVersion} ACTIVE
              </span>
              <span className="px-2 py-0.5 rounded bg-raised-2 text-muted text-xs font-mono border border-line-strong">
                {doc.id}
              </span>
              <span className="px-2 py-0.5 rounded bg-raised-2 text-muted text-xs font-mono border border-line-strong">
                {isLiveMode ? 'LIVE API METADATA' : '[DEMO DATA]'}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted mt-1">
            Review document metadata, cryptographic lineage, version shifts, and
            quantified downstream AI risk.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          <button
            onClick={handleRunIntegrityCheck}
            disabled={isIntegrityChecking}
            className="h-9 px-3.5 rounded-lg bg-raised-2 border border-line-strong hover:bg-raised-2 text-xs font-medium text-ink flex items-center gap-2 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-ice" />
            <span>{isIntegrityChecking ? 'Checking...' : 'Run Integrity Check'}</span>
          </button>

          <button
            onClick={() => navigate(`/dashboard/documents/${doc.id}/compare`)}
            className="h-9 px-4 rounded-lg bg-ice hover:bg-ice text-xs font-medium text-void transition-colors flex items-center gap-2 shadow-sm"
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare Versions</span>
          </button>
        </div>
      </div>

      {/* Main 12-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Primary Document Cards */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* 1. Document Summary Card */}
          <div className="bg-raised border border-line-strong rounded-xl p-6 flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-raised-2 border border-line-strong flex items-center justify-center shrink-0 text-red">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-ink">
                      {doc.id === 'DOC-7704'
                        ? 'ERP-Corporate-2026-v2.pdf'
                        : `${doc.title.replace(/\s+/g, '_')}_${doc.currentVersion}.pdf`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-raised-2 text-xs text-muted border border-line-strong">
                      SHA-256 VERIFIED
                    </span>
                  </div>
                  <span className="text-xs text-muted mt-0.5 block">
                    Document instance bound to Knowledge Base shard KB-WEST-09
                  </span>
                </div>
              </div>

              <span className="text-xs font-medium px-2.5 py-1 rounded bg-raised-2 border border-line-strong text-muted">
                {doc.classification || 'Restricted Classification'}
              </span>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-line-strong">
              <div>
                <span className="text-xs text-muted block">
                  Department
                </span>
                <span className="text-sm font-medium text-ink mt-0.5 block">
                  {doc.department}
                </span>
                <span className="text-xs text-muted">Org Node: HR-US-CORP</span>
              </div>
              <div>
                <span className="text-xs text-muted block">
                  Owner / Custodian
                </span>
                <span className="text-sm font-medium text-ink mt-0.5 block">
                  {doc.owner}
                </span>
                <span className="text-xs text-muted">Custodian Lead</span>
              </div>
              <div>
                <span className="text-xs text-muted block">
                  Repository Source
                </span>
                <span className="text-sm font-medium text-ink mt-0.5 block truncate">
                  {doc.repositorySource}
                </span>
                <span className="text-xs text-muted">Automated Webhook</span>
              </div>
              <div>
                <span className="text-xs text-muted block">
                  Lineage Trace
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-muted">v1.0</span>
                  <ArrowRight className="w-3 h-3 text-muted" />
                  <span className="px-1.5 py-0.5 rounded bg-ice/10 text-ice text-xs font-mono font-semibold">
                    {doc.currentVersion}
                  </span>
                </div>
                <span className="text-xs text-muted">Updated Today</span>
              </div>
            </div>

            {/* Assessment State Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-line-strong bg-raised-2/40 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">
                  Integrity Assertion State
                </span>
                <StatusBadge status={doc.integrityStatus} size="sm" pulse />
              </div>
              <div className="flex items-center justify-between border-t md:border-t-0 md:border-l border-line-strong pt-2 md:pt-0 md:pl-4">
                <span className="text-xs text-muted">
                  Predicted AI Knowledge Drift
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-red/15 text-red text-xs font-semibold border border-red/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {doc.affectedAnswerCount} Answers Flagged
                </span>
              </div>
            </div>
          </div>

          {/* 2. Integrity Variance Triggered Alert Card */}
          <div className=" bg-panel border border-amber/40 rounded-xl p-6 relative overflow-hidden">
            <div className="flex flex-col gap-3 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber" />
                  <h3 className="text-base font-semibold text-ink">
                    Integrity Variance Triggered
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber/20 text-amber text-xs font-semibold border border-amber/40">
                  MATERIAL SEMANTIC SHIFT
                </span>
              </div>

              <div className="space-y-1 text-sm">
                <p className="font-medium text-ink">
                  A high-consequence temporal modification was detected between
                  baseline v1.0 and ingested v2.0.
                </p>
                <p className="text-muted leading-relaxed">
                  Clause §4.2 reduces the employee reimbursement submission deadline
                  from{' '}
                  <span className="text-ink font-semibold underline decoration-red decoration-2">
                    30 calendar days
                  </span>{' '}
                  to{' '}
                  <span className="text-ink font-semibold underline decoration-ice decoration-2">
                    15 calendar days
                  </span>
                  .
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-line-strong mt-1">
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>3 downstream RAG answers invalidated</span>
                  <span>•</span>
                  <span>Engine evaluated: Sep 26, 2026 at 10:42 AM</span>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/documents/${doc.id}/compare`)}
                  className="px-3 py-1.5 rounded-lg bg-raised-2 border border-amber/40 text-ink hover:bg-amber/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <span>View Change Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 3. Semantic Diff Extraction Preview */}
          <div className="bg-raised border border-line-strong rounded-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber" />
                <h3 className="text-base font-semibold text-ink">
                  Semantic Diff Extraction
                </h3>
                <span className="text-xs text-muted font-mono">[DEMO DATA] Clause §4.2</span>
              </div>
              <span className="text-xs font-mono text-amber px-2 py-0.5 rounded bg-raised-2 border border-line-strong">
                Claim Mutation Detected
              </span>
            </div>

            {/* Diff Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Baseline v1 */}
              <div className="p-4 rounded-xl bg-void border border-line-strong flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-line-strong text-xs">
                    <span className="text-muted font-medium">Previous Baseline (v1.0)</span>
                    <span className="text-xs font-mono text-muted">ARCHIVED</span>
                  </div>
                  <p className="text-xs font-mono text-muted leading-relaxed">
                    Employees must submit all approved non-travel reimbursement claims within{' '}
                    <span className="bg-red/20 text-red line-through px-1 rounded font-semibold">
                      30 days
                    </span>{' '}
                    of incurring the respective expense event.
                  </p>
                </div>
                <div className="mt-3 text-xs font-mono text-muted">
                  Source Chunk: #CHK-0982-A
                </div>
              </div>

              {/* Active v2 */}
              <div className="p-4 rounded-xl bg-void border border-ice/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-line-strong text-xs">
                    <span className="text-ice font-medium">Active Policy (v2.0)</span>
                    <span className="text-xs font-mono text-ice bg-ice/10 px-1 rounded font-semibold">
                      CURRENT
                    </span>
                  </div>
                  <p className="text-xs font-mono text-ink leading-relaxed">
                    Employees must submit all approved non-travel reimbursement claims within{' '}
                    <span className="bg-ice/20 text-ice px-1 rounded font-bold">
                      15 days
                    </span>{' '}
                    of incurring the respective expense event.
                  </p>
                </div>
                <div className="mt-3 text-xs font-mono text-ice">
                  Ingested Chunk: #CHK-4419-B • Delta: High
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-raised-2/70 border border-line-strong flex items-center justify-between text-xs text-muted">
              <div>
                <strong className="text-ink">Detected Rule Variance:</strong> Filing
                window compressed by 50% (30d → 15d). 0 additional clause conflicts.
              </div>
              <button
                onClick={() => navigate(`/dashboard/documents/${doc.id}/compare`)}
                className="text-ice hover:underline flex items-center gap-1 font-medium"
              >
                <span>Inspect Vector Diff</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4. Potentially Affected Answers Table */}
          <div className="bg-raised border border-line-strong rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 pb-3 flex items-center justify-between border-b border-line-strong">
              <div>
                <h3 className="text-base font-semibold text-ink">
                  Potentially Compromised AI Responses
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Responses generated by downstream agents relying on v1 memory that provide inaccurate guidance.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-red/10 text-red text-xs font-semibold border border-red/30">
                {isLiveMode ? `${liveAffectedAlerts.length} Graph Alerts` : '3 High Drift Risk'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="h-9 bg-raised-2 text-xs font-medium text-muted">
                    <th className="px-5">Query Prompt / Target Answer</th>
                    <th className="px-4">Grounding Claim</th>
                    <th className="px-4">Timestamp</th>
                    <th className="px-4">Impact State</th>
                    <th className="px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-strong text-xs">
                  {isLiveMode ? (
                    liveAffectedAlerts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-muted">
                          No active compromised answers or alert flags for this document in the live graph.
                        </td>
                      </tr>
                    ) : (
                      liveAffectedAlerts.map((alt) => (
                        <tr key={alt.id} className="h-14 hover:bg-raised-2/40 transition-colors">
                          <td className="px-5">
                            <div className="font-medium text-ink">
                              "{alt.question}"
                            </div>
                            <div className="text-xs text-muted">
                              Downstream ID: {alt.answerId}
                            </div>
                          </td>
                          <td className="px-4 text-muted">{alt.affectedClaim}</td>
                          <td className="px-4 text-muted font-mono">{alt.timestamp}</td>
                          <td className="px-4">
                            <StatusBadge status={alt.status} size="sm" pulse={alt.severity === 'Critical'} />
                          </td>
                          <td className="px-5 text-right">
                            <button
                              onClick={() => navigate('/dashboard/reviews')}
                              className="px-2.5 py-1 rounded bg-raised-2 border border-line-strong hover:border-ice text-xs text-ink"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    <>
                      <tr className="h-14 hover:bg-raised-2/40 transition-colors">
                        <td className="px-5">
                          <div className="font-medium text-ink">
                            "How long do I have to submit an expense claim?"
                          </div>
                          <div className="text-xs text-muted">
                            Agent: Slack-Enterprise-Copilot
                          </div>
                        </td>
                        <td className="px-4 text-muted">Filing Deadline (§4.2)</td>
                        <td className="px-4 text-muted font-mono">Yesterday, 3:14 PM</td>
                        <td className="px-4">
                          <StatusBadge status="Review required" size="sm" />
                        </td>
                        <td className="px-5 text-right">
                          <button
                            onClick={() => navigate('/dashboard/reviews')}
                            className="px-2.5 py-1 rounded bg-raised-2 border border-line-strong hover:border-ice text-xs text-ink"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>

                      <tr className="h-14 hover:bg-raised-2/40 transition-colors">
                        <td className="px-5">
                          <div className="font-medium text-ink">
                            "What is the reimbursement submission deadline?"
                          </div>
                          <div className="text-xs text-muted">
                            Agent: HR-SelfService-Portal
                          </div>
                        </td>
                        <td className="px-4 text-muted">Expense filing timeline</td>
                        <td className="px-4 text-muted font-mono">Sep 25, 2026</td>
                        <td className="px-4">
                          <StatusBadge status="Review required" size="sm" />
                        </td>
                        <td className="px-5 text-right">
                          <button
                            onClick={() => navigate('/dashboard/reviews')}
                            className="px-2.5 py-1 rounded bg-raised-2 border border-line-strong hover:border-ice text-xs text-ink"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>

                      <tr className="h-14 bg-red/5 hover:bg-red/10 transition-colors">
                        <td className="px-5">
                          <div className="font-medium text-ink">
                            "Can I submit an expense receipt after 20 days?"
                          </div>
                          <div className="text-xs text-red">
                            Agent: Finance-Auditor-Bot
                          </div>
                        </td>
                        <td className="px-4 text-muted">Late submission exception</td>
                        <td className="px-4 text-muted font-mono">Sep 22, 2026</td>
                        <td className="px-4">
                          <StatusBadge status="Critical Conflict" size="sm" pulse />
                        </td>
                        <td className="px-5 text-right">
                          <button
                            onClick={() => navigate('/dashboard/reviews')}
                            className="px-2.5 py-1 rounded bg-red text-void hover:bg-red text-xs font-medium"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-raised-2 border-t border-line-strong flex items-center justify-between text-xs text-muted">
              <span>
                {isLiveMode
                  ? `Displaying ${liveAffectedAlerts.length} live impact alert(s)`
                  : 'Displaying 3 high-confidence impact vectors identified by graph'}
              </span>
              <button
                onClick={() => navigate('/dashboard/reviews')}
                className="text-ice hover:underline"
              >
                Open Bulk Invalidation Suite →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Version Provenance Timeline & Audit Feed */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* 1. Version History Card */}
          <div className="bg-raised border border-line-strong rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line-strong">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-ice" />
                <h3 className="text-base font-semibold text-ink">
                  Version Provenance
                </h3>
              </div>
              <span className="text-xs text-muted">
                {isLiveMode && doc.versions ? `${doc.versions.length} Records` : '2 Records'}
              </span>
            </div>

            {/* Vertical Timeline */}
            <div className="relative pl-6 flex flex-col gap-4">
              <div className="absolute left-2.5 top-3 bottom-3 w-[1px] bg-raised-2" />

              {isLiveMode && doc.versions && doc.versions.length > 0 ? (
                doc.versions.map((ver, idx) => {
                  const isCurrent = ver.version_number === doc.currentVersion || idx === 0;
                  return (
                    <div key={ver.id || idx} className="relative flex flex-col gap-2">
                      <div
                        className={`absolute -left-6 top-1 w-5 h-5 rounded-full bg-raised border-2 ${
                          isCurrent ? 'border-ice' : 'border-line-strong'
                        } flex items-center justify-center`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCurrent ? 'bg-ice' : 'bg-muted'
                          }`}
                        />
                      </div>
                      <div
                        className={`border rounded-xl p-4 flex flex-col gap-2 ${
                          isCurrent
                            ? 'bg-raised-2/70 border-ice/40'
                            : 'bg-void border-line-strong'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm font-semibold ${
                              isCurrent ? 'text-ink' : 'text-muted'
                            }`}
                          >
                            Version {ver.version_number}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded uppercase font-semibold ${
                              isCurrent
                                ? 'text-ice bg-ice/10 border border-ice/30'
                                : 'text-muted bg-raised-2'
                            }`}
                          >
                            {isCurrent ? 'Active' : 'Archived'}
                          </span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
                          {ver.raw_text
                            ? `${ver.raw_text.slice(0, 110)}...`
                            : `Registered version ${ver.version_number} for ${doc.title}.`}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-line-strong text-xs text-muted">
                          <span>
                            {ver.created_at
                              ? new Date(ver.created_at).toLocaleDateString()
                              : 'System Ingested'}
                          </span>
                          <button
                            onClick={() => navigate(`/dashboard/documents/${doc.id}/compare`)}
                            className="text-ice hover:underline"
                          >
                            Compare
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  {/* Version 2 */}
                  <div className="relative flex flex-col gap-2">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-raised border-2 border-ice flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-ice" />
                    </div>
                    <div className="bg-raised-2/70 border border-ice/40 rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink">
                          Version 2.0
                        </span>
                        <span className="text-xs text-ice bg-ice/10 px-1.5 py-0.5 rounded border border-ice/30 font-semibold">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        Updated submission timeline from 30 to 15 calendar days per executive policy revision.
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-line-strong text-xs text-muted">
                        <span>By HR-Ops-SVC</span>
                        <button
                          onClick={() => navigate(`/dashboard/documents/${doc.id}/compare`)}
                          className="text-ice hover:underline"
                        >
                          Compare
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mutation Connector */}
                  <div className="relative -my-1 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/30 text-xs font-mono">
                      1 Material Clause Divergence
                    </span>
                  </div>

                  {/* Version 1 */}
                  <div className="relative flex flex-col gap-2">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-raised border-2 border-line-strong flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted" />
                    </div>
                    <div className="bg-void border border-line-strong rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-muted">
                          Version 1.0
                        </span>
                        <span className="text-xs text-muted bg-raised-2 px-1.5 py-0.5 rounded">
                          Archived
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        Initial ingestion of enterprise corporate non-travel expenditure handbook baseline.
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-line-strong text-xs text-muted">
                        <span>Genesis Baseline</span>
                        <span>Sep 18, 2026</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 2. Cryptographic Audit Feed */}
          <div className="bg-raised border border-line-strong rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line-strong">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-ice" />
                <h3 className="text-base font-semibold text-ink">
                  Cryptographic Audit Feed
                </h3>
              </div>
              <span className="text-xs font-mono text-ice flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-ice animate-pulse" />
                Live Pipe
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber mt-1.5 shrink-0" />
                <div>
                  <div className="text-ink font-medium">Review Pending</div>
                  <div className="text-xs text-muted">
                    S. Vance assigned as security triage lead
                  </div>
                  <div className="text-xs font-mono text-muted">10:45 AM • SIG: 0x9b4f..33c2</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-red mt-1.5 shrink-0" />
                <div>
                  <div className="text-ink font-medium">Impact Flagged</div>
                  <div className="text-xs text-muted">
                    3 downstream answers flagged for invalidation
                  </div>
                  <div className="text-xs font-mono text-muted">10:42 AM • HASH: #EVT-48902</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-ice mt-1.5 shrink-0" />
                <div>
                  <div className="text-ink font-medium">Comparison Finished</div>
                  <div className="text-xs text-muted">
                    Vector diff calculated in 1.4s by DiffEngine
                  </div>
                  <div className="text-xs font-mono text-muted">10:42 AM</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-ice mt-1.5 shrink-0" />
                <div>
                  <div className="text-ink font-medium">Version 2 Ingested</div>
                  <div className="text-xs text-muted">
                    Uploaded by HR Operations Group
                  </div>
                  <div className="text-xs font-mono text-muted">10:40 AM • BLOB: hr_policy_v2.pdf</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard/audit')}
              className="w-full mt-1 py-1.5 rounded-lg bg-raised-2 border border-line-strong hover:bg-raised-2 text-xs font-medium text-muted hover:text-ink transition-colors"
            >
              Export Immutable Ledger
            </button>
          </div>

          {/* 3. Fast Governance Actions */}
          <div className="bg-raised border border-line-strong rounded-xl p-5 flex flex-col gap-3">
            <span className="text-xs font-medium text-muted">
              Fast Response Actions
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setIsQuarantineOpen(true)}
                className="h-9 px-3 rounded-lg bg-raised-2 border border-line-strong hover:border-red/60 text-xs font-medium text-red hover:bg-red/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Quarantine DOC</span>
              </button>
              <button
                onClick={() => setIsFlushCacheOpen(true)}
                className="h-9 px-3 rounded-lg bg-raised-2 border border-line-strong hover:border-ice/60 text-xs font-medium text-ice hover:bg-ice/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Flush Cache</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs for Fast Actions */}
      <ConfirmDialog
        isOpen={isQuarantineOpen}
        onClose={() => setIsQuarantineOpen(false)}
        onConfirm={() => {
          setIsQuarantineOpen(false);
          addToast({
            type: 'warning',
            title: 'Document Quarantined',
            message: `${doc.title} removed from production retrieval until audited.`,
          });
        }}
        type="danger"
        title="Quarantine Document?"
        description={`This will immediately evict ${doc.title} from ChromaDB knowledge retrieval for all enterprise AI copilots until security lead sign-off.`}
        confirmLabel="Confirm Quarantine"
      />

      <ConfirmDialog
        isOpen={isFlushCacheOpen}
        onClose={() => setIsFlushCacheOpen(false)}
        onConfirm={() => {
          setIsFlushCacheOpen(false);
          addToast({
            type: 'info',
            title: 'RAG Cache Flushed',
            message: `Vector caches citing ${doc.id} invalidated across 3 copilots.`,
          });
        }}
        type="primary"
        title="Flush Downstream RAG Cache?"
        description="This triggers immediate invalidation of cached answers referencing previous versions of this document."
        confirmLabel="Flush Cache"
      />
    </div>
  );
};
