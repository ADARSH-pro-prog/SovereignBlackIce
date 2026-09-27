import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import init_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_index_and_retrieve_chunks_api(client: TestClient):
    """Test POST /documents/{id}/versions/{vid}/index and GET /chunks."""
    text = (
        "[Page 1]\n"
        "Corporate Travel Policy:\n"
        "Employees can claim reimbursement within 30 days of purchase.\n\n"
        "[Page 2]\n"
        "Hotel stay is limited to $250 per night."
    )
    files = {"file": ("travel_sop.txt", io.BytesIO(text.encode("utf-8")), "text/plain")}
    up_resp = client.post("/api/v1/documents/upload", files=files)
    assert up_resp.status_code == 201
    doc_id = up_resp.json()["document"]["id"]
    ver_id = up_resp.json()["version"]["id"]

    # 1. Test GET chunks (auto-indexed on upload)
    chunks_resp = client.get(f"/api/v1/documents/{doc_id}/versions/{ver_id}/chunks")
    assert chunks_resp.status_code == 200
    chunk_data = chunks_resp.json()
    assert chunk_data["total"] >= 1
    assert chunk_data["document_id"] == doc_id
    assert chunk_data["version_id"] == ver_id

    # 2. Test explicit re-index endpoint with force=True
    idx_resp = client.post(f"/api/v1/documents/{doc_id}/versions/{ver_id}/index?force=true")
    assert idx_resp.status_code == 200
    idx_data = idx_resp.json()
    assert idx_data["status"] == "indexed"
    assert idx_data["chunks_indexed"] >= 1


def test_semantic_search_api(client: TestClient):
    """Test POST /search for vector similarity retrieval."""
    text = "Employees can claim reimbursement within 30 days of purchase."
    files = {"file": ("search_test_policy.txt", io.BytesIO(text.encode("utf-8")), "text/plain")}
    up_resp = client.post("/api/v1/documents/upload", files=files)
    assert up_resp.status_code == 201
    doc_id = up_resp.json()["document"]["id"]

    search_payload = {
        "query": "What is the deadline for submitting expense claims?",
        "document_id": doc_id,
        "top_k": 2,
    }
    search_resp = client.post("/api/v1/search", json=search_payload)
    assert search_resp.status_code == 200
    res = search_resp.json()
    assert res["total_results"] >= 1
    top_result = res["results"][0]
    assert "30 days" in top_result["content"]
    assert top_result["similarity_score"] > 0.0


def test_grounded_qa_with_mocked_llm(client: TestClient):
    """
    Test POST /qa/ask with mocked Ollama response:
    Verifies answer cites exact document version, returns linked evidence items,
    and persists in SQLite Answer and AnswerEvidence tables.
    """
    v1_text = "Policy: Employees can claim reimbursement within 30 days of purchase."
    files = {"file": ("qa_policy_v1.txt", io.BytesIO(v1_text.encode("utf-8")), "text/plain")}
    up_resp = client.post("/api/v1/documents/upload", files=files)
    assert up_resp.status_code == 201
    doc_id = up_resp.json()["document"]["id"]
    v1_id = up_resp.json()["version"]["id"]

    mock_answer = (
        "According to [Document: qa_policy_v1.txt, Version: 1, Page 1], "
        "employees can claim reimbursement within 30 days of purchase."
    )

    from app.services.rag_service import rag_service
    with patch.object(rag_service, "_generate_grounded_answer", return_value=(mock_answer, "mocked_ollama")):
        ask_payload = {
            "question": "What is the reimbursement submission window?",
            "document_id": doc_id,
            "version_id": v1_id,
            "top_k": 3,
        }
        ask_resp = client.post("/api/v1/qa/ask", json=ask_payload)
        assert ask_resp.status_code == 200
        ans_data = ask_resp.json()

        assert ans_data["id"] is not None
        assert ans_data["question"] == ask_payload["question"]
        assert "Version: 1" in ans_data["generated_answer"]
        assert "30 days" in ans_data["generated_answer"]
        assert ans_data["status"] == "current"

        # Verify evidence items are present and accurately linked
        assert len(ans_data["evidence_items"]) >= 1
        first_evidence = ans_data["evidence_items"][0]
        assert first_evidence["document_id"] == doc_id
        assert first_evidence["version_id"] == v1_id
        assert first_evidence["version_number"] == 1
        assert first_evidence["chunk_id"] is not None
        assert first_evidence["similarity_score"] > 0.0

        ans_id = ans_data["id"]

        # Verify GET /answers/{id}
        get_ans_resp = client.get(f"/api/v1/answers/{ans_id}")
        assert get_ans_resp.status_code == 200
        assert get_ans_resp.json()["id"] == ans_id
        assert len(get_ans_resp.json()["evidence_items"]) >= 1

        # Verify GET /answers list
        list_ans_resp = client.get("/api/v1/answers")
        assert list_ans_resp.status_code == 200
        assert list_ans_resp.json()["total"] >= 1


