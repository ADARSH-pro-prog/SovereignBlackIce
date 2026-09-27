from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.orm import Session
from app.database.models import EvidenceChunk


class ChunkRepository:
    """Data access layer for EvidenceChunk entities."""

    def bulk_create_chunks(self, db: Session, chunks: List[EvidenceChunk]) -> List[EvidenceChunk]:
        """Persist multiple evidence chunks in a single transaction."""
        db.add_all(chunks)
        db.commit()
        for c in chunks:
            db.refresh(c)
        return chunks

    def get_chunk_by_id(self, db: Session, chunk_id: str) -> Optional[EvidenceChunk]:
        """Fetch a single chunk by ID."""
        stmt = select(EvidenceChunk).where(EvidenceChunk.id == chunk_id)
        return db.execute(stmt).scalar_one_or_none()

    def get_chunks_by_version(self, db: Session, version_id: str) -> List[EvidenceChunk]:
        """Fetch all chunks for a specific document version ordered by chunk_index."""
        stmt = (
            select(EvidenceChunk)
            .where(EvidenceChunk.version_id == version_id)
            .order_by(EvidenceChunk.chunk_index)
        )
        return list(db.execute(stmt).scalars().all())

    def get_chunks_by_document(self, db: Session, document_id: str) -> List[EvidenceChunk]:
        """Fetch all chunks for a document across all versions."""
        stmt = (
            select(EvidenceChunk)
            .where(EvidenceChunk.document_id == document_id)
            .order_by(desc(EvidenceChunk.created_at))
        )
        return list(db.execute(stmt).scalars().all())

    def delete_chunks_for_version(self, db: Session, version_id: str) -> int:
        """Remove all chunks for a version (used before re-indexing)."""
        existing = self.get_chunks_by_version(db, version_id)
        count = len(existing)
        for chunk in existing:
            db.delete(chunk)
        db.commit()
        return count


chunk_repository = ChunkRepository()
