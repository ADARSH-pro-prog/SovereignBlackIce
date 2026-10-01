/**
 * Sovereign Black Ice API Service Layer
 * Connects directly to the local Python FastAPI backend (http://127.0.0.1:8000).
 * Uses versioned endpoints under `/api/v1` and `/health`.
 * Configured via VITE_API_BASE_URL.
 */

import {
  DocumentItem,
  DocumentVersion,
  ReviewItem,
  AuditEvent,
  BackendConnectionStatus,
  AssistantMessage,
  SeverityLevel,
  ReviewStatus,
  IntegrityStatus,
  GraphNodeData,
  GraphEdgeData,
  AuthUser,
} from '../types';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:8000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public endpoint: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Shared fetch helper with abort timeout and error parsing
 */
async function fetchWithTimeout<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 15000
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const cleanBase = API_BASE_URL.replace(/\/$/, '');
  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${cleanBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('blackice_token') : null;
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });

    clearTimeout(id);

    if (!response.ok) {
      let errMsg = `Request failed with status ${response.status}`;
      let errDetails: unknown = null;
      try {
        const errJson = await response.json();
        errMsg = errJson.detail || errJson.message || errMsg;
        errDetails = errJson;
      } catch {
        errMsg = response.statusText || errMsg;
      }
      throw new ApiError(response.status, errMsg, endpoint, errDetails);
    }

    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    clearTimeout(id);
    if (err instanceof ApiError) throw err;
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `Connection to backend (${API_BASE_URL}) timed out after ${timeoutMs}ms.`
          : `Failed to connect to backend at ${API_BASE_URL}: ${err.message}`
        : 'Unknown connection error';
    throw new ApiError(0, msg, endpoint);
  }
}

// ==========================================
// BACKEND CONTRACT TYPES (Exact Pydantic Mappings)
// ==========================================

export interface BackendHealthResponse {
  status: string;
  app_name: string;
  version: string;
  timestamp: string;
}

export interface BackendSystemStatus {
  app_name: string;
  environment: string;
  status: string;
  database: {
    status: string;
    message: string;
  };
  ollama: {
    status: string;
    message: string;
  };
  chromadb: {
    status: string;
    message: string;
  };
  configured_models: {
    llm_model: string;
    embedding_model: string;
    ollama_base_url: string;
  };
}

export interface BackendDocumentVersionSummary {
  id: string;
  version_number: number;
  file_hash: string;
  file_size_bytes: number;
  page_count: number;
  status: string;
  created_at: string;
}

export interface BackendDocumentVersionDetail extends BackendDocumentVersionSummary {
  document_id: string;
  file_name: string;
  chunk_count?: number;
  claim_count?: number;
}

export interface BackendDocumentItem {
  id: string;
  name: string;
  original_filename: string;
  file_type: string;
  created_at: string;
  updated_at: string;
  latest_version?: BackendDocumentVersionSummary;
  versions?: BackendDocumentVersionDetail[];
}

export interface BackendDocumentListResponse {
  total: number;
  documents: BackendDocumentItem[];
}

export interface BackendDocumentUploadResponse {
  status: string;
  message: string;
  is_duplicate: boolean;
  is_reversion: boolean;
  reverted_from_version?: number;
  document: {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  };
  version: {
    id: string;
    version_number: number;
    file_hash: string;
    file_name: string;
    file_size_bytes: number;
    page_count: number;
    status: string;
    upload_timestamp: string;
  };
}

export interface BackendClaim {
  id: string;
  document_id: string;
  version_id: string;
  subject: string;
  predicate: string;
  value?: string;
  unit?: string;
  claim_text: string;
  category: string;
  confidence: number;
  source_location?: string;
  created_at: string;
}

export interface BackendClaimChange {
  id: string;
  document_id: string;
  old_version_id?: string;
  new_version_id: string;
  change_type: 'added' | 'removed' | 'modified' | 'unchanged' | 'uncertain';
  changed_field?: string;
  old_value?: string;
  new_value?: string;
  confidence: number;
  human_review_required?: boolean;
  requires_human_review?: boolean;
  explanation: string;
  old_claim_id?: string;
  new_claim_id?: string;
  source_reference_old?: string;
  source_reference_new?: string;
  old_claim?: BackendClaim;
  new_claim?: BackendClaim;
}

