import re
from typing import List, Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging_config import logger
from app.core.exceptions import DocumentNotFoundError, VersionNotFoundError
from app.database.models import EvidenceChunk, Answer, AnswerEvidence
from app.repositories.document_repository import document_repository
from app.repositories.claim_repository import claim_repository
from app.repositories.chunk_repository import chunk_repository
from app.repositories.answer_repository import answer_repository
from app.services.chunking_service import chunking_service
from app.services.vector_store_service import vector_store_service
from app.database.schemas import (
    IndexVersionResponse,
    SemanticSearchResponse,
    SemanticSearchResultItem,
    AnswerResponse,
    AnswerEvidenceResponse,
)

RAG_SYSTEM_PROMPT = """You are Sovereign Black Ice, an enterprise AI knowledge integrity assistant.
Your objective is to provide a factually accurate, grounded answer to the user's question using ONLY the provided evidence passages and claims below.

GROUNDING & CITATION RULES:
1. Base your answer strictly on the provided evidence context. Do not invent facts, extrapolate, or use outside knowledge.
2. You MUST cite the source document name, version number, and page number for every claim or fact you state (e.g., "[Document: Travel Policy, Version: 1, Page 1]").
3. If the provided evidence does not contain sufficient facts to answer the question, clearly state: "The provided document version does not contain information to answer this question."
"""


