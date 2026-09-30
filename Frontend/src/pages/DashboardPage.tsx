import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  GitCompare,
  Network,
  Clock,
  Upload,
  Activity,
  ArrowRight,
  AlertTriangle,
  Download,
  Filter,
} from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CountUp, EmptyState } from '../components/ui/primitives';
import { AgentHero } from '../components/ui/AgentHero';
import { AXIS_TICK, Bars, GlassTooltip, GRID_STROKE, SegmentTabs, SERIES, StatCard } from '../components/ui/ChartKit';
import { useApp } from '../context/AppContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Statuses that mean "nothing unresolved" for a document.
const CLEAR = new Set(['Verified', 'No impact detected', 'No changes detected', 'Resolved']);
const CRITICAL = /critical|conflict|outdated|escalated/i;

const toneOf = (status: string) => (CLEAR.has(status) ? 'ice' : CRITICAL.test(status) ? 'red' : 'amber');

/** Reveals are handled globally by usePopOnScroll in the layout. */
const Rise: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { documents, reviews, auditEvents, isLiveMode, isLoading } = useApp();

  const [filterQuery, setFilterQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [series, setSeries] = useState<'all' | 'changes' | 'flagged'>('all');

  // Filter recent document changes table
  const filteredDocs = documents.filter((doc) => {
    const matchesQuery =
      doc.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      doc.id.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || doc.integrityStatus === filterStatus;
    const matchesType =
      filterType === 'All' ||
      (filterType === 'Deadline' && doc.activeDiffSummary?.includes('deadline')) ||
      (filterType === 'Requirement' && doc.activeDiffSummary?.includes('SLA')) ||
      (filterType === 'Retention' && doc.activeDiffSummary?.includes('retention'));
    return matchesQuery && matchesStatus && matchesType;
  });

  const pageSize = 5;
  const totalPages = Math.ceil(filteredDocs.length / pageSize) || 1;
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Values shown on this page, all derived from what the context already holds.
  const changesDetected = documents.reduce(
    (acc, d) => acc + (d.diffCount || (d.integrityStatus === 'Review required' ? 1 : 0)),
    0
  );
  const affectedAnswers = reviews.filter((r) => r.status !== 'Resolved').length;
  const pending = reviews.filter((r) => r.status === 'Pending');
  const clearDocs = documents.filter((d) => CLEAR.has(d.integrityStatus)).length;
  const integrity = documents.length ? Math.round((clearDocs / documents.length) * 100) : null;
  const heroTone = integrity === null ? 'muted' : integrity >= 90 ? 'ice' : integrity >= 60 ? 'amber' : 'red';

  const verdict =
    documents.length === 0
      ? 'No documents are being monitored yet. Upload a source to seal its first fingerprint.'
      : documents.length - clearDocs === 0 && pending.length === 0
        ? `All ${documents.length} monitored documents match their fingerprints. No AI answers need review.`
        : `${documents.length - clearDocs} of ${documents.length} documents have unresolved changes, ${affectedAnswers} AI answer${
            affectedAnswers === 1 ? '' : 's'
          } may be affected, and ${pending.length} review${pending.length === 1 ? ' is' : 's are'} waiting.`;

  // Activity by day, from audit events (the same list the Audit Log shows).
  const activity = useMemo(() => {
    const days = new Map<string, { date: string; changes: number; impacted: number }>();
    [...auditEvents].reverse().forEach((e) => {
      const date = (e.timestamp || '').split(',')[0].split('•')[0].trim();
      if (!date || date === 'Unknown') return;
      const row = days.get(date) ?? { date, changes: 0, impacted: 0 };
      if (e.eventType === 'Potential Impact Identified') row.impacted += 1;
      else if (
        e.eventType === 'Document Uploaded' ||
        e.eventType === 'New Version Added' ||
        e.eventType === 'Version Comparison Completed'
      )
        row.changes += 1;
      days.set(date, row);
    });
    return [...days.values()];
  }, [auditEvents]);
  const totalChanges = activity.reduce((a, r) => a + r.changes, 0);
  const totalImpacted = activity.reduce((a, r) => a + r.impacted, 0);

  const readiness: [string, number][] = [
    ['Sources clear', documents.length ? clearDocs / documents.length : 0],
    ['Reviews resolved', reviews.length ? reviews.filter((r) => r.status === 'Resolved').length / reviews.length : 0],
  ];

  const btn =
    'inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-raised px-3.5 text-sm text-ink transition-colors hover:border-ice/40 hover:bg-raised-2';

  return (
    <div className="flex flex-col gap-10">
      <AgentHero pending={pending.length} changed={documents.length - clearDocs} />

      {/* Hero: knowledge integrity */}
      <section className="ruler relative overflow-hidden rounded-[10px] border border-line bg-panel">
        <div aria-hidden className="ice-glow pointer-events-none absolute -left-24 -top-24 h-[420px] w-[620px]" />
        <div className="relative grid gap-10 p-8 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <div className="flex items-center gap-3 text-sm text-ink-2">
              Knowledge integrity
              {!isLiveMode && (
                <span className="rounded-full border border-amber/30 px-2 py-0.5 text-xs text-amber">Demo data</span>
              )}
            </div>
            <div className="mt-4 flex items-end gap-3">
              <span
                className={`display text-[112px] leading-[0.85] ${
                  heroTone === 'ice'
                    ? 'text-ice'
                    : heroTone === 'amber'
                      ? 'text-amber'
                      : heroTone === 'red'
                        ? 'text-red'
                        : 'text-muted'
                }`}
              >
                {integrity === null ? '—' : <CountUp value={integrity} />}
              </span>
              {integrity !== null && <span className="display pb-2 text-5xl text-muted">%</span>}
            </div>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-ink">
              {isLoading && documents.length === 0 ? 'Reading the knowledge base…' : verdict}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate('/dashboard/documents')} className="btn btn-primary">
                <Upload className="h-4 w-4" /> Upload document
              </button>
              <button type="button" onClick={() => navigate('/dashboard/impact')} className={btn}>
                <Network className="h-4 w-4 text-muted" /> Trace impact
              </button>
              <button type="button" onClick={() => navigate('/dashboard/audit')} className="btn btn-ghost">
                <Activity className="h-4 w-4" /> View activity
              </button>
            </div>
          </div>

          {/* One mark per document, coloured by its status */}
          <div>
            <div className="flex items-baseline justify-between text-xs text-muted">
              <span>Each mark is a monitored document</span>
              <span className="tabular-nums">
                {clearDocs} clear · {documents.length - clearDocs} changed
              </span>
            </div>
            <div className="mt-3 flex h-24 items-end gap-[3px] border-b border-line-strong pb-px">
              {documents.length === 0 ? (
                <div className="w-full self-center text-center text-sm text-muted">No documents yet</div>
              ) : (
                documents.map((d) => {
                  const t = toneOf(d.integrityStatus);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => navigate(`/dashboard/documents/${d.id}`)}
                      title={`${d.title} · ${d.integrityStatus}`}
                      aria-label={`${d.title}, ${d.integrityStatus}`}
                      className={`min-w-[3px] max-w-4 flex-1 rounded-t-[2px] opacity-80 transition-opacity duration-200 hover:opacity-100 ${
                        t === 'ice' ? 'h-[45%] bg-ice/60' : t === 'amber' ? 'h-full bg-amber/85' : 'h-full bg-red/85'
                      }`}
                    />
                  );
                })
              )}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-ice" /> Clear
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" /> Needs review
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red" /> Conflict
              </span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 border-t border-line p-4 lg:grid-cols-4">
          <MetricCard
            title="Monitored documents"
            value={documents.length}
            subtext={isLiveMode ? 'Active documents in SQLite' : 'Documents currently tracked'}
            icon={<FileText />}
            accentColor="green"
            onClick={() => navigate('/dashboard/documents')}
          />
          <MetricCard
            title="Changes detected"
            value={changesDetected}
            subtext="Document version diffs"
            icon={<GitCompare />}
            accentColor="amber"
            onClick={() => navigate('/dashboard/documents')}
          />
          <MetricCard
            title="Potentially affected answers"
            value={affectedAnswers}
            subtext="Flagged downstream answers"
            icon={<Network />}
            accentColor="pink"
            onClick={() => navigate('/dashboard/impact')}
          />
          <MetricCard
            title="Pending reviews"
            value={pending.length}
            subtext="Awaiting human sign-off"
            icon={<Clock />}
            accentColor="amber"
            onClick={() => navigate('/dashboard/reviews')}
          />
        </div>
      </section>

      {/* Activity: chart card + stat stack */}
      <Rise>
        <section className="grid gap-5 lg:grid-cols-12">
          <div className="chart-card lg:col-span-8">
            <SegmentTabs
              value={series}
              onChange={setSeries}
              options={[
                { value: 'all', label: 'All' },
                { value: 'changes', label: 'Changes' },
                { value: 'flagged', label: 'Flagged' },
              ]}
            />
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="label-mono">
                    {series === 'all' ? 'Integrity activity (events / day)' : series === 'changes' ? 'Document changes (per day)' : 'Flagged answers (per day)'}
                  </div>
                  <div className="mt-1 text-sm text-muted">From the audit log</div>
                </div>
                <div className="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.12em] text-ink-2">
                  {series !== 'flagged' && (
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: series === 'all' ? SERIES.changes.stroke : SERIES.solo.stroke }} /> Changes {totalChanges}
                    </span>
                  )}
                  {series !== 'changes' && (
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: series === 'all' ? SERIES.flagged.stroke : SERIES.solo.stroke }} /> Flagged {totalImpacted}
                    </span>
                  )}
                </div>
              </div>
              {activity.length === 0 ? (
                <EmptyState
                  title="No activity recorded yet."
                  body="Uploads, version comparisons and flagged answers will chart here."
                />
              ) : (
                <div className="mt-6 h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activity} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        {(['solo', 'changes', 'flagged'] as const).map((k) => (
                          <linearGradient key={k} id={`bi-${k}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={SERIES[k].fill} stopOpacity={k === 'flagged' ? 0.16 : k === 'solo' ? 0.5 : 0.34} />
                            <stop offset="100%" stopColor={SERIES[k].fill} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid stroke={GRID_STROKE} strokeDasharray="2 6" vertical={false} />
                      <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} dy={8} />
                      <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'rgb(160 175 255 / 0.3)', strokeDasharray: '3 4' }} />
                      {series !== 'flagged' && (
                        <Area
                          key={`c-${series}`}
                          type="linear"
                          dataKey="changes"
                          name="Changes"
                          stroke={series === 'all' ? SERIES.changes.stroke : SERIES.solo.stroke}
                          strokeWidth={1.75}
                          fill={`url(#bi-${series === 'all' ? 'changes' : 'solo'})`}
                          dot={false}
                          activeDot={{ r: 5, fill: '#0b1230', stroke: series === 'all' ? '#7FE3FF' : '#8B9BFF', strokeWidth: 2 }}
                          animationDuration={900}
                        />
                      )}
                      {series !== 'changes' && (
                        <Area
                          key={`f-${series}`}
                          type="linear"
                          dataKey="impacted"
                          name="Flagged"
                          stroke={series === 'all' ? SERIES.flagged.stroke : SERIES.solo.stroke}
                          strokeWidth={1.5}
                          fill={`url(#bi-${series === 'all' ? 'flagged' : 'solo'})`}
                          dot={false}
                          activeDot={{ r: 5, fill: '#0b1230', stroke: series === 'all' ? '#FFB547' : '#8B9BFF', strokeWidth: 2 }}
                          animationDuration={1100}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:col-span-4">
            <StatCard
              label="Flagged answers"
              value={<CountUp value={affectedAnswers} />}
              chip={`${pending.length} pending`}
              tone="amber"
              note="Answers built on sources that have since changed."
            />
            <Bars label="Knowledge readiness" items={readiness} className="flex-1" />
          </div>
        </section>
      </Rise>

      {/* Requires attention */}
      <Rise>
        <section>
          <div className="flex items-end justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-[17px] font-medium text-ink">Requires attention</h2>
              <p className="mt-0.5 text-sm text-muted">{pending.length} pending in the review queue</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/reviews')}
              className="text-sm text-ice transition-colors hover:text-ink"
            >
              View all
            </button>
          </div>
          {pending.length === 0 ? (
            <EmptyState
              title="Nothing is waiting for sign-off."
              body="New changes that touch AI answers will appear here."
            />
          ) : (
            <ol className="grid gap-x-10 md:grid-cols-2">
              {pending.slice(0, 4).map((item) => (
                <li key={item.id} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/reviews')}
                    className="group grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 py-3.5 text-left"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink group-hover:text-ice">{item.documentTitle}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[13px] text-ink-2">{item.issueSummary}</span>
                      <span className="mt-1 flex gap-2 font-mono text-xs text-muted">
                        <span>{item.timestamp || item.createdAt}</span>
                        {item.affectedAgent && <span className="text-amber/90">{item.affectedAgent}</span>}
                      </span>
                    </span>
                    <ArrowRight className="mt-0.5 h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </Rise>

      {/* Recent document changes */}
      <Rise>
      <section>
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-3 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-[17px] font-medium text-ink">Recent document changes</h2>
            <p className="mt-0.5 text-sm text-muted">
              {documents.length} documents · revisions and the answers they touch
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-60">
              <Filter className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => {
                  setFilterQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter by name or ID"
                aria-label="Filter document changes"
                className="h-9 w-full rounded-md border border-line bg-panel pl-8 pr-3 text-sm text-ink"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Change type"
              className="h-9 cursor-pointer rounded-md border border-line bg-panel px-2.5 text-sm text-ink-2"
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
              aria-label="Status"
              className="h-9 cursor-pointer rounded-md border border-line bg-panel px-2.5 text-sm text-ink-2"
            >
              <option value="All">All statuses</option>
              <option value="Review required">Review required</option>
              <option value="Impact analysis">Impact analysis</option>
              <option value="Pending review">Pending review</option>
              <option value="No impact detected">No impact detected</option>
              <option value="Verified">Verified</option>
            </select>
            <button
              type="button"
              onClick={() => {
                const csvData = documents
                  .map((d) => `${d.id},"${d.title}",${d.currentVersion},"${d.integrityStatus}",${d.affectedAnswerCount}`)
                  .join('\n');
                const blob = new Blob([`ID,Title,Version,Status,AffectedAnswers\n${csvData}`], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `document_changes_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
              }}
              className="btn btn-ghost h-9"
              title="Export changes to CSV"
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <EmptyState
            title={documents.length === 0 ? 'No documents yet.' : 'No documents match these filters.'}
            action={
              documents.length === 0 ? (
                <button type="button" onClick={() => navigate('/dashboard/documents')} className="btn btn-primary">
                  <Upload className="h-4 w-4" /> Upload a document
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="h-10 border-b border-line text-xs text-muted">
                  <th className="px-3 font-normal">Document</th>
                  <th className="px-3 font-normal">Change</th>
                  <th className="px-3 font-normal">Version</th>
                  <th className="px-3 font-normal">Affected answers</th>
                  <th className="px-3 font-normal">Last updated</th>
                  <th className="px-3 font-normal">Status</th>
                  <th className="px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {paginatedDocs.map((doc) => {
                  let changeLabel = 'Wording updated';
                  if (doc.activeDiffSummary?.includes('deadline')) changeLabel = 'Deadline changed';
                  else if (doc.activeDiffSummary?.includes('SLA')) changeLabel = 'Requirement changed';
                  else if (doc.activeDiffSummary?.includes('retention')) changeLabel = 'Retention period';
                  else if (doc.integrityStatus === 'Verified') changeLabel = 'Clause updated';

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
                      className="group h-14 cursor-pointer transition-colors hover:bg-panel"
                    >
                      <td className="px-3">
                        <div className="text-ink group-hover:text-ice">{doc.title}</div>
                        <div className="mt-0.5 text-xs text-muted">
                          {doc.department} · <span className="font-mono">{doc.id}</span>
                        </div>
                      </td>
                      <td className="px-3 text-ink-2">{changeLabel}</td>
                      <td className="px-3 font-mono text-xs text-ink">{doc.currentVersion}</td>
                      <td className="px-3 tabular-nums">
                        {doc.affectedAnswerCount > 0 ? (
                          <span className="text-amber">{doc.affectedAnswerCount} answers</span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 font-mono text-xs text-muted">{doc.lastModified}</td>
                      <td className="px-3">
                        <StatusBadge status={doc.integrityStatus} size="sm" />
                      </td>
                      <td className="px-3 text-right">
                        <ArrowRight className="ml-auto h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredDocs.length > 0 && (
          <div className="flex items-center justify-between border-t border-line py-3 text-sm text-muted">
            <div>
              <span className="tabular-nums text-ink">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredDocs.length)}
              </span>{' '}
              of <span className="tabular-nums text-ink">{filteredDocs.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-ghost h-8"
              >
                Previous
              </button>
              <span className="tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-ghost h-8"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
      </Rise>
    </div>
  );
};
