from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class HealthResponse(BaseModel):
    """Basic health check response."""
    status: str = Field(default="ok", description="Overall health status")
    app_name: str = Field(description="Name of the application")
    version: str = Field(description="Application version")
    timestamp: datetime = Field(description="UTC timestamp of the health check")


class ServiceComponentStatus(BaseModel):
    """Status details for an individual subsystem."""
    status: str = Field(description="Operational status: connected, disconnected, warning, or error")
    message: str = Field(description="Human-readable status summary")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Optional diagnostic details")


class ConfiguredModels(BaseModel):
    """Configured local AI model details."""
    llm_model: str = Field(description="Local Ollama model name for reasoning and claim extraction")
    embedding_model: str = Field(description="Embedding model name used for vector retrieval")
    ollama_base_url: str = Field(description="Ollama API base URL")


class SystemStatusResponse(BaseModel):
    """Detailed system diagnostic status response."""
    app_name: str
    environment: str
    status: str = Field(description="Overall system health")
    timestamp: datetime
    database: ServiceComponentStatus
    ollama: ServiceComponentStatus
    chromadb: ServiceComponentStatus
    configured_models: ConfiguredModels


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


# =====================================================================
# Document & Version Schemas
# =====================================================================

class DocumentVersionSummary(BaseModel):
    """Concise representation of a document version."""
    id: str
    version_number: int
    file_hash: str
    file_name: str
    file_size_bytes: int
    page_count: int
    status: str
    upload_timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentVersionDetail(DocumentVersionSummary):
    """Detailed version view including storage path and MIME type."""
    document_id: str
    file_path: str
    mime_type: str


class DocumentResponse(BaseModel):
    """Full document representation with latest version info."""
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    latest_version: Optional[DocumentVersionSummary] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    """List response for documents."""
    total: int
    documents: List[DocumentResponse]


class DocumentUploadVersionInfo(BaseModel):
    """Version metadata returned inside upload response."""
    id: str
    version_number: int
    file_hash: str
    file_name: str
    file_size_bytes: int
    page_count: int
    status: str
    upload_timestamp: datetime


class DocumentUploadDocumentInfo(BaseModel):
    """Document metadata returned inside upload response."""
    id: str
    name: str
    created_at: datetime
    updated_at: datetime


class DocumentUploadResponse(BaseModel):
    """Response returned upon uploading a new document or version."""
    status: str = Field(description="Upload outcome: 'created' or 'unchanged'")
    message: str = Field(description="Explanatory message for user/UI")
    is_duplicate: bool = Field(description="True if identical to current version")
    is_reversion: Optional[bool] = Field(default=False, description="True if content restored an earlier version")
    reverted_from_version: Optional[int] = Field(default=None, description="Earlier version number if reverted")
    document: DocumentUploadDocumentInfo
    version: DocumentUploadVersionInfo


class ExtractedTextResponse(BaseModel):
    """Response containing extracted text for a specific version."""
    document_id: str
    version_id: str
    version_number: int
    page_count: int
    full_text: str


class DeleteDocumentResponse(BaseModel):
    """Response returned when a document is deleted."""
    status: str
    message: str
    document_id: str


# =====================================================================
# Phase 3: Claim & Version Comparison Schemas
# =====================================================================

class ClaimBase(BaseModel):
    """Core attributes of a structured claim."""
    claim_text: str = Field(description="Full text of the claim or rule statement")
    subject: Optional[str] = Field(default=None, description="Topic or entity of the claim")
    predicate: Optional[str] = Field(default=None, description="Action, relation, or condition")
    value: Optional[str] = Field(default=None, description="Specific threshold or value")
    unit: Optional[str] = Field(default=None, description="Measurement unit (e.g. days, USD, %)")
    category: str = Field(default="policy_rule", description="Category: policy_rule, deadline, financial_limit, eligibility, general_fact")
    source_location: Optional[str] = Field(default=None, description="Source citation reference (e.g., 'Page 1, Paragraph 2')")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence score")


class ClaimCreate(ClaimBase):
    """Payload to create a new claim manually."""
    pass


