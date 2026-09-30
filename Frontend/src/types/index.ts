export type IntegrityStatus =
  | 'Verified'
  | 'Review required'
  | 'Potentially outdated'
  | 'No impact detected'
  | 'No changes detected'
  | 'Pending review'
  | 'In progress'
  | 'Resolved'
  | 'Escalated'
  | 'Impact analysis'
  | 'Critical Conflict';

export type ReviewStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Escalated';
export type SeverityLevel = 'High' | 'Medium' | 'Low' | 'Critical';

export interface DocumentVersion {
  version: string;
  releaseDate: string;
  sha256: string;
  status: 'Active' | 'Archived' | 'Draft';
  author: string;
  summary: string;
  isGenesis?: boolean;
  id?: string;
  version_number?: string;
  versionNumber?: string;
  uploadedAt?: string;
  created_at?: string;
  file_path?: string;
  raw_text?: string;
  claims_count?: number;
}

export interface DocumentItem {
  id: string; // e.g. DOC-7704
  title: string;
  department: string;
  currentVersion: string;
  previousVersion?: string;
  lastModified: string;
  integrityStatus: IntegrityStatus;
  affectedAnswerCount: number;
  lastAnalyzed: string;
  fileSize: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'md' | string;
  owner: string;
  repositorySource: string;
  classification: string;
  activeDiffSummary?: string;
  versions: DocumentVersion[];
  diffCount?: number;
}

export interface ClaimMutation {
  claimId: string;
  clauseRef: string;
  category: string;
  targetEntity: string;
  actionPredicate: string;
  previousClaim: string;
  currentClaim: string;
  previousValue: string;
  currentValue: string;
  confidenceScore: number;
  temporalDelta?: string;
  impactSynopsis: string;
}

export interface AffectedAnswerItem {
  id: string;
  agentName: string;
  queryPrompt: string;
  cachedAnswer: string;
  citedChunkId: string;
  citedPassage: string;
  potentialIssue: string;
  impactStatus: IntegrityStatus;
  lastUpdated: string;
  severity: SeverityLevel;
  directConflict: boolean;
}

export interface ReviewItem {
  id: string; // e.g. REV-4201
  documentId: string;
  documentTitle: string;
  issueSummary: string;
  severity: SeverityLevel;
  status: ReviewStatus;
  assignee: string;
  createdAt: string;
  timeRemainingSla: string;
  versionShift: string;
  lineageHash: string;
  claimMutation: ClaimMutation;
  affectedAnswers: AffectedAnswerItem[];
  auditorNotes: string;
  reviewHistory: {
    timestamp: string;
    actor: string;
    action: string;
    details: string;
  }[];
  timestamp?: string;
  affectedAgent?: string;
  documentName?: string;
  question?: string;
  answerId?: string;
  affectedClaim?: string;
  explanation?: string;
}

export interface AuditEvent {
  id: string; // e.g. EVT-98421
  timestamp: string;
  blockNumber: string;
  txHash: string;
  eventType:
    | 'Potential Impact Identified'
    | 'Version Comparison Completed'
    | 'New Version Added'
    | 'AI Answer Generated'
    | 'Review Item Created'
    | 'Review Decision Recorded'
    | 'Document Uploaded'
    | 'Cache Invalidation';
  documentName: string;
  documentId: string;
  documentVersion: string;
  actor: string;
  actorType: 'System' | 'AI' | 'User';
  status: 'Review Required' | 'Completed' | 'Pending' | 'Resolved' | 'Rejected';
  details: string;
  clauseAffected?: string;
  merkleLeaf?: number;
  signatureAlg?: string;
  blastRadiusSummary?: string;
}

export interface GraphNodeData {
  id: string;
  type: 'document' | 'claim' | 'answer' | 'review_gate';
  title: string;
  subtitle?: string;
  status?: string;
  metadata?: Record<string, string | number>;
  selected?: boolean;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  status?: 'normal' | 'drift' | 'critical';
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  content: string;
  citations?: {
    documentId: string;
    documentTitle: string;
    version: string;
    clause: string;
    chunkId: string;
    sha256: string;
    excerpt: string;
    isCurrentVersion: boolean;
  }[];
  temporalWarning?: {
    message: string;
    previousVersion: string;
    previousClaim: string;
    currentVersion: string;
    currentClaim: string;
  };
}

export interface BackendConnectionStatus {
  isConnected: boolean;
  checkedAt: string;
  baseUrl: string;
  latencyMs?: number;
  version?: string;
  ollamaStatus?: 'available' | 'offline' | 'unknown';
  chromaStatus?: 'connected' | 'offline' | 'unknown';
  error?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

