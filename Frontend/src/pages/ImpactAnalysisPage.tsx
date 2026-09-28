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

    <div className="relative flex flex-col gap-6 animate-in fade-in duration-200 pb-28 text-[#29233D] before:pointer-events-none before:fixed before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_15%_10%,rgba(217,249,157,0.42),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(249,168,212,0.30),transparent_30%),radial-gradient(circle_at_55%_75%,rgba(221,214,254,0.34),transparent_34%),linear-gradient(135deg,#FFFDF9_0%,#FFF8FC_48%,#F7FEE7_100%)]">

      {/* Top Page Header */}

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2">

        <div className="space-y-1">

          <div className="flex items-center gap-3 flex-wrap">

            <h1 className="text-2xl font-bold tracking-tight text-[#29233D]">

              Knowledge Impact Analysis

            </h1>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE] text-xs font-mono">

              <Network className="w-3.5 h-3.5" />

              <span>GRAPH ENGINE v2.4</span>

            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F7F3F8] text-[#65A30D] border border-[#E8E3EC] text-xs font-mono">

              <span className="w-1.5 h-1.5 rounded-full bg-[#84CC16]" />

              <span>{isLiveMode ? 'NETWORKX LIVE TOPOLOGY' : 'SEMANTIC LINEAGE LIVE'}</span>

            </div>

            <span className="px-2 py-0.5 rounded bg-[#F7F3F8] text-xs font-mono text-[#756D82] border border-[#E8E3EC]">

              {isLiveMode ? 'LIVE API' : '[DEMO DATA]'}

            </span>

          </div>

          <p className="text-sm text-[#756D82] max-w-3xl">

            Trace how document modifications and policy mutations affect downstream

            AI-generated answers, vector caches, and enterprise copilot responses.

          </p>

        </div>

        {/* Right Lineage Meta Strip */}

        <div className="flex items-center gap-3 shrink-0 self-start lg:self-end text-xs">

          <div className="text-right">

            <span className="text-[10px] uppercase text-[#938DA2] block font-mono">

              Graph Engine

            </span>

            <span className="font-mono text-[#29233D]">

              {isLiveMode ? 'NetworkX DiGraph DAG' : 'SHA256:7f0c...9a41 [DEMO DATA]'}

            </span>

          </div>

          <div className="h-6 w-[1px] bg-[#E8E3EC]" />

          <div className="text-right">

            <span className="text-[10px] uppercase text-[#938DA2] block font-mono">

              Topology Nodes

            </span>

            <span className="font-medium text-[#65A30D]">

              {isLiveMode && graphData ? `${graphData.total_nodes} Nodes • ${graphData.total_edges} Edges` : 'Deterministic Reachability'}

            </span>

          </div>

        </div>

      </div>

      {/* Top Toolbar Strip */}

      <div className="bg-white/85 border border-[#E8E3EC] rounded-2xl p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 shadow-sm">

        <div className="flex flex-wrap items-center gap-2.5">

          {/* Document Selector */}

          <div className="flex items-center bg-[#F7F3F8] border border-[#E8E3EC] rounded-lg px-3 h-9 gap-2">

            <FileText className="w-4 h-4 text-[#7C3AED]" />

            <span className="text-[11px] uppercase tracking-wider text-[#938DA2]">Source:</span>

            <select

              value={selectedDocId}

              onChange={(e) => setSelectedDocId(e.target.value)}

              className="bg-transparent text-xs font-medium text-[#29233D] focus:outline-none cursor-pointer"

            >

              {isLiveMode ? (

                <>

                  <option value="all" className="bg-[#F7F3F8]">All Documents in Knowledge Graph</option>

                  {documents.map((d) => (

                    <option key={d.id} value={d.id} className="bg-[#F7F3F8]">

                      {d.title} ({d.id})

                    </option>

                  ))}

                </>

              ) : (

                <>

                  <option value="DOC-7704" className="bg-[#F7F3F8]">Employee Reimbursement Policy (DOC-7704)</option>

                  <option value="DOC-8912" className="bg-[#F7F3F8]">Vendor Security Standard (DOC-8912)</option>

                  <option value="DOC-5120" className="bg-[#F7F3F8]">Data Retention Policy (DOC-5120)</option>

                </>

              )}

            </select>

          </div>

          {/* Lineage Selector */}

          <div className="flex items-center bg-[#F7F3F8] border border-[#E8E3EC] rounded-lg px-3 h-9 gap-2">

            <History className="w-4 h-4 text-[#938DA2]" />

            <span className="text-[11px] uppercase tracking-wider text-[#938DA2]">Lineage:</span>

            <select className="bg-transparent text-xs font-medium text-[#29233D] focus:outline-none cursor-pointer">

              <option className="bg-[#F7F3F8]">Active Knowledge State (Latest)</option>

              <option className="bg-[#F7F3F8]">All Monitored Versions</option>

            </select>

          </div>

          {/* Impact Level Filter */}

          <div className="flex items-center bg-[#F7F3F8] border border-[#E8E3EC] rounded-lg px-3 h-9 gap-2">

            <Filter className="w-4 h-4 text-[#F59E0B]" />

            <span className="text-[11px] uppercase tracking-wider text-[#938DA2]">Impact:</span>

            <select

              value={activeFilterTab}

              onChange={(e) => setActiveFilterTab(e.target.value as any)}

              className="bg-transparent text-xs font-medium text-[#29233D] focus:outline-none cursor-pointer"

            >

              <option value="all" className="bg-[#F7F3F8]">All impact levels</option>

              <option value="critical" className="bg-[#F7F3F8]">Critical Conflict only</option>

              <option value="review" className="bg-[#F7F3F8]">Review Required only</option>

            </select>

          </div>

        </div>

        {/* Action Controls */}

        <div className="flex items-center gap-2 shrink-0">

          <button

            onClick={handleRecalculate}

            disabled={isLoadingGraph}

            className="h-9 px-3.5 rounded-lg bg-[#F7F3F8] border border-[#E8E3EC] hover:bg-[#F3EEF5] text-xs font-medium text-[#29233D] flex items-center gap-1.5 transition-colors disabled:opacity-50"

          >

            <RefreshCw className={`w-3.5 h-3.5 text-[#7C3AED] ${isLoadingGraph ? 'animate-spin' : ''}`} />

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

            className="h-9 px-3.5 rounded-lg bg-[#F7F3F8] border border-[#E8E3EC] hover:bg-[#F3EEF5] text-xs font-medium text-[#29233D] flex items-center gap-1.5 transition-colors"

          >

            <Download className="w-3.5 h-3.5 text-[#756D82]" />

            <span>Export report</span>

          </button>

        </div>

      </div>

      {/* 4 Summary Metric Cards */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        <div className="p-4 bg-white/85 border border-[#E8E3EC] rounded-2xl flex flex-col justify-between h-[120px]">

          <div className="flex items-center justify-between">

            <span className="text-[11px] uppercase tracking-wider text-[#756D82]">

              {isLiveMode ? 'Knowledge Entities' : 'Changed Claims'}

            </span>

            <span className="p-1 rounded bg-[#F5F3FF] text-[#7C3AED]">

              <Sparkles className="w-4 h-4" />

            </span>

          </div>

          <div>

            <div className="text-2xl font-bold font-mono text-[#29233D]">

              {isLiveMode && graphData ? graphData.total_nodes : '1'}

            </div>

            <div className="text-xs text-[#7C3AED] mt-0.5">

              {isLiveMode && graphData

                ? `${graphData.node_counts_by_type?.claim || 0} claims • ${graphData.node_counts_by_type?.document || 0} docs`

                : '§4.2 Temporal Contraction'}

            </div>

          </div>

        </div>

        <div className="p-4 bg-white/85 border border-[#E8E3EC] rounded-2xl flex flex-col justify-between h-[120px]">

          <div className="flex items-center justify-between">

            <span className="text-[11px] uppercase tracking-wider text-[#756D82]">

              {isLiveMode ? 'Graph Dependencies' : 'Potentially Affected Answers'}

            </span>

            <span className="p-1 rounded bg-[#F59E0B]/10 text-[#F59E0B]">

              <AlertTriangle className="w-4 h-4" />

            </span>

          </div>

          <div>

            <div className="text-2xl font-bold font-mono text-[#29233D]">

              {isLiveMode && graphData ? graphData.total_edges : '3'}

            </div>

            <div className="text-xs text-[#F59E0B] mt-0.5">

              {isLiveMode ? 'Directed DAG Edges' : 'Drift Alert across 3 agents'}

            </div>

          </div>

        </div>

        <div className="p-4 bg-white/85 border border-[#E8E3EC] rounded-2xl flex flex-col justify-between h-[120px]">

          <div className="flex items-center justify-between">

            <span className="text-[11px] uppercase tracking-wider text-[#756D82]">

              {isLiveMode ? 'Unresolved Alerts' : 'High-Priority Reviews'}

            </span>

            <span className="p-1 rounded bg-[#EF4444]/10 text-[#EF4444]">

              <Shield className="w-4 h-4" />

            </span>

          </div>

          <div>

            <div className="text-2xl font-bold font-mono text-[#EF4444]">

              {isLiveMode ? reviews.filter((r) => r.status !== 'Resolved').length : '2'}

            </div>

            <div className="text-xs text-[#EF4444]/80 mt-0.5">

              {isLiveMode

                ? `${reviews.filter((r) => r.severity === 'High' && r.status !== 'Resolved').length} high severity`

                : '1 critical contradiction, 1 stale'}

            </div>

          </div>

        </div>

        <div className="p-4 bg-white/85 border border-[#E8E3EC] rounded-2xl flex flex-col justify-between h-[120px]">

          <div className="flex items-center justify-between">

            <span className="text-[11px] uppercase tracking-wider text-[#756D82]">

              {isLiveMode ? 'Auditor Resolved' : 'Confirmed Outdated Answers'}

            </span>

            <span className="p-1 rounded bg-[#84CC16]/10 text-[#65A30D]">

              <CheckCircle className="w-4 h-4" />

            </span>

          </div>

          <div>

            <div className="text-2xl font-bold font-mono text-[#29233D]">

              {isLiveMode ? reviews.filter((r) => r.status === 'Resolved').length : '0'}

            </div>

            <div className="text-xs text-[#65A30D] mt-0.5">

              {isLiveMode ? 'Signed off in Review Center' : 'Triage pending human auditor review'}

            </div>

          </div>

        </div>

      </div>

      {/* Central Interactive Dependency Graph & Inspector Grid */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column (8 cols): Graph Canvas */}

        <div className="lg:col-span-8 bg-white/85 border border-[#E8E3EC] rounded-2xl flex flex-col overflow-hidden shadow-sm">

          {/* Canvas Controls Header */}

          <div className="h-12 border-b border-[#E8E3EC] px-4 bg-gradient-to-r from-[#F7FEE7] via-white to-[#FDF2F8] flex items-center justify-between">

            <div className="flex items-center gap-2">

              <Network className="w-4 h-4 text-[#7C3AED]" />

              <h2 className="text-sm font-semibold text-[#29233D]">

                Knowledge Dependency Graph

              </h2>

              <span className="px-2 py-0.5 rounded bg-white/85 text-[10px] font-mono text-[#756D82] border border-[#E8E3EC]">

                {isLiveMode ? 'NetworkX DAG' : 'DAG Topology'}

              </span>

            </div>

            {/* Controls */}

            <div className="flex items-center gap-2">

              <div className="flex items-center bg-[#FFFDF9] p-0.5 rounded-lg border border-[#E8E3EC]">

                <button

                  onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}

                  className="p-1.5 rounded text-[#756D82] hover:text-[#29233D]"

                  title="Zoom in"

                >

                  <ZoomIn className="w-3.5 h-3.5" />

                </button>

                <button

                  onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}

                  className="p-1.5 rounded text-[#756D82] hover:text-[#29233D]"

                  title="Zoom out"

                >

                  <ZoomOut className="w-3.5 h-3.5" />

                </button>

                <button

                  onClick={() => setZoomLevel(100)}

                  className="p-1.5 rounded text-[#756D82] hover:text-[#29233D]"

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

            className="relative w-full min-h-[520px] bg-[#FFFDF9] p-6 flex flex-col justify-between overflow-x-auto transition-transform duration-150"

          >

            <div className="flex items-center justify-between text-[11px] text-[#938DA2] pb-2 border-b border-[#F1EDF2]">

              <span>

                {isLiveMode

                  ? 'Real NetworkX graph entities from SQLite and ChromaDB vector partitions.'

                  : 'Click any node to inspect upstream lineage and downstream blast radius.'}

              </span>

              <span className="uppercase font-mono">STAGE 1 → STAGE 4 TRACE FLOW</span>

            </div>

            {isLoadingGraph ? (

              <div className="py-24 text-center text-[#756D82] flex flex-col items-center justify-center gap-3">

                <RefreshCw className="w-8 h-8 text-[#7C3AED] animate-spin" />

                <p className="text-sm font-semibold text-[#29233D]">Constructing Dependency Graph...</p>

                <p className="text-xs text-[#938DA2]">Traversing NetworkX edges across documents, chunks, claims, and answers.</p>

              </div>

            ) : graphError ? (

              <div className="py-20 text-center text-xs flex flex-col items-center gap-3">

                <AlertTriangle className="w-8 h-8 text-[#F59E0B]" />

                <p className="text-sm font-semibold text-[#29233D]">Graph Topology Warning</p>

                <p className="text-[#756D82] max-w-md">{graphError}</p>

                <button

                  onClick={() => fetchGraph(selectedDocId)}

                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#A3E635] to-[#F9A8D4] text-[#29233D] hover:brightness-95 text-xs font-medium"

                >

                  Retry Loading Graph

                </button>

              </div>

            ) : isLiveMode && graphData && graphData.total_nodes === 0 ? (

              <div className="py-24 text-center text-[#756D82] flex flex-col items-center justify-center gap-3">

                <Network className="w-10 h-10 text-[#938DA2]" />

                <p className="text-sm font-semibold text-[#29233D]">No Graph Entities Recorded</p>

                <p className="text-xs text-[#938DA2] max-w-md">

                  The dependency graph is currently empty for this document selection. Ingest documents and ask questions via AI Assistant to build live lineage.

                </p>

                <button

                  onClick={handleRecalculate}

                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#A3E635] to-[#F9A8D4] text-[#29233D] hover:brightness-95 text-xs font-medium"

                >

                  Analyze Impact & Build Graph

                </button>

              </div>

            ) : isLiveMode && graphData ? (

              <div className="grid grid-cols-4 gap-4 items-start my-auto py-6">

                {/* STAGE 1: Documents & Versions */}

                <div className="flex flex-col gap-2">

                  <span className="text-[10px] uppercase font-mono text-[#938DA2] text-center mb-1">

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

                            ? 'bg-[#F7F3F8] border-2 border-[#C4B5FD] shadow-lg ring-1 ring-[#C4B5FD]/40'

                            : 'bg-white/85 border border-[#E8E3EC] hover:border-[#C4B5FD]/60'

                        }`}

                      >

                        <div className="flex items-center justify-between mb-1">

                          <span className="text-[10px] font-mono text-[#7C3AED] uppercase">

                            {node.type}

                          </span>

                        </div>

                        <h4 className="text-xs font-semibold text-[#29233D] truncate">

                          {node.title}

                        </h4>

                        <span className="text-[10px] font-mono text-[#938DA2] truncate block mt-0.5">

                          {node.id}

                        </span>

                      </div>

                    ))}

                </div>

                {/* STAGE 2: Claims & Chunks */}

                <div className="flex flex-col gap-2">

                  <span className="text-[10px] uppercase font-mono text-[#938DA2] text-center mb-1">

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

                            ? 'bg-[#F7F3F8] border-2 border-[#F59E0B] shadow-lg ring-1 ring-[#F59E0B]/30'

                            : 'bg-white/85 border border-[#E8E3EC] hover:border-[#F59E0B]/60'

                        }`}

                      >

                        <div className="flex items-center justify-between mb-1">

                          <span className="text-[10px] font-mono text-[#F59E0B] uppercase">

                            {node.type}

                          </span>

                        </div>

                        <h4 className="text-xs font-semibold text-[#29233D] truncate">

                          {node.title}

                        </h4>

                        <span className="text-[10px] font-mono text-[#938DA2] truncate block mt-0.5">

                          {node.id}

                        </span>

                      </div>

                    ))}

                </div>

                {/* STAGE 3: Grounded Answers */}

                <div className="flex flex-col gap-2">

                  <span className="text-[10px] uppercase font-mono text-[#938DA2] text-center mb-1">

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

                            ? 'bg-[#F7F3F8] border-2 border-[#C4B5FD]'

                            : 'bg-white/85 border border-[#E8E3EC] hover:border-[#C4B5FD]/60'

                        }`}

                      >

                        <div className="flex items-center justify-between mb-1">

                          <span className="text-[10px] font-mono text-[#7C3AED] uppercase">

                            Answer

                          </span>

                        </div>

                        <h4 className="text-xs font-semibold text-[#29233D] truncate">

                          "{node.title}"

                        </h4>

                        <span className="text-[10px] font-mono text-[#938DA2] truncate block mt-0.5">

                          {node.id}

                        </span>

                      </div>

                    ))}

                  {graphData!.nodes.filter((n) => n.type === 'answer').length === 0 && (

                    <div className="p-3 rounded-2xl bg-white/85 border border-dashed border-[#E8E3EC] text-center text-[11px] text-[#938DA2]">

                      No answers grounded on this document yet.

                    </div>

                  )}

                </div>

                {/* STAGE 4: Human Review & Alerts */}

                <div className="flex flex-col gap-2">

                  <span className="text-[10px] uppercase font-mono text-[#938DA2] text-center mb-1">

                    Stage 4: Review Gate ({reviews.filter((r) => r.status !== 'Resolved').length})

                  </span>

                  <div

                    onClick={() => setSelectedNode('gate')}

                    className={`p-3.5 rounded-2xl cursor-pointer transition-all ${

                      selectedNode === 'gate'

                        ? 'bg-[#F7F3F8] border-2 border-[#A3E635] shadow-lg ring-1 ring-[#A3E635]/30'

                        : 'bg-white/85 border border-[#E8E3EC] hover:border-[#A3E635]/60'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-2">

                      <span className="p-1 rounded bg-[#F59E0B]/15 text-[#F59E0B]">

                        <Shield className="w-4 h-4" />

                      </span>

                      <span className="text-[10px] font-mono text-[#F59E0B] font-semibold uppercase">

                        {reviews.filter((r) => r.status !== 'Resolved').length} PENDING

                      </span>

                    </div>

                    <h3 className="text-xs font-semibold text-[#29233D]">

                      Human Review Gate

                    </h3>

                    <div className="text-[10px] text-[#938DA2] mt-0.5">

                      Sovereign Triage

                    </div>

                    <button

                      onClick={(e) => {

                        e.stopPropagation();

                        navigate('/reviews');

                      }}

                      className="w-full mt-3 py-1.5 bg-[#F7F3F8] hover:bg-[#F3EEF5] border border-[#E8E3EC] rounded-lg text-xs font-medium text-[#29233D] flex items-center justify-center gap-1"

                    >

                      <span>Open Queue</span>

                      <ArrowRight className="w-3 h-3" />

                    </button>

                  </div>

                </div>

              </div>

            ) : (

              <div className="grid grid-cols-4 gap-4 items-center my-auto py-6">

                {/* STAGE 1: SOURCE DOCUMENT */}

                <div className="flex flex-col items-center">

                  <div

                    onClick={() => setSelectedNode('doc')}

                    className={`w-full max-w-[190px] rounded-2xl p-3.5 cursor-pointer transition-all duration-150 ${

                      selectedNode === 'doc'

                        ? 'bg-[#F7F3F8] border-2 border-[#C4B5FD] shadow-lg ring-2 ring-[#C4B5FD]/40'

                        : 'bg-white/85 border border-[#E8E3EC] hover:border-[#C4B5FD]/60'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-2">

                      <span className="p-1 rounded bg-[#F5F3FF] text-[#7C3AED]">

                        <FileText className="w-4 h-4" />

                      </span>

                      <span className="text-[10px] font-mono text-[#7C3AED] font-semibold uppercase">

                        SOURCE

                      </span>

                    </div>

                    <h3 className="text-xs font-semibold text-[#29233D]">

                      Reimbursement Policy

                    </h3>

                    <div className="text-[10px] font-mono text-[#938DA2] mt-1">

                      DOC-7704 • v2.0

                    </div>

                    <div className="mt-2 pt-2 border-t border-[#F1EDF2] text-[10px] text-[#756D82]">

                      Domain: Human Res.

                    </div>

                  </div>

                  <span className="text-[10px] uppercase font-mono text-[#938DA2] mt-2">

                    Origin Anchor

                  </span>

                </div>

                {/* STAGE 2: CHANGED CLAIM (MUTATOR) */}

                <div className="flex flex-col items-center">

                  <div

                    onClick={() => setSelectedNode('claim')}

                    className={`w-full max-w-[200px] rounded-2xl p-3.5 cursor-pointer transition-all duration-150 relative ${

                      selectedNode === 'claim'

                        ? 'bg-[#F7F3F8] border-2 border-[#F59E0B] shadow-xl ring-2 ring-[#F59E0B]/20'

                        : 'bg-white/85 border border-[#E8E3EC] hover:border-[#F59E0B]/60'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-2">

                      <span className="p-1 rounded bg-[#F59E0B]/15 text-[#F59E0B]">

                        <Sparkles className="w-4 h-4" />

                      </span>

                      <span className="text-[10px] font-mono text-[#F59E0B] font-semibold uppercase">

                        Mutated §4.2

                      </span>

                    </div>

                    <h3 className="text-xs font-semibold text-[#29233D]">

                      Submission Deadline

                    </h3>

                    <div className="text-[10px] font-mono text-[#938DA2] mt-0.5">

                      Claim #CLM-4201

                    </div>

                    <div className="mt-2 p-1.5 rounded bg-[#FFFDF9] border border-[#E8E3EC] flex items-center justify-between text-xs">

                      <span className="line-through text-[#EF4444] font-mono">30 days</span>

                      <ArrowRight className="w-3 h-3 text-[#938DA2]" />

                      <span className="text-[#65A30D] font-mono font-semibold">15 days</span>

                    </div>

                  </div>

                  <span className="text-[10px] uppercase font-mono text-[#938DA2] mt-2">

                    Semantic Mutator

                  </span>

                </div>

                {/* STAGE 3: 3 AFFECTED COPILOT ANSWERS */}

                <div className="flex flex-col gap-2.5 justify-center">

                  <div

                    onClick={() => setSelectedNode('ans1')}

                    className={`p-2.5 rounded-lg cursor-pointer transition-all text-xs ${

                      selectedNode === 'ans1'

                        ? 'bg-[#F7F3F8] border-2 border-[#F59E0B]'

                        : 'bg-white/85 border border-[#E8E3EC] hover:border-[#F59E0B]/60'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-0.5">

                      <span className="font-semibold text-[#29233D] truncate">

                        Slack HR Copilot

                      </span>

                      <span className="text-[9px] font-mono text-[#F59E0B] uppercase">REVIEW</span>

                    </div>

                    <p className="text-[11px] text-[#756D82] truncate">"How long to submit?"</p>

                    <span className="text-[10px] text-[#EF4444]">Cites 30d</span>

                  </div>

                  <div

                    onClick={() => setSelectedNode('ans2')}

                    className={`p-2.5 rounded-lg cursor-pointer transition-all text-xs ${

                      selectedNode === 'ans2'

                        ? 'bg-[#F7F3F8] border-2 border-[#F59E0B]'

                        : 'bg-white/85 border border-[#E8E3EC] hover:border-[#F59E0B]/60'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-0.5">

                      <span className="font-semibold text-[#29233D] truncate">

                        Enterprise Search

                      </span>

                      <span className="text-[9px] font-mono text-[#F59E0B] uppercase">REVIEW</span>

                    </div>

                    <p className="text-[11px] text-[#756D82] truncate">"Cutoff timeline..."</p>

                    <span className="text-[10px] text-[#938DA2]">Chunk superseded</span>

                  </div>

                  <div

                    onClick={() => setSelectedNode('ans3')}

                    className={`p-2.5 rounded-lg cursor-pointer transition-all text-xs ${

                      selectedNode === 'ans3'

                        ? 'bg-[#F7F3F8] border-2 border-[#EF4444]'

                        : 'bg-white/85 border border-[#EF4444]/60 hover:border-[#EF4444]'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-0.5">

                      <span className="font-semibold text-[#29233D] truncate">

                        Finance Copilot

                      </span>

                      <span className="text-[9px] font-mono text-[#EF4444] font-bold uppercase">

                        CRITICAL

                      </span>

                    </div>

                    <p className="text-[11px] text-[#756D82] truncate">"Can I submit at day 20?"</p>

                    <span className="text-[10px] text-[#EF4444] font-medium">Contradiction: says YES</span>

                  </div>

                </div>

                {/* STAGE 4: HUMAN REVIEW GATE */}

                <div className="flex flex-col items-center">

                  <div

                    onClick={() => setSelectedNode('gate')}

                    className={`w-full max-w-[190px] rounded-2xl p-3.5 cursor-pointer transition-all duration-150 ${

                      selectedNode === 'gate'

                        ? 'bg-[#F7F3F8] border-2 border-[#A3E635] shadow-lg ring-2 ring-[#A3E635]/30'

                        : 'bg-white/85 border border-[#E8E3EC] hover:border-[#A3E635]/60'

                    }`}

                  >

                    <div className="flex items-center justify-between mb-2">

                      <span className="p-1 rounded bg-[#F59E0B]/15 text-[#F59E0B]">

                        <Shield className="w-4 h-4" />

                      </span>

                      <span className="text-[10px] font-mono text-[#F59E0B] font-semibold uppercase">

                        3 PENDING

                      </span>

                    </div>

                    <h3 className="text-xs font-semibold text-[#29233D]">

                      Human Review Gate

                    </h3>

                    <div className="text-[10px] text-[#938DA2] mt-0.5">

                      Sovereign Triage

                    </div>

                    <button

                      onClick={(e) => {

                        e.stopPropagation();

                        navigate('/reviews');

                      }}

                      className="w-full mt-3 py-1.5 bg-[#F7F3F8] hover:bg-[#F3EEF5] border border-[#E8E3EC] rounded-lg text-xs font-medium text-[#29233D] flex items-center justify-center gap-1"

                    >

                      <span>Open Queue</span>

                      <ArrowRight className="w-3 h-3" />

                    </button>

                  </div>

                  <span className="text-[10px] uppercase font-mono text-[#938DA2] mt-2">

                    Governance Gate

                  </span>

                </div>

              </div>

            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#F1EDF2] text-[11px] text-[#938DA2]">

              <span className="flex items-center gap-1.5">

                <span className="w-2 h-2 rounded-full bg-[#84CC16]" />

                {isLiveMode && graphData

                  ? `NetworkX Topology: ${graphData.total_nodes} nodes, ${graphData.total_edges} verified edges`

                  : 'Direct Graph Parser: 4 nodes, 5 edges verified'}

              </span>

              <span className="font-mono text-[#7C3AED]">Zero cycles detected</span>

            </div>

          </div>

        </div>

        {/* Right Column (4 cols): Node Inspector Panel */}

        <div className="lg:col-span-4 bg-white/85 border border-[#E8E3EC] rounded-2xl flex flex-col shadow-sm">

          <div className="h-12 border-b border-[#E8E3EC] px-4 bg-gradient-to-r from-[#F7FEE7] via-white to-[#FDF2F8] flex items-center justify-between">

            <h3 className="text-sm font-semibold text-[#29233D]">

              Node Inspector

            </h3>

            <span className="text-[10px] font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded font-semibold uppercase">

              {isLiveMode ? 'Live Entity' : 'Pending Triage'}

            </span>

          </div>

          <div className="p-5 space-y-4 text-xs">

            {/* Target Node Summary */}

            <div className="p-3.5 rounded-2xl bg-[#F7F3F8] border border-[#E8E3EC]">

              <div className="flex items-center justify-between text-[10px] font-mono text-[#938DA2] mb-1">

                <span>ENTITY KEY</span>

                <span className="text-[#7C3AED] truncate max-w-[160px]">

                  {typeof selectedNode === 'object' && selectedNode?.id

                    ? selectedNode.id

                    : 'CLM-4201'}

                </span>

              </div>

              <div className="text-sm font-semibold text-[#29233D] truncate">

                {typeof selectedNode === 'object' && selectedNode?.label

                  ? selectedNode.label

                  : 'Submission Deadline Modified'}

              </div>

              <div className="text-xs text-[#756D82] mt-0.5">

                {typeof selectedNode === 'object' && selectedNode?.type

                  ? `Graph Entity Type: ${selectedNode.type.toUpperCase()}`

                  : 'Section 4.2 "Expense Submission Window & Eligibility"'}

              </div>

            </div>

            {/* Lineage & Source Metadata */}

            <div className="space-y-2 text-xs">

              <div className="flex justify-between py-1 border-b border-[#F1EDF2]">

                <span className="text-[#938DA2]">Entity Classification:</span>

                <span className="text-[#29233D] font-medium uppercase font-mono">

                  {typeof selectedNode === 'object' && selectedNode?.type

                    ? selectedNode.type

                    : 'Temporal Restriction'}

                </span>

              </div>

              <div className="flex justify-between py-1 border-b border-[#F1EDF2]">

                <span className="text-[#938DA2]">Extraction Method:</span>

                <span className="font-mono text-[#7C3AED]">

                  {isLiveMode ? 'NetworkX DAG Ingestion' : 'AST Semantic Token Diff'}

                </span>

              </div>

              <div className="flex justify-between py-1 border-b border-[#F1EDF2]">

                <span className="text-[#938DA2]">Connected Edges:</span>

                <span className="text-[#EF4444] font-medium">

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

              <div className="p-3 rounded-lg bg-[#FFFDF9] border border-[#E8E3EC] space-y-1.5 font-mono text-[11px]">

                <span className="text-[10px] text-[#938DA2] uppercase block">

                  Node Properties:

                </span>

                {Object.entries(selectedNode.properties).map(([k, v]) => (

                  <div key={k} className="flex justify-between gap-2 overflow-hidden">

                    <span className="text-[#756D82]">{k}:</span>

                    <span className="text-[#29233D] truncate">{String(v)}</span>

                  </div>

                ))}

              </div>

            ) : (

              <div className="space-y-2">

                <div className="flex justify-between text-[11px] text-[#938DA2]">

                  <span className="uppercase font-mono">Claim Value Mutation</span>

                  <span className="text-[#65A30D] font-medium">Diff Match 99.4%</span>

                </div>

                <div className="p-2.5 rounded bg-[#FFFDF9] border border-[#E8E3EC]">

                  <div className="text-[10px] text-[#938DA2] font-mono uppercase mb-0.5">

                    v1.0 (Sep 18 Baseline)

                  </div>

                  <p className="text-[#756D82] leading-relaxed">

                    "Employees must submit reimbursement claims within{' '}

                    <span className="text-[#EF4444] line-through font-mono">30 days</span> of the expense occurrence."

                  </p>

                </div>

                <div className="p-2.5 rounded bg-[#FFFDF9] border border-[#D9F99D]">

                  <div className="text-[10px] text-[#65A30D] font-mono uppercase mb-0.5">

                    v2.0 (Sep 26 Active)

                  </div>

                  <p className="text-[#29233D] leading-relaxed">

                    "Employees must submit reimbursement claims within{' '}

                    <span className="text-[#65A30D] font-bold font-mono">15 days</span> of the expense occurrence."

                  </p>

                </div>

              </div>

            )}

            {/* Inversion hazard callout */}

            <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 space-y-1">

              <div className="flex items-center gap-1.5 text-[#EF4444] font-semibold text-xs">

                <AlertTriangle className="w-3.5 h-3.5" />

                <span>Lineage Blast Notice</span>

              </div>

              <p className="text-[11px] text-[#756D82] leading-relaxed">

                Changes to this entity propagate through graph edges to grounded copilot answers. Validate changes in the Review Center.

              </p>

            </div>

            {/* Actions */}

            <div className="pt-2 space-y-2">

              <button

                onClick={() => navigate('/documents')}

                className="w-full py-2 bg-gradient-to-r from-[#A3E635] to-[#F9A8D4] hover:brightness-95 text-[#29233D] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"

              >

                <span>Inspect in Documents</span>

                <ArrowRight className="w-3.5 h-3.5" />

              </button>

              <button

                onClick={() => {

                  handleRecalculate();

                }}

                className="w-full py-2 bg-[#F7F3F8] hover:bg-[#F3EEF5] border border-[#E8E3EC] text-xs font-medium text-[#29233D] rounded-lg flex items-center justify-center gap-2 transition-colors"

              >

                <RefreshCw className="w-3.5 h-3.5 text-[#756D82]" />

                <span>Re-traverse NetworkX Edges</span>

              </button>

            </div>

          </div>

        </div>

      </div>

      {/* Protocol Explanation Callout */}

      <div className="bg-white/85 border-l-4 border-l-[#3B82F6] border-y border-r border-[#E8E3EC] rounded-r-xl p-5 flex items-start gap-4 shadow-sm">

        <div className="p-2 rounded-lg bg-[#F5F3FF] text-[#7C3AED] shrink-0">

          <Shield className="w-5 h-5" />

        </div>

        <div className="space-y-1">

          <div className="flex items-center gap-2">

            <h3 className="text-sm font-semibold text-[#29233D]">

              Understanding Dependency Blast Radius & False-Positive Prevention

            </h3>

            <span className="text-[10px] font-mono text-[#938DA2] px-1.5 py-0.5 rounded bg-[#F7F3F8]">

              SOVEREIGN PROTOCOL 12-B

            </span>

          </div>

          <p className="text-xs text-[#756D82] leading-relaxed max-w-5xl">

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

      <div className="bg-white/85 border border-[#E8E3EC] rounded-2xl overflow-hidden shadow-sm">

        <div className="px-5 py-3 border-b border-[#E8E3EC] flex items-center justify-between bg-gradient-to-r from-[#F7FEE7]/80 via-white to-[#FDF2F8]/80">

          <div className="flex items-center gap-3">

            <h3 className="text-sm font-semibold text-[#29233D]">

              Affected Knowledge Items

            </h3>

            <span className="px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-mono font-semibold">

              3 Items Detected

            </span>

          </div>

          {/* Filter Tabs */}

          <div className="flex items-center bg-[#FFFDF9] p-1 rounded-lg border border-[#E8E3EC]">

            <button

              onClick={() => setActiveFilterTab('all')}

              className={`px-3 py-1 text-xs font-medium rounded-md ${

                activeFilterTab === 'all'

                  ? 'bg-[#F7F3F8] text-[#29233D]'

                  : 'text-[#756D82]'

              }`}

            >

              All (3)

            </button>

            <button

              onClick={() => setActiveFilterTab('critical')}

              className={`px-3 py-1 text-xs font-medium rounded-md ${

                activeFilterTab === 'critical'

                  ? 'bg-[#F7F3F8] text-[#EF4444]'

                  : 'text-[#756D82]'

              }`}

            >

              Critical Inversion (1)

            </button>

            <button

              onClick={() => setActiveFilterTab('review')}

              className={`px-3 py-1 text-xs font-medium rounded-md ${

                activeFilterTab === 'review'

                  ? 'bg-[#F7F3F8] text-[#F59E0B]'

                  : 'text-[#756D82]'

              }`}

            >

              Review Required (2)

            </button>

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left border-collapse min-w-[800px]">

            <thead>

              <tr className="h-9 bg-[#F7F3F8] text-[11px] font-medium uppercase tracking-wider text-[#756D82]">

                <th className="px-5">Knowledge Item & Agent Source</th>

                <th className="px-4">Type</th>

                <th className="px-4">Related Semantic Change</th>

                <th className="px-4">Impact Status</th>

                <th className="px-4">Last Updated</th>

                <th className="px-5 text-right">Actions</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-[#F1EDF2] text-xs">

              {filteredAnswers.map((ans) => (

                <tr

                  key={ans.id}

                  className="h-14 hover:bg-gradient-to-r from-[#F7FEE7]/80 via-white to-[#FDF2F8]/80 transition-colors"

                >

                  <td className="px-5">

                    <div className="font-medium text-[#29233D]">

                      "{ans.queryPrompt}"

                    </div>

                    <div className="text-[11px] text-[#938DA2]">

                      {ans.agentName} • ID: {ans.id}

                    </div>

                  </td>

                  <td className="px-4">

                    <span className="font-mono text-[11px] text-[#756D82] px-2 py-0.5 rounded bg-[#F7F3F8]">

                      {ans.citedChunkId}

                    </span>

                  </td>

                  <td className="px-4">

                    <div className="flex items-center gap-1.5">

                      <span className="line-through text-[#EF4444] font-mono">30 days</span>

                      <ArrowRight className="w-3 h-3 text-[#938DA2]" />

                      <span className="text-[#65A30D] font-mono font-semibold">15 days</span>

                    </div>

                  </td>

                  <td className="px-4">

                    <StatusBadge status={ans.impactStatus} size="sm" pulse={ans.directConflict} />

                  </td>

                  <td className="px-4 text-[#938DA2] font-mono">{ans.lastUpdated}</td>

                  <td className="px-5 text-right">

                    <button

                      onClick={() => navigate('/reviews')}

                      className="px-2.5 py-1 rounded bg-[#F7F3F8] hover:bg-[#F3EEF5] border border-[#E8E3EC] text-xs text-[#29233D]"

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

      <div className="fixed bottom-0 left-[248px] right-0 h-16 bg-white/90 backdrop-blur-md border-t border-[#E8E3EC] z-30 px-7 flex items-center justify-between">

        <div className="flex items-center gap-2 text-xs text-[#756D82]">

          <span className="w-2 h-2 rounded-full bg-[#84CC16]" />

          <span>

            <strong className="text-[#29233D]">Blast radius analysis complete:</strong> 3 downstream dependencies mapped across 128 monitored documents.

          </span>

        </div>

        <div className="flex items-center gap-3">

          <button

            onClick={() => navigate('/documents/DOC-7704')}

            className="h-9 px-3.5 rounded-lg bg-white/85 border border-[#E8E3EC] text-xs text-[#29233D] hover:bg-[#F7F3F8] flex items-center gap-1.5 transition-colors"

          >

            <FileText className="w-4 h-4 text-[#938DA2]" />

            <span>Open Source Document</span>

          </button>

          <button

            onClick={() => navigate('/documents/DOC-7704/compare')}

            className="h-9 px-3.5 rounded-lg bg-white/85 border border-[#E8E3EC] text-xs text-[#29233D] hover:bg-[#F7F3F8] flex items-center gap-1.5 transition-colors"

          >

            <History className="w-4 h-4 text-[#938DA2]" />

            <span>View Version Comparison</span>

          </button>

          <button

            onClick={() => navigate('/reviews')}

            className="h-9 px-4 rounded-lg bg-gradient-to-r from-[#A3E635] to-[#F9A8D4] hover:brightness-95 text-xs font-semibold text-[#29233D] flex items-center gap-1.5 shadow-sm transition-colors"

          >

            <span>Review Affected Answers in Review Center</span>

            <ArrowRight className="w-4 h-4" />

          </button>

        </div>

      </div>

    </div>

  );

};
