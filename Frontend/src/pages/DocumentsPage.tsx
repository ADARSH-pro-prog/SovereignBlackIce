import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  Download,
  Filter,
  Search,
  CheckCircle,
  AlertTriangle,
  History,
  GitCompare,
  Eye,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  X,
  Sparkles,
  ShieldCheck,
  Shield,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useApp } from '../context/AppContext';
import { DocumentItem } from '../types';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { documents, uploadDocument, addToast } = useApp();

  // Upload Panel State
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(true);
  const [compareBaseline, setCompareBaseline] = useState(true);
  const [selectedBaselineId, setSelectedBaselineId] = useState('DOC-7704');
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(100);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [formatFilter, setFormatFilter] = useState('All');
  const [sortOption, setSortOption] = useState<'recent' | 'impact' | 'title'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
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
        compareBaseline ? selectedBaselineId : undefined
      );
      setStagedFile(null);
      setIsAnalyzing(false);
    } catch {
      setIsAnalyzing(false);
    }
  };

  // Filter & Sort
  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'All' || doc.integrityStatus === statusFilter;
      const matchesSource =
        sourceFilter === 'All' || doc.department === sourceFilter;
      const matchesFormat =
        formatFilter === 'All' || doc.fileType === formatFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSource && matchesFormat;
    })
    .sort((a, b) => {
      if (sortOption === 'impact') {
        return b.affectedAnswerCount - a.affectedAnswerCount;
      }
      if (sortOption === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0; // recent default
    });

  const pageSize = 6;
  const totalPages = Math.ceil(filteredDocuments.length / pageSize) || 1;
  const paginatedDocs = filteredDocuments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Page Header & Top Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
              Documents
            </h1>
            <span className="px-2 py-0.5 rounded bg-[#1E293B] text-[#3B82F6] text-[10px] font-mono uppercase tracking-wider border border-[#263247]">
              KNOWLEDGE BASE v2.4
            </span>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Manage source documents and monitor structural changes across your
            institutional knowledge base.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              addToast({
                type: 'info',
                title: 'Bulk Import',
                message: 'Connecting to Corporate SharePoint / Google Drive sync...',
              });
            }}
            className="h-9 px-3.5 rounded-lg bg-[#1E293B] hover:bg-[#263247] text-xs font-medium text-[#F8FAFC] border border-[#263247] transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[#94A3B8]" />
            <span>Import documents</span>
          </button>

          <button
            onClick={() => setIsUploadPanelOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-xs font-medium text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload document</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="h-[120px] p-4 bg-[#111827] border border-[#263247] rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
              Total Documents
            </span>
            <div className="w-7 h-7 rounded bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC]">
              {documents.length}
            </div>
            <div className="text-xs text-[#64748B] mt-1 flex items-center gap-1">
              <span>Monitored across 6 departments</span>
            </div>
          </div>
        </div>

        <div className="h-[120px] p-4 bg-[#111827] border border-[#263247] rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
              Recently Updated
            </span>
            <div className="w-7 h-7 rounded bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC]">12</div>
            <div className="text-xs text-[#64748B] mt-1">
              Last 14 days delta (+3 today)
            </div>
          </div>
        </div>

        <div className="h-[120px] p-4 bg-[#111827] border border-[#263247] rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
              Under Review
            </span>
            <div className="w-7 h-7 rounded bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#EF4444]">4</div>
            <div className="text-xs text-[#EF4444]/80 mt-1">
              Pending knowledge drift triage
            </div>
          </div>
        </div>

        <div className="h-[120px] p-4 bg-[#111827] border border-[#263247] rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
              No Impact Detected
            </span>
            <div className="w-7 h-7 rounded bg-[#14B8A6]/10 text-[#14B8A6] flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#14B8A6]">96</div>
            <div className="text-xs text-[#14B8A6]/80 mt-1">
              Verified nominal baseline
            </div>
          </div>
        </div>
      </div>

      {/* Storage Allocation Strip */}
      <div className="flex items-center justify-between text-xs text-[#64748B] px-1">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
          <span>All sample records represent illustrative demo records [DEMO DATA]</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Storage Allocation: <strong className="text-[#F8FAFC]">7.2 GB</strong> of 10.0 GB (72%)</span>
          <div className="w-24 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
            <div className="h-full bg-[#3B82F6] w-[72%] rounded-full" />
          </div>
        </div>
      </div>

      {/* Collapsible Document Ingestion & Analysis Panel */}
      {isUploadPanelOpen && (
        <div className="bg-[#111827] border border-[#263247] rounded-xl overflow-hidden shadow-lg animate-in slide-in-from-top-3 duration-200">
          {/* Panel Header */}
          <div className="px-5 py-3 bg-[#1E293B] border-b border-[#263247] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center">
                <Upload className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-semibold text-[#F8FAFC]">
                Document Ingestion & Integrity Analysis
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#14B8A6]/10 text-[#14B8A6] text-[10px] font-mono uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
                ENGINE ONLINE
              </span>
            </div>

            <button
              onClick={() => setIsUploadPanelOpen(false)}
              className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] flex items-center gap-1"
            >
              <span>Hide upload panel</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Panel Content Grid */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Drag & Drop Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="lg:col-span-6 rounded-xl border-2 border-dashed border-[#263247] hover:border-[#3B82F6] bg-[#1E293B]/30 hover:bg-[#1E293B]/50 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-full bg-[#1E293B] border border-[#263247] flex items-center justify-center text-[#3B82F6] mb-3 group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-[#F8FAFC]">
                Drag and drop document here, or browse files
              </span>
              <p className="text-xs text-[#64748B] mt-1 max-w-sm">
                Supported formats: PDF, DOCX, TXT, MD • Up to 50 MB per audit package
              </p>
              <button
                type="button"
                className="mt-4 px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#263247] border border-[#263247] text-xs font-medium text-[#F8FAFC] flex items-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Choose files</span>
              </button>
            </div>

            {/* Right: Ingestion Config & Staged File Analysis */}
            <div className="lg:col-span-6 flex flex-col justify-between gap-4">
              {/* Baseline Compare Config */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#F8FAFC]">
                  <input
                    type="checkbox"
                    checked={compareBaseline}
                    onChange={(e) => setCompareBaseline(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#1E293B] text-[#3B82F6] focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Compare against an existing document baseline</span>
                </label>

                {compareBaseline && (
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-[11px] text-[#64748B] whitespace-nowrap">
                      Baseline:
                    </span>
                    <select
                      value={selectedBaselineId}
                      onChange={(e) => setSelectedBaselineId(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                    >
                      <option value="DOC-7704">
                        Employee Reimbursement Policy (v1.0) — DOC-7704
                      </option>
                      <option value="DOC-8912">
                        Vendor Security Standard (v3.0) — DOC-8912
                      </option>
                      <option value="DOC-5120">
                        Data Retention Policy (v2.3) — DOC-5120
                      </option>
                    </select>
                  </div>
                )}
              </div>

              {/* Staged File Details or Default Preview */}
              <div className="rounded-xl p-3.5 bg-[#1E293B]/70 border border-[#263247] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#F8FAFC] truncate">
                        {stagedFile
                          ? stagedFile.name
                          : 'Employee_Reimbursement_Policy_v2.0_Final.pdf'}
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        {stagedFile
                          ? `${(stagedFile.size / (1024 * 1024)).toFixed(1)} MB`
                          : 'PDF Document • 3.4 MB • Staged for analysis'}
                      </div>
                    </div>
                  </div>
                  {stagedFile && (
                    <button
                      onClick={() => setStagedFile(null)}
                      className="text-[#64748B] hover:text-[#F8FAFC] p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#14B8A6] flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Ingestion Ready ({uploadProgress}%)
                    </span>
                    <span className="font-mono text-[#64748B]">sha256:d8c91...440f</span>
                  </div>
                  <div className="w-full h-1 bg-[#111827] rounded-full overflow-hidden">
                    <div className="h-full bg-[#14B8A6] w-full" />
                  </div>
                </div>

                {/* Real-time Diff status */}
                <div className="p-2 rounded-lg bg-[#111827] border border-[#263247] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />
                    <span className="text-[#94A3B8]">
                      Ready to analyze diff — <strong className="text-[#F59E0B]">3 affected answers identified in baseline</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#64748B]">1.2s</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setStagedFile(null)}
                  className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#263247] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleExecuteUpload}
                  disabled={isAnalyzing}
                  className="px-4 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-xs font-medium text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAnalyzing ? 'Analyzing diff...' : 'Upload and analyze'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-[#111827] border border-[#263247] rounded-xl p-3 flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search documents by name, source, or tag..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full md:w-auto h-9 px-3 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#94A3B8] focus:outline-none focus:border-[#3B82F6] cursor-pointer"
        >
          <option value="All">Status: All statuses</option>
          <option value="Review required">Review required</option>
          <option value="Impact analysis">Impact analysis</option>
          <option value="Pending review">Pending review</option>
          <option value="No impact detected">No impact detected</option>
          <option value="No changes detected">No changes detected</option>
          <option value="Verified">Verified</option>
        </select>

        {/* Source Dropdown */}
        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full md:w-auto h-9 px-3 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#94A3B8] focus:outline-none focus:border-[#3B82F6] cursor-pointer"
        >
          <option value="All">Source: All departments</option>
          <option value="Human Resources">Human Resources</option>
          <option value="Compliance">Compliance</option>
          <option value="Legal & Risk">Legal & Risk</option>
          <option value="Operations">Operations</option>
          <option value="IT Security">IT Security</option>
        </select>

        {/* Sort Dropdown */}
        <select
          value={sortOption}
          onChange={(e) =>
            setSortOption(e.target.value as 'recent' | 'impact' | 'title')
          }
          className="w-full md:w-auto h-9 px-3 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#94A3B8] focus:outline-none focus:border-[#3B82F6] cursor-pointer"
        >
          <option value="recent">Sort: Recently updated</option>
          <option value="impact">Sort: Highest impact</option>
          <option value="title">Sort: Title A-Z</option>
        </select>

        <button
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('All');
            setSourceFilter('All');
            setFormatFilter('All');
            setSortOption('recent');
          }}
          className="text-xs text-[#3B82F6] hover:underline whitespace-nowrap px-1"
        >
          Clear filters
        </button>
      </div>

      {/* Document Repository Table */}
      <div className="bg-[#111827] border border-[#263247] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="h-10 bg-[#1E293B] text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] border-b border-[#263247]">
                <th className="px-5 py-2">Document Name & ID</th>
                <th className="px-4 py-2">Department Source</th>
                <th className="px-4 py-2">Version</th>
                <th className="px-4 py-2">Last Modified</th>
                <th className="px-4 py-2">Integrity Status</th>
                <th className="px-4 py-2">Downstream Impact</th>
                <th className="px-4 py-2">Analyzed</th>
                <th className="px-5 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2438] text-xs">
              {paginatedDocs.map((doc) => (
                <tr
                  key={doc.id}
                  className="h-14 hover:bg-[#1E293B]/40 transition-colors"
                >
                  <td className="px-5 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1E293B] border border-[#263247] flex items-center justify-center text-[#3B82F6] shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div
                          onClick={() => navigate(`/documents/${doc.id}`)}
                          className="font-medium text-[#F8FAFC] hover:text-[#3B82F6] cursor-pointer truncate"
                        >
                          {doc.title}
                        </div>
                        <div className="text-[11px] font-mono text-[#64748B]">
                          {doc.id} • {doc.fileSize}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-2 text-[#94A3B8]">{doc.department}</td>

                  <td className="px-4 py-2">
                    <button
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E293B] hover:bg-[#263247] text-[#3B82F6] font-mono text-[11px] border border-[#263247] transition-colors"
                    >
                      <History className="w-3 h-3" />
                      <span>{doc.currentVersion}</span>
                    </button>
                  </td>

                  <td className="px-4 py-2 text-[#94A3B8] whitespace-nowrap">
                    {doc.lastModified}
                  </td>

                  <td className="px-4 py-2">
                    <StatusBadge status={doc.integrityStatus} size="sm" />
                  </td>

                  <td className="px-4 py-2">
                    {doc.affectedAnswerCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] font-medium text-[11px] border border-[#F59E0B]/30">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{doc.affectedAnswerCount} answers</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E293B] text-[#64748B] text-[11px]">
                        <CheckCircle className="w-3 h-3" />
                        <span>0 answers</span>
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-2 text-[#64748B]">{doc.lastAnalyzed}</td>

                  <td className="px-5 py-2 text-right relative">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#263247] border border-[#263247] text-xs text-[#F8FAFC] transition-colors"
                      >
                        Inspect
                      </button>

                      <button
                        onClick={() =>
                          setActiveMenuDocId(
                            activeMenuDocId === doc.id ? null : doc.id
                          )
                        }
                        className="w-7 h-7 rounded hover:bg-[#1E293B] flex items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC]"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Popover Menu */}
                    {activeMenuDocId === doc.id && (
                      <div className="absolute right-5 top-12 w-52 bg-[#1E293B] border border-[#263247] rounded-xl shadow-2xl py-1 z-30 text-left">
                        <button
                          onClick={() => {
                            setActiveMenuDocId(null);
                            navigate(`/documents/${doc.id}`);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#F8FAFC] hover:bg-[#263247] text-left"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>Open details & history</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuDocId(null);
                            navigate(`/documents/${doc.id}/compare`);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#F8FAFC] hover:bg-[#263247] text-left"
                        >
                          <GitCompare className="w-3.5 h-3.5 text-[#3B82F6]" />
                          <span>Compare versions</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuDocId(null);
                            navigate('/impact');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#F8FAFC] hover:bg-[#263247] text-left"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#14B8A6]" />
                          <span>Run integrity check</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 bg-[#1E293B] border-t border-[#263247] flex items-center justify-between text-xs text-[#94A3B8]">
          <div>
            Showing <strong className="text-[#F8FAFC]">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredDocuments.length)}</strong> of{' '}
            <strong className="text-[#F8FAFC]">{filteredDocuments.length}</strong> documents
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 px-2.5 rounded bg-[#111827] border border-[#263247] text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono px-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 px-2.5 rounded bg-[#111827] border border-[#263247] text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Pipeline Status Strip */}
      <div className="rounded-xl p-3 bg-[#111827] border border-[#263247] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
            <span className="text-[#94A3B8]">Ingestion pipeline healthy</span>
          </div>
          <span>•</span>
          <span className="font-mono">Block Hash: sha256:7b91d2c49a0...33e8</span>
          <span>•</span>
          <span>Auto-sync interval: 60s</span>
        </div>
        <button
          onClick={() => navigate('/audit')}
          className="text-[#3B82F6] hover:underline flex items-center gap-1"
        >
          <span>View Ingestion Logs</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
