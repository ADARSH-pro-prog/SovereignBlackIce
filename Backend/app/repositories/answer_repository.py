from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.orm import Session, joinedload
from app.database.models import Answer, AnswerEvidence


class AnswerRepository:
    """Data access layer for Answer and AnswerEvidence entities."""

    def create_answer(
        self,
        db: Session,
        question: str,
        generated_answer: str,
        model_name: str,
        status: str = "current",
        human_review_required: bool = False,
        review_notes: Optional[str] = None,
    ) -> Answer:
        """Create and persist a new generated Answer."""
        ans = Answer(
            question=question,
            generated_answer=generated_answer,
            model_name=model_name,
            status=status,
            human_review_required=human_review_required,
            review_notes=review_notes,
        )
        db.add(ans)
        db.commit()
        db.refresh(ans)
        return ans

    def bulk_create_evidence(
        self, db: Session, evidence_items: List[AnswerEvidence]
    ) -> List[AnswerEvidence]:
        """Persist multiple evidence link records for an answer."""
        db.add_all(evidence_items)
        db.commit()
        for e in evidence_items:
            db.refresh(e)
        return evidence_items

    def get_answer_by_id(self, db: Session, answer_id: str) -> Optional[Answer]:
        """Fetch an answer with its evidence items eagerly loaded."""
        stmt = (
            select(Answer)
            .options(joinedload(Answer.evidence_items))
            .where(Answer.id == answer_id)
        )
        return db.execute(stmt).unique().scalar_one_or_none()

    def list_answers(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
    ) -> List[Answer]:
        """Fetch paginated list of answers."""
        stmt = (
            select(Answer)
            .options(joinedload(Answer.evidence_items))
            .order_by(desc(Answer.created_at))
            .offset(skip)
            .limit(limit)
        )
        if status:
            stmt = stmt.where(Answer.status == status)
        return list(db.execute(stmt).unique().scalars().all())

    def get_answers_for_version(self, db: Session, version_id: str) -> List[Answer]:
        """Fetch all answers that cite a specific document version."""
        stmt = (
            select(Answer)
            .join(AnswerEvidence)
            .where(AnswerEvidence.version_id == version_id)
            .distinct()
            .order_by(desc(Answer.created_at))
        )
        return list(db.execute(stmt).scalars().all())

    def update_answer_status(
        self,
        db: Session,
        answer_id: str,
        status: str,
        review_notes: Optional[str] = None,
    ) -> Optional[Answer]:
        """Update operational status of an answer (e.g. potentially_outdated)."""
        ans = self.get_answer_by_id(db, answer_id)
        if not ans:
            return None
        ans.status = status
        if review_notes is not None:
            ans.review_notes = review_notes
        db.commit()
        db.refresh(ans)
        return ans


answer_repository = AnswerRepository()
