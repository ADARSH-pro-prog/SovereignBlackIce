from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.orm import Session
from app.database.models import Claim, ClaimChange


class ClaimRepository:
    """Encapsulates database operations for Claim and ClaimChange entities."""

    def create_claim(
        self,
        db: Session,
        document_id: str,
        version_id: str,
        claim_text: str,
        subject: Optional[str] = None,
        predicate: Optional[str] = None,
        value: Optional[str] = None,
        unit: Optional[str] = None,
        category: str = "policy_rule",
        source_location: Optional[str] = None,
        confidence: float = 1.0,
    ) -> Claim:
        """Create and persist a single structured claim."""
        claim = Claim(
            document_id=document_id,
            version_id=version_id,
            claim_text=claim_text,
            subject=subject,
            predicate=predicate,
            value=value,
            unit=unit,
            category=category,
            source_location=source_location,
            confidence=confidence,
        )
        db.add(claim)
        db.commit()
        db.refresh(claim)
        return claim

    def bulk_create_claims(self, db: Session, claims: List[Claim]) -> List[Claim]:
        """Persist multiple claims within a single transaction."""
        db.add_all(claims)
        db.commit()
        for c in claims:
            db.refresh(c)
        return claims

    def get_claim_by_id(self, db: Session, claim_id: str) -> Optional[Claim]:
        """Fetch a claim by its primary ID."""
        stmt = select(Claim).where(Claim.id == claim_id)
        return db.execute(stmt).scalar_one_or_none()

    def get_claims_by_version(self, db: Session, version_id: str) -> List[Claim]:
        """Fetch all claims linked to a specific document version."""
        stmt = select(Claim).where(Claim.version_id == version_id).order_by(Claim.created_at)
        return list(db.execute(stmt).scalars().all())

    def get_claims_by_document(
        self, db: Session, document_id: str, version_id: Optional[str] = None
    ) -> List[Claim]:
        """Fetch claims for a document, optionally restricted to a specific version."""
        stmt = select(Claim).where(Claim.document_id == document_id)
        if version_id:
            stmt = stmt.where(Claim.version_id == version_id)
        stmt = stmt.order_by(desc(Claim.created_at))
        return list(db.execute(stmt).scalars().all())

    def delete_claims_for_version(self, db: Session, version_id: str) -> int:
        """Remove previously extracted claims for a version (used during re-extraction)."""
        existing = self.get_claims_by_version(db, version_id)
        count = len(existing)
        for claim in existing:
            db.delete(claim)
        db.commit()
        return count

    def create_claim_change(
        self,
        db: Session,
        document_id: str,
        old_version_id: Optional[str],
        new_version_id: str,
        old_claim_id: Optional[str],
        new_claim_id: Optional[str],
        change_type: str,
        changed_field: Optional[str] = None,
        explanation: Optional[str] = None,
        confidence: float = 1.0,
        human_review_required: bool = False,
    ) -> ClaimChange:
        """Create and persist a detected claim change record."""
        change = ClaimChange(
            document_id=document_id,
            old_version_id=old_version_id,
            new_version_id=new_version_id,
            old_claim_id=old_claim_id,
            new_claim_id=new_claim_id,
            change_type=change_type,
            changed_field=changed_field,
            explanation=explanation,
            confidence=confidence,
            human_review_required=human_review_required,
        )
        db.add(change)
        db.commit()
        db.refresh(change)
        return change

    def bulk_create_claim_changes(
        self, db: Session, changes: List[ClaimChange]
    ) -> List[ClaimChange]:
        """Persist multiple claim changes in a single transaction."""
        db.add_all(changes)
        db.commit()
        for c in changes:
            db.refresh(c)
        return changes

    def get_changes_between_versions(
        self, db: Session, document_id: str, old_version_id: Optional[str], new_version_id: str
    ) -> List[ClaimChange]:
        """Fetch previously recorded changes between two specific versions."""
        stmt = select(ClaimChange).where(
            ClaimChange.document_id == document_id,
            ClaimChange.new_version_id == new_version_id,
        )
        if old_version_id is not None:
            stmt = stmt.where(ClaimChange.old_version_id == old_version_id)
        else:
            stmt = stmt.where(ClaimChange.old_version_id.is_(None))
        return list(db.execute(stmt).scalars().all())

    def delete_changes_between_versions(
        self, db: Session, document_id: str, old_version_id: Optional[str], new_version_id: str
    ) -> int:
        """Delete previously recorded changes between two specific versions (used before re-comparing)."""
        existing = self.get_changes_between_versions(db, document_id, old_version_id, new_version_id)
        count = len(existing)
        for change in existing:
            db.delete(change)
        db.commit()
        return count

    def get_changes_for_document(
        self, db: Session, document_id: str
    ) -> List[ClaimChange]:
        """Fetch all recorded changes across all versions of a document."""
        stmt = (
            select(ClaimChange)
            .where(ClaimChange.document_id == document_id)
            .order_by(desc(ClaimChange.created_at))
        )
        return list(db.execute(stmt).scalars().all())


claim_repository = ClaimRepository()