class ClaimResponse(ClaimBase):
    """Full structured claim representation."""
    id: str
    document_id: str
    version_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClaimListResponse(BaseModel):
    """List response for claims."""
    total: int
    document_id: str
    version_id: Optional[str] = None
    claims: List[ClaimResponse]


class ClaimExtractionResponse(BaseModel):
    """Response returned upon extracting claims from a document version."""
    document_id: str
    version_id: str
    version_number: int
    extraction_method: str = Field(description="'ollama_llm' or 'heuristic_fallback'")
    claims_count: int
    claims: List[ClaimResponse]


class ClaimChangeDetail(BaseModel):
    """Detailed record of a claim change between two versions."""
    id: Optional[str] = None
    change_type: str = Field(description="One of: 'added', 'removed', 'modified', 'unchanged', 'uncertain'")
    changed_field: Optional[str] = Field(default=None, description="Field that changed (e.g. 'value', 'predicate', 'claim_text')")
    confidence: float = Field(default=1.0, description="Confidence of the comparison decision")
    human_review_required: bool = Field(default=False, description="True if change is ambiguous and needs human review")
    explanation: str = Field(description="Clear explanation of the change")
    old_claim_id: Optional[str] = None
    new_claim_id: Optional[str] = None
    source_reference_old: Optional[str] = Field(default=None, description="Source location citation in old version")
    source_reference_new: Optional[str] = Field(default=None, description="Source location citation in new version")
    old_claim: Optional[ClaimResponse] = None
    new_claim: Optional[ClaimResponse] = None

    model_config = ConfigDict(from_attributes=True)


class VersionComparisonSummary(BaseModel):
    """Aggregate statistics for a version comparison."""
    total_old_claims: int
    total_new_claims: int
    added_count: int
    removed_count: int
    modified_count: int
    unchanged_count: int
    uncertain_count: int
    requires_human_review_count: int


class VersionComparisonResponse(BaseModel):
    """Full comparison response between two document versions."""
    document_id: str
    document_name: str
    old_version_id: Optional[str] = None
    old_version_number: Optional[int] = None
    new_version_id: str
    new_version_number: int
    summary: VersionComparisonSummary
    changes: List[ClaimChangeDetail]


class VersionComparisonRequest(BaseModel):
    """Request payload for comparing two versions."""
    old_version_id: Optional[str] = Field(default=None, description="Base/older version ID (defaults to previous version)")
    new_version_id: Optional[str] = Field(default=None, description="Target/newer version ID (defaults to latest version)")
    save_changes: bool = Field(default=True, description="Whether to persist changes into SQLite claim_changes table")


# =====================================================================
# Phase 4: Local AI, RAG & Answer Grounding Schemas
# =====================================================================

class EvidenceChunkResponse(BaseModel):
    """Structured representation of an indexed text chunk."""
    id: str
    document_id: str
    version_id: str
    chunk_index: int
    content: str
    page_number: int
    chroma_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EvidenceChunkListResponse(BaseModel):
    """List response for chunks of a version."""
    total: int
    document_id: str
    version_id: str
    chunks: List[EvidenceChunkResponse]


class IndexVersionResponse(BaseModel):
    """Outcome of chunking and indexing a document version."""
    status: str
    message: str
    document_id: str
    version_id: str
    version_number: int
    chunks_indexed: int


class SemanticSearchRequest(BaseModel):
    """Request payload for semantic vector search."""
    query: str = Field(description="Search text or question")
    document_id: Optional[str] = Field(default=None, description="Optional document ID filter")
    version_id: Optional[str] = Field(default=None, description="Optional version ID filter")
    top_k: int = Field(default=4, ge=1, le=20, description="Maximum number of chunks to return")


class SemanticSearchResultItem(BaseModel):
    """A single retrieved evidence chunk with similarity ranking."""
    chunk_id: str
    document_id: str
    version_id: str
    version_number: Optional[int] = None
    chunk_index: int
    page_number: int
    content: str
    similarity_score: float
    distance: Optional[float] = None


