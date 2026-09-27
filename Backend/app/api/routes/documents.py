from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    UploadFile,
    status,
    Query,
    Response,
)
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.core.exceptions import DocumentNotFoundError, VersionNotFoundError
from app.database.schemas import (
    DocumentResponse,
    DocumentListResponse,
    DocumentVersionSummary,
    DocumentVersionDetail,
    DocumentUploadResponse,
    ExtractedTextResponse,
    DeleteDocumentResponse,
)
from app.repositories.document_repository import document_repository
from app.services.document_service import document_service

router = APIRouter(prefix="/documents", tags=["Documents & Versions"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new document",
    description="Uploads a TXT or PDF document, extracts text, computes SHA-256, and establishes version 1.",
)
async def upload_document(
    file: UploadFile = File(..., description="Document file (.txt or .pdf, max 10MB)"),
    document_name: Optional[str] = Form(None, description="Optional custom display name for the document"),
    db: Session = Depends(get_db),
) -> DocumentUploadResponse:
    content = await file.read()
    result = document_service.upload_document(
        db=db,
        content=content,
        original_filename=file.filename or "uploaded_file.txt",
        document_name=document_name,
    )
    return DocumentUploadResponse(**result)


@router.post(
    "/{document_id}/versions",
    response_model=DocumentUploadResponse,
    summary="Upload a new version of an existing document",
    description=(
        "Uploads a new file snapshot for an existing document ID. "
        "If the SHA-256 hash matches the current version, returns an 'unchanged' response without duplicating. "
        "If content changed, increments version number. Safely preserves all historical versions."
    ),
)
async def upload_document_version(
    document_id: str,
    response: Response,
    file: UploadFile = File(..., description="Updated document file (.txt or .pdf)"),
    db: Session = Depends(get_db),
) -> DocumentUploadResponse:
    content = await file.read()
    result = document_service.upload_version(
        db=db,
        document_id=document_id,
        content=content,
        original_filename=file.filename or "updated_file.txt",
    )
    # Set 201 for newly created version, 200 for unchanged duplicate detection
    if result["status"] == "created":
        response.status_code = status.HTTP_201_CREATED
    else:
        response.status_code = status.HTTP_200_OK

    return DocumentUploadResponse(**result)


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List all tracked documents",
    description="Returns a paginated list of documents with their latest active version summary.",
)
def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> DocumentListResponse:
    docs = document_repository.list_documents(db, skip=skip, limit=limit)
    response_items: List[DocumentResponse] = []

    for doc in docs:
        latest_ver = document_repository.get_latest_version(db, doc.id)
        latest_summary = None
        if latest_ver:
            latest_summary = DocumentVersionSummary.model_validate(latest_ver)

        response_items.append(
            DocumentResponse(
                id=doc.id,
                name=doc.name,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
                latest_version=latest_summary,
            )
        )

    return DocumentListResponse(total=len(response_items), documents=response_items)


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document details",
    description="Fetches document metadata and its latest active version.",
)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
) -> DocumentResponse:
    doc = document_repository.get_document_by_id(db, document_id)
    if not doc:
        raise DocumentNotFoundError(document_id)

    latest_ver = document_repository.get_latest_version(db, doc.id)
    latest_summary = DocumentVersionSummary.model_validate(latest_ver) if latest_ver else None

    return DocumentResponse(
        id=doc.id,
        name=doc.name,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        latest_version=latest_summary,
    )


@router.get(
    "/{document_id}/versions",
    response_model=List[DocumentVersionDetail],
    summary="Get version history for a document",
    description="Returns all historical immutable versions of this document from newest to oldest.",
)
def get_document_versions(
    document_id: str,
    db: Session = Depends(get_db),
) -> List[DocumentVersionDetail]:
    doc = document_repository.get_document_by_id(db, document_id)
    if not doc:
        raise DocumentNotFoundError(document_id)

    versions = document_repository.list_versions_by_document(db, document_id)
    return [DocumentVersionDetail.model_validate(v) for v in versions]


@router.get(
    "/{document_id}/versions/{version_id}",
    response_model=DocumentVersionDetail,
    summary="Get specific version metadata",
)
def get_specific_version(
    document_id: str,
    version_id: str,
    db: Session = Depends(get_db),
) -> DocumentVersionDetail:
    doc = document_repository.get_document_by_id(db, document_id)
    if not doc:
        raise DocumentNotFoundError(document_id)

    ver = document_repository.get_version_by_id(db, document_id, version_id)
    if not ver:
        raise VersionNotFoundError(document_id, version_id)

    return DocumentVersionDetail.model_validate(ver)


@router.get(
    "/{document_id}/versions/{version_id}/text",
    response_model=ExtractedTextResponse,
    summary="Get extracted text for a specific version",
    description="Returns the full extracted text for a given document version.",
)
def get_version_extracted_text(
    document_id: str,
    version_id: str,
    db: Session = Depends(get_db),
) -> ExtractedTextResponse:
    doc = document_repository.get_document_by_id(db, document_id)
    if not doc:
        raise DocumentNotFoundError(document_id)

    ver = document_repository.get_version_by_id(db, document_id, version_id)
    if not ver:
        raise VersionNotFoundError(document_id, version_id)

    return ExtractedTextResponse(
        document_id=doc.id,
        version_id=ver.id,
        version_number=ver.version_number,
        page_count=ver.page_count,
        full_text=ver.extracted_text,
    )


@router.delete(
    "/{document_id}",
    response_model=DeleteDocumentResponse,
    summary="Delete a document and all versions",
    description="Applies safe deletion rules, removes files from local storage, and deletes records.",
)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
) -> DeleteDocumentResponse:
    result = document_service.delete_document(db, document_id)
    return DeleteDocumentResponse(**result)
