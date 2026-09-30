import React, { useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {

  AlertTriangle,

  ArrowRight,

  CheckCircle,

  ChevronUp,

  Download,

  Eye,

  FileText,

  FolderOpen,

  GitCompare,

  History,

  MoreVertical,

  Search,

  ShieldCheck,

  Sparkles,

  Upload,

  X,

} from 'lucide-react';

import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricCard } from '../components/ui/MetricCard';
import { EmptyState, Hash } from '../components/ui/primitives';

import { useApp } from '../context/AppContext';

export const DocumentsPage: React.FC = () => {

  const navigate = useNavigate();

  const { documents, uploadDocument, addToast } = useApp();

  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(true);

  const [compareBaseline, setCompareBaseline] = useState(true);

  const [selectedBaselineId, setSelectedBaselineId] = useState('DOC-7704');

  const [stagedFile, setStagedFile] = useState<File | null>(null);

  const [uploadProgress, setUploadProgress] = useState(100);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [statusFilter, setStatusFilter] = useState('All');

  const [sourceFilter, setSourceFilter] = useState('All');

  const [sortOption, setSortOption] = useState<'recent' | 'impact' | 'title'>('recent');

  const [currentPage, setCurrentPage] = useState(1);

  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {

    e.preventDefault();

    const file = e.dataTransfer.files?.[0];

    if (file) handleFileSelected(file);

  };

  const handleFileSelected = (file: File) => {

    setStagedFile(file);

    setUploadProgress(100);

  };

  const handleExecuteUpload = async () => {

    if (!stagedFile) {

      addToast({

        type: 'warning',

        title: 'No File Selected',

        message: 'Please choose or drag a file to upload.',

      });

      return;

    }

    setIsAnalyzing(true);

    try {

      await uploadDocument(

        stagedFile,

        compareBaseline ? selectedBaselineId : undefined,

      );

      setStagedFile(null);

    } finally {

      setIsAnalyzing(false);

    }

  };

  const filteredDocuments = documents

    .filter((doc) => {

      const q = searchQuery.toLowerCase();

      const matchesSearch =

        doc.title.toLowerCase().includes(q) ||

        doc.id.toLowerCase().includes(q) ||

        doc.department.toLowerCase().includes(q);

      const matchesStatus =

        statusFilter === 'All' || doc.integrityStatus === statusFilter;

      const matchesSource =

        sourceFilter === 'All' || doc.department === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;

    })

    .sort((a, b) => {

      if (sortOption === 'impact') return b.affectedAnswerCount - a.affectedAnswerCount;

      if (sortOption === 'title') return a.title.localeCompare(b.title);

      return 0;

    });

  const pageSize = 6;

  const totalPages = Math.ceil(filteredDocuments.length / pageSize) || 1;

  const paginatedDocs = filteredDocuments.slice(

    (currentPage - 1) * pageSize,

    currentPage * pageSize,

  );

  const resetFilters = () => {

    setSearchQuery('');

    setStatusFilter('All');

    setSourceFilter('All');

    setSortOption('recent');

    setCurrentPage(1);

  };

  // Display-only values derived from the documents already in context.
  const CLEAR_STATUSES = ['Verified', 'No impact detected', 'No changes detected', 'Resolved'];
  const departments = new Set(documents.map((d) => d.department)).size;
  const needsReview = documents.filter((d) => !CLEAR_STATUSES.includes(d.integrityStatus)).length;
  const affectedTotal = documents.reduce((a, d) => a + (d.affectedAnswerCount || 0), 0);
  const hashOf = (doc: (typeof documents)[number]) =>
    doc.versions?.find((v) => v.version === doc.currentVersion)?.sha256 || doc.versions?.[0]?.sha256;

  const field = 'h-9 rounded-md border border-line bg-panel px-3 text-sm text-ink-2';

  return (
    <div className="flex flex-col gap-10">
      {/* Title */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="display text-[44px] text-ink">Documents</h1>
          <p className="mt-2 max-w-xl text-[15px] text-ink-2">
            Every source is fingerprinted on ingest. Versions, claims and the answers they feed are tracked from here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              addToast({
                type: 'info',
                title: 'Bulk Import',
                message: 'Connecting to Corporate SharePoint / Google Drive sync...',
              })
            }
            className="btn btn-ghost"
          >
            <Download className="h-4 w-4" /> Import documents
          </button>
          <button type="button" onClick={() => setIsUploadPanelOpen(true)} className="btn btn-primary">
            <Upload className="h-4 w-4" /> Upload document
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          title="Total documents"
          value={documents.length}
          subtext={`Across ${departments} department${departments === 1 ? '' : 's'}`}
          icon={<FileText />}
          accentColor="green"
        />
        <MetricCard
          title="Need review"
          value={needsReview}
          subtext="Changed since their baseline"
          icon={<AlertTriangle />}
          accentColor="amber"
        />
        <MetricCard
          title="Answers affected"
          value={affectedTotal}
          subtext="Downstream of changed sources"
          icon={<History />}
          accentColor="amber"
        />
        <MetricCard
          title="Clear"
          value={documents.length - needsReview}
          subtext="Match their fingerprint"
          icon={<CheckCircle />}
          accentColor="green"
        />
      </section>

      {/* Ingest */}
      {isUploadPanelOpen && (
        <section>
          <div className="flex items-end justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-[17px] font-medium text-ink">Add a source</h2>
              <p className="mt-0.5 text-sm text-muted">Hashed, parsed and compared locally. Nothing leaves this machine.</p>
            </div>
            <button type="button" onClick={() => setIsUploadPanelOpen(false)} className="btn btn-ghost h-8">
              Hide <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="grid-marks group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed border-line-strong bg-panel p-8 text-center transition-colors hover:border-ice/50 lg:col-span-7"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              />
              <Upload className="h-7 w-7 text-ice transition-transform duration-300 group-hover:-translate-y-0.5" />
              <div className="display mt-5 text-[28px] text-ink">Drop a document to fingerprint it</div>
              <p className="mt-2 text-sm text-muted">PDF, DOCX, TXT or MD · up to 50 MB</p>
              <span className="btn mt-5 h-9">
                <FolderOpen className="h-4 w-4 text-ice" /> Choose file
              </span>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-5">
              <div className="rounded-[10px] border border-line bg-panel p-4">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={compareBaseline}
                    onChange={(e) => setCompareBaseline(e.target.checked)}
                    className="h-4 w-4 accent-[#7FE3FF]"
                  />
                  Compare against an existing baseline
                </label>
                {compareBaseline && (
                  <div className="mt-3">
                    <label htmlFor="baseline" className="mb-1.5 block text-xs text-muted">
                      Baseline document
                    </label>
                    <select
                      id="baseline"
                      value={selectedBaselineId}
                      onChange={(e) => setSelectedBaselineId(e.target.value)}
                      className={`${field} w-full`}
                    >
                      <option value="DOC-7704">Employee Reimbursement Policy (v1.0) — DOC-7704</option>
                      <option value="DOC-8912">Vendor Security Standard (v3.0) — DOC-8912</option>
                      <option value="DOC-5120">Data Retention Policy (v2.3) — DOC-5120</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex-1 rounded-[10px] border border-line bg-panel p-4">
                {stagedFile ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="h-5 w-5 shrink-0 text-ice" />
                        <div className="min-w-0">
                          <div className="truncate text-sm text-ink">{stagedFile.name}</div>
                          <div className="mt-0.5 font-mono text-xs text-muted">
                            {(stagedFile.size / (1024 * 1024)).toFixed(1)} MB
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStagedFile(null)}
                        aria-label="Remove staged file"
                        className="rounded-md p-1.5 text-muted hover:bg-raised hover:text-ink"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <ol className="mt-5 grid grid-cols-3 gap-2 text-xs">
                      {['Staged', 'Hash & extract', 'Compare'].map((step, i) => {
                        const state = i === 0 ? 'done' : isAnalyzing ? 'active' : 'todo';
                        return (
                          <li key={step}>
                            <div
                              className={`h-0.5 rounded-full ${
                                state === 'done'
                                  ? 'bg-ice'
                                  : state === 'active'
                                    ? 'animate-[breathe_1.4s_ease-in-out_infinite] bg-ice/70'
                                    : 'bg-line-strong'
                              }`}
                            />
                            <div className={`mt-2 ${state === 'todo' ? 'text-muted' : 'text-ink-2'}`}>{step}</div>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                ) : (
                  <div className="flex h-full min-h-[96px] items-center justify-center text-sm text-muted">
                    No file staged yet.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setStagedFile(null)} className="btn btn-ghost">
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleExecuteUpload}
                  disabled={isAnalyzing}
                  className="btn btn-primary"
                >
                  <Sparkles className="h-4 w-4" />
                  {isAnalyzing ? 'Analyzing diff…' : 'Upload & analyze'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Repository */}
      <section>
        <div className="flex flex-col gap-4 border-b border-line pb-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-[17px] font-medium text-ink">Knowledge repository</h2>
            <p className="mt-0.5 text-sm text-muted">{filteredDocuments.length} indexed sources</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Name, department or ID"
                aria-label="Search documents"
                className={`${field} w-full pl-8 text-ink`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Status"
              className={field}
            >
              <option value="All">All statuses</option>
              <option value="Review required">Review required</option>
              <option value="Impact analysis">Impact analysis</option>
              <option value="Pending review">Pending review</option>
              <option value="No impact detected">No impact detected</option>
              <option value="No changes detected">No changes detected</option>
              <option value="Verified">Verified</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Department"
              className={field}
            >
              <option value="All">All departments</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Compliance">Compliance</option>
              <option value="Legal & Risk">Legal & Risk</option>
              <option value="Operations">Operations</option>
              <option value="IT Security">IT Security</option>
            </select>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as 'recent' | 'impact' | 'title')}
              aria-label="Sort"
              className={field}
            >
              <option value="recent">Recently updated</option>
              <option value="impact">Highest impact</option>
              <option value="title">Title A–Z</option>
            </select>
            <button type="button" onClick={resetFilters} className="btn btn-ghost h-9">
              Reset
            </button>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <EmptyState
            title={documents.length === 0 ? 'No documents yet.' : 'No documents match these filters.'}
            body={documents.length === 0 ? 'Upload a source to seal its first fingerprint.' : undefined}
            action={
              documents.length === 0 ? (
                <button type="button" onClick={() => setIsUploadPanelOpen(true)} className="btn btn-primary">
                  <Upload className="h-4 w-4" /> Upload document
                </button>
              ) : (
                <button type="button" onClick={resetFilters} className="btn">
                  Reset filters
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead>
                <tr className="h-10 border-b border-line text-xs text-muted">
                  <th className="px-3 font-normal">Document</th>
                  <th className="px-3 font-normal">Version</th>
                  <th className="px-3 font-normal">SHA-256</th>
                  <th className="px-3 font-normal">Modified</th>
                  <th className="px-3 font-normal">Status</th>
                  <th className="px-3 font-normal">Impact</th>
                  <th className="px-3 font-normal">Analyzed</th>
                  <th className="px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {paginatedDocs.map((doc) => (
                  <tr key={doc.id} className="h-14 transition-colors hover:bg-panel">
                    <td className="px-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
                        className="block max-w-[260px] truncate text-left text-ink transition-colors hover:text-ice"
                      >
                        {doc.title}
                      </button>
                      <div className="mt-0.5 text-xs text-muted">
                        {doc.department} · <span className="font-mono">{doc.id}</span> · {doc.fileSize}
                      </div>
                    </td>
                    <td className="px-3">
                      <span className="inline-flex items-center gap-1 rounded-md border border-line-strong px-1.5 py-0.5 font-mono text-xs text-ink">
                        {doc.currentVersion}
                        {doc.versions?.length > 1 && (
                          <span className="text-muted">/{doc.versions.length}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3">
                      <Hash value={hashOf(doc)} chars={10} />
                    </td>
                    <td className="whitespace-nowrap px-3 font-mono text-xs text-muted">{doc.lastModified}</td>
                    <td className="px-3">
                      <StatusBadge status={doc.integrityStatus} size="sm" />
                    </td>
                    <td className="px-3 tabular-nums">
                      {doc.affectedAnswerCount > 0 ? (
                        <span className="text-amber">{doc.affectedAnswerCount} answers</span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 text-xs text-muted">{doc.lastAnalyzed}</td>
                    <td className="relative px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
                          className="btn btn-ghost h-8 px-2.5"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenuDocId(activeMenuDocId === doc.id ? null : doc.id)}
                          aria-label={`More actions for ${doc.title}`}
                          aria-expanded={activeMenuDocId === doc.id}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-raised hover:text-ink"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                      {activeMenuDocId === doc.id && (
                        <div className="absolute right-3 top-12 z-30 w-56 overflow-hidden rounded-[10px] border border-line-strong bg-raised py-1 text-left shadow-xl">
                          <MenuButton icon={<Eye className="h-4 w-4" />} label="Open details & history" onClick={() => { setActiveMenuDocId(null); navigate(`/dashboard/documents/${doc.id}`); }} />
                          <MenuButton icon={<GitCompare className="h-4 w-4" />} label="Compare versions" onClick={() => { setActiveMenuDocId(null); navigate(`/dashboard/documents/${doc.id}/compare`); }} />
                          <MenuButton icon={<ShieldCheck className="h-4 w-4" />} label="Run integrity check" onClick={() => { setActiveMenuDocId(null); navigate('/dashboard/impact'); }} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredDocuments.length > 0 && (
          <div className="flex items-center justify-between border-t border-line py-3 text-sm text-muted">
            <div>
              <span className="tabular-nums text-ink">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredDocuments.length)}
              </span>{' '}
              of <span className="tabular-nums text-ink">{filteredDocuments.length}</span>
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

      <button
        type="button"
        onClick={() => navigate('/dashboard/audit')}
        className="flex items-center gap-1 self-start text-sm text-ink-2 transition-colors hover:text-ice"
      >
        View ingestion history in the audit log <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const MenuButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-2 transition-colors hover:bg-raised-2 hover:text-ink [&_svg]:text-muted"
  >
    {icon}
    <span>{label}</span>
  </button>
);