class RAGService:
    """
    Orchestrates document chunking, ChromaDB vector indexing, semantic retrieval,
    grounded question answering with citations, and answer-evidence relationship persistence.
    """

    def index_version(
        self,
        db: Session,
        document_id: str,
        version_id: str,
        force: bool = False,
    ) -> IndexVersionResponse:
        """
        Chunks and indexes a document version into SQLite and ChromaDB.
        Skips if already indexed and force=False.
        """
        doc = document_repository.get_document_by_id(db, document_id)
        if not doc:
            raise DocumentNotFoundError(document_id)

        ver = document_repository.get_version_by_id(db, document_id, version_id)
        if not ver:
            raise VersionNotFoundError(document_id, version_id)

        existing = chunk_repository.get_chunks_by_version(db, version_id)
        if existing and not force:
            logger.info(
                f"Version '{version_id}' already has {len(existing)} chunks indexed. Skipping re-indexing."
            )
            return IndexVersionResponse(
                status="cached",
                message=f"Version {ver.version_number} already indexed with {len(existing)} chunks.",
                document_id=document_id,
                version_id=version_id,
                version_number=ver.version_number,
                chunks_indexed=len(existing),
            )

        if force and existing:
            chunk_repository.delete_chunks_for_version(db, version_id)
            vector_store_service.delete_version_chunks(version_id)
            logger.info(f"Cleared previous chunks for version '{version_id}' before re-indexing.")

        # Chunk the text
        raw_chunks = chunking_service.chunk_text(ver.extracted_text)
        if not raw_chunks:
            # Fallback for single short text
            raw_chunks = [
                {
                    "chunk_index": 0,
                    "content": ver.extracted_text.strip(),
                    "page_number": 1,
                }
            ]

        chunk_entities: List[EvidenceChunk] = []
        for rc in raw_chunks:
            chunk = EvidenceChunk(
                document_id=document_id,
                version_id=version_id,
                chunk_index=rc["chunk_index"],
                content=rc["content"],
                page_number=rc["page_number"],
            )
            chunk_entities.append(chunk)

        # 1. Save chunks to SQLite
        saved_chunks = chunk_repository.bulk_create_chunks(db, chunk_entities)

        # 2. Index into ChromaDB
        vector_store_service.upsert_chunks(saved_chunks, version_number=ver.version_number)

        logger.info(
            f"Successfully indexed {len(saved_chunks)} chunks for document '{doc.name}' version {ver.version_number}."
        )

        return IndexVersionResponse(
            status="indexed",
            message=f"Version {ver.version_number} indexed successfully with {len(saved_chunks)} evidence chunks.",
            document_id=document_id,
            version_id=version_id,
            version_number=ver.version_number,
            chunks_indexed=len(saved_chunks),
        )

    def search_evidence(
        self,
        query: str,
        document_id: Optional[str] = None,
        version_id: Optional[str] = None,
        top_k: int = 4,
    ) -> SemanticSearchResponse:
        """Searches ChromaDB vector store for semantic matches to query."""
        results = vector_store_service.query_similar(
            query_text=query,
            n_results=top_k,
            document_id=document_id,
            version_id=version_id,
        )

        items = [SemanticSearchResultItem(**r) for r in results]
        return SemanticSearchResponse(
            query=query,
            total_results=len(items),
            results=items,
        )

    def ask_grounded_question(
        self,
        db: Session,
        question: str,
        document_id: Optional[str] = None,
        version_id: Optional[str] = None,
        top_k: int = 4,
    ) -> AnswerResponse:
        """
        Executes grounded question answering:
        1. Resolves document and exact version.
        2. Ensures version is indexed into vector store.
        3. Retrieves top-k evidence chunks and relevant structured claims.
        4. Synthesizes answer using local Ollama model (with extractive fallback).
        5. Persists Answer and AnswerEvidence records.
        6. Returns structured answer with explicit document version citations.
        """
        # Step 1: Resolve document and version
        doc = None
        ver = None

        if document_id:
            doc = document_repository.get_document_by_id(db, document_id)
            if not doc:
                raise DocumentNotFoundError(document_id)

            if version_id:
                ver = document_repository.get_version_by_id(db, document_id, version_id)
                if not ver:
                    raise VersionNotFoundError(document_id, version_id)
            else:
                ver = document_repository.get_latest_version(db, document_id)
                if not ver:
                    raise VersionNotFoundError(document_id, "latest")
        elif version_id:
            # Look up version directly
            all_docs = document_repository.list_documents(db)
            for d in all_docs:
                v = document_repository.get_version_by_id(db, d.id, version_id)
                if v:
                    doc = d
                    ver = v
                    break
            if not ver:
                raise VersionNotFoundError("unknown", version_id)

        # Step 2: Auto-index version if chunks are not yet created
        if doc and ver:
            chunks = chunk_repository.get_chunks_by_version(db, ver.id)
            if not chunks:
                self.index_version(db, doc.id, ver.id)

        # Step 3: Semantic retrieval
        retrieved_chunks = vector_store_service.query_similar(
            query_text=question,
            n_results=top_k,
            document_id=doc.id if doc else None,
            version_id=ver.id if ver else None,
        )

        # Fetch relevant structured claims for grounding
        related_claims = []
        if ver:
            related_claims = claim_repository.get_claims_by_version(db, ver.id)

        # Step 4: Generate grounded answer via local Ollama or deterministic fallback
        generated_answer, model_used = self._generate_grounded_answer(
            question=question,
            doc_name=doc.name if doc else "Corporate Document",
            version_number=ver.version_number if ver else 1,
            version_id=ver.id if ver else "",
            chunks=retrieved_chunks,
            claims=related_claims,
        )

        # Step 5: Save Answer to database
        answer_record = answer_repository.create_answer(
            db=db,
            question=question,
            generated_answer=generated_answer,
            model_name=model_used,
            status="current",
            human_review_required=len(retrieved_chunks) == 0,
        )

        # Step 6: Create AnswerEvidence records linking answer to exact version and chunks
        evidence_entities: List[AnswerEvidence] = []
        for ch in retrieved_chunks:
            citation_excerpt = ch["content"][:250].strip()
            # Try to match with claim relevant to this question/answer if available
            matched_claim_id = None
            if related_claims:
                q_lower = question.lower()
                ans_lower = generated_answer.lower()
                for cl in related_claims:
                    subj_lower = cl.subject.lower() if cl.subject else ""
                    # 1. Subject match in question or generated answer
                    if subj_lower:
                        meaningful_words = [w for w in re.findall(r"\w+", subj_lower) if len(w) > 3 and w not in {"policy", "rule", "guideline", "standard"}]
                        if meaningful_words and all(w in q_lower for w in meaningful_words):
                            matched_claim_id = cl.id
                            break
                        if meaningful_words and any(w in q_lower for w in meaningful_words) and any(w in ans_lower for w in meaningful_words):
                            matched_claim_id = cl.id
                            break
                    # 2. Value + unit match in generated answer
                    if cl.value and cl.unit and f"{cl.value} {cl.unit}".lower() in ans_lower:
                        matched_claim_id = cl.id
                        break
                    # 3. Subject in chunk content (original fallback)
                    if cl.subject and cl.subject.lower() in ch["content"].lower():
                        matched_claim_id = cl.id
                        break

            evidence_item = AnswerEvidence(
                answer_id=answer_record.id,
                document_id=ch["document_id"] or (doc.id if doc else ""),
                version_id=ch["version_id"] or (ver.id if ver else ""),
                chunk_id=ch["chunk_id"],
                claim_id=matched_claim_id,
                similarity_score=ch["similarity_score"],
                citation_text=citation_excerpt,
            )
            evidence_entities.append(evidence_item)

        saved_evidence = answer_repository.bulk_create_evidence(db, evidence_entities)

        # Step 7: Build response
        evidence_responses: List[AnswerEvidenceResponse] = []
        for e in saved_evidence:
            chunk_rec = chunk_repository.get_chunk_by_id(db, e.chunk_id) if e.chunk_id else None
            ev_doc_name = doc.name if doc else None
            ev_ver_num = ver.version_number if ver else None
            if not ev_doc_name and e.document_id:
                target_d = document_repository.get_document_by_id(db, e.document_id)
                if target_d:
                    ev_doc_name = target_d.name
            if not ev_ver_num and e.document_id and e.version_id:
                target_v = document_repository.get_version_by_id(db, e.document_id, e.version_id)
                if target_v:
                    ev_ver_num = target_v.version_number
            elif not ev_ver_num and chunk_rec and chunk_rec.version:
                ev_ver_num = chunk_rec.version.version_number

            evidence_responses.append(
                AnswerEvidenceResponse(
                    id=e.id,
                    document_id=e.document_id,
                    document_name=ev_doc_name,
                    version_id=e.version_id,
                    version_number=ev_ver_num,
                    chunk_id=e.chunk_id,
                    page_number=chunk_rec.page_number if chunk_rec else 1,
                    claim_id=e.claim_id,
                    similarity_score=e.similarity_score,
                    citation_text=e.citation_text,
                    created_at=e.created_at,
                )
            )

        logger.info(
            f"Generated answer [ID: {answer_record.id}] with {len(evidence_responses)} grounded evidence citations."
        )

        return AnswerResponse(
            id=answer_record.id,
            question=answer_record.question,
            generated_answer=answer_record.generated_answer,
            model_name=answer_record.model_name,
            status=answer_record.status,
            human_review_required=answer_record.human_review_required,
            review_notes=answer_record.review_notes,
            created_at=answer_record.created_at,
            updated_at=answer_record.updated_at,
            evidence_items=evidence_responses,
        )

    def _generate_grounded_answer(
        self,
        question: str,
        doc_name: str,
        version_number: int,
        version_id: str,
        chunks: List[Dict[str, Any]],
        claims: List[Any],
    ) -> tuple[str, str]:
        """
        Invokes local Ollama model to generate grounded answer with citations.
        Falls back to deterministic extractive synthesis if Ollama is unreachable.
        """
        # If no evidence chunks retrieved
        if not chunks and not claims:
            return (
                f"The provided document version [Document: {doc_name}, Version: {version_number}] "
                "contains no evidence relevant to answer this question.",
                "deterministic_fallback",
            )

        # Build context strings
        evidence_text_parts = []
        for idx, ch in enumerate(chunks, start=1):
            evidence_text_parts.append(
                f"[Chunk {idx}] (Page {ch['page_number']}, Similarity: {ch['similarity_score']}):\n{ch['content']}"
            )
        evidence_context = "\n\n".join(evidence_text_parts)

        claims_context = ""
        if claims:
            claims_context = "\n".join(
                f"- {c.claim_text} (Source: {c.source_location or 'Page 1'})"
                for c in claims[:5]
            )

        user_content = (
            f"Document Title: {doc_name}\n"
            f"Document Version: {version_number} (ID: {version_id})\n\n"
            f"Evidence Passages:\n{evidence_context}\n\n"
        )
        if claims_context:
            user_content += f"Extracted Policy Rules:\n{claims_context}\n\n"

        user_content += (
            f"User Question: {question}\n\n"
            "Provide a grounded, concise answer citing the exact document name, version number, "
            "and page number for every fact."
        )

        payload = {
            "model": settings.OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": RAG_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            "stream": False,
            "options": {
                "temperature": 0.0,
            },
        }

        # Attempt Ollama call
        try:
            with httpx.Client(timeout=25.0) as client:
                resp = client.post(f"{settings.OLLAMA_BASE_URL}/api/chat", json=payload)
                if resp.status_code == 200:
                    ans_text = resp.json().get("message", {}).get("content", "").strip()
                    if ans_text:
                        return ans_text, settings.OLLAMA_MODEL
        except Exception as e:
            logger.warning(f"Ollama generation unavailable ({e}). Using deterministic grounded synthesis.")

        # Fallback: Deterministic extractive synthesis with explicit citations
        best_chunk = chunks[0] if chunks else None
        citation_tag = f"[Document: {doc_name}, Version: {version_number}, Page {best_chunk['page_number'] if best_chunk else 1}]"

        if best_chunk:
            sentences = re.split(r"(?<=[.!?])\s+", best_chunk["content"].strip())
            # Find sentence with highest keyword overlap with question
            q_words = set(re.findall(r"\w+", question.lower())) - {"what", "is", "the", "for", "how", "can", "when"}
            best_sentence = sentences[0]
            max_matches = 0
            for s in sentences:
                matches = sum(1 for w in q_words if w in s.lower())
                if matches > max_matches:
                    max_matches = matches
                    best_sentence = s

            return (
                f"Based on {citation_tag}: {best_sentence.strip()}",
                "extractive_fallback",
            )

        return (
            f"According to {citation_tag}, the requested policy information is not specified.",
            "extractive_fallback",
        )


rag_service = RAGService()
