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

  return (

    <div className="relative flex flex-col gap-6 animate-in fade-in duration-300 text-[#29233D] before:pointer-events-none before:absolute before:-inset-7 before:-z-10 before:bg-[radial-gradient(circle_at_8%_8%,rgba(217,249,157,0.30),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(249,168,212,0.24),transparent_27%),radial-gradient(circle_at_55%_48%,rgba(233,213,255,0.20),transparent_32%),linear-gradient(135deg,#FFFDF8_0%,#FFF8FC_52%,#FAFFF1_100%)]">

      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#FBCFE8]/25 blur-3xl" />

      <div className="pointer-events-none absolute top-32 left-1/4 h-72 w-72 rounded-full bg-[#D9F99D]/25 blur-3xl" />

      <section className="relative overflow-hidden rounded-[28px] border border-[#EEE7E1] bg-gradient-to-br from-white/95 via-[#FFF7FB]/90 to-[#F7FEE7]/90 px-6 py-5 shadow-[0_20px_60px_rgba(73,55,94,0.10)] backdrop-blur-xl">

        <div className="absolute right-0 top-0 h-24 w-44 rounded-bl-[80px] bg-gradient-to-br from-[#D9F99D]/45 via-[#FCE7F3]/35 to-transparent" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">

              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#D9F99D] bg-[#F7FEE7] text-[#65A30D] shadow-sm">

                <ShieldCheck className="h-4 w-4" />

              </span>

              <h1 className="text-2xl font-bold tracking-tight text-[#29233D]">Documents</h1>

              <span className="rounded-full border border-[#E9D5FF] bg-[#FAF5FF] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#7C3AED]">

                Knowledge Base v2.4

              </span>

            </div>

            <p className="max-w-2xl text-sm leading-relaxed text-[#81798E]">

              Monitor source integrity, compare knowledge versions, and trace every change into downstream AI impact.

            </p>

          </div>

          <div className="flex flex-wrap items-center gap-2.5">

            <button

              onClick={() =>

                addToast({

                  type: 'info',

                  title: 'Bulk Import',

                  message: 'Connecting to Corporate SharePoint / Google Drive sync...',

                })

              }

              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E8E0DA] bg-white px-4 text-xs font-semibold text-[#514A60] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#F9A8D4] hover:shadow-md"

            >

              <Download className="h-4 w-4 text-[#F472B6]" />

              Import documents

            </button>

            <button

              onClick={() => setIsUploadPanelOpen(true)}

              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/80 bg-gradient-to-r from-[#BEF264] via-[#D9F99D] to-[#F9A8D4] px-4 text-xs font-bold text-[#29233D] shadow-[0_10px_26px_rgba(244,114,182,0.16)] transition-all hover:-translate-y-0.5 hover:brightness-95"

            >

              <Upload className="h-4 w-4" />

              Upload document

            </button>

          </div>

        </div>

      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <MetricTile

          title="Total Documents"

          value={documents.length}

          note="Across 6 departments"

          badge="Integrity active"

          tone="green"

          icon={<FileText className="h-5 w-5" />}

        />

        <MetricTile

          title="Recently Updated"

          value="12"

          note="Last 14 days"

          badge="+3 today"

          tone="orange"

          icon={<History className="h-5 w-5" />}

        />

        <MetricTile

          title="Under Review"

          value="4"

          note="Knowledge drift triage"

          badge="Review queue"

          tone="orange"

          icon={<AlertTriangle className="h-5 w-5" />}

        />

        <MetricTile

          title="No Impact Detected"

          value="96"

          note="Verified nominal baseline"

          badge="Trusted"

          tone="green"

          icon={<CheckCircle className="h-5 w-5" />}

        />

      </section>

      {isUploadPanelOpen && (

        <section className="overflow-hidden rounded-[26px] border border-[#E8E0DA] bg-white shadow-[0_20px_60px_rgba(41,35,61,0.08)]">

          <div className="flex items-center justify-between border-b border-[#F0E9E4] bg-gradient-to-r from-[#FFFDF8] via-[#FFF7FB] to-[#F7FEE7] px-5 py-4">

            <div className="flex flex-wrap items-center gap-2.5">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D9F99D] bg-white text-[#65A30D] shadow-sm">

                <Upload className="h-4 w-4" />

              </div>

              <div>

                <div className="text-sm font-bold text-[#29233D]">Document Ingestion & Integrity Analysis</div>

                <div className="text-[10px] text-[#938DA2]">Secure local-first verification pipeline</div>

              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9F99D] bg-[#F7FEE7] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#65A30D]">

                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#A3E635]" />

                Engine online

              </span>

            </div>

            <button

              onClick={() => setIsUploadPanelOpen(false)}

              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#81798E] transition-colors hover:bg-white hover:text-[#29233D]"

            >

              Hide panel <ChevronUp className="h-3.5 w-3.5" />

            </button>

          </div>

          <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-12">

            <div

              onDragOver={(e) => e.preventDefault()}

              onDrop={handleDrop}

              onClick={() => fileInputRef.current?.click()}

              className="group relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#DCCFD8] bg-gradient-to-br from-[#FFFDF8] via-white to-[#FDF2F8] p-6 text-center transition-all hover:-translate-y-0.5 hover:border-[#F9A8D4] hover:shadow-[0_14px_35px_rgba(244,114,182,0.10)] lg:col-span-6"

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

              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FBCFE8] bg-white text-[#DB2777] shadow-[0_8px_24px_rgba(244,114,182,0.13)] transition-transform group-hover:scale-105">

                <Upload className="h-6 w-6" />

              </div>

              <div className="text-sm font-bold text-[#29233D]">Drag & drop a document here</div>

              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[#938DA2]">

                PDF, DOCX, TXT or MD • Up to 50 MB per audit package

              </p>

              <span className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#E8E0DA] bg-white px-3.5 py-2 text-xs font-semibold text-[#514A60] shadow-sm">

                <FolderOpen className="h-3.5 w-3.5 text-[#F472B6]" />

                Choose file

              </span>

            </div>

            <div className="flex flex-col gap-4 lg:col-span-6">

              <div className="rounded-2xl border border-[#EEE7E1] bg-[#FFFCF8] p-4">

                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#514A60]">

                  <input

                    type="checkbox"

                    checked={compareBaseline}

                    onChange={(e) => setCompareBaseline(e.target.checked)}

                    className="h-4 w-4 accent-[#A3E635]"

                  />

                  Compare against an existing document baseline

                </label>

                {compareBaseline && (

                  <div className="mt-3">

                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#938DA2]">Baseline</label>

                    <select

                      value={selectedBaselineId}

                      onChange={(e) => setSelectedBaselineId(e.target.value)}

                      className="h-10 w-full rounded-xl border border-[#E8E0DA] bg-white px-3 text-xs text-[#514A60] outline-none transition-colors focus:border-[#A3E635]"

                    >

                      <option value="DOC-7704">Employee Reimbursement Policy (v1.0) — DOC-7704</option>

                      <option value="DOC-8912">Vendor Security Standard (v3.0) — DOC-8912</option>

                      <option value="DOC-5120">Data Retention Policy (v2.3) — DOC-5120</option>

                    </select>

                  </div>

                )}

              </div>

              <div className="flex-1 rounded-2xl border border-[#FBCFE8] bg-gradient-to-br from-[#FFF7FB] to-white p-4">

                <div className="flex items-center justify-between gap-3">

                  <div className="flex min-w-0 items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FBCFE8] bg-white text-[#DB2777]">

                      <FileText className="h-4 w-4" />

                    </div>

                    <div className="min-w-0">

                      <div className="truncate text-xs font-bold text-[#29233D]">

                        {stagedFile ? stagedFile.name : 'Employee_Reimbursement_Policy_v2.0_Final.pdf'}

                      </div>

                      <div className="mt-0.5 text-[10px] text-[#938DA2]">

                        {stagedFile

                          ? `${(stagedFile.size / (1024 * 1024)).toFixed(1)} MB`

                          : 'PDF Document • 3.4 MB • Staged for analysis'}

                      </div>

                    </div>

                  </div>

                  {stagedFile && (

                    <button onClick={() => setStagedFile(null)} className="rounded-lg p-1.5 text-[#938DA2] hover:bg-white hover:text-[#29233D]">

                      <X className="h-4 w-4" />

                    </button>

                  )}

                </div>

                <div className="mt-4">

                  <div className="mb-1.5 flex items-center justify-between text-[10px]">

                    <span className="flex items-center gap-1 font-semibold text-[#65A30D]">

                      <CheckCircle className="h-3 w-3" /> Ingestion Ready ({uploadProgress}%)

                    </span>

                    <span className="font-mono text-[#938DA2]">sha256:d8c91...440f</span>

                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF3E7]">

                    <div className="h-full rounded-full bg-[#A3E635]" style={{ width: `${uploadProgress}%` }} />

                  </div>

                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs">

                  <div className="flex items-center gap-2 text-[#817047]">

                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#F59E0B]" />

                    Ready to analyze diff — <strong className="text-[#D97706]">3 affected answers in baseline</strong>

                  </div>

                  <span className="font-mono text-[10px] text-[#A68C60]">1.2s</span>

                </div>

              </div>

              <div className="flex justify-end gap-2.5">

                <button

                  type="button"

                  onClick={() => setStagedFile(null)}

                  className="rounded-xl border border-[#E8E0DA] bg-white px-3.5 py-2 text-xs font-semibold text-[#81798E] hover:text-[#29233D]"

                >

                  Clear

                </button>

                <button

                  type="button"

                  onClick={handleExecuteUpload}

                  disabled={isAnalyzing}

                  className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-gradient-to-r from-[#29233D] via-[#5B3F72] to-[#DB2777] px-4 py-2 text-xs font-bold text-white shadow-[0_10px_26px_rgba(91,63,114,0.20)] transition-all hover:-translate-y-0.5 hover:brightness-105 disabled:opacity-50"

                >

                  <Sparkles className="h-3.5 w-3.5 text-[#D9F99D]" />

                  {isAnalyzing ? 'Analyzing diff...' : 'Upload & analyze'}

                </button>

              </div>

            </div>

          </div>

        </section>

      )}

      <section className="rounded-[22px] border border-white/90 bg-gradient-to-r from-white/90 via-[#FFF9FC]/88 to-[#FAFFF1]/88 p-3 shadow-[0_12px_34px_rgba(73,55,94,0.07)] backdrop-blur-xl">

        <div className="flex flex-col items-center gap-3 md:flex-row">

          <div className="relative w-full flex-1">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A39AAA]" />

            <input

              value={searchQuery}

              onChange={(e) => {

                setSearchQuery(e.target.value);

                setCurrentPage(1);

              }}

              placeholder="Search documents by name, source, or ID..."

              className="h-10 w-full rounded-xl border border-[#EEE7E1] bg-[#FFFDF8] pl-9 pr-3 text-xs text-[#29233D] outline-none placeholder:text-[#B0A8B7] focus:border-[#F9A8D4] focus:bg-white"

            />

          </div>

          <select

            value={statusFilter}

            onChange={(e) => {

              setStatusFilter(e.target.value);

              setCurrentPage(1);

            }}

            className="h-10 w-full rounded-xl border border-[#EEE7E1] bg-[#FFFDF8] px-3 text-xs text-[#6F687C] outline-none focus:border-[#A3E635] md:w-auto"

          >

            <option value="All">Status: All</option>

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

            className="h-10 w-full rounded-xl border border-[#EEE7E1] bg-[#FFFDF8] px-3 text-xs text-[#6F687C] outline-none focus:border-[#A3E635] md:w-auto"

          >

            <option value="All">Source: All</option>

            <option value="Human Resources">Human Resources</option>

            <option value="Compliance">Compliance</option>

            <option value="Legal & Risk">Legal & Risk</option>

            <option value="Operations">Operations</option>

            <option value="IT Security">IT Security</option>

          </select>

          <select

            value={sortOption}

            onChange={(e) => setSortOption(e.target.value as 'recent' | 'impact' | 'title')}

            className="h-10 w-full rounded-xl border border-[#EEE7E1] bg-[#FFFDF8] px-3 text-xs text-[#6F687C] outline-none focus:border-[#F9A8D4] md:w-auto"

          >

            <option value="recent">Sort: Recently updated</option>

            <option value="impact">Sort: Highest impact</option>

            <option value="title">Sort: Title A-Z</option>

          </select>

          <button onClick={resetFilters} className="whitespace-nowrap px-2 text-xs font-semibold text-[#DB2777] hover:underline">

            Clear filters

          </button>

        </div>

      </section>

      <section className="overflow-hidden rounded-[26px] border border-white/90 bg-white/92 shadow-[0_22px_60px_rgba(73,55,94,0.09)] backdrop-blur-xl">

        <div className="flex items-center justify-between border-b border-[#F0E9E4] bg-gradient-to-r from-[#F7FEE7] via-[#FFFDF8] to-[#FDF2F8] px-5 py-4">

          <div>

            <h2 className="text-sm font-bold text-[#29233D]">Knowledge Repository</h2>

            <p className="mt-0.5 text-[10px] text-[#938DA2]">Versioned sources with integrity and downstream impact status</p>

          </div>

          <span className="rounded-full border border-[#D9F99D] bg-[#F7FEE7] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#65A30D]">

            {filteredDocuments.length} indexed

          </span>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[900px] border-collapse text-left">

            <thead>

              <tr className="h-11 border-b border-[#EEE7E1] bg-[#FFFCF8] text-[10px] font-bold uppercase tracking-[0.12em] text-[#938DA2]">

                <th className="px-5 py-2">Document Name & ID</th>

                <th className="px-4 py-2">Department</th>

                <th className="px-4 py-2">Version</th>

                <th className="px-4 py-2">Last Modified</th>

                <th className="px-4 py-2">Integrity Status</th>

                <th className="px-4 py-2">Downstream Impact</th>

                <th className="px-4 py-2">Analyzed</th>

                <th className="px-5 py-2 text-right">Actions</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-[#F3EEE9] text-xs">

              {paginatedDocs.map((doc) => (

                <tr key={doc.id} className="h-16 transition-colors hover:bg-[#FFF9FC]">

                  <td className="px-5 py-2">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D9F99D] bg-[#F7FEE7] text-[#65A30D]">

                        <FileText className="h-4 w-4" />

                      </div>

                      <div className="min-w-0">

                        <button

                          onClick={() => navigate(`/documents/${doc.id}`)}

                          className="block max-w-[240px] truncate text-left font-semibold text-[#29233D] transition-colors hover:text-[#DB2777]"

                        >

                          {doc.title}

                        </button>

                        <div className="mt-0.5 font-mono text-[10px] text-[#A39AAA]">{doc.id} • {doc.fileSize}</div>

                      </div>

                    </div>

                  </td>

                  <td className="px-4 py-2 text-[#716A7C]">{doc.department}</td>

                  <td className="px-4 py-2">

                    <button

                      onClick={() => navigate(`/documents/${doc.id}`)}

                      className="inline-flex items-center gap-1 rounded-lg border border-[#E9D5FF] bg-[#FAF5FF] px-2 py-1 font-mono text-[10px] font-semibold text-[#7C3AED]"

                    >

                      <History className="h-3 w-3" /> {doc.currentVersion}

                    </button>

                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-[#81798E]">{doc.lastModified}</td>

                  <td className="px-4 py-2"><StatusBadge status={doc.integrityStatus} size="sm" /></td>

                  <td className="px-4 py-2">

                    {doc.affectedAnswerCount > 0 ? (

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FBCFE8] bg-[#FDF2F8] px-2.5 py-1 text-[10px] font-bold text-[#DB2777]">

                        <AlertTriangle className="h-3 w-3" /> {doc.affectedAnswerCount} answers

                      </span>

                    ) : (

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9F99D] bg-[#F7FEE7] px-2.5 py-1 text-[10px] font-semibold text-[#65A30D]">

                        <CheckCircle className="h-3 w-3" /> 0 answers

                      </span>

                    )}

                  </td>

                  <td className="px-4 py-2 text-[#938DA2]">{doc.lastAnalyzed}</td>

                  <td className="relative px-5 py-2 text-right">

                    <div className="inline-flex items-center gap-1">

                      <button

                        onClick={() => navigate(`/documents/${doc.id}`)}

                        className="rounded-lg border border-[#E8E0DA] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#514A60] shadow-sm hover:border-[#F9A8D4]"

                      >

                        Inspect

                      </button>

                      <button

                        onClick={() => setActiveMenuDocId(activeMenuDocId === doc.id ? null : doc.id)}

                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#938DA2] hover:bg-[#FDF2F8] hover:text-[#DB2777]"

                      >

                        <MoreVertical className="h-4 w-4" />

                      </button>

                    </div>

                    {activeMenuDocId === doc.id && (

                      <div className="absolute right-5 top-12 z-30 w-52 overflow-hidden rounded-xl border border-[#E8E0DA] bg-white py-1 text-left shadow-[0_18px_45px_rgba(41,35,61,0.15)]">

                        <MenuButton icon={<Eye className="h-3.5 w-3.5" />} label="Open details & history" onClick={() => { setActiveMenuDocId(null); navigate(`/documents/${doc.id}`); }} />

                        <MenuButton icon={<GitCompare className="h-3.5 w-3.5 text-[#DB2777]" />} label="Compare versions" onClick={() => { setActiveMenuDocId(null); navigate(`/documents/${doc.id}/compare`); }} />

                        <MenuButton icon={<ShieldCheck className="h-3.5 w-3.5 text-[#65A30D]" />} label="Run integrity check" onClick={() => { setActiveMenuDocId(null); navigate('/impact'); }} />

                      </div>

                    )}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        <div className="flex items-center justify-between border-t border-[#EEE7E1] bg-[#FFFCF8] px-5 py-3 text-xs text-[#81798E]">

          <div>

            Showing <strong className="text-[#29233D]">{filteredDocuments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredDocuments.length)}</strong> of{' '}

            <strong className="text-[#29233D]">{filteredDocuments.length}</strong> documents

          </div>

          <div className="flex items-center gap-2">

            <button

              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}

              disabled={currentPage === 1}

              className="rounded-lg border border-[#E8E0DA] bg-white px-2.5 py-1.5 font-semibold text-[#716A7C] disabled:opacity-40"

            >

              Previous

            </button>

            <span className="px-1 font-mono text-[10px] text-[#938DA2]">Page {currentPage} of {totalPages}</span>

            <button

              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}

              disabled={currentPage === totalPages}

              className="rounded-lg border border-[#E8E0DA] bg-white px-2.5 py-1.5 font-semibold text-[#716A7C] disabled:opacity-40"

            >

              Next

            </button>

          </div>

        </div>

      </section>

      <section className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/90 bg-gradient-to-r from-[#F7FEE7]/90 via-white/90 to-[#FDF2F8]/90 p-3.5 text-xs text-[#81798E] shadow-[0_10px_30px_rgba(73,55,94,0.07)] backdrop-blur-xl sm:flex-row">

        <div className="flex flex-wrap items-center gap-3">

          <span className="inline-flex items-center gap-1.5 font-semibold text-[#65A30D]">

            <span className="h-2 w-2 rounded-full bg-[#A3E635]" /> Ingestion pipeline healthy

          </span>

          <span className="text-[#D8D0CA]">•</span>

          <span className="font-mono text-[10px]">Block Hash: sha256:7b91d2c49a0...33e8</span>

          <span className="text-[#D8D0CA]">•</span>

          <span>Auto-sync: 60s</span>

        </div>

        <button onClick={() => navigate('/audit')} className="flex items-center gap-1 font-semibold text-[#DB2777] hover:underline">

          View ingestion logs <ArrowRight className="h-3.5 w-3.5" />

        </button>

      </section>

    </div>

  );

};

type Tone = 'green' | 'orange';

const MetricTile: React.FC<{

  title: string;

  value: string | number;

  note: string;

  badge: string;

  tone: Tone;

  icon: React.ReactNode;

}> = ({ title, value, note, badge, tone, icon }) => {

  const green = tone === 'green';

  return (

    <div className={`group relative min-h-[132px] overflow-hidden rounded-2xl border p-5 shadow-[0_9px_28px_rgba(41,35,61,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(41,35,61,0.11)] ${green ? 'border-[#E2EBCF] bg-gradient-to-br from-white via-[#FBFFF4] to-[#F7FEE7] hover:border-[#D9F99D]' : 'border-[#F5E6C7] bg-gradient-to-br from-white via-[#FFF9F3] to-[#FFF7FB] hover:border-[#F9A8D4]'}`}>

      <div className={`absolute inset-x-0 top-0 h-[3px] ${green ? 'bg-[#A3E635]' : 'bg-[#F59E0B]'}`} />

      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${green ? 'bg-[#D9F99D]/35' : 'bg-[#FDE68A]/30'}`} />

      <div className="relative flex items-start justify-between">

        <div>

          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#716A7C]">{title}</div>

          <div className="mt-2 text-[30px] font-bold leading-none text-[#29233D]">{value}</div>

        </div>

        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm transition-transform group-hover:scale-105 ${green ? 'border-[#D9F99D] bg-[#F7FEE7] text-[#65A30D]' : 'border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]'}`}>

          {icon}

        </div>

      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-[#F2EEE9] pt-3">

        <span className="text-[11px] text-[#938DA2]">{note}</span>

        <span className={`text-[10px] font-semibold ${green ? 'text-[#65A30D]' : 'text-[#D97706]'}`}>{badge}</span>

      </div>

    </div>

  );

};

const MenuButton: React.FC<{

  icon: React.ReactNode;

  label: string;

  onClick: () => void;

}> = ({ icon, label, onClick }) => (

  <button onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#514A60] transition-colors hover:bg-[#FFF7FB] hover:text-[#29233D]">

    {icon}

    <span>{label}</span>

  </button>

);
