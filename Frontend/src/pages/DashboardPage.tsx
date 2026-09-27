import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  GitCompare,
  Network,
  Clock,
  Upload,
  Activity,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Shield,
  Download,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useApp } from '../context/AppContext';
import { DEMO_ACTIVITY_CHART } from '../data/demoData';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { documents, reviews, isLiveMode } = useApp();
  const [timeRange, setTimeRange] = useState<'7D' | '14D' | '30D' | '90D'>('30D');
  const [filterQuery, setFilterQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter recent document changes table
  const filteredDocs = documents.filter((doc) => {
    const matchesQuery =
      doc.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      doc.id.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesStatus =
      filterStatus === 'All' || doc.integrityStatus === filterStatus;
    const matchesType =
      filterType === 'All' ||
      (filterType === 'Deadline' && doc.activeDiffSummary?.includes('deadline')) ||
      (filterType === 'Requirement' && doc.activeDiffSummary?.includes('SLA')) ||
      (filterType === 'Retention' && doc.activeDiffSummary?.includes('retention'));
    return matchesQuery && matchesStatus && matchesType;
  });

  const pageSize = 5;
  const totalPages = Math.ceil(filteredDocs.length / pageSize) || 1;
  const paginatedDocs = filteredDocs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="flex flex-col gap-7 animate-in fade-in duration-200">
      {/* Top Header & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] text-[11px] font-medium uppercase tracking-wider border border-[#263247]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
              Telemetry Engine Active
            </span>
            <span className="text-[#64748B] text-[11px] font-mono">
              SYS_ID: ICE-0941
            </span>
            {!isLiveMode && (
              <span className="text-[11px] text-[#F59E0B] font-mono px-1.5 py-0.2 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                [DEMO DATA]
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
            Knowledge Integrity Overview
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Monitor document integrity, track knowledge changes, and review
            potentially affected AI answers.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          <div className="flex items-center bg-[#111827] border border-[#263247] rounded-lg p-0.5">
            {(['7D', '14D', '30D', '90D'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === r
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('/audit')}
            className="h-9 px-3.5 rounded-lg bg-[#1E293B] border border-[#263247] text-xs font-medium text-[#F8FAFC] hover:bg-[#263247] transition-colors flex items-center gap-2"
          >
            <Activity className="w-4 h-4 text-[#94A3B8]" />
            <span>View activity</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="h-9 px-4 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-xs font-medium text-white transition-colors flex items-center gap-2 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload document</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
            Operational Health Indicators
          </span>
          <span className="text-[11px] text-[#64748B] flex items-center gap-1 font-mono">
            {isLiveMode
              ? 'Live FastAPI Backend Sync • Real SQLite & ChromaDB Metrics'
              : 'All sample metrics represent illustrative governance data'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard
            title="Monitored Documents"
            value={isLiveMode ? documents.length : '128'}
            subtext={isLiveMode ? 'Active documents in SQLite' : 'Documents currently tracked'}
            icon={<FileText className="w-5 h-5 text-[#3B82F6]" />}
            accentColor="blue"
            trendText={isLiveMode ? 'Live' : '+4 mo'}
            trendType="positive"
            onClick={() => navigate('/documents')}
          />
          <MetricCard
            title="Changes Detected"
            value={
              isLiveMode
                ? documents.reduce(
                    (acc, d) =>
                      acc + (d.diffCount || (d.integrityStatus === 'Review required' ? 1 : 0)),
                    0
                  )
                : '12'
            }
            subtext={isLiveMode ? 'Document version diffs' : 'In selected 30d period'}
            icon={<GitCompare className="w-5 h-5 text-[#F59E0B]" />}
            accentColor="amber"
            trendText={isLiveMode ? `${reviews.filter((r) => r.status === 'Pending').length} pending` : '3 pending'}
            trendType="warning"
            onClick={() => navigate('/documents')}
          />
          <MetricCard
            title="Potentially Affected Answers"
            value={
              isLiveMode
                ? reviews.filter((r) => r.status !== 'Resolved').length
                : '7'
            }
            subtext={isLiveMode ? 'Flagged downstream answers' : 'Awaiting impact triage'}
            icon={<Network className="w-5 h-5 text-[#EF4444]" />}
            accentColor="red"
            trendText={isLiveMode ? 'Tracked' : 'High risk'}
            trendType="critical"
            onClick={() => navigate('/impact')}
          />
          <MetricCard
            title="Pending Reviews"
            value={reviews.filter((r) => r.status === 'Pending').length}
            subtext={isLiveMode ? 'Awaiting auditor resolution' : 'Items awaiting human sign-off'}
            icon={<Clock className="w-5 h-5 text-[#F59E0B]" />}
            accentColor="amber"
            trendText={isLiveMode ? 'Queue' : 'Avg 4.2h'}
            trendType="neutral"
            onClick={() => navigate('/reviews')}
          />
        </div>
      </div>

      {/* Middle Section: Integrity Activity Chart + Requires Attention Priority Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Integrity Activity Chart (7 cols) */}
        <div className="lg:col-span-7 rounded-xl bg-[#111827] border border-[#263247] p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#263247]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[#F8FAFC]">
                    Integrity Activity
                  </h2>
                  <span className="px-1.5 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] text-[10px] font-mono">
                    Real-time sync
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Document changes vs impacted AI answers across the last 30 days
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                  <span className="text-[#94A3B8]">Document Changes (12)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="text-[#94A3B8]">Impacted Answers (7)</span>
                </div>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="w-full h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={DEMO_ACTIVITY_CHART}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorChanges" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorImpacted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#263247" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderColor: '#3B82F6',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="changes"
                    name="Document Changes"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorChanges)"
                  />
                  <Area
                    type="monotone"
                    dataKey="impacted"
                    name="Impacted Answers"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorImpacted)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1A2438] flex items-center justify-between text-xs text-[#64748B]">
            <span>Significant anomaly spike detected on Jun 10 (Reimbursement Policy v2)</span>
            <span className="font-mono text-[#3B82F6] cursor-pointer hover:underline" onClick={() => navigate('/impact')}>
              Inspect Vector Cluster →
            </span>
          </div>
        </div>

        {/* Right Column: Requires Attention Panel (5 cols) */}
        <div className="lg:col-span-5 rounded-xl bg-[#111827] border border-[#263247] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#263247]">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#F8FAFC]">
                  Requires Attention
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] text-xs font-semibold border border-[#F59E0B]/30">
                  {reviews.filter((r) => r.status === 'Pending').length} Pending
                </span>
              </div>
              <button
                onClick={() => navigate('/reviews')}
                className="text-xs text-[#3B82F6] hover:underline"
              >
                View all alerts
              </button>
            </div>

            {/* List */}
            <div className="flex flex-col divide-y divide-[#1A2438]">
              {isLiveMode ? (
                reviews.filter((r) => r.status === 'Pending').length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#64748B]">
                    No pending policy drift alerts requiring human sign-off.
                  </div>
                ) : (
                  reviews
                    .filter((r) => r.status === 'Pending')
                    .slice(0, 3)
                    .map((item) => (
                      <div key={item.id} className="py-3.5 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] flex items-center justify-center shrink-0 mt-0.5">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-[#F8FAFC] truncate">
                                {item.documentTitle}
                              </span>
                              <StatusBadge status={item.status} size="sm" />
                            </div>
                            <p className="text-xs text-[#94A3B8] mt-1 line-clamp-1">
                              {item.issueSummary}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748B]">
                              <span>{item.timestamp}</span>
                              <span>•</span>
                              <span className="text-[#F59E0B] font-medium">
                                {item.affectedAgent}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/reviews')}
                          className="shrink-0 px-2.5 py-1 rounded bg-[#1E293B] border border-[#263247] hover:border-[#3B82F6] text-[#F8FAFC] text-xs font-medium transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    ))
                )
              ) : (
                <>
                  {/* Demo Item 1 */}
                  <div className="py-3.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[#F8FAFC] truncate">
                            Employee Reimbursement Policy
                          </span>
                          <StatusBadge status="Review required" size="sm" />
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          A deadline changed from 30 days to 15 days.
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748B]">
                          <span>Detected today, 10:42 AM</span>
                          <span>•</span>
                          <span className="text-[#F59E0B] font-medium">
                            3 AI answers impacted
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/documents/DOC-7704/compare')}
                      className="shrink-0 px-2.5 py-1 rounded bg-[#1E293B] border border-[#263247] hover:border-[#3B82F6] text-[#F8FAFC] text-xs font-medium transition-colors"
                    >
                      Review Diff
                    </button>
                  </div>

                  {/* Demo Item 2 */}
                  <div className="py-3.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center shrink-0 mt-0.5">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[#F8FAFC] truncate">
                            Vendor Security Standard
                          </span>
                          <StatusBadge status="Impact analysis" size="sm" />
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          A requirement changed between document versions.
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748B]">
                          <span>Detected today, 9:18 AM</span>
                          <span>•</span>
                          <span className="text-[#3B82F6] font-medium">
                            2 AI answers impacted
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/impact')}
                      className="shrink-0 px-2.5 py-1 rounded bg-[#1E293B] border border-[#263247] hover:border-[#3B82F6] text-[#F8FAFC] text-xs font-medium transition-colors"
                    >
                      Analyze
                    </button>
                  </div>

                  {/* Demo Item 3 */}
                  <div className="py-3.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[#F8FAFC] truncate">
                            Data Retention Policy
                          </span>
                          <StatusBadge status="Pending review" size="sm" />
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          A potentially affected answer was identified.
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748B]">
                          <span>Detected yesterday, 4:15 PM</span>
                          <span>•</span>
                          <span className="text-[#F59E0B] font-medium">
                            1 AI answer impacted
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/reviews')}
                      className="shrink-0 px-2.5 py-1 rounded bg-[#1E293B] border border-[#263247] hover:border-[#3B82F6] text-[#F8FAFC] text-xs font-medium transition-colors"
                    >
                      Assess
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#263247] flex items-center justify-between text-xs text-[#64748B]">
            <span>
              {isLiveMode
                ? `${reviews.filter((r) => r.status === 'Pending').length} pending items in governance queue`
                : '3 items require senior CISO sign-off'}
            </span>
            <button
              onClick={() => navigate('/reviews')}
              className="text-[#3B82F6] hover:underline flex items-center gap-1"
            >
              <span>Open Human Review Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Document Changes Table */}
      <div className="rounded-xl bg-[#111827] border border-[#263247] overflow-hidden flex flex-col">
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-[#263247] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#F8FAFC]">
                Recent Document Changes
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] text-xs font-mono">
                {documents.length} Events
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Audit trail of document revisions and automated AI answer reconciliation.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative w-60">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => {
                  setFilterQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter document changes..."
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#94A3B8] focus:outline-none focus:border-[#3B82F6] cursor-pointer"
            >
              <option value="All">All types</option>
              <option value="Deadline">Deadline changed</option>
              <option value="Requirement">Requirement changed</option>
              <option value="Retention">Retention period</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#94A3B8] focus:outline-none focus:border-[#3B82F6] cursor-pointer"
            >
              <option value="All">All statuses</option>
              <option value="Review required">Review required</option>
              <option value="Impact analysis">Impact analysis</option>
              <option value="Pending review">Pending review</option>
              <option value="No impact detected">No impact detected</option>
              <option value="Verified">Verified</option>
            </select>

            <button
              onClick={() => {
                const csvData = documents.map(d => `${d.id},"${d.title}",${d.currentVersion},"${d.integrityStatus}",${d.affectedAnswerCount}`).join('\n');
                const blob = new Blob([`ID,Title,Version,Status,AffectedAnswers\n${csvData}`], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `document_changes_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
              }}
              className="h-8 px-2.5 rounded-lg bg-[#1E293B] border border-[#263247] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center gap-1.5 text-xs transition-colors"
              title="Export changes to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="h-10 bg-[#1E293B]/70 border-b border-[#263247] text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
                <th className="px-5">Document Name</th>
                <th className="px-4">Change Type</th>
                <th className="px-4">Version</th>
                <th className="px-4">Affected Answers</th>
                <th className="px-4">Last Updated</th>
                <th className="px-4">Status</th>
                <th className="px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2438] text-xs">
              {paginatedDocs.map((doc) => {
                let changeLabel = 'Wording updated';
                if (doc.activeDiffSummary?.includes('deadline')) changeLabel = 'Deadline changed';
                else if (doc.activeDiffSummary?.includes('SLA')) changeLabel = 'Requirement changed';
                else if (doc.activeDiffSummary?.includes('retention')) changeLabel = 'Retention period';
                else if (doc.integrityStatus === 'Verified') changeLabel = 'Clause updated';

                return (
                  <tr
                    key={doc.id}
                    className="h-14 hover:bg-[#1E293B]/40 transition-colors"
                  >
                    <td className="px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1E293B] border border-[#263247] flex items-center justify-center text-[#3B82F6] shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            className="font-medium text-[#F8FAFC] hover:text-[#3B82F6] cursor-pointer"
                          >
                            {doc.title}
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            {doc.department} • {doc.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4">
                      <span className="px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] text-[11px] border border-[#263247]">
                        {changeLabel}
                      </span>
                    </td>

                    <td className="px-4 font-mono text-[11px] text-[#F8FAFC]">
                      {doc.currentVersion}
                    </td>

                    <td className="px-4">
                      {doc.affectedAnswerCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] font-medium text-[11px] border border-[#F59E0B]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                          {doc.affectedAnswerCount} answers
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E293B] text-[#64748B] text-[11px]">
                          0 answers
                        </span>
                      )}
                    </td>

                    <td className="px-4 text-[#94A3B8] whitespace-nowrap">
                      {doc.lastModified}
                    </td>

                    <td className="px-4">
                      <StatusBadge status={doc.integrityStatus} size="sm" />
                    </td>

                    <td className="px-5 text-right">
                      <button
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="h-7 px-2.5 rounded bg-[#1E293B] border border-[#263247] hover:border-[#3B82F6] text-[#F8FAFC] text-xs font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        <span>View details</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-[#263247] bg-[#111827] flex items-center justify-between text-xs text-[#94A3B8]">
          <div>
            Showing <strong className="text-[#F8FAFC]">{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredDocs.length)}</strong> of{' '}
            <strong className="text-[#F8FAFC]">{filteredDocs.length}</strong> document changes
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 px-2.5 rounded bg-[#1E293B] border border-[#263247] text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-[11px] font-mono px-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 px-2.5 rounded bg-[#1E293B] border border-[#263247] text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
