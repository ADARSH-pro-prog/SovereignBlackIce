from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.core.exceptions import AppException
from app.database.schemas import (
    IndexVersionResponse,
    EvidenceChunkListResponse,
    EvidenceChunkResponse,
    SemanticSearchRequest,
    SemanticSearchResponse,
    AskQuestionRequest,
    AnswerResponse,
    AnswerListResponse,
    AnswerEvidenceResponse,
)
from app.repositories.chunk_repository import chunk_repository
from app.repositories.answer_repository import answer_repository
from app.services.rag_service import rag_service

router = APIRouter(tags=["Local AI, RAG & Question Answering"])


class AnswerNotFoundError(AppException):
    def __init__(self, answer_id: str):
        super().__init__(
            message=f"Answer with ID '{answer_id}' was not found.",
            status_code=404,
            error_code="ANSWER_NOT_FOUND",
            details={"answer_id": answer_id},
        )


@router.post(
    "/documents/{document_id}/versions/{version_id}/index",
    response_model=IndexVersionResponse,
    status_code=status.HTTP_200_OK,
    summary="Index document version into ChromaDB vector store",
    description="Chunks document text and indexes embeddings into local ChromaDB with version metadata.",
)
def index_document_version(
    document_id: str,
    version_id: str,
    force: bool = Query(False, description="Force re-indexing even if already indexed"),
    db: Session = Depends(get_db),
) -> IndexVersionResponse:
    return rag_service.index_version(
        db=db, document_id=document_id, version_id=version_id, force=force
    )


@router.get(
    "/documents/{document_id}/versions/{version_id}/chunks",
    response_model=EvidenceChunkListResponse,
    summary="List evidence chunks for a document version",
    description="Returns all chunked passages and page boundaries stored for this version.",
)
def get_version_chunks(
    document_id: str,
    version_id: str,
    db: Session = Depends(get_db),
) -> EvidenceChunkListResponse:
    chunks = chunk_repository.get_chunks_by_version(db, version_id)
    items = [EvidenceChunkResponse.model_validate(c) for c in chunks]
    return EvidenceChunkListResponse(
        total=len(items),
        document_id=document_id,
        version_id=version_id,
        chunks=items,
    )


@router.post(
    "/search",
    response_model=SemanticSearchResponse,
    summary="Semantic vector search across indexed documents",
    description="Searches ChromaDB vector store for evidence chunks matching a query, with optional document/version scoping.",
)
def search_evidence(
    payload: SemanticSearchRequest,
) -> SemanticSearchResponse:
    return rag_service.search_evidence(
        query=payload.query,
        document_id=payload.document_id,
        version_id=payload.version_id,
        top_k=payload.top_k,
    )


@router.post(
    "/qa/ask",
    response_model=AnswerResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask a question against document versions with grounded citations",
    description=(
        "Retrieves relevant evidence from ChromaDB vector store and extracted claims, "
        "generates a grounded answer using local Ollama (llama3.2:3b), "
        "explicitly cites the exact document version and page numbers, and stores the answer with evidence linkage."
    ),
)
def ask_grounded_question(
    payload: AskQuestionRequest,
    db: Session = Depends(get_db),
) -> AnswerResponse:
    return rag_service.ask_grounded_question(
        db=db,
        question=payload.question,
        document_id=payload.document_id,
        version_id=payload.version_id,
        top_k=payload.top_k,
    )


@router.get(
    "/answers",
    response_model=AnswerListResponse,
    summary="List historical AI-generated answers",
    description="Returns all historical answers with their current operational status and grounded evidence links.",
)
def list_answers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None, description="Optional status filter ('current', 'potentially_outdated')"),
    db: Session = Depends(get_db),
) -> AnswerListResponse:
    answers = answer_repository.list_answers(db, skip=skip, limit=limit, status=status)
    items = []
    for a in answers:
        ev_items = [
            AnswerEvidenceResponse(
                id=e.id,
                document_id=e.document_id,
                document_name=e.chunk.document.name if (e.chunk and e.chunk.document) else None,
                version_id=e.version_id,
                version_number=e.chunk.version.version_number if (e.chunk and e.chunk.version) else None,
                chunk_id=e.chunk_id,
                page_number=e.chunk.page_number if e.chunk else 1,
                claim_id=e.claim_id,
                similarity_score=e.similarity_score,
                citation_text=e.citation_text,
                created_at=e.created_at,
            )
            for e in a.evidence_items
        ]
        items.append(
            AnswerResponse(
                id=a.id,
                question=a.question,
                generated_answer=a.generated_answer,
                model_name=a.model_name,
                status=a.status,
                human_review_required=a.human_review_required,
                review_notes=a.review_notes,
                created_at=a.created_at,
                updated_at=a.updated_at,
                evidence_items=ev_items,
            )
        )
    return AnswerListResponse(total=len(items), answers=items)


@router.get(
    "/answers/{answer_id}",
    response_model=AnswerResponse,
    summary="Get answer details and grounded evidence trail",
    description="Retrieves a specific answer and all its linked document version evidence chunks and claims.",
)
def get_answer(
    answer_id: str,
    db: Session = Depends(get_db),
) -> AnswerResponse:
    a = answer_repository.get_answer_by_id(db, answer_id)
    if not a:
        raise AnswerNotFoundError(answer_id)

    ev_items = [
        AnswerEvidenceResponse(
            id=e.id,
            document_id=e.document_id,
            document_name=e.chunk.document.name if (e.chunk and e.chunk.document) else None,
            version_id=e.version_id,
            version_number=e.chunk.version.version_number if (e.chunk and e.chunk.version) else None,
            chunk_id=e.chunk_id,
            page_number=e.chunk.page_number if e.chunk else 1,
            claim_id=e.claim_id,
            similarity_score=e.similarity_score,
            citation_text=e.citation_text,
            created_at=e.created_at,
        )
        for e in a.evidence_items
    ]

    return AnswerResponse(
        id=a.id,
        question=a.question,
        generated_answer=a.generated_answer,
        model_name=a.model_name,
        status=a.status,
        human_review_required=a.human_review_required,
        review_notes=a.review_notes,
        created_at=a.created_at,
        updated_at=a.updated_at,
        evidence_items=ev_items,
    )
