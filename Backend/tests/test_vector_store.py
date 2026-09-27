import pytest
from app.database.models import EvidenceChunk
from app.services.vector_store_service import vector_store_service


def test_vector_store_upsert_and_query():
    """Verify adding evidence chunks to ChromaDB and querying by similarity."""
    doc_id = "test_doc_vs"
    ver_id = "test_ver_vs"

    c1 = EvidenceChunk(
        id="chunk_vs_1",
        document_id=doc_id,
        version_id=ver_id,
        chunk_index=0,
        content="Employees can claim reimbursement within 30 days of purchase.",
        page_number=1,
    )
    c2 = EvidenceChunk(
        id="chunk_vs_2",
        document_id=doc_id,
        version_id=ver_id,
        chunk_index=1,
        content="Personal vehicle mileage is reimbursed at 58 cents per mile.",
        page_number=1,
    )

    upserted = vector_store_service.upsert_chunks([c1, c2], version_number=1)
    assert upserted == 2

    # Query for reimbursement deadline
    results = vector_store_service.query_similar(
        query_text="How many days do I have to submit reimbursement claims?",
        n_results=2,
        document_id=doc_id,
        version_id=ver_id,
    )
    assert len(results) >= 1
    top = results[0]
    assert top["chunk_id"] == "chunk_vs_1"
    assert "30 days" in top["content"]
    assert top["similarity_score"] > 0.0

    # Clean up
    vector_store_service.delete_version_chunks(ver_id)