def test_grounded_qa_version_specific_citations(client: TestClient):
    """
    Test asking questions across different document versions (v1 vs v2).
    In v1: reimbursement deadline is 30 days.
    In v2: reimbursement deadline is 15 days.
    Verifies that querying v1 grounds to v1 and cites Version 1,
    while querying v2 grounds to v2 and cites Version 2!
    """
    v1_text = "Policy: Employees can claim reimbursement within 30 days of purchase."
    v2_text = "Policy: Employees can claim reimbursement within 15 days of purchase."

    # 1. Upload v1
    files_v1 = {"file": ("timeframe_policy.txt", io.BytesIO(v1_text.encode("utf-8")), "text/plain")}
    res_v1 = client.post("/api/v1/documents/upload", files=files_v1)
    doc_id = res_v1.json()["document"]["id"]
    v1_id = res_v1.json()["version"]["id"]

    # 2. Upload v2
    files_v2 = {"file": ("timeframe_policy.txt", io.BytesIO(v2_text.encode("utf-8")), "text/plain")}
    res_v2 = client.post(f"/api/v1/documents/{doc_id}/versions", files=files_v2)
    v2_id = res_v2.json()["version"]["id"]

    # 3. Ask against Version 1
    ask_v1_payload = {
        "question": "What is the reimbursement deadline?",
        "document_id": doc_id,
        "version_id": v1_id,
    }
    ans_v1_resp = client.post("/api/v1/qa/ask", json=ask_v1_payload)
    assert ans_v1_resp.status_code == 200
    v1_answer = ans_v1_resp.json()
    assert "Version: 1" in v1_answer["generated_answer"]
    assert "30 days" in v1_answer["generated_answer"]
    assert v1_answer["evidence_items"][0]["version_id"] == v1_id
    assert v1_answer["evidence_items"][0]["version_number"] == 1

    # 4. Ask against Version 2
    ask_v2_payload = {
        "question": "What is the reimbursement deadline?",
        "document_id": doc_id,
        "version_id": v2_id,
    }
    ans_v2_resp = client.post("/api/v1/qa/ask", json=ask_v2_payload)
    assert ans_v2_resp.status_code == 200
    v2_answer = ans_v2_resp.json()
    assert "Version: 2" in v2_answer["generated_answer"]
    assert "15 days" in v2_answer["generated_answer"]
    assert v2_answer["evidence_items"][0]["version_id"] == v2_id
    assert v2_answer["evidence_items"][0]["version_number"] == 2


def test_live_ollama_model_if_available(client: TestClient):
    """If local Ollama is active with llama3.2:3b, test live end-to-end grounded generation."""
    try:
        import httpx
        from app.core.config import settings
        resp = httpx.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=1.5)
        if resp.status_code != 200:
            pytest.skip("Local Ollama not reachable")
    except Exception:
        pytest.skip("Local Ollama not reachable")

    text = "Employees can claim travel expenses within 45 business days of return."
    files = {"file": ("live_model_policy.txt", io.BytesIO(text.encode("utf-8")), "text/plain")}
    res = client.post("/api/v1/documents/upload", files=files)
    doc_id = res.json()["document"]["id"]
    ver_id = res.json()["version"]["id"]

    ask_payload = {
        "question": "What is the travel expense claim timeframe?",
        "document_id": doc_id,
        "version_id": ver_id,
        "top_k": 2,
    }
    ans_resp = client.post("/api/v1/qa/ask", json=ask_payload)
    assert ans_resp.status_code == 200
    data = ans_resp.json()
    assert data["model_name"] in [settings.OLLAMA_MODEL, "extractive_fallback"]
    assert len(data["evidence_items"]) >= 1
    assert data["evidence_items"][0]["version_id"] == ver_id

