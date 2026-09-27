from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy import select, desc, func
from sqlalchemy.orm import Session, joinedload
from app.database.models import Alert


class AlertRepository:
    """Data access layer for Alert entities."""

    def create_alert(
        self,
        db: Session,
        alert_type: str,
        document_id: Optional[str] = None,
        old_version_id: Optional[str] = None,
        new_version_id: Optional[str] = None,
        related_claim_id: Optional[str] = None,
        affected_answer_id: Optional[str] = None,
        severity: str = "medium",
        explanation: str = "",
        status: str = "unreviewed",
    ) -> Alert:
        """Create and persist a single impact alert."""
        alert = Alert(
            alert_type=alert_type,
            document_id=document_id,
            old_version_id=old_version_id,
            new_version_id=new_version_id,
            related_claim_id=related_claim_id,
            affected_answer_id=affected_answer_id,
            severity=severity,
            explanation=explanation,
            status=status,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert

    def bulk_create_alerts(self, db: Session, alerts: List[Alert]) -> List[Alert]:
        """Persist multiple alerts in a single transaction."""
        db.add_all(alerts)
        db.commit()
        for a in alerts:
            db.refresh(a)
        return alerts

    def get_alert_by_id(self, db: Session, alert_id: str) -> Optional[Alert]:
        """Fetch alert by ID with related document and answer entities."""
        stmt = (
            select(Alert)
            .options(joinedload(Alert.document), joinedload(Alert.affected_answer))
            .where(Alert.id == alert_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_alerts(
        self,
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        document_id: Optional[str] = None,
        affected_answer_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Alert]:
        """Fetch paginated alerts with optional filtering."""
        stmt = (
            select(Alert)
            .options(joinedload(Alert.document), joinedload(Alert.affected_answer))
            .order_by(desc(Alert.created_at))
            .offset(skip)
            .limit(limit)
        )
        if status:
            stmt = stmt.where(Alert.status == status)
        if severity:
            stmt = stmt.where(Alert.severity == severity)
        if document_id:
            stmt = stmt.where(Alert.document_id == document_id)
        if affected_answer_id:
            stmt = stmt.where(Alert.affected_answer_id == affected_answer_id)

        return list(db.execute(stmt).scalars().all())

    def count_unreviewed(self, db: Session) -> int:
        """Count total unreviewed alerts."""
        stmt = select(func.count(Alert.id)).where(Alert.status == "unreviewed")
        return db.execute(stmt).scalar() or 0

    def update_alert_status(
        self, db: Session, alert_id: str, new_status: str
    ) -> Optional[Alert]:
        """Update review status of an alert (e.g. to 'reviewed' or 'resolved')."""
        alert = self.get_alert_by_id(db, alert_id)
        if not alert:
            return None
        alert.status = new_status
        if new_status == "resolved":
            alert.resolved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(alert)
        return alert

    def get_alerts_for_answer(self, db: Session, answer_id: str) -> List[Alert]:
        """Fetch all alerts affecting a specific answer."""
        stmt = (
            select(Alert)
            .where(Alert.affected_answer_id == answer_id)
            .order_by(desc(Alert.created_at))
        )
        return list(db.execute(stmt).scalars().all())


alert_repository = AlertRepository()
