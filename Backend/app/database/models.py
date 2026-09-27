import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from app.database.database import Base


def generate_uuid() -> str:
    """Generate a clean hex UUID string."""
    return uuid.uuid4().hex


def utc_now() -> datetime:
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc)


class Document(Base):
    """Represents a tracked document entity with stable ID across version changes."""
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan", order_by="DocumentVersion.version_number.desc()")
    claims = relationship("Claim", back_populates="document", cascade="all, delete-orphan")
    changes = relationship("ClaimChange", back_populates="document", cascade="all, delete-orphan")
    evidence_chunks = relationship("EvidenceChunk", back_populates="document", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="document", cascade="all, delete-orphan")


class DocumentVersion(Base):
    """Immutable snapshot of a document at a specific version."""
    __tablename__ = "document_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False, index=True)
    file_hash = Column(String(64), nullable=False, index=True)  # SHA-256
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(64), nullable=False)
    extracted_text = Column(Text, nullable=False)
    page_count = Column(Integer, default=1, nullable=False)
    status = Column(String(32), default="processed", nullable=False)  # processed, processing, failed
    upload_timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("document_id", "version_number", name="uq_document_version"),
        Index("idx_doc_version_hash", "document_id", "file_hash"),
    )

    # Relationships
    document = relationship("Document", back_populates="versions")
    claims = relationship("Claim", back_populates="version", cascade="all, delete-orphan")
    evidence_chunks = relationship("EvidenceChunk", back_populates="version", cascade="all, delete-orphan")


class Claim(Base):
    """Structured rule, fact, or policy statement extracted from a document version."""
    __tablename__ = "claims"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    version_id = Column(String(36), ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    claim_text = Column(Text, nullable=False)
    subject = Column(String(255), nullable=True)
    predicate = Column(String(255), nullable=True)
    value = Column(String(255), nullable=True)
    unit = Column(String(64), nullable=True)
    category = Column(String(64), default="policy_rule", nullable=False)
    source_location = Column(String(128), nullable=True)  # e.g., 'Page 1, Paragraph 2'
    confidence = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    document = relationship("Document", back_populates="claims")
    version = relationship("DocumentVersion", back_populates="claims")


class ClaimChange(Base):
    """Records detected diffs between claims in adjacent document versions."""
    __tablename__ = "claim_changes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    old_version_id = Column(String(36), ForeignKey("document_versions.id"), nullable=True)
    new_version_id = Column(String(36), ForeignKey("document_versions.id"), nullable=False)
    old_claim_id = Column(String(36), ForeignKey("claims.id"), nullable=True)
    new_claim_id = Column(String(36), ForeignKey("claims.id"), nullable=True)
    change_type = Column(String(32), nullable=False)  # added, removed, modified, unchanged, uncertain
    changed_field = Column(String(255), nullable=True)
    explanation = Column(Text, nullable=True)
    confidence = Column(Float, default=1.0, nullable=False)
    human_review_required = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    document = relationship("Document", back_populates="changes")
    old_claim = relationship("Claim", foreign_keys=[old_claim_id])
    new_claim = relationship("Claim", foreign_keys=[new_claim_id])


class EvidenceChunk(Base):
    """Text chunk stored in SQLite and indexed into ChromaDB."""
    __tablename__ = "evidence_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    version_id = Column(String(36), ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, default=1, nullable=False)
    chroma_id = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    document = relationship("Document", back_populates="evidence_chunks")
    version = relationship("DocumentVersion", back_populates="evidence_chunks")


class Answer(Base):
    """AI-generated answer linked to historical evidence."""
    __tablename__ = "answers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    question = Column(Text, nullable=False)
    generated_answer = Column(Text, nullable=False)
    model_name = Column(String(128), nullable=False)
    status = Column(String(32), default="current", nullable=False)  # current, potentially_outdated, verified, superseded
    human_review_required = Column(Boolean, default=False, nullable=False)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    evidence_items = relationship("AnswerEvidence", back_populates="answer", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="affected_answer")


class AnswerEvidence(Base):
    """Join record linking an answer to exact document versions, chunks, and claims."""
    __tablename__ = "answer_evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    answer_id = Column(String(36), ForeignKey("answers.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    version_id = Column(String(36), ForeignKey("document_versions.id"), nullable=False)
    chunk_id = Column(String(36), ForeignKey("evidence_chunks.id"), nullable=True)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=True)
    similarity_score = Column(Float, nullable=True)
    citation_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    answer = relationship("Answer", back_populates="evidence_items")
    chunk = relationship("EvidenceChunk")
    claim = relationship("Claim")


class Alert(Base):
    """Alert record notifying of document updates, claim diffs, and outdated answers."""
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    alert_type = Column(String(48), nullable=False, index=True)  # document_updated, claim_changed, answer_potentially_outdated, etc.
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True, index=True)
    old_version_id = Column(String(36), ForeignKey("document_versions.id"), nullable=True)
    new_version_id = Column(String(36), ForeignKey("document_versions.id"), nullable=True)
    related_claim_id = Column(String(36), ForeignKey("claims.id"), nullable=True)
    affected_answer_id = Column(String(36), ForeignKey("answers.id"), nullable=True, index=True)
    severity = Column(String(16), default="medium", nullable=False)  # low, medium, high, critical
    explanation = Column(Text, nullable=False)
    status = Column(String(24), default="unreviewed", nullable=False, index=True)  # unreviewed, reviewed, resolved
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    document = relationship("Document", back_populates="alerts")
    affected_answer = relationship("Answer", back_populates="alerts")
    related_claim = relationship("Claim")
