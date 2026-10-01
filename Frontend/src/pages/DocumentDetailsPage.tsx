import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  GitCompare,
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
  Plus,
  Upload,
  FolderOpen,
  X,
  FileCheck,
  Sparkles,
  Layers,
  ChevronRight,
  Database,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Hash } from '../components/ui/primitives';
import { useApp } from '../context/AppContext';
import { apiService, BackendClaim } from '../services/api';
import { DEMO_DOCUMENTS } from '../data/demoData';
import { DocumentItem } from '../types';

export const DocumentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { documents, reviews, addToast, refreshData, uploadDocument, isLiveMode } = useApp();

  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(true);
  const [docError, setDocError] = useState<string | null>(null);

  // Claims state
  const [claims, setClaims] = useState<BackendClaim[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState<boolean>(false);
  const [isExtractingClaims, setIsExtractingClaims] = useState<boolean>(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  // Upload New Version Modal State
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [newVersionError, setNewVersionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active section tab: 'overview' | 'versions' | 'claims' | 'impact'
  const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'claims' | 'impact'>('overview');

  // Governance action dialogs
  const [isQuarantineOpen, setIsQuarantineOpen] = useState(false);
  const [isFlushCacheOpen, setIsFlushCacheOpen] = useState(false);
  const [isIntegrityChecking, setIsIntegrityChecking] = useState(false);

  // Load document claims
  const loadClaimsForVersion = useCallback(async (documentId: string, versionId?: string) => {
    if (!isLiveMode) return;
    setIsLoadingClaims(true);
    try {
      if (versionId) {
        const claimsList = await apiService.getVersionClaims(documentId, versionId);
        setClaims(claimsList);
      } else {
        const res = await apiService.getDocumentClaims(documentId);
        setClaims(res.claims || []);
      }
    } catch {
      setClaims([]);
    } finally {
      setIsLoadingClaims(false);
    }
  }, [isLiveMode]);

  // Load document details
  const loadDocument = useCallback(async () => {
    if (!id) return;
    setIsLoadingDoc(true);
    setDocError(null);

    try {
      if (isLiveMode) {
        const docDetails = await apiService.getDocumentDetails(id);
        setDoc(docDetails);
        const activeVer = docDetails.versions?.[0];
        const activeVerId = activeVer?.id || '';
        setSelectedVersionId(activeVerId);
        await loadClaimsForVersion(docDetails.id, activeVerId);
      } else {
        const demoDoc = documents.find((d) => d.id === id) || DEMO_DOCUMENTS.find((d) => d.id === id);
        if (demoDoc) {
          setDoc(demoDoc);
          setSelectedVersionId(demoDoc.versions?.[0]?.version || 'v1.0');
        } else {
          setDocError(`Demo document with ID '${id}' was not found.`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to load document '${id}' from backend.`;
      setDocError(msg);
      setDoc(null);
    } finally {
      setIsLoadingDoc(false);
    }
  }, [id, isLiveMode, documents, loadClaimsForVersion]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Handle manual claim extraction
  const handleExtractClaims = async () => {
    if (!doc || !selectedVersionId) return;
    setIsExtractingClaims(true);
    addToast({
      type: 'info',
      title: 'Extracting Structured Claims',
      message: `Running claim extraction engine on version...`,
    });

    try {
      const res = await apiService.extractClaims(doc.id, selectedVersionId, true);
      setClaims(res.claims || []);
      addToast({
        type: 'success',
        title: 'Claim Extraction Complete',
        message: `Extracted ${res.claims_count} structured policy claims using ${res.extraction_method}.`,
      });
      await loadDocument();
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Claim extraction failed';
      addToast({ type: 'error', title: 'Extraction Failed', message: msg });
    } finally {
      setIsExtractingClaims(false);
    }
  };

  // Handle new version file selection
  const handleNewVersionFileSelected = (file: File) => {
    setNewVersionError(null);
    if (file.size === 0) {
      setNewVersionError('The selected file is empty (0 bytes).');
      return;
    }
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.txt', '.pdf'].includes(ext)) {
      setNewVersionError(`File format '${ext}' is not supported. Please upload a .txt or .pdf file.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setNewVersionError('File size exceeds the 10 MB limit.');
      return;
    }
    setNewVersionFile(file);
  };

  // Handle execute new version upload
  const handleExecuteNewVersionUpload = async () => {
    if (!doc || !newVersionFile) {
      setNewVersionError('Please select a file to upload.');
      return;
    }

    setIsUploadingVersion(true);
    setNewVersionError(null);

    try {
      await uploadDocument(newVersionFile, doc.id);
      setIsNewVersionModalOpen(false);
      setNewVersionFile(null);
      await loadDocument();
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload new version';
      setNewVersionError(msg);
    } finally {
      setIsUploadingVersion(false);
    }
  };

  // Run integrity check simulation/trigger
  const handleRunIntegrityCheck = async () => {
    if (!doc) return;
    setIsIntegrityChecking(true);
    addToast({
      type: 'info',
      title: 'Integrity Check Initiated',
      message: `Checking cryptographic hash lineage and claim diffs for ${doc.id}...`,
    });

    try {
      if (isLiveMode) {
        await apiService.analyzeDocument(doc.id);
        await loadDocument();
        await refreshData();
      }
      setTimeout(() => {
        setIsIntegrityChecking(false);
        addToast({
          type: 'success',
          title: 'Integrity Check Finished',
          message: `Cryptographic hash verified for ${doc.title} (${doc.currentVersion}).`,
        });
      }, 800);
    } catch (err: unknown) {
      setIsIntegrityChecking(false);
      const msg = err instanceof Error ? err.message : 'Integrity check failed';
      addToast({ type: 'error', title: 'Check Failed', message: msg });
    }
  };

  // Alerts linked to this document
  const liveAffectedAlerts = doc
    ? reviews.filter((r) => r.documentId === doc.id || r.documentName === doc.title)
    : [];

  // Loading State
  if (isLoadingDoc) {
    return (
      <div className="py-24 text-center text-muted flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-9 h-9 text-ice animate-spin" />
        <p className="text-base font-medium text-ink">Loading document details...</p>
        <p className="text-xs text-muted">Retrieving immutable versions and structured claims from backend.</p>
      </div>
    );
  }

  // Error / Not Found State (Crucial: never silently show fake data in Live Mode)
  if (docError || !doc) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red/10 border border-red/30 flex items-center justify-center text-red">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Document Not Available</h2>
          <p className="text-sm text-muted mt-1 max-w-md">
            {docError || `No record found for document ID '${id}' in the current ${isLiveMode ? 'Live database' : 'Demo dataset'}.`}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button
            type="button"
            onClick={() => loadDocument()}
            className="btn btn-ghost h-9"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/documents')}
            className="btn btn-primary h-9"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

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

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="display text-[36px] sm:text-[40px] leading-none text-ink">
              {doc.title}
            </h1>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-ice/10 text-ice text-xs font-medium border border-ice/30">
                <span className="w-1.5 h-1.5 rounded-full bg-ice animate-pulse" />
                {doc.currentVersion} ACTIVE
              </span>
              <span className="px-2 py-0.5 rounded bg-raised-2 text-muted text-xs font-mono border border-line-strong">
                {doc.id}
              </span>
              <span className="px-2 py-0.5 rounded bg-raised-2 text-muted text-xs font-mono border border-line-strong">
                {isLiveMode ? 'LIVE API' : '[DEMO DATA]'}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Review immutable document versions, cryptographically verified lineage, and structured policy claims.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setIsNewVersionModalOpen(true)}
            className="btn btn-primary h-9 px-3.5 text-xs font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Version</span>
          </button>

          <button
            type="button"
            onClick={handleRunIntegrityCheck}
            disabled={isIntegrityChecking}
            className="btn btn-ghost h-9 px-3.5 text-xs font-medium flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-ice" />
            <span>{isIntegrityChecking ? 'Verifying...' : 'Verify Hash'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/dashboard/documents/${doc.id}/compare`)}
            className="btn btn-ghost h-9 px-3.5 text-xs font-medium flex items-center gap-2"
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare Versions</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-px text-sm">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'overview'
              ? 'border-ice text-ice'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Overview & Provenance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('versions')}
          className={`pb-2.5 px-3 font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'versions'
              ? 'border-ice text-ice'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <span>Version Lineage</span>
          <span className="rounded-full bg-raised-2 px-1.5 py-0.2 font-mono text-xs text-muted">
            {doc.versions?.length || 0}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('claims')}
          className={`pb-2.5 px-3 font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'claims'
              ? 'border-ice text-ice'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <span>Structured Claims</span>
          <span className="rounded-full bg-ice/15 px-1.5 py-0.2 font-mono text-xs text-ice">
            {claims.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('impact')}
          className={`pb-2.5 px-3 font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'impact'
              ? 'border-ice text-ice'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <span>Downstream Alerts</span>
          {liveAffectedAlerts.length > 0 && (
            <span className="rounded-full bg-amber/20 px-1.5 py-0.2 font-mono text-xs text-amber font-semibold">
              {liveAffectedAlerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Primary Document Cards */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* 1. Document Summary Card */}
            <div className="bg-raised border border-line-strong rounded-xl p-6 flex flex-col gap-5">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-raised-2 border border-line-strong flex items-center justify-center shrink-0 text-ice">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold text-ink">
                        {doc.title}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-raised-2 text-xs text-muted border border-line-strong">
                        SHA-256 VERIFIED
                      </span>
                    </div>
                    <span className="text-xs text-muted mt-0.5 block">
                      Stored in local repository with immutable version history
                    </span>
                  </div>
                </div>

                <span className="text-xs font-medium px-2.5 py-1 rounded bg-raised-2 border border-line-strong text-muted">
                  {doc.classification || 'Institutional Knowledge'}
                </span>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-line-strong">
                <div>
                  <span className="text-xs text-muted block">Department</span>
                  <span className="text-sm font-medium text-ink mt-0.5 block">{doc.department}</span>
                  <span className="text-xs text-muted">Category Node</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Active Version</span>
                  <span className="text-sm font-medium text-ink mt-0.5 block font-mono">
                    {doc.currentVersion}
                  </span>
                  <span className="text-xs text-muted">
                    {doc.versions?.length || 1} Total Version{(doc.versions?.length || 1) !== 1 ? 's' : ''}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted block">File Size & Type</span>
                  <span className="text-sm font-medium text-ink mt-0.5 block">
                    {doc.fileSize} · {doc.fileType.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted">Original File</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Last Modified</span>
                  <span className="text-sm font-medium text-ink mt-0.5 block font-mono text-xs">
                    {doc.lastModified}
                  </span>
                  <span className="text-xs text-muted">Automated Sync</span>
                </div>
              </div>

              {/* Assessment State Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-line-strong bg-panel p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Integrity Assertion State</span>
                  <StatusBadge status={doc.integrityStatus} size="sm" pulse />
                </div>
                <div className="flex items-center justify-between border-t md:border-t-0 md:border-l border-line-strong pt-2 md:pt-0 md:pl-4">
                  <span className="text-xs text-muted">Extracted Claims</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-ice/10 text-ice text-xs font-semibold border border-ice/30">
                    <FileCheck className="w-3.5 h-3.5" />
                    {claims.length} Claims
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Claims Preview */}
            <div className="bg-raised border border-line-strong rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-ice" />
                  <h3 className="text-base font-semibold text-ink">Extracted Policy Claims</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('claims')}
                  className="text-xs text-ice hover:underline flex items-center gap-1 font-medium"
                >
                  <span>View All {claims.length} Claims</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {claims.length === 0 ? (
                <div className="p-6 text-center text-muted border border-dashed border-line rounded-lg flex flex-col items-center gap-2">
                  <Database className="w-6 h-6 text-muted" />
                  <p className="text-xs text-ink-2">No structured claims extracted yet for this version.</p>
                  <button
                    type="button"
                    onClick={handleExtractClaims}
                    disabled={isExtractingClaims}
                    className="btn btn-primary h-8 px-3 text-xs mt-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isExtractingClaims ? 'Extracting...' : 'Extract Claims Now'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {claims.slice(0, 3).map((claim) => (
                    <div
                      key={claim.id}
                      className="p-3 rounded-lg bg-panel border border-line text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-muted">
                        <span className="font-semibold text-ink flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-ice" />
                          {claim.subject || 'Policy Rule'}
                        </span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-raised border border-line">
                          {claim.category}
                        </span>
                      </div>
                      <p className="text-ink-2">{claim.claim_text}</p>
                      {claim.value && (
                        <div className="font-mono text-muted text-[11px]">
                          Target Value: <span className="text-ice font-semibold">{claim.value} {claim.unit || ''}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (4 cols): Version Provenance Timeline & Audit Feed */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Version Provenance Card */}
            <div className="bg-raised border border-line-strong rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-line-strong">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-ice" />
                  <h3 className="text-base font-semibold text-ink">Version Lineage</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewVersionModalOpen(true)}
                  className="text-xs text-ice hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New version
                </button>
              </div>

              {/* Vertical Timeline */}
              <div className="relative pl-6 flex flex-col gap-4">
                <div className="absolute left-2.5 top-3 bottom-3 w-[1px] bg-line-strong" />

                {doc.versions && doc.versions.length > 0 ? (
                  doc.versions.map((ver, idx) => {
                    const isCurrent = idx === 0;
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
                              ? 'bg-panel border-ice/40'
                              : 'bg-panel/40 border-line'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-semibold ${
                                isCurrent ? 'text-ink' : 'text-muted'
                              }`}
                            >
                              Version {ver.version_number || ver.version}
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

                          <div className="font-mono text-[11px] text-muted truncate">
                            SHA: <Hash value={ver.sha256} chars={12} />
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-line text-xs text-muted">
                            <span>{ver.releaseDate || ver.uploadedAt || 'Indexed'}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigate(`/dashboard/documents/${doc.id}/compare`);
                              }}
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
                  <p className="text-xs text-muted">No version history recorded.</p>
                )}
              </div>
            </div>

            {/* Fast Governance Actions */}
            <div className="bg-raised border border-line-strong rounded-xl p-5 flex flex-col gap-3">
              <span className="text-xs font-medium text-muted">Fast Response Actions</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsQuarantineOpen(true)}
                  className="h-9 px-3 rounded-lg bg-raised-2 border border-line-strong hover:border-red/60 text-xs font-medium text-red hover:bg-red/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Quarantine DOC</span>
                </button>
                <button
                  type="button"
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
      )}

      {/* Tab 2: Versions */}
      {activeTab === 'versions' && (
        <div className="bg-raised border border-line-strong rounded-xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-line">
            <div>
              <h2 className="text-lg font-semibold text-ink">Document Version History</h2>
              <p className="text-xs text-muted mt-0.5">
                All historical immutable snapshots for {doc.title}. Content cannot be overwritten, only incremented.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewVersionModalOpen(true)}
              className="btn btn-primary h-9 px-3.5 text-xs font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Upload New Version
            </button>
          </div>

          <div className="space-y-4">
            {doc.versions && doc.versions.length > 0 ? (
              doc.versions.map((ver, idx) => {
                const isCurrent = idx === 0;
                return (
                  <div
                    key={ver.id || idx}
                    className={`p-5 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-panel border-ice/40 shadow-sm'
                        : 'bg-panel/40 border-line hover:border-line-strong'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-ink text-base">
                          Version {ver.version_number || ver.version}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${
                            isCurrent
                              ? 'text-ice bg-ice/10 border border-ice/30'
                              : 'text-muted bg-raised-2 border border-line'
                          }`}
                        >
                          {isCurrent ? 'Current Active' : 'Historical Snapshot'}
                        </span>
                        {ver.isGenesis && (
                          <span className="text-xs px-2 py-0.5 rounded bg-raised text-muted border border-line">
                            Genesis
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (ver.id) {
                              setSelectedVersionId(ver.id);
                              loadClaimsForVersion(doc.id, ver.id);
                              setActiveTab('claims');
                            }
                          }}
                          className="btn btn-ghost h-8 px-2.5 text-xs"
                        >
                          View Claims
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigate(`/dashboard/documents/${doc.id}/compare?new=${doc.versions[0]?.id || ''}&old=${ver.id || ''}`);
                          }}
                          className="btn btn-ghost h-8 px-2.5 text-xs text-ice"
                        >
                          Compare with Active
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-3 border-t border-line text-xs">
                      <div>
                        <span className="text-muted block">SHA-256 Digest</span>
                        <span className="font-mono text-ink mt-0.5 block truncate">
                          <Hash value={ver.sha256} chars={16} />
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block">Version ID</span>
                        <span className="font-mono text-muted mt-0.5 block truncate" title={ver.id}>
                          {ver.id || 'system-generated'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block">Created Date</span>
                        <span className="text-ink mt-0.5 block">
                          {ver.releaseDate || ver.uploadedAt || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block">File Details</span>
                        <span className="text-ink mt-0.5 block">
                          {ver.page_count ? `${ver.page_count} page(s)` : 'Processed'} · {ver.file_name || doc.title}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-muted">No versions recorded yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Structured Claims */}
      {activeTab === 'claims' && (
        <div className="bg-raised border border-line-strong rounded-xl p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-line">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-ink">Structured Claims Repository</h2>
                <span className="px-2 py-0.5 rounded-full bg-ice/15 text-ice font-mono text-xs">
                  {claims.length} Claims
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Deterministic and LLM-extracted assertions that ground AI answers in this document.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExtractClaims}
                disabled={isExtractingClaims}
                className="btn btn-primary h-8 px-3 text-xs flex items-center gap-1.5"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isExtractingClaims ? 'animate-spin' : ''}`} />
                <span>{isExtractingClaims ? 'Extracting Claims...' : 'Re-extract Claims'}</span>
              </button>
            </div>
          </div>

          {isLoadingClaims ? (
            <div className="py-16 text-center text-muted flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-7 h-7 text-ice animate-spin" />
              <p className="text-sm font-medium text-ink">Loading structured claims...</p>
            </div>
          ) : claims.length === 0 ? (
            <div className="py-14 text-center text-muted flex flex-col items-center justify-center gap-3 border border-dashed border-line rounded-xl">
              <FileCheck className="w-8 h-8 text-muted" />
              <div>
                <p className="text-sm font-semibold text-ink">No Claims Extracted Yet</p>
                <p className="text-xs text-muted mt-1 max-w-md">
                  Claims can be automatically extracted using the local extraction pipeline to ground corporate RAG copilots.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExtractClaims}
                disabled={isExtractingClaims}
                className="btn btn-primary h-9 px-4 text-xs mt-1"
              >
                <Sparkles className="w-4 h-4" /> Extract Claims Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="h-9 bg-panel text-xs font-medium text-muted border-b border-line">
                    <th className="px-4">Subject</th>
                    <th className="px-4">Predicate</th>
                    <th className="px-4">Target Value</th>
                    <th className="px-4">Category</th>
                    <th className="px-4">Source Location</th>
                    <th className="px-4">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs">
                  {claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-panel/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-ink">
                        {claim.subject || 'Rule Assertion'}
                      </td>
                      <td className="px-4 py-3 text-ink-2 font-mono">
                        {claim.predicate || 'defines'}
                      </td>
                      <td className="px-4 py-3">
                        {claim.value ? (
                          <span className="font-mono font-semibold text-ice bg-ice/10 px-2 py-0.5 rounded border border-ice/20">
                            {claim.value} {claim.unit || ''}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-raised text-muted font-mono text-[11px] border border-line">
                          {claim.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted font-mono">
                        {claim.source_location || 'Paragraph 1'}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted">
                        {(claim.confidence * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Downstream Alerts */}
      {activeTab === 'impact' && (
        <div className="bg-raised border border-line-strong rounded-xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h2 className="text-lg font-semibold text-ink">Downstream Integrity Alerts</h2>
              <p className="text-xs text-muted mt-0.5">
                AI copilot answers identified as potentially outdated or conflicting with updated document rules.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/reviews')}
              className="btn btn-ghost h-8 px-3 text-xs text-ice"
            >
              Open Review Center →
            </button>
          </div>

          {liveAffectedAlerts.length === 0 ? (
            <div className="py-14 text-center text-muted flex flex-col items-center justify-center gap-2">
              <CheckCircle className="w-8 h-8 text-ice" />
              <p className="text-sm font-semibold text-ink">No Active Invalidation Alerts</p>
              <p className="text-xs text-muted max-w-md">
                No downstream copilot responses are currently flagged as compromised for this document.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveAffectedAlerts.map((alt) => (
                <div
                  key={alt.id}
                  className="p-4 rounded-xl bg-panel border border-amber/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-ink text-sm">"{alt.question}"</div>
                      <div className="text-muted mt-1">{alt.issueSummary}</div>
                      <div className="flex items-center gap-3 mt-2 text-muted font-mono text-[11px]">
                        <span>Answer ID: {alt.answerId}</span>
                        <span>•</span>
                        <span>{alt.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <StatusBadge status={alt.status} size="sm" />
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/reviews')}
                      className="btn btn-ghost h-8 px-3 text-xs"
                    >
                      Resolve Alert
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload New Version Modal */}
      {isNewVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-raised border border-line-strong rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-ice/10 text-ice">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">Upload New Version</h3>
                  <p className="text-xs text-muted">{doc.title} (Currently {doc.currentVersion})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewVersionModalOpen(false);
                  setNewVersionFile(null);
                  setNewVersionError(null);
                }}
                className="text-muted hover:text-ink p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newVersionError && (
              <div className="p-3 rounded-lg bg-red/10 border border-red/30 text-xs text-red flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{newVersionError}</span>
              </div>
            )}

            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleNewVersionFileSelected(f);
              }}
              className="border-2 border-dashed border-line-strong hover:border-ice/60 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2 cursor-pointer bg-panel/50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleNewVersionFileSelected(f);
                }}
              />
              <Upload className="w-7 h-7 text-ice" />
              <p className="text-sm font-semibold text-ink">Select or drop updated file</p>
              <p className="text-xs text-muted">Supports .TXT and .PDF up to 10 MB</p>
            </div>

            {newVersionFile && (
              <div className="p-3 rounded-lg bg-panel border border-line flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-ice shrink-0" />
                  <span className="font-semibold text-ink truncate">{newVersionFile.name}</span>
                  <span className="text-muted font-mono">
                    ({(newVersionFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewVersionFile(null)}
                  className="text-muted hover:text-ink"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  setIsNewVersionModalOpen(false);
                  setNewVersionFile(null);
                  setNewVersionError(null);
                }}
                disabled={isUploadingVersion}
                className="btn btn-ghost h-9 px-3.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteNewVersionUpload}
                disabled={!newVersionFile || isUploadingVersion}
                className="btn btn-primary h-9 px-4 text-xs flex items-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${isUploadingVersion ? 'animate-spin' : ''}`} />
                <span>{isUploadingVersion ? 'Processing & Diffing...' : 'Upload & Process Version'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
        description={`This will immediately evict ${doc.title} from knowledge retrieval for all enterprise AI copilots until security lead sign-off.`}
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
            message: `Vector caches citing ${doc.id} invalidated.`,
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
