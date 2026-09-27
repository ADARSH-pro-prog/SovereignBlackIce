from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.logging_config import logger
from app.core.exceptions import DocumentNotFoundError, VersionNotFoundError, AppException
from app.database.models import Claim, ClaimChange
from app.database.schemas import ClaimResponse, ClaimExtractionResponse, VersionComparisonResponse
from app.repositories.document_repository import document_repository
from app.repositories.claim_repository import claim_repository
from app.services.claim_extraction_service import claim_extraction_service
from app.services.claim_comparison_service import claim_comparison_service


class ClaimNotFoundError(AppException):
    def __init__(self, claim_id: str):
        super().__init__(
            message=f"Claim with ID '{claim_id}' was not found.",
            status_code=404,
            error_code="CLAIM_NOT_FOUND",
            details={"claim_id": claim_id},
        )


class ClaimService:
    """Coordinates claim extraction, persistence, retrieval, and comparison operations."""

    def extract_and_save_claims(
        self,
        db: Session,
        document_id: str,
        version_id: str,
        force: bool = False,
    ) -> ClaimExtractionResponse:
        """
        Extracts structured claims from a document version's text and saves them to the database.
        If claims exist and force=False, returns already stored claims.
        """
        doc = document_repository.get_document_by_id(db, document_id)
        if not doc:
            raise DocumentNotFoundError(document_id)

        ver = document_repository.get_version_by_id(db, document_id, version_id)
        if not ver:
            raise VersionNotFoundError(document_id, version_id)

        existing = claim_repository.get_claims_by_version(db, version_id)
        if existing and not force:
            logger.info(f"Version '{version_id}' already has {len(existing)} claims. Returning existing.")
            return ClaimExtractionResponse(
                document_id=document_id,
                version_id=version_id,
                version_number=ver.version_number,
                extraction_method="cached_database",
                claims_count=len(existing),
                claims=[ClaimResponse.model_validate(c) for c in existing],
            )

        if force and existing:
            deleted_count = claim_repository.delete_claims_for_version(db, version_id)
            logger.info(f"Deleted {deleted_count} existing claims for version '{version_id}' before re-extraction.")

        raw_claims, method = claim_extraction_service.extract_claims(
            text=ver.extracted_text, document_name=doc.name
        )

        entities_to_save: List[Claim] = []
        for c in raw_claims:
            claim_entity = Claim(
                document_id=document_id,
                version_id=version_id,
                claim_text=c["claim_text"],
                subject=c.get("subject"),
                predicate=c.get("predicate"),
                value=c.get("value"),
                unit=c.get("unit"),
                category=c.get("category", "policy_rule"),
                source_location=c.get("source_location"),
                confidence=c.get("confidence", 1.0),
            )
            entities_to_save.append(claim_entity)

        saved = claim_repository.bulk_create_claims(db, entities_to_save)
        logger.info(
            f"Successfully saved {len(saved)} structured claims for document '{doc.name}' version {ver.version_number}."
        )

        return ClaimExtractionResponse(
            document_id=document_id,
            version_id=version_id,
            version_number=ver.version_number,
            extraction_method=method,
            claims_count=len(saved),
            claims=[ClaimResponse.model_validate(c) for c in saved],
        )

    def get_version_claims(self, db: Session, document_id: str, version_id: str) -> List[Claim]:
        """Fetch all claims for a given document version."""
        doc = document_repository.get_document_by_id(db, document_id)
        if not doc:
            raise DocumentNotFoundError(document_id)
        ver = document_repository.get_version_by_id(db, document_id, version_id)
        if not ver:
            raise VersionNotFoundError(document_id, version_id)
        return claim_repository.get_claims_by_version(db, version_id)

    def get_document_claims(
        self, db: Session, document_id: str, version_id: Optional[str] = None
    ) -> List[Claim]:
        """Fetch claims for a document, optionally restricted to a specific version."""
        doc = document_repository.get_document_by_id(db, document_id)
        if not doc:
            raise DocumentNotFoundError(document_id)
        return claim_repository.get_claims_by_document(db, document_id, version_id)

    def get_claim(self, db: Session, claim_id: str) -> Claim:
        """Fetch a single claim by primary key."""
        claim = claim_repository.get_claim_by_id(db, claim_id)
        if not claim:
            raise ClaimNotFoundError(claim_id)
        return claim

    def compare_document_versions(
        self,
        db: Session,
        document_id: str,
        old_version_id: Optional[str] = None,
        new_version_id: Optional[str] = None,
        save_changes: bool = True,
    ) -> VersionComparisonResponse:
        """Compares claims between two versions and returns structured diff."""
        return claim_comparison_service.compare_versions(
            db=db,
            document_id=document_id,
            old_version_id=old_version_id,
            new_version_id=new_version_id,
            save_changes=save_changes,
        )

    def get_document_changes(self, db: Session, document_id: str) -> List[ClaimChange]:
        """Fetch all historical claim change records for a document."""
        doc = document_repository.get_document_by_id(db, document_id)
        if not doc:
            raise DocumentNotFoundError(document_id)
        return claim_repository.get_changes_for_document(db, document_id)


claim_service = ClaimService()