export interface BackendClaimListResponse {
  total: number;
  document_id: string;
  version_id?: string;
  claims: BackendClaim[];
}

export interface BackendClaimExtractionResponse {
  document_id: string;
  version_id: string;
  version_number: number;
  extraction_method: string;
  claims_count: number;
  claims: BackendClaim[];
}

export interface BackendVersionComparisonResponse {
  document_id: string;
  document_name: string;
  old_version_id?: string;
  old_version_number?: number;
  new_version_id: string;
  new_version_number: number;
  summary: {
    total_old_claims: number;
    total_new_claims: number;
    added_count: number;
    removed_count: number;
    modified_count: number;
    unchanged_count: number;
    uncertain_count: number;
    requires_human_review_count: number;
  };
  changes: BackendClaimChange[];
}

export interface BackendAnswerEvidence {
  id: string;
  document_id: string;
  document_name?: string;
  version_id: string;
  version_number?: number;
  chunk_id?: string;
  page_number?: number;
  claim_id?: string;
  similarity_score?: number;
  citation_text?: string;
  created_at: string;
}

export interface BackendAnswerResponse {
  id: string;
  question: string;
  generated_answer: string;
  model_name: string;
  status: 'current' | 'potentially_outdated' | 'verified' | 'superseded';
  human_review_required: boolean;
  review_notes?: string;
  created_at: string;
  updated_at: string;
  evidence_items: BackendAnswerEvidence[];
}

export interface BackendAlert {
  id: string;
  alert_type: string;
  document_id?: string;
  document_name?: string;
  old_version_id?: string;
  new_version_id?: string;
  related_claim_id?: string;
  affected_answer_id?: string;
  affected_question?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  status: 'unreviewed' | 'reviewed' | 'resolved';
  created_at: string;
  resolved_at?: string;
}

export interface BackendAlertListResponse {
  total: number;
  unreviewed_count: number;
  alerts: BackendAlert[];
}

export interface BackendGraphNode {
  id: string;
  type: string;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface BackendGraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
}

export interface BackendDependencyGraphResponse {
  total_nodes: number;
  total_edges: number;
  node_counts_by_type: Record<string, number>;
  nodes: BackendGraphNode[];
  edges: BackendGraphEdge[];
}

// Convenient type aliases
export type DependencyGraphResponse = BackendDependencyGraphResponse;
export type VersionComparisonResponse = BackendVersionComparisonResponse;
export type ClaimChangeDetail = BackendClaimChange;

export interface BackendImpactAnalysisResult {
  document_id: string;
  document_name: string;
  old_version_id?: string;
  new_version_id: string;
  total_claims_analyzed: number;
  changed_claims_count: number;
  affected_answers_count: number;
  unaffected_answers_count: number;
  alerts_generated: number;
  affected_answers: BackendAnswerResponse[];
  unaffected_answers: BackendAnswerResponse[];
  alerts: BackendAlert[];
}

export interface ImpactGraphResult {
  totalNodes: number;
  totalEdges: number;
  nodeCountsByType: Record<string, number>;
  total_nodes: number;
  total_edges: number;
  node_counts_by_type: Record<string, number>;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  rawGraph: BackendDependencyGraphResponse;
}

