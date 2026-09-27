from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.core.exceptions import AppException
from app.database.schemas import (
    ImpactAnalysisRequest,
    ImpactAnalysisResult,
    DependencyGraphResponse,
    AlertListResponse,
    AlertResponse,
    AlertResolveRequest,
)
from app.repositories.alert_repository import alert_repository
from app.services.graph_service import graph_service
from app.services.impact_service import impact_service

router = APIRouter(tags=["Dependency Graph & Impact Analysis"])


class AlertNotFoundError(AppException):
    def __init__(self, alert_id: str):
        super().__init__(
            message=f"Alert with ID '{alert_id}' was not found.",
            status_code=404,
            error_code="ALERT_NOT_FOUND",
            details={"alert_id": alert_id},
        )


@router.post(
    "/impact/analyze",
    response_model=ImpactAnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Trigger impact analysis between document versions",
    description=(
        "Traverses NetworkX dependency graph, traces modified/removed/uncertain claims "
        "to historical AI answers, flags affected answers as potentially outdated, and creates alerts."
    ),
)
def run_impact_analysis(
    payload: ImpactAnalysisRequest,
    db: Session = Depends(get_db),
) -> ImpactAnalysisResult:
    return impact_service.analyze_version_impact(
        db=db,
        document_id=payload.document_id,
        old_version_id=payload.old_version_id,
        new_version_id=payload.new_version_id,
    )


@router.get(
    "/impact/graph",
    response_model=DependencyGraphResponse,
    summary="Get NetworkX dependency graph topology",
    description="Serializes the complete knowledge integrity dependency graph (Documents, Versions, Chunks, Claims, Answers, Diffs).",
)
def get_dependency_graph(
    document_id: Optional[str] = Query(None, description="Optional document ID to scope graph"),
    db: Session = Depends(get_db),
) -> DependencyGraphResponse:
    return graph_service.get_graph_data(db, document_id=document_id)


@router.get(
    "/alerts",
    response_model=AlertListResponse,
    summary="List impact and knowledge drift alerts",
    description="Returns alerts for outdated answers, modified policy claims, and document updates.",
)
def list_alerts(
    status: Optional[str] = Query(None, description="Filter by status: 'unreviewed', 'reviewed', 'resolved'"),
    severity: Optional[str] = Query(None, description="Filter by severity: 'low', 'medium', 'high', 'critical'"),
    document_id: Optional[str] = Query(None, description="Filter by document ID"),
    affected_answer_id: Optional[str] = Query(None, description="Filter by affected answer ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> AlertListResponse:
    alerts = alert_repository.list_alerts(
        db=db,
        status=status,
        severity=severity,
        document_id=document_id,
        affected_answer_id=affected_answer_id,
        skip=skip,
        limit=limit,
    )
    unreviewed = alert_repository.count_unreviewed(db)

    items = []
    for a in alerts:
        items.append(
            AlertResponse(
                id=a.id,
                alert_type=a.alert_type,
                document_id=a.document_id,
                document_name=a.document.name if a.document else None,
                old_version_id=a.old_version_id,
                new_version_id=a.new_version_id,
                related_claim_id=a.related_claim_id,
                affected_answer_id=a.affected_answer_id,
                affected_question=a.affected_answer.question if a.affected_answer else None,
                severity=a.severity,
                explanation=a.explanation,
                status=a.status,
                created_at=a.created_at,
                resolved_at=a.resolved_at,
            )
        )

    return AlertListResponse(
        total=len(items),
        unreviewed_count=unreviewed,
        alerts=items,
    )


@router.get(
    "/alerts/{alert_id}",
    response_model=AlertResponse,
    summary="Get alert details by ID",
)
def get_alert(
    alert_id: str,
    db: Session = Depends(get_db),
) -> AlertResponse:
    a = alert_repository.get_alert_by_id(db, alert_id)
    if not a:
        raise AlertNotFoundError(alert_id)

    return AlertResponse(
        id=a.id,
        alert_type=a.alert_type,
        document_id=a.document_id,
        document_name=a.document.name if a.document else None,
        old_version_id=a.old_version_id,
        new_version_id=a.new_version_id,
        related_claim_id=a.related_claim_id,
        affected_answer_id=a.affected_answer_id,
        affected_question=a.affected_answer.question if a.affected_answer else None,
        severity=a.severity,
        explanation=a.explanation,
        status=a.status,
        created_at=a.created_at,
        resolved_at=a.resolved_at,
    )


@router.patch(
    "/alerts/{alert_id}/resolve",
    response_model=AlertResponse,
    summary="Update alert review/resolution status",
)
def resolve_alert(
    alert_id: str,
    payload: AlertResolveRequest,
    db: Session = Depends(get_db),
) -> AlertResponse:
    updated = alert_repository.update_alert_status(db, alert_id, payload.status)
    if not updated:
        raise AlertNotFoundError(alert_id)

    return AlertResponse(
        id=updated.id,
        alert_type=updated.alert_type,
        document_id=updated.document_id,
        document_name=updated.document.name if updated.document else None,
        old_version_id=updated.old_version_id,
        new_version_id=updated.new_version_id,
        related_claim_id=updated.related_claim_id,
        affected_answer_id=updated.affected_answer_id,
        affected_question=updated.affected_answer.question if updated.affected_answer else None,
        severity=updated.severity,
        explanation=updated.explanation,
        status=updated.status,
        created_at=updated.created_at,
        resolved_at=updated.resolved_at,
    )


@router.get(
    "/answers/{answer_id}/impact",
    response_model=List[AlertResponse],
    summary="Get active alerts for a specific answer",
)
def get_answer_alerts(
    answer_id: str,
    db: Session = Depends(get_db),
) -> List[AlertResponse]:
    alerts = alert_repository.get_alerts_for_answer(db, answer_id)
    return [
        AlertResponse(
            id=a.id,
            alert_type=a.alert_type,
            document_id=a.document_id,
            document_name=a.document.name if a.document else None,
            old_version_id=a.old_version_id,
            new_version_id=a.new_version_id,
            related_claim_id=a.related_claim_id,
            affected_answer_id=a.affected_answer_id,
            affected_question=a.affected_answer.question if a.affected_answer else None,
            severity=a.severity,
            explanation=a.explanation,
            status=a.status,
            created_at=a.created_at,
            resolved_at=a.resolved_at,
        )
        for a in alerts
    ]
