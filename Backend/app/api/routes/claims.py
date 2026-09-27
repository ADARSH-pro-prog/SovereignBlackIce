from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.database.schemas import (
    ClaimResponse,
    ClaimListResponse,
    ClaimExtractionResponse,
    ClaimChangeDetail,
    VersionComparisonResponse,
    VersionComparisonRequest,
)
from app.services.claim_service import claim_service

router = APIRouter(tags=["Claims & Version Comparison"])


@router.post(
    "/documents/{document_id}/versions/{version_id}/claims/extract",
    response_model=ClaimExtractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract structured claims for a document version",
    description=(
        "Extracts structured claims from the document version using local Ollama LLM, "
        "falling back to deterministic heuristic extraction if Ollama is unreachable. "
        "Stores extracted claims in the database."
    ),
)
def extract_claims(
    document_id: str,
    version_id: str,
    force: bool = Query(False, description="Force re-extraction even if claims already exist"),
    db: Session = Depends(get_db),
) -> ClaimExtractionResponse:
    return claim_service.extract_and_save_claims(
        db=db, document_id=document_id, version_id=version_id, force=force
    )


@router.get(
    "/documents/{document_id}/versions/{version_id}/claims",
    response_model=List[ClaimResponse],
    summary="Get claims for a specific document version",
    description="Returns all structured claims extracted from the specified version.",
)
def get_version_claims(
    document_id: str,
    version_id: str,
    db: Session = Depends(get_db),
) -> List[ClaimResponse]:
    claims = claim_service.get_version_claims(db, document_id, version_id)
    return [ClaimResponse.model_validate(c) for c in claims]


@router.get(
    "/documents/{document_id}/claims",
    response_model=ClaimListResponse,
    summary="List claims for a document",
    description="Returns claims for a document, optionally filtered by a specific version ID.",
)
def list_document_claims(
    document_id: str,
    version_id: Optional[str] = Query(None, description="Optional version ID filter"),
    db: Session = Depends(get_db),
) -> ClaimListResponse:
    claims = claim_service.get_document_claims(db, document_id, version_id)
    response_items = [ClaimResponse.model_validate(c) for c in claims]
    return ClaimListResponse(
        total=len(response_items),
        document_id=document_id,
        version_id=version_id,
        claims=response_items,
    )


@router.get(
    "/claims/{claim_id}",
    response_model=ClaimResponse,
    summary="Get claim by ID",
    description="Retrieves full structured claim details and source references for a single claim.",
)
def get_claim(
    claim_id: str,
    db: Session = Depends(get_db),
) -> ClaimResponse:
    claim = claim_service.get_claim(db, claim_id)
    return ClaimResponse.model_validate(claim)


@router.get(
    "/documents/{document_id}/compare",
    response_model=VersionComparisonResponse,
    summary="Compare claims between two document versions (GET)",
    description=(
        "Performs structured claim comparison between two document versions. "
        "Detects added, removed, modified, unchanged, and uncertain claims. "
        "If version IDs are omitted, defaults to comparing the latest version against its predecessor."
    ),
)
def compare_document_versions_get(
    document_id: str,
    old_version_id: Optional[str] = Query(None, description="Base/older version ID"),
    new_version_id: Optional[str] = Query(None, description="Target/newer version ID"),
    save_changes: bool = Query(True, description="Persist detected changes into SQLite"),
    db: Session = Depends(get_db),
) -> VersionComparisonResponse:
    return claim_service.compare_document_versions(
        db=db,
        document_id=document_id,
        old_version_id=old_version_id,
        new_version_id=new_version_id,
        save_changes=save_changes,
    )


@router.post(
    "/documents/{document_id}/compare",
    response_model=VersionComparisonResponse,
    summary="Compare claims between two document versions (POST)",
    description="Compares claims between two versions with optional request body parameters.",
)
def compare_document_versions_post(
    document_id: str,
    payload: VersionComparisonRequest,
    db: Session = Depends(get_db),
) -> VersionComparisonResponse:
    return claim_service.compare_document_versions(
        db=db,
        document_id=document_id,
        old_version_id=payload.old_version_id,
        new_version_id=payload.new_version_id,
        save_changes=payload.save_changes,
    )


@router.get(
    "/documents/{document_id}/changes",
    response_model=List[ClaimChangeDetail],
    summary="Get all historical claim changes for a document",
    description="Returns all recorded diffs across all versions of the document.",
)
def get_document_changes(
    document_id: str,
    db: Session = Depends(get_db),
) -> List[ClaimChangeDetail]:
    changes = claim_service.get_document_changes(db, document_id)
    results: List[ClaimChangeDetail] = []
    for c in changes:
        old_claim_resp = ClaimResponse.model_validate(c.old_claim) if c.old_claim else None
        new_claim_resp = ClaimResponse.model_validate(c.new_claim) if c.new_claim else None
        results.append(
            ClaimChangeDetail(
                id=c.id,
                change_type=c.change_type,
                changed_field=c.changed_field,
                confidence=c.confidence,
                human_review_required=c.human_review_required,
                explanation=c.explanation or "",
                old_claim_id=c.old_claim_id,
                new_claim_id=c.new_claim_id,
                source_reference_old=c.old_claim.source_location if c.old_claim else None,
                source_reference_new=c.new_claim.source_location if c.new_claim else None,
                old_claim=old_claim_resp,
                new_claim=new_claim_resp,
            )
        )
    return results