// ==========================================
// DATA ADAPTER HELPERS
// ==========================================

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(isoString?: string): string {
  if (!isoString) return 'Unknown';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function transformBackendDocToItem(
  doc: BackendDocumentItem,
  alerts: BackendAlert[] = [],
  answers: BackendAnswerResponse[] = []
): DocumentItem {
  const docAlerts = alerts.filter((a) => a.document_id === doc.id);
  const unreviewedAlerts = docAlerts.filter((a) => a.status === 'unreviewed');
  const docAnswers = answers.filter((a) =>
    a.evidence_items.some((ev) => ev.document_id === doc.id)
  );
  const outdatedAnswers = docAnswers.filter(
    (a) => a.status === 'potentially_outdated'
  );

  let integrityStatus: IntegrityStatus = 'Verified';
  if (unreviewedAlerts.length > 0 || outdatedAnswers.length > 0) {
    integrityStatus = 'Review required';
  } else if (doc.latest_version && doc.latest_version.version_number > 1) {
    integrityStatus = 'Verified';
  }

  const versions: DocumentVersion[] = (doc.versions || []).map((v, idx) => ({
    id: v.id,
    version: `v${v.version_number}.0`,
    versionNumber: `v${v.version_number}.0`,
    version_number: String(v.version_number),
    raw_version_number: v.version_number,
    releaseDate: formatDate(v.created_at),
    uploadedAt: formatDate(v.created_at),
    created_at: v.created_at,
    sha256: v.file_hash,
    status: idx === 0 ? 'Active' : 'Archived',
    author: 'Internal Knowledge System',
    summary: `Version ${v.version_number} snapshot (${v.page_count} page${v.page_count !== 1 ? 's' : ''}, ${v.chunk_count || 0} chunks, ${v.claim_count || 0} claims).`,
    isGenesis: v.version_number === 1,
    file_name: v.file_name,
    file_size_bytes: v.file_size_bytes,
    page_count: v.page_count,
    claims_count: v.claim_count,
  }));

  const currentVerStr = doc.latest_version
    ? `v${doc.latest_version.version_number}.0`
    : 'v1.0';
  const prevVerStr =
    doc.latest_version && doc.latest_version.version_number > 1
      ? `v${doc.latest_version.version_number - 1}.0`
      : undefined;

  return {
    id: doc.id,
    title: doc.name || doc.original_filename,
    department: 'Corporate Governance',
    currentVersion: currentVerStr,
    previousVersion: prevVerStr,
    lastModified: formatDate(doc.updated_at || doc.created_at),
    integrityStatus,
    affectedAnswerCount: outdatedAnswers.length || unreviewedAlerts.length,
    lastAnalyzed: formatDate(doc.updated_at),
    fileSize: formatBytes(doc.latest_version?.file_size_bytes),
    fileType: (doc.file_type || 'txt').toLowerCase() as DocumentItem['fileType'],
    owner: 'Knowledge Integrity Engine',
    repositorySource: 'Sovereign Black Ice Local Vault',
    classification: 'Verified Institutional Record',
    activeDiffSummary:
      unreviewedAlerts.length > 0
        ? unreviewedAlerts[0].explanation
        : undefined,
    versions,
  };
}

export function transformBackendAlertToReviewItem(
  alert: BackendAlert,
  claimChanges: BackendClaimChange[] = []
): ReviewItem {
  const sevMap: Record<string, SeverityLevel> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  const statusMap: Record<string, ReviewStatus> = {
    unreviewed: 'Pending',
    reviewed: 'In Progress',
    resolved: 'Resolved',
  };

  const matchingChange = claimChanges.find(
    (c) => c.id === alert.related_claim_id || c.old_claim_id === alert.related_claim_id
  );

  return {
    id: alert.id,
    documentId: alert.document_id || '',
    documentTitle: alert.document_name || `Document ${alert.document_id || ''}`,
    issueSummary: alert.explanation,
    severity: sevMap[alert.severity] || 'Medium',
    status: statusMap[alert.status] || 'Pending',
    assignee: 'Safety & Compliance Auditor',
    createdAt: formatDate(alert.created_at),
    timeRemainingSla: alert.severity === 'critical' ? '4h SLA' : '24h SLA',
    versionShift:
      alert.old_version_id && alert.new_version_id
        ? 'Version Drift Detected'
        : 'Active Version Alert',
    lineageHash: alert.id.slice(0, 16),
    claimMutation: {
      claimId: alert.related_claim_id || alert.id,
      clauseRef: matchingChange?.source_reference_new || 'Rule Clause',
      category: matchingChange?.new_claim?.category || 'Policy Rule',
      targetEntity: matchingChange?.new_claim?.subject || 'Monitored Policy',
      actionPredicate: matchingChange?.new_claim?.predicate || 'modified',
      previousClaim: matchingChange?.old_claim?.claim_text || 'Prior version clause',
      currentClaim: matchingChange?.new_claim?.claim_text || alert.explanation,
      previousValue: matchingChange?.old_value || '',
      currentValue: matchingChange?.new_value || '',
      confidenceScore: matchingChange?.confidence || 0.95,
      impactSynopsis: alert.explanation,
    },
    affectedAnswers: alert.affected_answer_id
      ? [
        {
          id: alert.affected_answer_id,
          agentName: 'Enterprise Knowledge Assistant',
          queryPrompt: alert.affected_question || 'Historical user query',
          cachedAnswer: 'Answer grounded on previous document version.',
          citedChunkId: 'cited-chunk',
          citedPassage: alert.explanation,
          potentialIssue: alert.explanation,
          impactStatus: 'Potentially outdated',
          lastUpdated: formatDate(alert.created_at),
          severity: sevMap[alert.severity] || 'Medium',
          directConflict: alert.severity === 'critical' || alert.severity === 'high',
        },
      ]
      : [],
    auditorNotes:
      alert.status === 'resolved'
        ? `Resolved at ${formatDate(alert.resolved_at)}`
        : 'Awaiting auditor disposition.',
    reviewHistory: [
      {
        timestamp: formatDate(alert.created_at),
        actor: 'Knowledge Integrity Engine',
        action: `Alert Generated (${alert.alert_type})`,
        details: alert.explanation,
      },
      ...(alert.resolved_at
        ? [
          {
            timestamp: formatDate(alert.resolved_at),
            actor: 'Compliance Auditor',
            action: 'Status Marked Resolved',
            details: 'Actioned in compliance center.',
          },
        ]
        : []),
    ],
  };
}

// ==========================================
// CENTRALIZED SERVICE OPERATIONS
// ==========================================

export const apiService = {
  /**
   * Health Check: Verifies FastAPI, ChromaDB and local Ollama model availability
   */
  async checkHealth(): Promise<BackendConnectionStatus> {
    const startTime = performance.now();
    try {
      // 1. Root /health
      const health = await fetchWithTimeout<BackendHealthResponse>('/health', {}, 4000);
      const latency = Math.round(performance.now() - startTime);

      // 2. Detailed system diagnostics
      let sysStatus: BackendSystemStatus | null = null;
      try {
        sysStatus = await fetchWithTimeout<BackendSystemStatus>(
          '/api/v1/system/status',
          {},
          4000
        );
      } catch {
        // Fallback to basic health if diagnostics slow
      }

      const isOllamaConnected =
        sysStatus?.ollama?.status === 'connected' ||
        sysStatus?.status === 'operational';

      const isChromaConnected =
        sysStatus?.chromadb?.status === 'connected';

      return {
        isConnected: true,
        checkedAt: new Date().toISOString(),
        baseUrl: API_BASE_URL,
        latencyMs: latency,
        version: health.version || '0.1.0',
        ollamaStatus: isOllamaConnected ? 'available' : 'offline',
        chromaStatus: isChromaConnected ? 'connected' : 'offline',
      };
    } catch (err: unknown) {
      return {
        isConnected: false,
        checkedAt: new Date().toISOString(),
        baseUrl: API_BASE_URL,
        error:
          err instanceof Error
            ? err.message
            : `FastAPI backend unreachable at ${API_BASE_URL}`,
      };
    }
  },

  /**
   * Detailed System Diagnostics (Ollama models, Chroma, SQLite)
   */
  async getSystemStatus(): Promise<BackendSystemStatus> {
    return fetchWithTimeout<BackendSystemStatus>('/api/v1/system/status');
  },

  /**
   * List Monitored Documents with latest version info
   */
  async getDocuments(): Promise<DocumentItem[]> {
    const [docsResp, alertsResp, answersResp] = await Promise.all([
      fetchWithTimeout<BackendDocumentListResponse>('/api/v1/documents'),
      fetchWithTimeout<BackendAlertListResponse>('/api/v1/alerts').catch(() => ({
        total: 0,
        unreviewed_count: 0,
        alerts: [],
      })),
      fetchWithTimeout<{ total: number; answers: BackendAnswerResponse[] }>(
        '/api/v1/answers'
      ).catch(() => ({ total: 0, answers: [] })),
    ]);

    // Fetch versions for each document in parallel
    const items = await Promise.all(
      docsResp.documents.map(async (d) => {
        try {
          const versions = await fetchWithTimeout<BackendDocumentVersionDetail[]>(
            `/api/v1/documents/${encodeURIComponent(d.id)}/versions`
          );
          d.versions = versions;
        } catch {
          d.versions = [];
        }
        return transformBackendDocToItem(d, alertsResp.alerts, answersResp.answers);
      })
    );

    return items;
  },

  /**
   * Upload Document & Ingest (Version 1 or Version N)
   */
  async uploadDocument(
    file: File,
    baselineId?: string,
    documentName?: string
  ): Promise<{
    document: DocumentItem;
    analysisPending: boolean;
    status: string;
    message: string;
    is_duplicate: boolean;
    is_reversion?: boolean;
    version_id?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (documentName) {
      formData.append('document_name', documentName);
    }

    let endpoint = '/api/v1/documents/upload';
    if (baselineId) {
      endpoint = `/api/v1/documents/${encodeURIComponent(baselineId)}/versions`;
    }

    const uploadRes = await fetchWithTimeout<BackendDocumentUploadResponse>(
      endpoint,
      {
        method: 'POST',
        body: formData,
      },
      30000 // Ingestion, vectorization, and claim extraction can take up to 30s
    );

    // Fetch full document record
    const docItem = await this.getDocumentDetails(uploadRes.document.id);

    return {
      document: docItem,
      analysisPending: false,
      status: uploadRes.status,
      message: uploadRes.message,
      is_duplicate: uploadRes.is_duplicate,
      is_reversion: uploadRes.is_reversion,
      version_id: uploadRes.version?.id,
    };
  },

  /**
   * Get Document Details including full version history
   */
  async getDocumentDetails(documentId: string): Promise<DocumentItem> {
    const [docData, versionsResp, alertsResp, answersResp] = await Promise.all([
      fetchWithTimeout<BackendDocumentItem>(
        `/api/v1/documents/${encodeURIComponent(documentId)}`
      ),
      fetchWithTimeout<BackendDocumentVersionDetail[]>(
        `/api/v1/documents/${encodeURIComponent(documentId)}/versions`
      ).catch(() => []),
      fetchWithTimeout<BackendAlertListResponse>(
        `/api/v1/alerts?document_id=${encodeURIComponent(documentId)}`
      ).catch(() => ({ total: 0, unreviewed_count: 0, alerts: [] })),
      fetchWithTimeout<{ total: number; answers: BackendAnswerResponse[] }>(
        `/api/v1/answers?document_id=${encodeURIComponent(documentId)}`
      ).catch(() => ({ total: 0, answers: [] })),
    ]);

    docData.versions = versionsResp;
    return transformBackendDocToItem(docData, alertsResp.alerts, answersResp.answers);
  },

  /**
   * Delete Document
   */
  async deleteDocument(documentId: string): Promise<void> {
    await fetchWithTimeout(`/api/v1/documents/${encodeURIComponent(documentId)}`, {
      method: 'DELETE',
    });
  },

  /**
   * List Versions of a Document
   */
  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    const doc = await this.getDocumentDetails(documentId);
    return doc.versions;
  },

  /**
   * Compare Document Versions (Extracts actual claim mutations and diffs)
   */
  async compareVersions(
    documentId: string,
    oldVersionId?: string,
    newVersionId?: string
  ): Promise<BackendVersionComparisonResponse> {
    const query = new URLSearchParams();
    if (oldVersionId) query.set('old_version_id', oldVersionId);
    if (newVersionId) query.set('new_version_id', newVersionId);
    const qStr = query.toString() ? `?${query.toString()}` : '';

    return fetchWithTimeout<BackendVersionComparisonResponse>(
      `/api/v1/documents/${encodeURIComponent(documentId)}/compare${qStr}`
    );
  },

  /**
   * Get All Historical Claim Changes for a Document
   */
  async getDocumentChanges(documentId: string): Promise<BackendClaimChange[]> {
    return fetchWithTimeout<BackendClaimChange[]>(
      `/api/v1/documents/${encodeURIComponent(documentId)}/changes`
    );
  },

  /**
   * Get Structured Claims for a Specific Document Version
   */
  async getVersionClaims(documentId: string, versionId: string): Promise<BackendClaim[]> {
    return fetchWithTimeout<BackendClaim[]>(
      `/api/v1/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(versionId)}/claims`
    );
  },

  /**
   * List Claims for a Document, optionally filtered by version ID
   */
  async getDocumentClaims(documentId: string, versionId?: string): Promise<BackendClaimListResponse> {
    const q = versionId ? `?version_id=${encodeURIComponent(versionId)}` : '';
    return fetchWithTimeout<BackendClaimListResponse>(
      `/api/v1/documents/${encodeURIComponent(documentId)}/claims${q}`
    );
  },

  /**
   * Trigger Claim Extraction for a Document Version
   */
  async extractClaims(
    documentId: string,
    versionId: string,
    force = false
  ): Promise<BackendClaimExtractionResponse> {
    return fetchWithTimeout<BackendClaimExtractionResponse>(
      `/api/v1/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(versionId)}/claims/extract?force=${force}`,
      { method: 'POST' }
    );
  },

  /**
   * Get Extracted Text for a Specific Document Version
   */
  async getVersionText(
    documentId: string,
    versionId: string
  ): Promise<{
    document_id: string;
    version_id: string;
    version_number: number;
    page_count: number;
    full_text: string;
  }> {
    return fetchWithTimeout<{
      document_id: string;
      version_id: string;
      version_number: number;
      page_count: number;
      full_text: string;
    }>(
      `/api/v1/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(versionId)}/text`
    );
  },

  /**
   * Trigger Integrity / Impact Recalculation
   * Returns full impact analysis result with affected answers, alerts, and graph data.
   */
  async analyzeDocument(
    documentId: string,
    oldVersionId?: string,
    newVersionId?: string
  ): Promise<BackendImpactAnalysisResult> {
    return fetchWithTimeout<BackendImpactAnalysisResult>(
      '/api/v1/impact/analyze',
      {
        method: 'POST',
        body: JSON.stringify({
          document_id: documentId,
          old_version_id: oldVersionId,
          new_version_id: newVersionId,
        }),
      },
      60000 // Impact analysis can be slow with LLM
    );
  },

  /**
   * Ask Knowledge Assistant (Strict Local Grounded RAG)
   */
  async askAssistant(params: {
    question: string;
    documentId?: string;
    versionId?: string;
    strictCurrentVersion?: boolean;
    scope?: string;
    topK?: number;
  }): Promise<{
    answer: string;
    citations: AssistantMessage['citations'];
    temporalWarning?: AssistantMessage['temporalWarning'];
    status: string;
    answerId: string;
  }> {
    const payload = {
      question: params.question,
      document_id: params.documentId,
      version_id: params.versionId,
      top_k: params.topK || 4,
    };

    const res = await fetchWithTimeout<BackendAnswerResponse>(
      '/api/v1/qa/ask',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      30000
    );

    const citations = res.evidence_items.map((ev) => ({
      documentId: ev.document_id,
      documentTitle: ev.document_name || 'Referenced Document',
      version: ev.version_number ? `v${ev.version_number}.0` : 'v1.0',
      clause: ev.claim_id ? `Rule Claim #${ev.claim_id.slice(0, 8)}` : `Chunk #${ev.chunk_id?.slice(0, 8) || '1'}`,
      chunkId: ev.chunk_id || 'chunk-1',
      sha256: ev.id.slice(0, 16),
      excerpt: ev.citation_text || 'Verified grounded passage excerpt.',
      isCurrentVersion: res.status === 'current',
    }));

    let temporalWarning: AssistantMessage['temporalWarning'];
    if (res.status === 'potentially_outdated') {
      temporalWarning = {
        message:
          res.review_notes ||
          'This answer cites an earlier document version that has been superseded by newer policy rules.',
        previousVersion: citations[0]?.version || 'v1.0',
        previousClaim: 'Original Policy Rule',
        currentVersion: 'v2.0',
        currentClaim: 'Updated Policy Rule',
      };
    }

    return {
      answer: res.generated_answer,
      citations,
      temporalWarning,
      status: res.status,
      answerId: res.id,
    };
  },

  /**
   * Retrieve Historical Answers
   */
  async getHistoricalAnswers(documentId?: string): Promise<BackendAnswerResponse[]> {
    const q = documentId ? `?document_id=${encodeURIComponent(documentId)}` : '';
    const res = await fetchWithTimeout<{
      total: number;
      answers: BackendAnswerResponse[];
    }>(`/api/v1/answers${q}`);
    return res.answers;
  },

  /**
   * Retrieve Impact Graph Topology (NetworkX Directed Graph)
   */
  async getImpactGraph(documentId?: string): Promise<ImpactGraphResult> {
    const q = documentId ? `?document_id=${encodeURIComponent(documentId)}` : '';
    const raw = await fetchWithTimeout<BackendDependencyGraphResponse>(
      `/api/v1/impact/graph${q}`
    );

    const nodes: GraphNodeData[] = raw.nodes.map((n) => {
      let mappedType: GraphNodeData['type'] = 'claim';
      if (n.type === 'document' || n.type === 'version') mappedType = 'document';
      else if (n.type === 'answer') mappedType = 'answer';
      else if (n.type === 'change') mappedType = 'review_gate';

      return {
        id: n.id,
        type: mappedType,
        title: n.label,
        subtitle: (n.metadata?.subject as string) || n.type,
        status: (n.metadata?.status as string) || 'active',
        metadata: (n.metadata as Record<string, string | number>) || {},
      };
    });

    const edges: GraphEdgeData[] = raw.edges.map((e, idx) => ({
      id: `edge-${idx}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      label: e.relation,
      status:
        e.relation === 'MODIFIES'
          ? 'drift'
          : e.relation === 'GROUNDS'
            ? 'normal'
            : 'normal',
    }));

    return {
      totalNodes: raw.total_nodes,
      totalEdges: raw.total_edges,
      nodeCountsByType: raw.node_counts_by_type,
      total_nodes: raw.total_nodes,
      total_edges: raw.total_edges,
      node_counts_by_type: raw.node_counts_by_type,
      nodes,
      edges,
      rawGraph: raw,
    };
  },

  /**
   * List Human Review Items (Derived from Real Backend Alerts)
   */
  async getReviewItems(status?: string, severity?: string): Promise<ReviewItem[]> {
    const query = new URLSearchParams();
    if (status && status !== 'All') {
      const backendStatus =
        status === 'Pending'
          ? 'unreviewed'
          : status === 'In Progress'
            ? 'reviewed'
            : status === 'Resolved'
              ? 'resolved'
              : status.toLowerCase();
      query.set('status', backendStatus);
    }
    if (severity && severity !== 'All') {
      query.set('severity', severity.toLowerCase());
    }

    const qStr = query.toString() ? `?${query.toString()}` : '';
    const alertsResp = await fetchWithTimeout<BackendAlertListResponse>(
      `/api/v1/alerts${qStr}`
    );

    return alertsResp.alerts.map((a) => transformBackendAlertToReviewItem(a));
  },

  /**
   * Update Human Review Status / Resolve
   */
  async updateReviewStatus(
    reviewId: string,
    payload: {
      status: string;
      notes?: string;
      assignee?: string;
      action?: 'mark_reviewed' | 'refresh_answers' | 'dismiss' | 'escalate';
    }
  ): Promise<ReviewItem> {
    const backendStatus =
      payload.status === 'Resolved' || payload.action === 'mark_reviewed' || payload.action === 'dismiss'
        ? 'resolved'
        : 'reviewed';

    const res = await fetchWithTimeout<BackendAlert>(
      `/api/v1/alerts/${encodeURIComponent(reviewId)}/resolve`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: backendStatus }),
      }
    );

    return transformBackendAlertToReviewItem(res);
  },

  /**
   * Retrieve Audit Events (Aggregates real backend changes and alerts)
   */
  async getAuditEvents(params?: {
    eventType?: string;
    documentId?: string;
    limit?: number;
  }): Promise<{ events: AuditEvent[]; total: number }> {
    const [alertsResp, docsResp] = await Promise.all([
      fetchWithTimeout<BackendAlertListResponse>('/api/v1/alerts').catch(() => ({
        total: 0,
        unreviewed_count: 0,
        alerts: [],
      })),
      fetchWithTimeout<BackendDocumentListResponse>('/api/v1/documents').catch(
        () => ({ total: 0, documents: [] })
      ),
    ]);

    const events: AuditEvent[] = [];

    // 1. Alert events
    alertsResp.alerts.forEach((a) => {
      events.push({
        id: `EVT-ALT-${a.id.slice(0, 8)}`,
        timestamp: formatDate(a.created_at),
        blockNumber: `#${a.id.slice(0, 6)}`,
        txHash: `0x${a.id.replace(/-/g, '').slice(0, 32)}`,
        eventType: 'Potential Impact Identified',
        documentName: a.document_name || 'Monitored Policy',
        documentId: a.document_id || '',
        documentVersion: 'Active Version',
        actor: 'Knowledge Integrity Engine',
        actorType: 'System',
        status: a.status === 'resolved' ? 'Resolved' : 'Review Required',
        details: a.explanation,
        clauseAffected: a.alert_type,
      });

      if (a.resolved_at) {
        events.push({
          id: `EVT-RES-${a.id.slice(0, 8)}`,
          timestamp: formatDate(a.resolved_at),
          blockNumber: `#${a.id.slice(0, 6)}`,
          txHash: `0x${a.id.replace(/-/g, '').slice(0, 32)}`,
          eventType: 'Review Decision Recorded',
          documentName: a.document_name || 'Monitored Policy',
          documentId: a.document_id || '',
          documentVersion: 'Active Version',
          actor: 'Compliance Auditor',
          actorType: 'User',
          status: 'Resolved',
          details: `Alert ${a.id} marked as resolved in Human Review Center.`,
        });
      }
    });

    // 2. Document upload events
    docsResp.documents.forEach((d) => {
      events.push({
        id: `EVT-DOC-${d.id.slice(0, 8)}`,
        timestamp: formatDate(d.created_at),
        blockNumber: `#${d.id.slice(0, 6)}`,
        txHash: `0x${d.id.replace(/-/g, '').slice(0, 32)}`,
        eventType: 'Document Uploaded',
        documentName: d.name,
        documentId: d.id,
        documentVersion: d.latest_version ? `v${d.latest_version.version_number}.0` : 'v1.0',
        actor: 'Ingestion Pipeline',
        actorType: 'System',
        status: 'Completed',
        details: `Document '${d.name}' ingested, chunked, and indexed with SHA-256 integrity validation.`,
      });
    });

    return {
      events: events.slice(0, params?.limit || 50),
      total: events.length,
    };
  },
};

export interface GoogleLoginResponse {
  message: string;
  access_token?: string;
  token_type?: string;
  user: AuthUser;
}

export const authService = {
  async googleLogin(credential: string): Promise<GoogleLoginResponse> {
    return fetchWithTimeout<GoogleLoginResponse>('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        credential,
      }),
    });
  },

  async devLogin(): Promise<GoogleLoginResponse> {
    return fetchWithTimeout<GoogleLoginResponse>('/api/v1/auth/dev-login', {
      method: 'POST',
    });
  },

  async getMe(): Promise<AuthUser> {
    return fetchWithTimeout<AuthUser>('/api/v1/auth/me');
  },

  async logout(): Promise<{ message: string }> {
    try {
      return await fetchWithTimeout<{ message: string }>('/api/v1/auth/logout', {
        method: 'POST',
      });
    } catch {
      return { message: 'Logged out successfully' };
    }
  },
};