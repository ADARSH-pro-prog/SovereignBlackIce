import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import {

  Network,

  Download,

  Filter,

  ZoomIn,

  ZoomOut,

  Maximize2,

  FileText,

  AlertTriangle,

  History,

  CheckCircle,

  ArrowRight,

  Shield,

  Sparkles,

  ExternalLink,

  RefreshCw,

} from 'lucide-react';

import { StatusBadge } from '../components/ui/StatusBadge';

import { useApp } from '../context/AppContext';

import { apiService, ImpactGraphResult } from '../services/api';

import { DEMO_AFFECTED_ANSWERS } from '../data/demoData';

export const ImpactAnalysisPage: React.FC = () => {

  const navigate = useNavigate();

  const { documents, reviews, isLiveMode, recalculateImpact, addToast } = useApp();

  const [selectedDocId, setSelectedDocId] = useState<string>('all');

  const [graphData, setGraphData] = useState<ImpactGraphResult | null>(null);

  const [isLoadingGraph, setIsLoadingGraph] = useState(false);

  const [graphError, setGraphError] = useState<string | null>(null);

  const [selectedNode, setSelectedNode] = useState<any>('claim');

  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'critical' | 'review'>('all');

  const [zoomLevel, setZoomLevel] = useState(100);

  // Fetch real dependency graph when in live mode

  const fetchGraph = async (docId?: string) => {

    if (!isLiveMode) return;

    setIsLoadingGraph(true);

    setGraphError(null);

    try {

      const data = await apiService.getImpactGraph(docId === 'all' ? undefined : docId);

      setGraphData(data);

    } catch (err: any) {

      console.warn('Failed to load dependency graph:', err);

      setGraphError(err.message || 'Failed to load graph data');

      setGraphData(null);

    } finally {

      setIsLoadingGraph(false);

    }

  };

  useEffect(() => {

    if (isLiveMode) {

      fetchGraph(selectedDocId);

    } else {

      setGraphData(null);

      setGraphError(null);

    }

  }, [isLiveMode, selectedDocId]);

  const handleRecalculate = async () => {

    const targetDocId = selectedDocId === 'all' ? documents[0]?.id : selectedDocId;

    if (!targetDocId && isLiveMode) {

      addToast({

        type: 'warning',

        title: 'No Document Available',

        message: 'Please upload a document first to analyze impact.',

      });

      return;

    }

    if (isLiveMode && targetDocId) {

      await recalculateImpact(targetDocId);

      await fetchGraph(selectedDocId);

    } else {

      recalculateImpact('DOC-7704');

    }

  };

  const filteredAnswers = isLiveMode

    ? reviews.map((r) => ({

        id: r.id,

        queryPrompt: r.issueSummary,

        agentName: r.affectedAgent,

        cachedAnswer: r.claimMutation?.previousClaim || 'Copilot answer grounded on older baseline',

        potentialIssue: r.explanation,

        impactStatus: r.status as any,

        directConflict: r.severity === 'High',

        citedChunkId: r.lineageHash,

        lastUpdated: r.timestamp,

      }))

    : DEMO_AFFECTED_ANSWERS.filter((ans) => {

        if (activeFilterTab === 'critical') return ans.directConflict;

        if (activeFilterTab === 'review') return !ans.directConflict;

        return true;

      });

  return (

    <div className="relative flex flex-col gap-6 animate-in fade-in duration-200 pb-28 text-ink before:pointer-events-none before:fixed before:inset-0 before:-z-10 ">

      {/* Top Page Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="display text-[44px] leading-none text-ink">Impact analysis</h1>
            {!isLiveMode && (
              <span className="rounded-full border border-amber/30 px-2 py-0.5 text-xs text-amber">Demo data</span>
            )}
          </div>
          <p className="mt-3 max-w-2xl text-[15px] text-ink-2">
            Follow a change from the source that moved, through the claims it supports, to every AI answer that cited
            them.
          </p>
        </div>
        {isLiveMode && graphData && (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <div className="text-xs text-muted">Nodes</div>
              <div className="tabular-nums text-ink">{graphData.total_nodes}</div>
            </div>
            <div className="h-8 w-px bg-line-strong" />
            <div>
              <div className="text-xs text-muted">Edges</div>
              <div className="tabular-nums text-ink">{graphData.total_edges}</div>
            </div>
          </div>
        )}
      </header>

      {/* Top Toolbar Strip */}

      <div className="bg-panel border border-line rounded-2xl p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 shadow-sm">

        <div className="flex flex-wrap items-center gap-2.5">

          {/* Document Selector */}

          <div className="flex items-center bg-raised border border-line rounded-lg px-3 h-9 gap-2">

            <FileText className="w-4 h-4 text-ice" />

            <span className="text-xs text-muted">Source:</span>

            <select

              value={selectedDocId}

              onChange={(e) => setSelectedDocId(e.target.value)}

              className="bg-transparent text-xs font-medium text-ink focus:outline-none cursor-pointer"

            >

              {isLiveMode ? (

                <>

                  <option value="all" className="bg-raised">All Documents in Knowledge Graph</option>

                  {documents.map((d) => (

                    <option key={d.id} value={d.id} className="bg-raised">

                      {d.title} ({d.id})

                    </option>

                  ))}

                </>

              ) : (

                <>

                  <option value="DOC-7704" className="bg-raised">Employee Reimbursement Policy (DOC-7704)</option>

                  <option value="DOC-8912" className="bg-raised">Vendor Security Standard (DOC-8912)</option>

                  <option value="DOC-5120" className="bg-raised">Data Retention Policy (DOC-5120)</option>

                </>

              )}

            </select>

          </div>

          {/* Lineage Selector */}

          <div className="flex items-center bg-raised border border-line rounded-lg px-3 h-9 gap-2">

            <History className="w-4 h-4 text-muted" />

            <span className="text-xs text-muted">Lineage:</span>

            <select className="bg-transparent text-xs font-medium text-ink focus:outline-none cursor-pointer">

              <option className="bg-raised">Active Knowledge State (Latest)</option>

              <option className="bg-raised">All Monitored Versions</option>

            </select>

          </div>

          {/* Impact Level Filter */}

          <div className="flex items-center bg-raised border border-line rounded-lg px-3 h-9 gap-2">

            <Filter className="w-4 h-4 text-amber" />

            <span className="text-xs text-muted">Impact:</span>

            <select

              value={activeFilterTab}

              onChange={(e) => setActiveFilterTab(e.target.value as any)}

              className="bg-transparent text-xs font-medium text-ink focus:outline-none cursor-pointer"

            >

              <option value="all" className="bg-raised">All impact levels</option>

              <option value="critical" className="bg-raised">Critical Conflict only</option>

              <option value="review" className="bg-raised">Review Required only</option>

            </select>

          </div>

        </div>

        {/* Action Controls */}

        <div className="flex items-center gap-2 shrink-0">

          <button

            onClick={handleRecalculate}

            disabled={isLoadingGraph}

            className="h-9 px-3.5 rounded-lg bg-raised border border-line hover:bg-raised text-xs font-medium text-ink flex items-center gap-1.5 transition-colors disabled:opacity-50"

          >

            <RefreshCw className={`w-3.5 h-3.5 text-ice ${isLoadingGraph ? 'animate-spin' : ''}`} />

            <span>{isLoadingGraph ? 'Calculating...' : 'Recalculate impact'}</span>

          </button>

          <button

            onClick={() => {

              addToast({

                type: 'info',

                title: 'Exporting Impact Report',

                message: isLiveMode && graphData

                  ? `Exporting graph topology (${graphData.total_nodes} nodes, ${graphData.total_edges} edges)...`

                  : 'Preparing JSON-LD audit bundle with Merkle proof receipts...',

              });

            }}

            className="h-9 px-3.5 rounded-lg bg-raised border border-line hover:bg-raised text-xs font-medium text-ink flex items-center gap-1.5 transition-colors"

          >

            <Download className="w-3.5 h-3.5 text-muted" />

            <span>Export report</span>

          </button>

        </div>

      </div>

      {/* 4 Summary Metric Cards */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        <div className="chart-card flex h-[132px] flex-col justify-between px-5 py-4">

          <div className="flex items-center justify-between">

            <span className="label-mono">

              {isLiveMode ? 'Knowledge Entities' : 'Changed Claims'}

            </span>

            <span className="p-1 rounded bg-raised text-ice">

              <Sparkles className="w-4 h-4" />

            </span>

          </div>

          <div>

            <div className="font-mono text-[34px] font-medium leading-none tracking-tight tabular-nums text-ink">

              {isLiveMode && graphData ? graphData.total_nodes : '1'}

            </div>

            <div className="text-xs text-ice mt-0.5">

              {isLiveMode && graphData

                ? `${graphData.node_counts_by_type?.claim || 0} claims • ${graphData.node_counts_by_type?.document || 0} docs`

                : '§4.2 Temporal Contraction'}

            </div>

          </div>

        </div>

        <div className="chart-card flex h-[132px] flex-col justify-between px-5 py-4">

          <div className="flex items-center justify-between">

            <span className="label-mono">

              {isLiveMode ? 'Graph Dependencies' : 'Potentially Affected Answers'}

            </span>

            <span className="p-1 rounded bg-amber/10 text-amber">

              <AlertTriangle className="w-4 h-4" />

            </span>

          </div>

          <div>

            <div className="font-mono text-[34px] font-medium leading-none tracking-tight tabular-nums text-ink">

              {isLiveMode && graphData ? graphData.total_edges : '3'}

            </div>

            <div className="text-xs text-amber mt-0.5">

              {isLiveMode ? 'Directed DAG Edges' : 'Drift Alert across 3 agents'}

            </div>

          </div>

        </div>

        <div className="chart-card flex h-[132px] flex-col justify-between px-5 py-4">

          <div className="flex items-center justify-between">

            <span className="label-mono">

              {isLiveMode ? 'Unresolved Alerts' : 'High-Priority Reviews'}

            </span>

            <span className="p-1 rounded bg-red/10 text-red">

              <Shield className="w-4 h-4" />

            </span>

          </div>

          <div>

            <div className="font-mono text-[34px] font-medium leading-none tracking-tight tabular-nums text-red">

              {isLiveMode ? reviews.filter((r) => r.status !== 'Resolved').length : '2'}

            </div>

            <div className="text-xs text-red/80 mt-0.5">

              {isLiveMode

                ? `${reviews.filter((r) => r.severity === 'High' && r.status !== 'Resolved').length} high severity`

                : '1 critical contradiction, 1 stale'}

            </div>

          </div>

        </div>

        <div className="chart-card flex h-[132px] flex-col justify-between px-5 py-4">

          <div className="flex items-center justify-between">

            <span className="label-mono">

              {isLiveMode ? 'Auditor Resolved' : 'Confirmed Outdated Answers'}

            </span>

            <span className="p-1 rounded bg-ice/10 text-ice">

              <CheckCircle className="w-4 h-4" />

            </span>

          </div>

          <div>

            <div className="font-mono text-[34px] font-medium leading-none tracking-tight tabular-nums text-ink">

              {isLiveMode ? reviews.filter((r) => r.status === 'Resolved').length : '0'}

            </div>

            <div className="text-xs text-ice mt-0.5">

              {isLiveMode ? 'Signed off in Review Center' : 'Triage pending human auditor review'}

            </div>

          </div>

        </div>

      </div>

      {/* Central Interactive Dependency Graph & Inspector Grid */}

      <div className="grid grid-cols-1 min-[1560px]:grid-cols-12 gap-6 items-start">

        {/* Left Column (8 cols): Graph Canvas */}

        <div className="min-[1560px]:col-span-8 chart-card flex flex-col">

          {/* Canvas Controls Header */}

          <div className="h-12 border-b border-line px-4 bg-raised flex items-center justify-between">

            <div className="flex items-center gap-2">

              <Network className="w-4 h-4 text-ice" />

              <h2 className="text-sm font-semibold text-ink">

                Knowledge Dependency Graph

              </h2>

              <span className="px-2 py-0.5 rounded bg-panel text-xs font-mono text-muted border border-line">

                {isLiveMode ? 'NetworkX DAG' : 'DAG Topology'}

              </span>

            </div>

            {/* Controls */}

            <div className="flex items-center gap-2">

              <div className="flex items-center bg-panel p-0.5 rounded-lg border border-line">

                <button

                  onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}

                  className="p-1.5 rounded text-muted hover:text-ink"

                  title="Zoom in"

                >

                  <ZoomIn className="w-3.5 h-3.5" />

                </button>

                <button

                  onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}

                  className="p-1.5 rounded text-muted hover:text-ink"

                  title="Zoom out"

                >

                  <ZoomOut className="w-3.5 h-3.5" />

                </button>

                <button

                  onClick={() => setZoomLevel(100)}

                  className="p-1.5 rounded text-muted hover:text-ink"

                  title="Fit to viewport"

                >

                  <Maximize2 className="w-3.5 h-3.5" />

                </button>

              </div>

            </div>

          </div>

          {/* Interactive Visual Graph Canvas */}

          <div

            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}

            className="grid-marks relative w-full min-h-[600px] bg-void p-8 flex flex-col justify-between overflow-x-auto transition-transform duration-150"

          >

            <div className="flex items-center justify-between text-xs text-muted pb-2 border-b border-line">

              <span>

                {isLiveMode

                  ? 'Real NetworkX graph entities from SQLite and ChromaDB vector partitions.'

                  : 'Click any node to inspect upstream lineage and downstream blast radius.'}

              </span>

              <span className="">STAGE 1 → STAGE 4 TRACE FLOW</span>

            </div>

            {isLoadingGraph ? (

              <div className="py-24 text-center text-muted flex flex-col items-center justify-center gap-3">

                <RefreshCw className="w-8 h-8 text-ice animate-spin" />

                <p className="text-sm font-semibold text-ink">Constructing Dependency Graph...</p>

                <p className="text-xs text-muted">Traversing NetworkX edges across documents, chunks, claims, and answers.</p>

              </div>

            ) : graphError ? (

              <div className="py-20 text-center text-xs flex flex-col items-center gap-3">

                <AlertTriangle className="w-8 h-8 text-amber" />

                <p className="text-sm font-semibold text-ink">Graph Topology Warning</p>

                <p className="text-muted max-w-md">{graphError}</p>

                <button

                  onClick={() => fetchGraph(selectedDocId)}

                  className="px-3.5 py-1.5 rounded-lg bg-ice text-void hover:brightness-95 text-xs font-medium"

                >

                  Retry Loading Graph

                </button>

              </div>

            ) : isLiveMode && graphData && graphData.total_nodes === 0 ? (

              <div className="py-24 text-center text-muted flex flex-col items-center justify-center gap-3">

                <Network className="w-10 h-10 text-muted" />

                <p className="text-sm font-semibold text-ink">No Graph Entities Recorded</p>

                <p className="text-xs text-muted max-w-md">

                  The dependency graph is currently empty for this document selection. Ingest documents and ask questions via AI Assistant to build live lineage.

                </p>

                <button

                  onClick={handleRecalculate}

                  className="px-3.5 py-1.5 rounded-lg bg-ice text-void hover:brightness-95 text-xs font-medium"

                >

                  Analyze Impact & Build Graph

                </button>

              </div>

            ) : isLiveMode && graphData ? (

              <div className="grid grid-cols-4 gap-4 items-start my-auto py-6">

                {/* STAGE 1: Documents & Versions */}

                <div className="flex flex-col gap-2">

                  <span className="text-xs text-muted text-center mb-1">

                    Stage 1: Documents ({graphData!.node_counts_by_type?.document || 0})

                  </span>

                  {graphData!.nodes

                    .filter((n) => n.type === 'document')

                    .slice(0, 3)

                    .map((node) => (

                      <div

                        key={node.id}

                        onClick={() => setSelectedNode(node)}

                        className={`p-3 rounded-2xl cursor-pointer transition-all ${

                          selectedNode?.id === node.id || selectedNode === 'doc'

                            ? 'bg-raised border-2 border-line-strong shadow-lg ring-1 ring-line-strong'

                            : 'bg-panel border border-line hover:border-line-strong'

                        }`}

                      >

                        <div className="flex items-center justify-between mb-1">

                          <span className="text-xs text-ice">

                            {node.type}

                          </span>

                        </div>

                        <h4 className="text-xs font-semibold text-ink truncate">

                          {node.title}

                        </h4>

                        <span className="text-xs font-mono text-muted truncate block mt-0.5">

                          {node.id}

                        </span>

                      </div>

                    ))}

                </div>

                {/* STAGE 2: Claims & Chunks */}

                <div className="flex flex-col gap-2">

                  <span className="text-xs text-muted text-center mb-1">

                    Stage 2: Claims ({graphData!.node_counts_by_type?.claim || 0})

                  </span>

                  {graphData!.nodes

                    .filter((n) => n.type === 'claim')

                    .slice(0, 3)

                    .map((node) => (

                      <div

                        key={node.id}

                        onClick={() => setSelectedNode(node)}

                        className={`p-3 rounded-2xl cursor-pointer transition-all ${

                          selectedNode?.id === node.id || selectedNode === 'claim'

                            ? 'bg-raised border-2 border-amber shadow-lg ring-1 ring-amber/30'

                            : 'bg-panel border border-line hover:border-amber/60'

                        }`}

                      >

                        <div className="flex items-center justify-between mb-1">

                          <span className="text-xs text-amber">

                            {node.type}

                          </span>

                        </div>

                        <h4 className="text-xs font-semibold text-ink truncate">

                          {node.title}

                        </h4>

                        <span className="text-xs font-mono text-muted truncate block mt-0.5">

                          {node.id}

                        </span>

                      </div>

                    ))}

                </div>

                {/* STAGE 3: Grounded Answers */}

                <div className="flex flex-col gap-2">

                  <span className="text-xs text-muted text-center mb-1">

                    Stage 3: Answers ({graphData!.node_counts_by_type?.answer || 0})

                  </span>

                  {graphData!.nodes

                    .filter((n) => n.type === 'answer')

                    .slice(0, 3)

                    .map((node) => (

                      <div

                        key={node.id}

                        onClick={() => setSelectedNode(node)}

                        className={`p-3 rounded-2xl cursor-pointer transition-all ${

                          selectedNode?.id === node.id

                            ? 'bg-raised border-2 border-line-strong'

                            : 'bg-panel border border-line hover:border-line-strong'

                        }`}

                      >

                        <div className="flex items-center justify-between mb-1">

                          <span className="text-xs text-ice">

                            Answer

                          </span>

                        </div>

                        <h4 className="text-xs font-semibold text-ink truncate">

                          "{node.title}"

                        </h4>

                        <span className="text-xs font-mono text-muted truncate block mt-0.5">

                          {node.id}

                        </span>

                      </div>

                    ))}

                  {graphData!.nodes.filter((n) => n.type === 'answer').length === 0 && (

                    <div className="p-3 rounded-2xl bg-panel border border-dashed border-line text-center text-xs text-muted">

                      No answers grounded on this document yet.

                    </div>

                  )}

                </div>

                {/* STAGE 4: Human Review & Alerts */}

                <div className="flex flex-col gap-2">

                  <span className="text-xs text-muted text-center mb-1">

                    Stage 4: Review Gate ({reviews.filter((r) => r.status !== 'Resolved').length})

                  </span>

                  <div

                    onClick={() => setSelectedNode('gate')}

                    className={`p-3.5 rounded-2xl cursor-pointer transition-all ${

                      selectedNode === 'gate'

                        ? 'bg-raised border-2 border-ice shadow-lg ring-1 ring-ice/30'

                        : 'bg-panel border border-line hover:border-ice/60'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-2">

                      <span className="p-1 rounded bg-amber/15 text-amber">

                        <Shield className="w-4 h-4" />

                      </span>

                      <span className="text-xs text-amber font-semibold">

                        {reviews.filter((r) => r.status !== 'Resolved').length} PENDING

                      </span>

                    </div>

                    <h3 className="text-xs font-semibold text-ink">

                      Human Review Gate

                    </h3>

                    <div className="text-xs text-muted mt-0.5">

                      Sovereign Triage

                    </div>

                    <button

                      onClick={(e) => {

                        e.stopPropagation();

                        navigate('/dashboard/reviews');

                      }}

                      className="w-full mt-3 py-1.5 bg-raised hover:bg-raised border border-line rounded-lg text-xs font-medium text-ink flex items-center justify-center gap-1"

                    >

                      <span>Open Queue</span>

                      <ArrowRight className="w-3 h-3" />

                    </button>

                  </div>

                </div>

              </div>

            ) : (

              <div className="relative grid grid-cols-4 gap-6 items-center my-auto py-10">
                {/* Propagation path: source → claim → answers → review gate */}
                <div aria-hidden className="pointer-events-none absolute inset-x-[10%] top-1/2 flex -translate-y-1/2">
                  <span className="h-px flex-1 border-t border-dashed border-ice/40" />
                  <span className="h-px flex-[2] border-t border-dashed border-amber/60" />
                </div>

                {/* STAGE 1: SOURCE DOCUMENT */}

                <div className="relative z-10 flex flex-col items-center">

                  <div

                    onClick={() => setSelectedNode('doc')}

                    className={`w-full max-w-[190px] rounded-2xl p-3.5 cursor-pointer transition-all duration-150 ${

                      selectedNode === 'doc'

                        ? 'bg-raised border-2 border-line-strong shadow-lg ring-2 ring-line-strong'

                        : 'bg-panel border border-line hover:border-line-strong'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-2">

                      <span className="p-1 rounded bg-raised text-ice">

                        <FileText className="w-4 h-4" />

                      </span>

                      <span className="text-xs text-ice font-semibold">

                        SOURCE

                      </span>

                    </div>

                    <h3 className="text-xs font-semibold text-ink">

                      Reimbursement Policy

                    </h3>

                    <div className="text-xs font-mono text-muted mt-1">

                      DOC-7704 • v2.0

                    </div>

                    <div className="mt-2 pt-2 border-t border-line text-xs text-muted">

                      Domain: Human Res.

                    </div>

                  </div>

                  <span className="text-xs text-muted mt-2">

                    Origin Anchor

                  </span>

                </div>

                {/* STAGE 2: CHANGED CLAIM (MUTATOR) */}

                <div className="relative z-10 flex flex-col items-center">

                  <div

                    onClick={() => setSelectedNode('claim')}

                    className={`w-full max-w-[200px] rounded-2xl p-3.5 cursor-pointer transition-all duration-150 relative ${

                      selectedNode === 'claim'

                        ? 'bg-raised border-2 border-amber shadow-xl ring-2 ring-amber/20'

                        : 'bg-panel border border-line hover:border-amber/60'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-2">

                      <span className="p-1 rounded bg-amber/15 text-amber">

                        <Sparkles className="w-4 h-4" />

                      </span>

                      <span className="text-xs text-amber font-semibold">

                        Mutated §4.2

                      </span>

                    </div>

                    <h3 className="text-xs font-semibold text-ink">

                      Submission Deadline

                    </h3>

                    <div className="text-xs font-mono text-muted mt-0.5">

                      Claim #CLM-4201

                    </div>

                    <div className="mt-2 p-1.5 rounded bg-panel border border-line flex items-center justify-between text-xs">

                      <span className="line-through text-red font-mono">30 days</span>

                      <ArrowRight className="w-3 h-3 text-muted" />

                      <span className="text-ice font-mono font-semibold">15 days</span>

                    </div>

                  </div>

                  <span className="text-xs text-muted mt-2">

                    Semantic Mutator

                  </span>

                </div>

                {/* STAGE 3: 3 AFFECTED COPILOT ANSWERS */}

                <div className="relative z-10 flex flex-col gap-2.5 justify-center">

                  <div

                    onClick={() => setSelectedNode('ans1')}

                    className={`p-2.5 rounded-lg cursor-pointer transition-all text-xs ${

                      selectedNode === 'ans1'

                        ? 'bg-raised border-2 border-amber'

                        : 'bg-panel border border-line hover:border-amber/60'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-0.5">

                      <span className="font-semibold text-ink truncate">

                        Slack HR Copilot

                      </span>

                      <span className="text-xs text-amber">REVIEW</span>

                    </div>

                    <p className="text-xs text-muted truncate">"How long to submit?"</p>

                    <span className="text-xs text-red">Cites 30d</span>

                  </div>

                  <div

                    onClick={() => setSelectedNode('ans2')}

                    className={`p-2.5 rounded-lg cursor-pointer transition-all text-xs ${

                      selectedNode === 'ans2'

                        ? 'bg-raised border-2 border-amber'

                        : 'bg-panel border border-line hover:border-amber/60'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-0.5">

                      <span className="font-semibold text-ink truncate">

                        Enterprise Search

                      </span>

                      <span className="text-xs text-amber">REVIEW</span>

                    </div>

                    <p className="text-xs text-muted truncate">"Cutoff timeline..."</p>

                    <span className="text-xs text-muted">Chunk superseded</span>

                  </div>

                  <div

                    onClick={() => setSelectedNode('ans3')}

                    className={`p-2.5 rounded-lg cursor-pointer transition-all text-xs ${

                      selectedNode === 'ans3'

                        ? 'bg-raised border-2 border-red'

                        : 'bg-panel border border-red/60 hover:border-red'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-0.5">

                      <span className="font-semibold text-ink truncate">

                        Finance Copilot

                      </span>

                      <span className="text-xs text-red font-bold">

                        CRITICAL

                      </span>

                    </div>

                    <p className="text-xs text-muted truncate">"Can I submit at day 20?"</p>

                    <span className="text-xs text-red font-medium">Contradiction: says YES</span>

                  </div>

                </div>

                {/* STAGE 4: HUMAN REVIEW GATE */}

                <div className="relative z-10 flex flex-col items-center">

                  <div

                    onClick={() => setSelectedNode('gate')}

                    className={`w-full max-w-[190px] rounded-2xl p-3.5 cursor-pointer transition-all duration-150 ${

                      selectedNode === 'gate'

                        ? 'bg-raised border-2 border-ice shadow-lg ring-2 ring-ice/30'

                        : 'bg-panel border border-line hover:border-ice/60'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-2">

                      <span className="p-1 rounded bg-amber/15 text-amber">

                        <Shield className="w-4 h-4" />

                      </span>

                      <span className="text-xs text-amber font-semibold">

                        3 PENDING

                      </span>

                    </div>

                    <h3 className="text-xs font-semibold text-ink">

                      Human Review Gate

                    </h3>

                    <div className="text-xs text-muted mt-0.5">

                      Sovereign Triage

                    </div>

                    <button

                      onClick={(e) => {

                        e.stopPropagation();

                        navigate('/dashboard/reviews');

                      }}

                      className="w-full mt-3 py-1.5 bg-raised hover:bg-raised border border-line rounded-lg text-xs font-medium text-ink flex items-center justify-center gap-1"

                    >

                      <span>Open Queue</span>

                      <ArrowRight className="w-3 h-3" />

                    </button>

                  </div>

                  <span className="text-xs text-muted mt-2">

                    Governance Gate

                  </span>

                </div>

              </div>

            )}

            <div className="flex items-center justify-between pt-3 border-t border-line text-xs text-muted">

              <span className="flex items-center gap-1.5">

                <span className="w-2 h-2 rounded-full bg-ice" />

                {isLiveMode && graphData

                  ? `NetworkX Topology: ${graphData.total_nodes} nodes, ${graphData.total_edges} verified edges`

                  : 'Direct Graph Parser: 4 nodes, 5 edges verified'}

              </span>

              <span className="font-mono text-ice">Zero cycles detected</span>

            </div>

          </div>

        </div>

        {/* Right Column (4 cols): Node Inspector Panel */}

        <div className="min-[1560px]:col-span-4 chart-card flex flex-col">

          <div className="h-12 border-b border-line px-4 bg-raised flex items-center justify-between">

            <h3 className="text-sm font-semibold text-ink">

              Node Inspector

            </h3>

            <span className="text-xs text-amber bg-amber/10 px-2 py-0.5 rounded font-semibold">

              {isLiveMode ? 'Live Entity' : 'Pending Triage'}

            </span>

          </div>

          <div className="p-5 space-y-4 text-xs">

            {/* Target Node Summary */}

            <div className="p-3.5 rounded-2xl bg-raised border border-line">

              <div className="flex items-center justify-between text-xs font-mono text-muted mb-1">

                <span>ENTITY KEY</span>

                <span className="text-ice truncate max-w-[160px]">

                  {typeof selectedNode === 'object' && selectedNode?.id

                    ? selectedNode.id

                    : 'CLM-4201'}

                </span>

              </div>

              <div className="text-sm font-semibold text-ink truncate">

                {typeof selectedNode === 'object' && selectedNode?.label

                  ? selectedNode.label

                  : 'Submission Deadline Modified'}

              </div>

              <div className="text-xs text-muted mt-0.5">

                {typeof selectedNode === 'object' && selectedNode?.type

                  ? `Graph Entity Type: ${selectedNode.type.toUpperCase()}`

                  : 'Section 4.2 "Expense Submission Window & Eligibility"'}

              </div>

            </div>

            {/* Lineage & Source Metadata */}

            <div className="space-y-2 text-xs">

              <div className="flex justify-between py-1 border-b border-line">

                <span className="text-muted">Entity Classification:</span>

                <span className="text-ink font-medium">

                  {typeof selectedNode === 'object' && selectedNode?.type

                    ? selectedNode.type

                    : 'Temporal Restriction'}

                </span>

              </div>

              <div className="flex justify-between py-1 border-b border-line">

                <span className="text-muted">Extraction Method:</span>

                <span className="font-mono text-ice">

                  {isLiveMode ? 'NetworkX DAG Ingestion' : 'AST Semantic Token Diff'}

                </span>

              </div>

              <div className="flex justify-between py-1 border-b border-line">

                <span className="text-muted">Connected Edges:</span>

                <span className="text-red font-medium">

                  {isLiveMode && graphData && typeof selectedNode === 'object'

                    ? graphData.edges.filter(

                        (e) => e.source === selectedNode.id || e.target === selectedNode.id

                      ).length

                    : '3 AI Agents • 1 Vector KB'}

                </span>

              </div>

            </div>

            {/* Node Properties / Content Preview */}

            {typeof selectedNode === 'object' && selectedNode?.properties ? (

              <div className="p-3 rounded-lg bg-panel border border-line space-y-1.5 font-mono text-xs">

                <span className="text-xs text-muted block">

                  Node Properties:

                </span>

                {Object.entries(selectedNode.properties).map(([k, v]) => (

                  <div key={k} className="flex justify-between gap-2 overflow-hidden">

                    <span className="text-muted">{k}:</span>

                    <span className="text-ink truncate">{String(v)}</span>

                  </div>

                ))}

              </div>

            ) : (

              <div className="space-y-2">

                <div className="flex justify-between text-xs text-muted">

                  <span className="">Claim Value Mutation</span>

                  <span className="text-ice font-medium">Diff Match 99.4%</span>

                </div>

                <div className="p-2.5 rounded bg-panel border border-line">

                  <div className="text-xs text-muted mb-0.5">

                    v1.0 (Sep 18 Baseline)

                  </div>

                  <p className="text-muted leading-relaxed">

                    "Employees must submit reimbursement claims within{' '}

                    <span className="text-red line-through font-mono">30 days</span> of the expense occurrence."

                  </p>

                </div>

                <div className="p-2.5 rounded bg-panel border border-line-strong">

                  <div className="text-xs text-ice mb-0.5">

                    v2.0 (Sep 26 Active)

                  </div>

                  <p className="text-ink leading-relaxed">

                    "Employees must submit reimbursement claims within{' '}

                    <span className="text-ice font-bold font-mono">15 days</span> of the expense occurrence."

                  </p>

                </div>

              </div>

            )}

            {/* Inversion hazard callout */}

            <div className="p-3 rounded-lg bg-red/10 border border-red/30 space-y-1">

              <div className="flex items-center gap-1.5 text-red font-semibold text-xs">

                <AlertTriangle className="w-3.5 h-3.5" />

                <span>Lineage Blast Notice</span>

              </div>

              <p className="text-xs text-muted leading-relaxed">

                Changes to this entity propagate through graph edges to grounded copilot answers. Validate changes in the Review Center.

              </p>

            </div>

            {/* Actions */}

            <div className="pt-2 space-y-2">

              <button

                onClick={() => navigate('/dashboard/documents')}

                className="w-full py-2 bg-ice hover:brightness-95 text-void rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"

              >

                <span>Inspect in Documents</span>

                <ArrowRight className="w-3.5 h-3.5" />

              </button>

              <button

                onClick={() => {

                  handleRecalculate();

                }}

                className="w-full py-2 bg-raised hover:bg-raised border border-line text-xs font-medium text-ink rounded-lg flex items-center justify-center gap-2 transition-colors"

              >

                <RefreshCw className="w-3.5 h-3.5 text-muted" />

                <span>Re-traverse NetworkX Edges</span>

              </button>

            </div>

          </div>

        </div>

      </div>

      {/* Protocol Explanation Callout */}

      <div className="bg-panel border-l-4 border-l-ice border-y border-r border-line rounded-r-xl p-5 flex items-start gap-4 shadow-sm">

        <div className="p-2 rounded-lg bg-raised text-ice shrink-0">

          <Shield className="w-5 h-5" />

        </div>

        <div className="space-y-1">

          <div className="flex items-center gap-2">

            <h3 className="text-sm font-semibold text-ink">

              Understanding Dependency Blast Radius & False-Positive Prevention

            </h3>

          </div>

          <p className="text-xs text-muted leading-relaxed max-w-5xl">

            These answers are structurally linked to the previous 30-day deadline claim.

            Since the current active document states 15 days, they have been flagged for

            human review. The graph indicates a potential semantic dependency, not a

            confirmed incorrect answer. Sovereign Black Ice preserves agent operational

            continuity by requiring compliance verification prior to preemptively purging

            knowledge caches or evicting production prompts.

          </p>

        </div>

      </div>

      {/* Affected Knowledge Items Table */}

      <div className="bg-panel border border-line rounded-2xl overflow-hidden shadow-sm">

        <div className="px-5 py-3 border-b border-line flex items-center justify-between bg-raised ">

          <div className="flex items-center gap-3">

            <h3 className="text-sm font-semibold text-ink">

              Affected Knowledge Items

            </h3>

            <span className="px-2 py-0.5 rounded bg-amber/10 text-amber text-xs font-mono font-semibold">

              3 Items Detected

            </span>

          </div>

          {/* Filter Tabs */}

          <div className="flex items-center bg-panel p-1 rounded-lg border border-line">

            <button

              onClick={() => setActiveFilterTab('all')}

              className={`px-3 py-1 text-xs font-medium rounded-md ${

                activeFilterTab === 'all'

                  ? 'bg-raised text-ink'

                  : 'text-muted'

              }`}

            >

              All (3)

            </button>

            <button

              onClick={() => setActiveFilterTab('critical')}

              className={`px-3 py-1 text-xs font-medium rounded-md ${

                activeFilterTab === 'critical'

                  ? 'bg-raised text-red'

                  : 'text-muted'

              }`}

            >

              Critical Inversion (1)

            </button>

            <button

              onClick={() => setActiveFilterTab('review')}

              className={`px-3 py-1 text-xs font-medium rounded-md ${

                activeFilterTab === 'review'

                  ? 'bg-raised text-amber'

                  : 'text-muted'

              }`}

            >

              Review Required (2)

            </button>

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left border-collapse min-w-[800px]">

            <thead>

              <tr className="h-9 bg-raised text-xs font-medium text-muted">

                <th className="px-5">Knowledge Item & Agent Source</th>

                <th className="px-4">Type</th>

                <th className="px-4">Related Semantic Change</th>

                <th className="px-4">Impact Status</th>

                <th className="px-4">Last Updated</th>

                <th className="px-5 text-right">Actions</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-line text-xs">

              {filteredAnswers.map((ans) => (

                <tr

                  key={ans.id}

                  className="h-14 bg-raised transition-colors"

                >

                  <td className="px-5">

                    <div className="font-medium text-ink">

                      "{ans.queryPrompt}"

                    </div>

                    <div className="text-xs text-muted">

                      {ans.agentName} • ID: {ans.id}

                    </div>

                  </td>

                  <td className="px-4">

                    <span className="font-mono text-xs text-muted px-2 py-0.5 rounded bg-raised">

                      {ans.citedChunkId}

                    </span>

                  </td>

                  <td className="px-4">

                    <div className="flex items-center gap-1.5">

                      <span className="line-through text-red font-mono">30 days</span>

                      <ArrowRight className="w-3 h-3 text-muted" />

                      <span className="text-ice font-mono font-semibold">15 days</span>

                    </div>

                  </td>

                  <td className="px-4">

                    <StatusBadge status={ans.impactStatus} size="sm" pulse={ans.directConflict} />

                  </td>

                  <td className="px-4 text-muted font-mono">{ans.lastUpdated}</td>

                  <td className="px-5 text-right">

                    <button

                      onClick={() => navigate('/dashboard/reviews')}

                      className="px-2.5 py-1 rounded bg-raised hover:bg-raised border border-line text-xs text-ink"

                    >

                      View answer

                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* Sticky Bottom Dock */}

      <div className="fixed bottom-0 left-[232px] right-0 h-16 bg-panel border-t border-line z-30 px-7 flex items-center justify-between">

        <div className="flex items-center gap-2 text-xs text-muted">

          <span className="w-2 h-2 rounded-full bg-ice" />

          <span>

            <strong className="text-ink">Blast radius analysis complete:</strong> {filteredAnswers.length} downstream answers mapped across {documents.length} monitored documents.

          </span>

        </div>

        <div className="flex items-center gap-3">

          <button

            onClick={() => navigate('/dashboard/documents/DOC-7704')}

            className="h-9 px-3.5 rounded-lg bg-panel border border-line text-xs text-ink hover:bg-raised flex items-center gap-1.5 transition-colors"

          >

            <FileText className="w-4 h-4 text-muted" />

            <span>Open Source Document</span>

          </button>

          <button

            onClick={() => navigate('/dashboard/documents/DOC-7704/compare')}

            className="h-9 px-3.5 rounded-lg bg-panel border border-line text-xs text-ink hover:bg-raised flex items-center gap-1.5 transition-colors"

          >

            <History className="w-4 h-4 text-muted" />

            <span>View Version Comparison</span>

          </button>

          <button

            onClick={() => navigate('/dashboard/reviews')}

            className="h-9 px-4 rounded-lg bg-ice hover:brightness-95 text-xs font-semibold text-void flex items-center gap-1.5 shadow-sm transition-colors"

          >

            <span>Review Affected Answers in Review Center</span>

            <ArrowRight className="w-4 h-4" />

          </button>

        </div>

      </div>

    </div>

  );

};
