import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging_config import logger
from app.core.exceptions import (
    DocumentNotFoundError,
    VersionNotFoundError,
    InvalidFileError,
    DocumentProcessingError,
)
from app.repositories.document_repository import document_repository
from app.services.hashing_service import hashing_service
from app.services.text_extraction_service import text_extraction_service
from app.utils.file_utils import (
    ALLOWED_EXTENSIONS,
    get_file_extension,
    sanitize_filename,
    save_file,
)


class DocumentService:
    """Orchestrates document validation, hashing, storage, text extraction, and version tracking."""

    def _validate_file(self, content: bytes, filename: str) -> str:
        """Validate file extension and size."""
        ext = get_file_extension(filename)
        if ext not in ALLOWED_EXTENSIONS:
            allowed = ", ".join(ALLOWED_EXTENSIONS)
            raise InvalidFileError(
                f"Unsupported file format '{ext}'. Allowed formats are: {allowed}"
            )

        file_size = len(content)
        if file_size > settings.max_upload_size_bytes:
            size_mb = file_size / (1024 * 1024)
            raise InvalidFileError(
                f"File size ({size_mb:.2f} MB) exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
            )

        if file_size == 0:
            raise InvalidFileError("Uploaded file is empty (0 bytes).")

        return ext

    def upload_document(
        self,
        db: Session,
        content: bytes,
        original_filename: str,
        document_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Upload a brand-new document and create version 1."""
        ext = self._validate_file(content, original_filename)
        clean_name = sanitize_filename(original_filename)
        doc_display_name = document_name.strip() if document_name and document_name.strip() else clean_name
        
        # Calculate SHA-256 hash of raw file bytes
        file_hash = hashing_service.hash_bytes(content)

        # Extract readable text and page metadata
        extracted = text_extraction_service.extract_text(content, original_filename)

        # Create Document record
        doc = document_repository.create_document(db, name=doc_display_name)
        
        # Store file in local storage
        relative_storage_path = f"documents/{doc.id}/v1_{clean_name}"
        full_storage_path = settings.BASE_DIR / settings.STORAGE_DIR / relative_storage_path
        save_file(content, full_storage_path)

        # Create initial DocumentVersion (v1)
        mime_type = "application/pdf" if ext == ".pdf" else "text/plain"
        version = document_repository.create_version(
            db=db,
            document_id=doc.id,
            version_number=1,
            file_hash=file_hash,
            file_name=clean_name,
            file_path=relative_storage_path,
            file_size_bytes=len(content),
            mime_type=mime_type,
            extracted_text=extracted.full_text,
            page_count=extracted.page_count,
            status="processed",
        )

        # Automatically extract claims and index into vector store for version 1
        try:
            from app.services.claim_service import claim_service
            from app.services.rag_service import rag_service
            claim_service.extract_and_save_claims(db, doc.id, version.id)
            rag_service.index_version(db, doc.id, version.id)
        except Exception as e:
            logger.warning(f"Initial claim extraction or indexing deferred for version {version.id}: {e}")

        logger.info(
            f"Created new document '{doc.name}' [ID: {doc.id}] with version 1 (SHA-256: {file_hash[:8]}...)"
        )

        return {
            "status": "created",
            "message": "Document uploaded and version 1 created successfully.",
            "is_duplicate": False,
            "document": {
                "id": doc.id,
                "name": doc.name,
                "created_at": doc.created_at,
                "updated_at": doc.updated_at,
            },
            "version": {
                "id": version.id,
                "version_number": version.version_number,
                "file_hash": version.file_hash,
                "file_name": version.file_name,
                "file_size_bytes": version.file_size_bytes,
                "page_count": version.page_count,
                "status": version.status,
                "upload_timestamp": version.upload_timestamp,
            },
        }

    def upload_version(
        self,
        db: Session,
        document_id: str,
        content: bytes,
        original_filename: str,
    ) -> Dict[str, Any]:
        """
        Upload a new version for an existing document.
        Detects duplicates against the current version, detects content changes,
        and safely handles version reversions.
        """
        doc = document_repository.get_document_by_id(db, document_id)
        if not doc:
            raise DocumentNotFoundError(document_id)

        ext = self._validate_file(content, original_filename)
        clean_name = sanitize_filename(original_filename)
        new_file_hash = hashing_service.hash_bytes(content)

        latest_version = document_repository.get_latest_version(db, document_id)
        if not latest_version:
            raise DocumentProcessingError(f"Document '{document_id}' has no existing version history.")

        # Duplicate Detection: If hash matches current version, do not create duplicate
        if hashing_service.compare_hashes(latest_version.file_hash, new_file_hash):
            logger.info(
                f"Uploaded file for document '{doc.name}' [ID: {document_id}] matches current version {latest_version.version_number}. Skipping duplicate version creation."
            )
            return {
                "status": "unchanged",
                "message": (
                    f"The uploaded document is identical to the current version "
                    f"(v{latest_version.version_number}, SHA-256: {new_file_hash[:8]}...). "
                    f"No duplicate version was created."
                ),
                "is_duplicate": True,
                "document": {
                    "id": doc.id,
                    "name": doc.name,
                    "created_at": doc.created_at,
                    "updated_at": doc.updated_at,
                },
                "version": {
                    "id": latest_version.id,
                    "version_number": latest_version.version_number,
                    "file_hash": latest_version.file_hash,
                    "file_name": latest_version.file_name,
                    "file_size_bytes": latest_version.file_size_bytes,
                    "page_count": latest_version.page_count,
                    "status": latest_version.status,
                    "upload_timestamp": latest_version.upload_timestamp,
                },
            }

        # Check for Version Reversion (content matches an older version)
        earlier_match = document_repository.get_version_by_hash(db, document_id, new_file_hash)
        is_reversion = earlier_match is not None

        next_version_num = latest_version.version_number + 1

        # Extract readable text and page metadata
        extracted = text_extraction_service.extract_text(content, original_filename)

        # Store file in local storage
        relative_storage_path = f"documents/{doc.id}/v{next_version_num}_{clean_name}"
        full_storage_path = settings.BASE_DIR / settings.STORAGE_DIR / relative_storage_path
        save_file(content, full_storage_path)

        mime_type = "application/pdf" if ext == ".pdf" else "text/plain"
        new_version = document_repository.create_version(
            db=db,
            document_id=doc.id,
            version_number=next_version_num,
            file_hash=new_file_hash,
            file_name=clean_name,
            file_path=relative_storage_path,
            file_size_bytes=len(content),
            mime_type=mime_type,
            extracted_text=extracted.full_text,
            page_count=extracted.page_count,
            status="processed",
        )

        # Automatically extract claims, compare with previous version, index into vector store, and run impact analysis
        try:
            from app.services.claim_service import claim_service
            from app.services.claim_comparison_service import claim_comparison_service
            from app.services.rag_service import rag_service
            from app.services.impact_service import impact_service

            claim_service.extract_and_save_claims(db, doc.id, new_version.id)
            claim_comparison_service.compare_versions(
                db=db,
                document_id=doc.id,
                old_version_id=latest_version.id,
                new_version_id=new_version.id,
                save_changes=True,
            )
            rag_service.index_version(db, doc.id, new_version.id)
            impact_service.analyze_version_impact(
                db=db,
                document_id=doc.id,
                old_version_id=latest_version.id,
                new_version_id=new_version.id,
            )
        except Exception as e:
            logger.warning(f"Version pipeline processing deferred for version {new_version.id}: {e}")

        message = f"New version {next_version_num} created successfully."
        if is_reversion and earlier_match:
            message += f" Note: Content matches earlier version {earlier_match.version_number} (reversion detected and safely preserved)."

        logger.info(
            f"Created version {next_version_num} for document '{doc.name}' [ID: {doc.id}] (reversion: {is_reversion})"
        )

        return {
            "status": "created",
            "message": message,
            "is_duplicate": False,
            "is_reversion": is_reversion,
            "reverted_from_version": earlier_match.version_number if is_reversion and earlier_match else None,
            "document": {
                "id": doc.id,
                "name": doc.name,
                "created_at": doc.created_at,
                "updated_at": doc.updated_at,
            },
            "version": {
                "id": new_version.id,
                "version_number": new_version.version_number,
                "file_hash": new_version.file_hash,
                "file_name": new_version.file_name,
                "file_size_bytes": new_version.file_size_bytes,
                "page_count": new_version.page_count,
                "status": new_version.status,
                "upload_timestamp": new_version.upload_timestamp,
            },
        }

    def delete_document(self, db: Session, document_id: str) -> Dict[str, Any]:
        """Safely delete a document, its version records, vector chunks, and files on disk."""
        doc = document_repository.get_document_by_id(db, document_id)
        if not doc:
            raise DocumentNotFoundError(document_id)

        # Clean up files on disk
        doc_dir = settings.BASE_DIR / settings.STORAGE_DIR / "documents" / document_id
        if doc_dir.exists():
            try:
                shutil.rmtree(doc_dir)
            except Exception as e:
                logger.warning(f"Failed to delete directory {doc_dir}: {e}")

        # Clean up ChromaDB vector chunks
        try:
            from app.services.vector_store_service import vector_store_service
            vector_store_service.delete_document_chunks(document_id)
        except Exception as e:
            logger.warning(f"Failed to delete ChromaDB chunks for document {document_id}: {e}")

        # Delete database records
        document_repository.delete_document(db, doc)
        logger.info(f"Deleted document '{doc.name}' [ID: {document_id}] and all historical versions.")

        return {
            "status": "deleted",
            "message": f"Document '{document_id}' and all its versions were deleted successfully.",
            "document_id": document_id,
        }


document_service = DocumentService()
