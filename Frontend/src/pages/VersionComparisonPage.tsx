import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  GitCompare,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Columns,
  List,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Shield,
  Layers,
  History,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
  Upload,
  FileText,
  Filter,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import {
  apiService,
  VersionComparisonResponse,
  ClaimChangeDetail,
  BackendClaim,
} from '../services/api';
import { DEMO_AFFECTED_ANSWERS } from '../data/demoData';
import { AffectedAnswerItem, DocumentItem } from '../types';

export const VersionComparisonPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { documents, addToast, isLiveMode, reviews, isLoading: isAppLoading } = useApp();

  const [selectedDocId, setSelectedDocId] = useState<string>(id || '');
  const [fetchedDoc, setFetchedDoc] = useState<DocumentItem | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);

  const [diffMode, setDiffMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [filterChangeType, setFilterChangeType] = useState<
    'all' | 'modified' | 'added' | 'removed' | 'unchanged' | 'uncertain'
  >('all');
  const [selectedOldVersion, setSelectedOldVersion] = useState('');
  const [selectedNewVersion, setSelectedNewVersion] = useState('');
  const [isRerunning, setIsRerunning] = useState(false);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [liveComparison, setLiveComparison] = useState<VersionComparisonResponse | null>(null);
  const [selectedEvidenceAnswer, setSelectedEvidenceAnswer] =
    useState<AffectedAnswerItem | null>(null);

  // Sync selectedDocId when url param :id changes or when documents first load
  useEffect(() => {
    if (id) {
      setSelectedDocId(id);
    } else if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [id, documents, selectedDocId]);

  // Resolve current active document
  const doc = useMemo(() => {
    return (
      documents.find((d) => d.id === selectedDocId) ||
      fetchedDoc ||
      (documents.length > 0 ? documents[0] : null)
    );
  }, [documents, selectedDocId, fetchedDoc]);

  // If doc is not found in context (e.g. direct URL navigation), fetch from backend in live mode
  useEffect(() => {
    if (isLiveMode && selectedDocId && !documents.some((d) => d.id === selectedDocId)) {
      setIsLoadingDoc(true);
      apiService
        .getDocumentDetails(selectedDocId)
        .then((d) => setFetchedDoc(d))
        .catch((err) => {
          console.warn('Failed to fetch document details for comparison:', err);
          setFetchedDoc(null);
        })
        .finally(() => setIsLoadingDoc(false));
    }
  }, [isLiveMode, selectedDocId, documents]);

  // Populate version dropdown options based on current document's versions
  useEffect(() => {
    if (doc?.versions && doc.versions.length >= 2) {
      // versions are sorted descending by version number
      // Old version is previous (index 1), New version is latest (index 0)
      const oldV =
        doc.versions[1].version_id ||
        String(doc.versions[1].raw_version_number || doc.versions[1].versionNumber || '1');
      const newV =
        doc.versions[0].version_id ||
        String(doc.versions[0].raw_version_number || doc.versions[0].versionNumber || '2');
      setSelectedOldVersion(oldV);
      setSelectedNewVersion(newV);
    } else if (doc?.versions && doc.versions.length === 1) {
      const v =
        doc.versions[0].version_id ||
        String(doc.versions[0].raw_version_number || doc.versions[0].versionNumber || '1');
      setSelectedOldVersion(v);
      setSelectedNewVersion(v);
    } else {
      setSelectedOldVersion('');
      setSelectedNewVersion('');
    }
  }, [doc]);

  // Fetch real comparison from backend
  const fetchLiveDiff = async (oldVer?: string, newVer?: string) => {
    if (!isLiveMode || !doc?.id) return;
    setIsLoadingDiff(true);
    setDiffError(null);
    try {
      const res = await apiService.compareVersions(doc.id, oldVer, newVer);
      setLiveComparison(res);
      addToast({
        type: 'success',
        title: 'Backend Diff Loaded',
        message: `Comparison completed: ${res.summary.modified_count} modified, ${res.summary.added_count} added, ${res.summary.removed_count} removed, ${res.summary.unchanged_count} unchanged claims.`,
      });
    } catch (err: any) {
      console.warn('Version comparison API error:', err);
      const msg = err.message || 'Failed to compare document versions';
      setDiffError(msg);
      setLiveComparison(null);
    } finally {
      setIsLoadingDiff(false);
    }
  };

  useEffect(() => {
    if (isLiveMode && doc?.id) {
      fetchLiveDiff(
        selectedOldVersion || undefined,
        selectedNewVersion || undefined
      );
    } else {
      setLiveComparison(null);
      setDiffError(null);
    }
  }, [isLiveMode, doc?.id, selectedOldVersion, selectedNewVersion]);

  const handleRerunDiff = async () => {
    setIsRerunning(true);
    if (isLiveMode) {
      addToast({
        type: 'info',
        title: 'Rerunning Semantic Diff',
        message: `Calling backend comparison for ${doc?.id}...`,
      });
      await fetchLiveDiff(
        selectedOldVersion || undefined,
        selectedNewVersion || undefined
      );
      setIsRerunning(false);
    } else {
      addToast({
        type: 'info',
        title: 'Rerunning Semantic Diff',
        message: `Analyzing token mutations between ${selectedOldVersion || 'v1.0'} and ${selectedNewVersion || 'v2.0'}...`,
      });
      setTimeout(() => {
        setIsRerunning(false);
        addToast({
          type: 'success',
          title: 'Diff Analysis Complete',
          message: '1 changed claim identified with 99.4% confidence.',
        });
      }, 1000);
    }
  };

  // Filter changes based on selected filter tab
  const filteredChanges = useMemo(() => {
    if (!liveComparison?.changes) return [];
    if (filterChangeType === 'all') return liveComparison.changes;
    return liveComparison.changes.filter((c) => c.change_type === filterChangeType);
  }, [liveComparison, filterChangeType]);

  // Loading state
  if (isAppLoading || isLoadingDoc) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted gap-3">
        <RefreshCw className="w-8 h-8 text-ice animate-spin" />
        <p className="text-sm font-medium text-ink">Loading Version Comparison...</p>
        <p className="text-xs text-muted">Fetching document history and version metadata.</p>
      </div>
    );
  }

  // Empty State: No documents exist in repository
  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-lg mx-auto gap-4">
        <div className="w-16 h-16 rounded-2xl bg-raised border border-line-strong flex items-center justify-center text-muted">
          <GitCompare className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-ink">No Documents Available for Comparison</h2>
          <p className="text-sm text-muted mt-2">
            {isLiveMode
              ? 'The repository currently has no documents in the database. Upload a document to start tracking versions and claim diffs.'
              : 'No documents found in demo state.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/documents')}
          className="btn btn-primary inline-flex items-center gap-2 mt-2"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>
    );
  }

  const hasMultipleVersions = (doc.versions?.length || 0) >= 2;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 pb-28">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted font-mono mb-1">
            <Link to="/dashboard" className="hover:text-ink transition-colors">Governance</Link>
            <span>/</span>
            <Link to="/dashboard/documents" className="hover:text-ink transition-colors">Documents</Link>
            <span>/</span>
            <Link to={`/dashboard/documents/${doc.id}`} className="text-muted hover:text-ink transition-colors">
              {doc.title}
            </Link>
            <span>/</span>
            <span className="text-ice">Compare Versions</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="display text-[36px] md:text-[40px] leading-none text-ink">
              Compare Document Versions
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-raised-2 text-xs font-mono text-muted border border-line-strong">
                {doc.id}
              </span>
              <span className="px-2 py-0.5 rounded bg-raised-2 text-xs font-mono text-ice border border-line-strong flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Semantic diff
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                  isLiveMode && liveComparison
                    ? liveComparison.changes.length > 0
                      ? 'bg-amber/10 text-amber border-amber/30'
                      : 'bg-ice/10 text-ice border-ice/30'
                    : isLiveMode && !hasMultipleVersions
                      ? 'bg-muted/10 text-muted border-line-strong'
                      : 'bg-amber/10 text-amber border-amber/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLiveMode && liveComparison && liveComparison.changes.length === 0
                      ? 'bg-ice'
                      : isLiveMode && !hasMultipleVersions
                        ? 'bg-muted'
                        : 'bg-amber animate-pulse'
                  }`}
                />
                {isLiveMode && liveComparison
                  ? `${liveComparison.changes.length} Claim Mutation(s) Detected`
                  : isLiveMode && !hasMultipleVersions
                    ? 'Single Version (Baseline Sealed)'
                    : '1 Material Change Detected'}
              </span>
              <span className="px-2 py-0.5 rounded bg-raised-2 text-xs font-mono text-muted border border-line-strong">
                {isLiveMode ? 'LIVE API' : '[DEMO DATA]'}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted mt-1 max-w-3xl">
            Review exact textual changes, extracted claim mutations, and identify
            potentially affected AI-generated answers across deployed corporate copilots.
          </p>
        </div>

        {/* Right Lineage Meta Strip */}
        <div className="bg-raised border border-line-strong rounded-xl px-4 py-2 flex items-center gap-4 text-xs shrink-0 self-start md:self-auto">
          <div>
            <span className="text-xs text-muted block">Lineage State</span>
            <span className="font-medium text-ice flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isLiveMode ? 'Live Verification' : 'Audited Ingestion'}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-raised-2" />
          <div>
            <span className="text-xs text-muted block">Claim Changes</span>
            <span className="font-medium text-ink font-mono">
              {isLiveMode && liveComparison
                ? `${liveComparison.changes.length} Detected`
                : '1 Vector Retrained'}
            </span>
          </div>
        </div>
      </div>

      {/* Comparison Toolbar & Mode Selectors */}
      <div className="bg-raised border border-line-strong rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm">
        {/* Document & Version Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dynamic Document Switcher */}
          {documents.length > 1 ? (
            <select
              value={selectedDocId}
              onChange={(e) => {
                setSelectedDocId(e.target.value);
                navigate(`/dashboard/documents/${e.target.value}/compare`);
              }}
              className="h-9 px-3 rounded-lg bg-raised-2 border border-line-strong text-xs font-medium text-ink focus:outline-none focus:border-ice cursor-pointer max-w-xs truncate"
              title="Select document to compare"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.id})
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-1.5 bg-raised-2 border border-line-strong rounded-lg text-xs font-medium text-ink flex items-center gap-2">
              <span className="text-ice font-semibold">{doc.title}</span>
              <span className="text-muted font-mono">({doc.id})</span>
            </div>
          )}

          {/* Version Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedOldVersion}
              onChange={(e) => setSelectedOldVersion(e.target.value)}
              disabled={!doc.versions || doc.versions.length < 2}
              className="h-9 px-3 rounded-lg bg-raised-2 border border-line-strong text-xs text-ink focus:outline-none focus:border-ice cursor-pointer disabled:opacity-50"
              title="Old Version (Baseline)"
            >
              {doc.versions && doc.versions.length > 0 ? (
                doc.versions.map((v) => (
                  <option
                    key={`old-${v.version_id || v.versionNumber || v.version}`}
                    value={v.version_id || v.versionNumber || v.version}
                  >
                    Version {v.versionNumber || v.version} ({v.releaseDate || v.uploadedAt || 'Baseline'})
                  </option>
                ))
              ) : (
                <option value="v1.0">Version 1.0 (Baseline)</option>
              )}
            </select>

            <ArrowRight className="w-4 h-4 text-muted" />

            <select
              value={selectedNewVersion}
              onChange={(e) => setSelectedNewVersion(e.target.value)}
              disabled={!doc.versions || doc.versions.length < 2}
              className="h-9 px-3 rounded-lg bg-raised-2 border border-line-strong text-xs text-ink focus:outline-none focus:border-ice cursor-pointer disabled:opacity-50"
              title="New Version (Target)"
            >
              {doc.versions && doc.versions.length > 0 ? (
                doc.versions.map((v) => (
                  <option
                    key={`new-${v.version_id || v.versionNumber || v.version}`}
                    value={v.version_id || v.versionNumber || v.version}
                  >
                    Version {v.versionNumber || v.version} ({v.releaseDate || v.uploadedAt || 'Target'})
                  </option>
                ))
              ) : (
                <option value="v2.0">Version 2.0 (Target)</option>
              )}
            </select>

            <button
              onClick={handleRerunDiff}
              disabled={isRerunning || isLoadingDiff || !hasMultipleVersions}
              className="h-9 px-3 rounded-lg bg-raised-2 border border-line-strong hover:border-ice text-xs font-medium text-ink flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-ice ${
                  isRerunning || isLoadingDiff ? 'animate-spin' : ''
                }`}
              />
              <span>{isLoadingDiff ? 'Analyzing...' : 'Rerun Diff'}</span>
            </button>
          </div>
        </div>

        {/* View Mode & Quick Diff Stats */}
        <div className="flex items-center gap-4 flex-wrap justify-between xl:justify-end">
          <div className="flex items-center gap-2 text-xs text-muted bg-void px-3 py-1.5 rounded-lg border border-line-strong">
            {isLiveMode && liveComparison ? (
              <>
                <span className="text-muted">{liveComparison.changes.length} changes detected</span>
                <span>•</span>
                <span className="text-red font-mono font-medium">-{liveComparison.summary.removed_count}</span>
                <span>/</span>
                <span className="text-ice font-mono font-medium">+{liveComparison.summary.added_count}</span>
                <span>•</span>
                <span className="text-amber font-mono font-medium">{liveComparison.summary.modified_count} mod</span>
                <span>•</span>
                <span className="text-muted font-mono">{liveComparison.summary.unchanged_count} same</span>
              </>
            ) : isLiveMode && !hasMultipleVersions ? (
              <span className="text-muted">1 version sealed in DB</span>
            ) : (
              <>
                <span className="text-muted">1 file changed</span>
                <span>•</span>
                <span className="text-muted">1 line modified</span>
                <span>•</span>
                <span className="text-red font-mono font-medium">-1</span>
                <span>/</span>
                <span className="text-ice font-mono font-medium">+1 tokens</span>
              </>
            )}
          </div>

          {/* Segmented Mode Button */}
          <div className="flex items-center bg-void p-1 rounded-lg border border-line-strong">
            <button
              onClick={() => setDiffMode('side-by-side')}
              className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                diffMode === 'side-by-side'
                  ? 'bg-raised-2 text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-side</span>
            </button>
            <button
              onClick={() => setDiffMode('unified')}
              className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                diffMode === 'unified'
                  ? 'bg-raised-2 text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Unified</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notice if document has only 1 version */}
      {isLiveMode && !hasMultipleVersions && (
        <div className="bg-raised border border-amber/30 rounded-xl p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-ink">Single Version Available</h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                This document currently has only 1 version ({doc.currentVersion}). Comparative version diffing requires at least 2 versions. Upload a second revision to detect claim modifications, deletions, and downstream copilot drift.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
            className="btn btn-primary text-xs shrink-0 inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Version 2</span>
          </button>
        </div>
      )}

      {/* Filter Tabs for Claim Changes (Live Mode) */}
      {isLiveMode && liveComparison && liveComparison.changes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-muted flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter by:
          </span>
          <button
            onClick={() => setFilterChangeType('all')}
            className={`px-3 py-1 rounded-lg border transition-colors ${
              filterChangeType === 'all'
                ? 'bg-ice text-void border-ice font-semibold'
                : 'bg-raised text-muted border-line-strong hover:text-ink'
            }`}
          >
            All ({liveComparison.changes.length})
          </button>
          <button
            onClick={() => setFilterChangeType('modified')}
            className={`px-3 py-1 rounded-lg border transition-colors ${
              filterChangeType === 'modified'
                ? 'bg-amber text-void border-amber font-semibold'
                : 'bg-raised text-muted border-line-strong hover:text-ink'
            }`}
          >
            Modified ({liveComparison.summary.modified_count})
          </button>
          <button
            onClick={() => setFilterChangeType('added')}
            className={`px-3 py-1 rounded-lg border transition-colors ${
              filterChangeType === 'added'
                ? 'bg-ice text-void border-ice font-semibold'
                : 'bg-raised text-muted border-line-strong hover:text-ink'
            }`}
          >
            Added ({liveComparison.summary.added_count})
          </button>
          <button
            onClick={() => setFilterChangeType('removed')}
            className={`px-3 py-1 rounded-lg border transition-colors ${
              filterChangeType === 'removed'
                ? 'bg-red text-void border-red font-semibold'
                : 'bg-raised text-muted border-line-strong hover:text-ink'
            }`}
          >
            Removed ({liveComparison.summary.removed_count})
          </button>
          {liveComparison.summary.unchanged_count > 0 && (
            <button
              onClick={() => setFilterChangeType('unchanged')}
              className={`px-3 py-1 rounded-lg border transition-colors ${
                filterChangeType === 'unchanged'
                  ? 'bg-raised-2 text-ink border-line-strong font-semibold'
                  : 'bg-raised text-muted border-line-strong hover:text-ink'
              }`}
            >
              Unchanged ({liveComparison.summary.unchanged_count})
            </button>
          )}
          {liveComparison.summary.uncertain_count > 0 && (
            <button
              onClick={() => setFilterChangeType('uncertain')}
              className={`px-3 py-1 rounded-lg border transition-colors ${
                filterChangeType === 'uncertain'
                  ? 'bg-purple-500 text-white border-purple-500 font-semibold'
                  : 'bg-raised text-muted border-line-strong hover:text-ink'
              }`}
            >
              Review Required ({liveComparison.summary.uncertain_count})
            </button>
          )}
        </div>
      )}

      {/* Main Semantic Diff Canvas */}
      <div className="bg-raised border border-line-strong rounded-xl overflow-hidden shadow-sm">
        {/* Panel Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 bg-raised-2 border-b border-line-strong text-xs divide-y md:divide-y-0 md:divide-x divide-line-strong">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red" />
              <span className="font-semibold text-ink">
                Previous Version {isLiveMode && liveComparison?.old_version_number ? `(v${liveComparison.old_version_number})` : ''}
              </span>
            </div>
            <span className="text-muted text-xs font-mono">
              {isLiveMode && liveComparison?.old_version_id
                ? `ID: ${liveComparison.old_version_id.slice(0, 8)}...`
                : 'Baseline'}
            </span>
          </div>

          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ice" />
              <span className="font-semibold text-ink">
                Target Version {isLiveMode && liveComparison?.new_version_number ? `(v${liveComparison.new_version_number})` : ''}
              </span>
            </div>
            <span className="text-muted text-xs font-mono">
              {isLiveMode && liveComparison?.new_version_id
                ? `ID: ${liveComparison.new_version_id.slice(0, 8)}...`
                : 'Target'}
            </span>
          </div>
        </div>

        {/* Diff Content Canvas */}
        {isLoadingDiff ? (
          <div className="py-16 text-center text-muted flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-ice animate-spin" />
            <p className="text-sm font-medium text-ink">Comparing Document Versions...</p>
            <p className="text-xs text-muted">Running backend semantic comparison and claim mutation engine.</p>
          </div>
        ) : diffError ? (
          <div className="p-8 text-center text-xs flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber" />
            <p className="text-sm font-semibold text-ink">Version Comparison Error</p>
            <p className="text-muted max-w-md">{diffError}</p>
            <button
              onClick={() => handleRerunDiff()}
              className="px-3.5 py-1.5 rounded-lg bg-ice text-void hover:bg-ice text-xs font-medium"
            >
              Retry Comparison
            </button>
          </div>
        ) : isLiveMode && liveComparison ? (
          filteredChanges.length > 0 ? (
            <div className="overflow-x-auto font-mono text-xs leading-6 bg-void p-4 space-y-4">
              {filteredChanges.map((change, idx) => {
                const isModified = change.change_type === 'modified';
                const isAdded = change.change_type === 'added';
                const isRemoved = change.change_type === 'removed';
                const isUnchanged = change.change_type === 'unchanged';
                const isUncertain = change.change_type === 'uncertain';

                const badgeColor = isModified
                  ? 'bg-amber/15 text-amber border-amber/30'
                  : isAdded
                    ? 'bg-ice/15 text-ice border-ice/30'
                    : isRemoved
                      ? 'bg-red/15 text-red border-red/30'
                      : isUnchanged
                        ? 'bg-raised-2 text-muted border-line-strong'
                        : 'bg-purple-500/15 text-purple-400 border-purple-500/30';

                return (
                  <div
                    key={change.id || idx}
                    className="p-4 rounded-xl bg-raised border border-line-strong space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-line-strong flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider ${badgeColor}`}>
                          {change.change_type}
                        </span>
                        {change.changed_field && (
                          <span className="text-xs font-mono text-muted">
                            field: <span className="text-ink">{change.changed_field}</span>
                          </span>
                        )}
                        {change.human_review_required && (
                          <span className="px-2 py-0.5 rounded bg-red/10 text-red border border-red/30 text-[10px] font-semibold">
                            Human Review Required
                          </span>
                        )}
                      </div>
                      <span className="text-muted font-mono text-xs">
                        Decision Confidence: <span className="text-ice font-bold">{(change.confidence * 100).toFixed(1)}%</span>
                      </span>
                    </div>

                    <p className="text-muted font-sans text-xs italic leading-relaxed">
                      {change.explanation}
                    </p>

                    {diffMode === 'side-by-side' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* Old Claim Box */}
                        <div className={`p-3 rounded-lg border ${
                          isRemoved || isModified ? 'bg-red/5 border-red/30' : 'bg-void border-line-strong'
                        }`}>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-red font-bold">
                              PREVIOUS ({change.source_reference_old || 'Old Version'}):
                            </span>
                            {change.old_claim?.category && (
                              <span className="text-[10px] font-mono text-muted uppercase">
                                {change.old_claim.category}
                              </span>
                            )}
                          </div>
                          <p className="text-ink font-sans leading-relaxed text-xs">
                            {change.old_claim?.claim_text || '— (No claim in previous version)'}
                          </p>
                          {change.old_claim?.subject && (
                            <div className="mt-2 pt-2 border-t border-line-strong/60 flex items-center gap-2 text-[11px] text-muted font-mono">
                              <span>Subject: <strong className="text-ink">{change.old_claim.subject}</strong></span>
                              <span>•</span>
                              <span>Value: <strong className="text-red">{change.old_claim.value || 'N/A'} {change.old_claim.unit || ''}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* New Claim Box */}
                        <div className={`p-3 rounded-lg border ${
                          isAdded || isModified ? 'bg-ice/5 border-ice/30' : 'bg-void border-line-strong'
                        }`}>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-ice font-bold">
                              NEW ({change.source_reference_new || 'New Version'}):
                            </span>
                            {change.new_claim?.category && (
                              <span className="text-[10px] font-mono text-muted uppercase">
                                {change.new_claim.category}
                              </span>
                            )}
                          </div>
                          <p className="text-ink font-sans leading-relaxed text-xs">
                            {change.new_claim?.claim_text || '— (Claim removed in new version)'}
                          </p>
                          {change.new_claim?.subject && (
                            <div className="mt-2 pt-2 border-t border-line-strong/60 flex items-center gap-2 text-[11px] text-muted font-mono">
                              <span>Subject: <strong className="text-ink">{change.new_claim.subject}</strong></span>
                              <span>•</span>
                              <span>Value: <strong className="text-ice">{change.new_claim.value || 'N/A'} {change.new_claim.unit || ''}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Unified Diff Mode */
                      <div className="space-y-1.5 pt-1 font-mono text-xs">
                        {change.old_claim && (
                          <div className="bg-red/15 text-red px-3 py-1.5 rounded flex items-start gap-2">
                            <span className="font-bold select-none">-</span>
                            <span>{change.old_claim.claim_text}</span>
                          </div>
                        )}
                        {change.new_claim && (
                          <div className="bg-ice/15 text-ice px-3 py-1.5 rounded flex items-start gap-2">
                            <span className="font-bold select-none">+</span>
                            <span>{change.new_claim.claim_text}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-14 text-center text-muted flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-ice" />
              <p className="text-sm font-semibold text-ink">
                {filterChangeType === 'all'
                  ? 'No Claim Changes Detected'
                  : `No '${filterChangeType}' Changes Found`}
              </p>
              <p className="text-xs text-muted max-w-md">
                The versions compared are structurally aligned or no matching claims met the selected filter.
              </p>
            </div>
          )
        ) : isLiveMode && !hasMultipleVersions ? (
          <div className="py-16 text-center text-muted flex flex-col items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-ice" />
            <p className="text-sm font-semibold text-ink">Baseline Version Ingested</p>
            <p className="text-xs text-muted max-w-md">
              Version {doc.currentVersion} is currently the sole baseline version for {doc.title}. Upload a new version to compare claims and calculate impact.
            </p>
          </div>
        ) : diffMode === 'side-by-side' ? (
          /* Demo Side-by-side Diff View */
          <div className="overflow-x-auto font-mono text-xs leading-6 bg-void">
            <div className="min-w-[900px] grid grid-cols-2 divide-x divide-line-strong">
              {/* Left Column (v1.0) */}
              <div className="flex flex-col py-2">
                <div className="flex items-stretch hover:bg-raised-2/40">
                  <span className="w-10 text-right pr-3 text-muted select-none text-xs">40</span>
                  <p className="px-2 text-muted font-bold">SECTION 4.2 — EXPENSE SUBMISSION WINDOW & ELIGIBILITY</p>
                </div>
                <div className="flex items-stretch hover:bg-raised-2/40">
                  <span className="w-10 text-right pr-3 text-muted select-none text-xs">41</span>
                  <p className="px-2 text-transparent select-none">.</p>
                </div>
                <div className="flex items-stretch bg-red/10 border-y border-red/30">
                  <span className="w-10 text-right pr-3 text-red font-bold select-none text-xs bg-red/20">42</span>
                  <span className="w-5 text-center text-red font-bold select-none">-</span>
                  <p className="px-2 text-ink">
                    Employees must submit reimbursement claims within{' '}
                    <span className="bg-red/25 text-red border border-red/50 px-1 py-0.5 rounded font-bold line-through mx-1">
                      30 days
                    </span>{' '}
                    of the expense.
                  </p>
                </div>
                <div className="flex items-stretch hover:bg-raised-2/40">
                  <span className="w-10 text-right pr-3 text-muted select-none text-xs">43</span>
                  <p className="px-2 text-muted">Claims must include valid receipts and manager approval.</p>
                </div>
              </div>

              {/* Right Column (v2.0) */}
              <div className="flex flex-col py-2">
                <div className="flex items-stretch hover:bg-raised-2/40">
                  <span className="w-10 text-right pr-3 text-muted select-none text-xs">40</span>
                  <p className="px-2 text-muted font-bold">SECTION 4.2 — EXPENSE SUBMISSION WINDOW & ELIGIBILITY</p>
                </div>
                <div className="flex items-stretch hover:bg-raised-2/40">
                  <span className="w-10 text-right pr-3 text-muted select-none text-xs">41</span>
                  <p className="px-2 text-transparent select-none">.</p>
                </div>
                <div className="flex items-stretch bg-ice/10 border-y border-ice/30">
                  <span className="w-10 text-right pr-3 text-ice font-bold select-none text-xs bg-ice/20">42</span>
                  <span className="w-5 text-center text-ice font-bold select-none">+</span>
                  <p className="px-2 text-ink">
                    Employees must submit reimbursement claims within{' '}
                    <span className="bg-ice/25 text-ice border border-ice/50 px-1 py-0.5 rounded font-bold mx-1">
                      15 days
                    </span>{' '}
                    of the expense.
                  </p>
                </div>
                <div className="flex items-stretch hover:bg-raised-2/40">
                  <span className="w-10 text-right pr-3 text-muted select-none text-xs">43</span>
                  <p className="px-2 text-muted">Claims must include valid receipts and manager approval.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Demo Unified Diff View */
          <div className="overflow-x-auto font-mono text-xs leading-6 bg-void p-3">
            <div className="text-muted">@@ -40,5 +40,5 @@ SECTION 4.2 — EXPENSE SUBMISSION WINDOW</div>
            <div className="text-muted pl-6"> SECTION 4.2 — EXPENSE SUBMISSION WINDOW & ELIGIBILITY</div>
            <div className="bg-red/15 text-red px-2 py-0.5 rounded">
              - Employees must submit reimbursement claims within <span className="line-through font-bold">30 days</span> of the expense.
            </div>
            <div className="bg-ice/15 text-ice px-2 py-0.5 rounded">
              + Employees must submit reimbursement claims within <span className="font-bold">15 days</span> of the expense.
            </div>
            <div className="text-muted pl-6"> Claims must include valid receipts and manager approval.</div>
          </div>
        )}

        <div className="bg-raised-2 border-t border-line-strong px-4 py-2 flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-ice" />
            <span>
              {isLiveMode && liveComparison
                ? `FastAPI Claim Diff Engine • Processed ${liveComparison.changes.length} mutations across SQLite claims`
                : 'Deterministic claim alignment engine'}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span>Encoding: UTF-8</span>
            <span>Doc ID: {doc.id}</span>
          </div>
        </div>
      </div>

      {/* Two-Column Analytical Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Change Summary (7 cols) */}
        <div className="lg:col-span-7 bg-raised border border-line-strong rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line-strong">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-amber" />
                <h3 className="text-base font-semibold text-ink">Change Summary</h3>
              </div>
              <span className="text-xs font-mono text-muted bg-raised-2 px-2 py-0.5 rounded border border-line-strong">
                {isLiveMode ? 'LIVE API SUMMARY' : '[DEMO DATA]'}
              </span>
            </div>

            {isLiveMode && liveComparison && liveComparison.changes.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-void p-3 rounded-lg border border-line-strong">
                    <span className="text-xs text-muted block">Primary Change Type</span>
                    <span className="text-xs font-medium text-ink mt-0.5 block truncate capitalize">
                      {liveComparison.changes[0].change_type}{' '}
                      {liveComparison.changes[0].changed_field ? `(${liveComparison.changes[0].changed_field})` : ''}
                    </span>
                    <span className="text-xs text-amber">
                      {liveComparison.changes[0].human_review_required ? 'Human Review Required' : 'Automated Diff'}
                    </span>
                  </div>

                  <div className="bg-void p-3 rounded-lg border border-line-strong">
                    <span className="text-xs text-muted block">Previous Value</span>
                    <span className="text-xs font-medium text-red line-through mt-0.5 block truncate">
                      {liveComparison.changes[0].old_value ||
                        liveComparison.changes[0].old_claim?.value ||
                        liveComparison.changes[0].old_claim?.claim_text ||
                        'Baseline'}
                    </span>
                    <span className="text-xs text-muted">Old version claim</span>
                  </div>

                  <div className="bg-void p-3 rounded-lg border border-line-strong">
                    <span className="text-xs text-muted block">Current Value</span>
                    <span className="text-xs font-medium text-ice mt-0.5 block truncate">
                      {liveComparison.changes[0].new_value ||
                        liveComparison.changes[0].new_claim?.value ||
                        liveComparison.changes[0].new_claim?.claim_text ||
                        'Updated'}
                    </span>
                    <span className="text-xs text-ice">New version claim</span>
                  </div>
                </div>

                <div className="bg-raised-2/60 border border-line-strong rounded-xl p-4 text-xs text-muted leading-relaxed">
                  <p className="text-ink font-semibold mb-1">Synthesized Impact Synopsis</p>
                  {liveComparison.changes[0].explanation ||
                    `Detected ${liveComparison.changes.length} structural changes across version comparison.`}
                </div>
              </>
            ) : isLiveMode && liveComparison ? (
              <div className="p-6 text-center text-muted text-xs">
                No changed claims detected between versions {selectedOldVersion || 'v1.0'} and {selectedNewVersion || 'v2.0'}.
              </div>
            ) : isLiveMode && !hasMultipleVersions ? (
              <div className="p-6 text-center text-muted text-xs">
                Single version sealed in database. Upload a new revision to generate a change summary.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-void p-3 rounded-lg border border-line-strong">
                    <span className="text-xs text-muted block">Change Type</span>
                    <span className="text-xs font-medium text-ink mt-0.5 block truncate">Deadline Modified</span>
                    <span className="text-xs text-amber">(Temporal Contraction)</span>
                  </div>

                  <div className="bg-void p-3 rounded-lg border border-line-strong">
                    <span className="text-xs text-muted block">Previous Value</span>
                    <span className="text-xs font-medium text-red line-through mt-0.5 block">30 calendar days</span>
                    <span className="text-xs text-muted">v1.0 baseline</span>
                  </div>

                  <div className="bg-void p-3 rounded-lg border border-line-strong">
                    <span className="text-xs text-muted block">Current Value</span>
                    <span className="text-xs font-medium text-ice mt-0.5 block">15 calendar days</span>
                    <span className="text-xs text-ice">-50% reduction</span>
                  </div>
                </div>

                <div className="bg-raised-2/60 border border-line-strong rounded-xl p-4 text-xs text-muted leading-relaxed">
                  <p className="text-ink font-semibold mb-1">Synthesized Impact Synopsis</p>
                  The updated policy changes the reimbursement submission deadline from 30 days to 15 days. Answers and downstream copilot responses that cite or imply the previous 30-day window may provide outdated advice and create employee compliance friction.
                </div>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-line-strong flex items-center justify-between text-xs text-muted mt-3">
            <span>
              {isLiveMode && liveComparison
                ? `Total claims: ${liveComparison.summary.total_old_claims} old / ${liveComparison.summary.total_new_claims} new`
                : 'Affected Concept: Policy submission eligibility'}
            </span>
            <span className="font-mono">{doc.id}</span>
          </div>
        </div>

        {/* Right: Extracted Claim Mutation (5 cols) */}
        <div className="lg:col-span-5 bg-raised border border-line-strong rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line-strong">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ice" />
                <h3 className="text-base font-semibold text-ink">Extracted Claim Mutation</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-ice/10 text-ice text-xs font-mono font-semibold">
                {isLiveMode && liveComparison && liveComparison.changes.length > 0
                  ? `${(liveComparison.changes[0].confidence * 100).toFixed(1)}% CONF`
                  : '99.4% CONF'}
              </span>
            </div>

            {isLiveMode && liveComparison && liveComparison.changes.length > 0 ? (
              <div className="space-y-2.5">
                <div className="bg-void p-3 rounded-lg border border-line-strong">
                  <div className="text-xs text-red font-semibold mb-1">
                    Previous Claim ({liveComparison.changes[0].source_reference_old || 'Old Version'})
                  </div>
                  <p className="text-xs text-muted leading-relaxed font-mono">
                    "{liveComparison.changes[0].old_claim?.claim_text || '— (No previous claim)'}"
                  </p>
                </div>

                <div className="bg-void p-3 rounded-lg border border-line-strong">
                  <div className="text-xs text-ice font-semibold mb-1">
                    Active Claim ({liveComparison.changes[0].source_reference_new || 'New Version'})
                  </div>
                  <p className="text-xs text-ink leading-relaxed font-mono">
                    "{liveComparison.changes[0].new_claim?.claim_text || '— (Claim removed)'}"
                  </p>
                </div>
              </div>
            ) : isLiveMode ? (
              <div className="p-4 text-center text-xs text-muted">
                No claim mutation to inspect.
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="bg-void p-3 rounded-lg border border-line-strong">
                  <div className="text-xs text-red font-semibold mb-1">Previous Claim (v1.0)</div>
                  <p className="text-xs text-muted leading-relaxed">
                    "Employees may submit reimbursement claims within{' '}
                    <span className="text-red underline decoration-red/60 font-semibold">30 days</span> of the expense."
                  </p>
                </div>

                <div className="bg-void p-3 rounded-lg border border-line-strong">
                  <div className="text-xs text-ice font-semibold mb-1">Active Claim (v2.0)</div>
                  <p className="text-xs text-ink leading-relaxed">
                    "Employees may submit reimbursement claims within{' '}
                    <span className="text-ice underline decoration-ice/60 font-semibold">15 days</span> of the expense."
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-raised-2 border border-line-strong">
                <span className="text-muted text-xs block">Target Subject:</span>
                <span className="text-ink font-medium truncate block">
                  {isLiveMode && liveComparison && liveComparison.changes.length > 0
                    ? liveComparison.changes[0].new_claim?.subject || liveComparison.changes[0].old_claim?.subject || doc.title
                    : 'Employees (Org-wide)'}
                </span>
              </div>
              <div className="p-2 rounded bg-raised-2 border border-line-strong">
                <span className="text-muted text-xs block">Graph Mutation:</span>
                <span className="text-amber font-medium truncate block">
                  {isLiveMode && liveComparison && liveComparison.changes.length > 0
                    ? `${liveComparison.summary.modified_count} mod, ${liveComparison.summary.added_count} add`
                    : '30d → 15d'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 text-right text-xs text-muted italic">
            Extracted locally by the claim engine
          </div>
        </div>
      </div>

      {/* Potentially Affected AI Answers Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">
                Potentially Affected AI Answers
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-red/15 text-red text-xs font-semibold border border-red/30">
                {isLiveMode
                  ? `${reviews.filter((r) => r.documentId === doc.id).length} Flagged`
                  : '3 Flagged'}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Enterprise Copilots and RAG embeddings that ingested the obsolete version.
            </p>
          </div>
        </div>

        {/* Why these answers were flagged callout */}
        <div className="bg-raised border-l-4 border-l-amber border-y border-r border-line-strong p-4 rounded-r-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-ink block mb-0.5">
              Why these answers were flagged
            </span>
            <span className="text-muted">
              {isLiveMode
                ? 'These answers were synthesized using previous vector chunks of this document. Sovereign Black Ice flags them for audit revalidation upon policy change detection.'
                : 'These 3 synthesized answers were generated by enterprise RAG copilots citing the earlier v1.0 30-day baseline. They are flagged for revalidation against v2.0 policy.'}
            </span>
          </div>
        </div>

        {/* Answers Table */}
        <div className="bg-raised border border-line-strong rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="h-10 bg-raised-2 border-b border-line-strong text-xs font-medium text-muted">
                  <th className="px-5 w-[28%]">Previously Generated Answer & Agent</th>
                  <th className="px-4 w-[28%]">Previous Statement / Cited Passage</th>
                  <th className="px-4 w-[26%]">Potential Issue & Semantic Risk</th>
                  <th className="px-4 w-[10%]">Status</th>
                  <th className="px-5 w-[8%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-strong text-xs">
                {(isLiveMode
                  ? reviews.filter((r) => r.documentId === doc.id)
                  : DEMO_AFFECTED_ANSWERS
                ).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted">
                      No affected copilot answers flagged for this document yet. Run impact analysis or ask questions against indexed documents to populate lineage.
                    </td>
                  </tr>
                ) : (
                  (isLiveMode
                    ? reviews
                        .filter((r) => r.documentId === doc.id)
                        .map((r) => ({
                          id: r.id,
                          queryPrompt: r.issueSummary,
                          agentName: r.affectedAgent,
                          cachedAnswer: r.claimMutation?.previousClaim || 'Historical copilot answer citing superseded baseline.',
                          potentialIssue: r.explanation,
                          impactStatus: r.status as any,
                          directConflict: r.severity === 'High',
                          citedChunkId: r.lineageHash,
                          citedPassage: r.claimMutation?.currentClaim || '',
                          lastUpdated: r.timestamp,
                        }))
                    : DEMO_AFFECTED_ANSWERS
                  ).map((ans) => (
                    <tr
                      key={ans.id}
                      className={`hover:bg-raised-2/40 transition-colors ${
                        ans.directConflict ? 'bg-red/5' : ''
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-ink">
                          "{ans.queryPrompt}"
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          {ans.agentName}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="p-2 rounded bg-void border border-line-strong font-mono text-xs text-muted leading-relaxed">
                          "{ans.cachedAnswer}"
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-start gap-1.5 text-muted">
                          <AlertTriangle
                            className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                              ans.directConflict ? 'text-red' : 'text-amber'
                            }`}
                          />
                          <span>{ans.potentialIssue}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={ans.impactStatus} size="sm" pulse={ans.directConflict} />
                      </td>

                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setSelectedEvidenceAnswer(ans as any)}
                          className="px-2.5 py-1 rounded bg-raised-2 border border-line-strong hover:border-ice text-xs text-ink whitespace-nowrap transition-colors"
                        >
                          Evidence
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pinned Bottom Action Dock */}
      <div className="fixed bottom-0 left-[232px] right-0 h-16 bg-panel/95 border-t border-line-strong z-30 px-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
            className="h-9 px-3.5 rounded-lg bg-raised border border-line-strong text-xs text-muted hover:text-ink flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Document</span>
          </button>
          <button
            onClick={() => navigate(`/dashboard/impact?doc=${doc.id}`)}
            className="h-9 px-3.5 rounded-lg bg-raised border border-line-strong text-xs text-ice hover:bg-raised-2 flex items-center gap-2 transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>View Impact Graph</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/dashboard/reviews?doc=${doc.id}`)}
            className="h-9 px-5 rounded-lg bg-ice hover:bg-ice text-xs font-semibold text-void flex items-center gap-2 shadow-sm transition-colors"
          >
            <span>Review Affected Answers</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Evidence Modal */}
      {selectedEvidenceAnswer && (
        <Modal
          isOpen={!!selectedEvidenceAnswer}
          onClose={() => setSelectedEvidenceAnswer(null)}
          title={`Evidence Inspection: ${selectedEvidenceAnswer.id}`}
          subtitle={`Agent: ${selectedEvidenceAnswer.agentName}`}
          maxWidth="lg"
        >
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-3 rounded-lg bg-void border border-line-strong flex flex-col gap-1">
              <span className="text-xs text-muted">User Query</span>
              <p className="text-sm font-semibold text-ink">
                "{selectedEvidenceAnswer.queryPrompt}"
              </p>
            </div>

            <div className="p-3 rounded-lg bg-void border border-line-strong flex flex-col gap-1">
              <span className="text-xs text-muted">Cached Copilot Answer</span>
              <p className="font-mono text-muted">
                "{selectedEvidenceAnswer.cachedAnswer}"
              </p>
            </div>

            <div className="p-3 rounded-lg bg-raised-2/70 border border-line-strong flex flex-col gap-1">
              <span className="text-xs text-ice">Vector Grounding Chunk</span>
              <div className="font-mono text-ink">{selectedEvidenceAnswer.citedChunkId}</div>
              <p className="text-muted italic mt-1">
                "{selectedEvidenceAnswer.citedPassage}"
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-line-strong">
              <StatusBadge status={selectedEvidenceAnswer.impactStatus} />
              <button
                onClick={() => {
                  setSelectedEvidenceAnswer(null);
                  navigate(`/dashboard/reviews?doc=${doc.id}`);
                }}
                className="px-4 py-2 rounded-lg bg-ice text-void hover:bg-ice font-medium"
              >
                Resolve in Review Center →
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
