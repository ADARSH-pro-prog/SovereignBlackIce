from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.orm import Session
from app.database.models import Document, DocumentVersion


class DocumentRepository:
    """Encapsulates all database operations for Document and DocumentVersion entities."""

    def create_document(self, db: Session, name: str) -> Document:
        """Create a new tracked document record."""
        doc = Document(name=name)
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    def get_document_by_id(self, db: Session, document_id: str) -> Optional[Document]:
        """Fetch a document by its stable ID."""
        stmt = select(Document).where(Document.id == document_id)
        return db.execute(stmt).scalar_one_or_none()

    def list_documents(self, db: Session, skip: int = 0, limit: int = 100) -> List[Document]:
        """List documents ordered by newest update."""
        stmt = select(Document).order_by(desc(Document.updated_at)).offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    def get_latest_version(self, db: Session, document_id: str) -> Optional[DocumentVersion]:
        """Fetch the most recent version of a document."""
        stmt = (
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .order_by(desc(DocumentVersion.version_number))
            .limit(1)
        )
        return db.execute(stmt).scalar_one_or_none()

    def get_version_by_id(
        self, db: Session, document_id: str, version_id: str
    ) -> Optional[DocumentVersion]:
        """Fetch a specific version by its version ID and document ID."""
        stmt = select(DocumentVersion).where(
            DocumentVersion.document_id == document_id,
            DocumentVersion.id == version_id,
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_versions_by_document(
        self, db: Session, document_id: str
    ) -> List[DocumentVersion]:
        """List all historical versions of a document ordered from newest to oldest."""
        stmt = (
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .order_by(desc(DocumentVersion.version_number))
        )
        return list(db.execute(stmt).scalars().all())

    def get_version_by_hash(
        self, db: Session, document_id: str, file_hash: str
    ) -> Optional[DocumentVersion]:
        """Find any existing version of this document that matches the given SHA-256 hash."""
        stmt = (
            select(DocumentVersion)
            .where(
                DocumentVersion.document_id == document_id,
                DocumentVersion.file_hash == file_hash,
            )
            .order_by(desc(DocumentVersion.version_number))
            .limit(1)
        )
        return db.execute(stmt).scalar_one_or_none()

    def create_version(
        self,
        db: Session,
        document_id: str,
        version_number: int,
        file_hash: str,
        file_name: str,
        file_path: str,
        file_size_bytes: int,
        mime_type: str,
        extracted_text: str,
        page_count: int = 1,
        status: str = "processed",
    ) -> DocumentVersion:
        """Create and persist an immutable document version snapshot."""
        version = DocumentVersion(
            document_id=document_id,
            version_number=version_number,
            file_hash=file_hash,
            file_name=file_name,
            file_path=file_path,
            file_size_bytes=file_size_bytes,
            mime_type=mime_type,
            extracted_text=extracted_text,
            page_count=page_count,
            status=status,
        )
        db.add(version)
        db.commit()
        db.refresh(version)
        return version

    def delete_document(self, db: Session, document: Document) -> None:
        """Safely delete document and all cascading children."""
        db.delete(document)
        db.commit()


document_repository = DocumentRepository()