class SemanticSearchResponse(BaseModel):
    """Results from semantic vector retrieval."""
    query: str
    total_results: int
    results: List[SemanticSearchResultItem]


class AskQuestionRequest(BaseModel):
    """Payload to ask a grounded question using local RAG."""
    question: str = Field(description="The question to answer against documents")
    document_id: Optional[str] = Field(default=None, description="Restrict retrieval to a specific document ID")
    version_id: Optional[str] = Field(default=None, description="Restrict retrieval to an exact document version ID")
    top_k: int = Field(default=4, ge=1, le=10, description="Number of evidence chunks to retrieve for grounding")


class AnswerEvidenceResponse(BaseModel):
    """Evidence record linking an answer to exact document version and chunk."""
    id: str
    document_id: str
    document_name: Optional[str] = None
    version_id: str
    version_number: Optional[int] = None
    chunk_id: Optional[str] = None
    page_number: Optional[int] = None
    claim_id: Optional[str] = None
    similarity_score: Optional[float] = None
    citation_text: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnswerResponse(BaseModel):
    """Fully grounded AI answer with version and chunk evidence citations."""
    id: str
    question: str
    generated_answer: str
    model_name: str
    status: str = Field(description="'current', 'potentially_outdated', 'verified', 'superseded'")
    human_review_required: bool = False
    review_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    evidence_items: List[AnswerEvidenceResponse]

    model_config = ConfigDict(from_attributes=True)


class AnswerListResponse(BaseModel):
    """Paginated list of historical answers."""
    total: int
    answers: List[AnswerResponse]


# =====================================================================
# Phase 5: Dependency Graph & Impact Analysis Schemas
# =====================================================================

class AlertResponse(BaseModel):
    """Alert record notifying of document updates, claim diffs, and outdated answers."""
    id: str
    alert_type: str = Field(description="Type: 'answer_potentially_outdated', 'claim_modified', 'claim_removed', 'claim_uncertain'")
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    old_version_id: Optional[str] = None
    new_version_id: Optional[str] = None
    related_claim_id: Optional[str] = None
    affected_answer_id: Optional[str] = None
    affected_question: Optional[str] = None
    severity: str = Field(description="'low', 'medium', 'high', 'critical'")
    explanation: str = Field(description="Explanatory message detailing the impact")
    status: str = Field(description="'unreviewed', 'reviewed', 'resolved'")
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AlertListResponse(BaseModel):
    """List response for alerts."""
    total: int
    unreviewed_count: int
    alerts: List[AlertResponse]


class AlertResolveRequest(BaseModel):
    """Request payload to update alert review status."""
    status: str = Field(default="resolved", description="'reviewed' or 'resolved'")


class GraphNode(BaseModel):
    """Node in the NetworkX dependency graph."""
    id: str
    type: str = Field(description="'document', 'version', 'chunk', 'claim', 'answer', 'change'")
    label: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    """Directed edge in the NetworkX dependency graph."""
    source: str
    target: str
    relation: str = Field(description="'HAS_VERSION', 'CONTAINS_CHUNK', 'CONTAINS_CLAIM', 'GROUNDS', 'MODIFIES'")
    weight: float = 1.0


class DependencyGraphResponse(BaseModel):
    """Complete serialized topology of document-claim-answer dependencies."""
    total_nodes: int
    total_edges: int
    node_counts_by_type: Dict[str, int]
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class ImpactAnalysisRequest(BaseModel):
    """Payload to trigger impact analysis between versions."""
    document_id: str
    old_version_id: Optional[str] = None
    new_version_id: Optional[str] = None


class ImpactAnalysisResult(BaseModel):
    """Outcome of impact analysis tracing changed claims to answers."""
    document_id: str
    document_name: str
    old_version_id: Optional[str] = None
    new_version_id: str
    total_claims_analyzed: int
    changed_claims_count: int
    affected_answers_count: int
    unaffected_answers_count: int
    alerts_generated: int
    affected_answers: List[AnswerResponse]
    unaffected_answers: List[AnswerResponse]
    alerts: List[AlertResponse]




