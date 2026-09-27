import io
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import init_db
from app.services.claim_extraction_service import claim_extraction_service


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_heuristic_claim_extraction_deadlines():
    """Verify that heuristic extractor detects deadlines and units with exact source locations."""
    text = (
        "Expense Reimbursement Policy\n\n"
        "All employee travel expense claims must be submitted within 30 days of purchase.\n\n"
        "Late submissions will not be processed."
    )
    claims = claim_extraction_service.extract_claims_heuristically(text)
    assert len(claims) >= 1

    deadline_claim = next((c for c in claims if "30 days" in (c.get("value") or "")), None)
    assert deadline_claim is not None
    assert deadline_claim["value"] == "30 days"
    assert "days" in deadline_claim["unit"]
    assert deadline_claim["category"] == "deadline"
    assert "Page 1" in deadline_claim["source_location"]
    assert deadline_claim["confidence"] >= 0.85


def test_heuristic_claim_extraction_financial_limits():
    """Verify detection of financial amounts, per diems, and currency units."""
    text = (
        "Meals and Incidental Policy\n\n"
        "Daily per diem for meals is reimbursed up to $75 per day for domestic travel."
    )
    claims = claim_extraction_service.extract_claims_heuristically(text)
    assert len(claims) >= 1

    fin_claim = next((c for c in claims if "$75" in (c.get("value") or "")), None)
    assert fin_claim is not None
    assert "$75" in fin_claim["value"]
    assert fin_claim["unit"] == "USD"
    assert fin_claim["category"] == "financial_limit"
    assert "Page 1" in fin_claim["source_location"]


def test_heuristic_claim_extraction_multi_page():
    """Verify that [Page X] tags correctly map to source_location page citations."""
    text = (
        "[Page 1]\n"
        "Travel reimbursement must be filed within 14 days.\n\n"
        "[Page 2]\n"
        "Hotel lodging expenses are limited to $250 per night."
    )
    claims = claim_extraction_service.extract_claims_heuristically(text)
    assert len(claims) >= 2

    page1_claim = next((c for c in claims if "Page 1" in c["source_location"]), None)
    page2_claim = next((c for c in claims if "Page 2" in c["source_location"]), None)

    assert page1_claim is not None
    assert "14 days" in page1_claim["value"]
    assert page2_claim is not None
    assert "$250" in page2_claim["value"]


def test_ollama_llm_claim_extraction_with_mock():
    """Verify that when Ollama returns JSON claims, they are correctly parsed and returned with 'ollama_llm' tag."""
    mock_llm_response = {
        "message": {
            "content": json.dumps(
                [
                    {
                        "claim_text": "Employees can claim reimbursement within 30 days of purchase.",
                        "subject": "Reimbursement Deadline",
                        "predicate": "must be submitted within",
                        "value": "30 days",
                        "unit": "days",
                        "category": "deadline",
                        "source_location": "Page 1, Paragraph 1",
                        "confidence": 0.98,
                    }
                ]
            )
        }
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_llm_response

    with patch("httpx.Client.post", return_value=mock_resp):
        claims, method = claim_extraction_service.extract_claims(
            "Employees can claim reimbursement within 30 days of purchase.",
            document_name="Travel Policy",
        )

        assert method == "ollama_llm"
        assert len(claims) == 1
        assert claims[0]["value"] == "30 days"
        assert claims[0]["subject"] == "Reimbursement Deadline"
        assert claims[0]["confidence"] == 0.98


def test_ollama_fallback_to_heuristic_on_network_failure():
    """Verify graceful fallback to heuristic extractor when Ollama service is unreachable."""
    with patch("httpx.Client.post", side_effect=Exception("Connection refused")):
        text = "All expense claims must be filed within 30 days of purchase."
        claims, method = claim_extraction_service.extract_claims(text)

        assert method == "heuristic_fallback"
        assert len(claims) >= 1
        assert any("30 days" in (c.get("value") or "") for c in claims)


def test_claim_extraction_api_endpoint(client: TestClient):
    """Test POST /documents/{id}/versions/{vid}/claims/extract and GET /versions/{vid}/claims."""
    # 1. Upload a document
    txt_content = b"All expense claims must be filed within 30 days of purchase.\nMeals allowance is $50 per day."
    files = {"file": ("extract_test_policy.txt", io.BytesIO(txt_content), "text/plain")}
    up_resp = client.post("/api/v1/documents/upload", files=files)
    assert up_resp.status_code == 201
    doc_id = up_resp.json()["document"]["id"]
    version_id = up_resp.json()["version"]["id"]

    # 2. Trigger explicit extraction endpoint
    ext_resp = client.post(
        f"/api/v1/documents/{doc_id}/versions/{version_id}/claims/extract?force=true"
    )
    assert ext_resp.status_code == 200
    ext_data = ext_resp.json()
    assert ext_data["document_id"] == doc_id
    assert ext_data["version_id"] == version_id
    assert ext_data["claims_count"] >= 1
    assert len(ext_data["claims"]) == ext_data["claims_count"]

    first_claim = ext_data["claims"][0]
    assert first_claim["id"] is not None
    assert first_claim["source_location"] is not None
    assert first_claim["category"] in ["deadline", "financial_limit", "policy_rule"]

    claim_id = first_claim["id"]

    # 3. Test GET single claim by ID
    single_claim_resp = client.get(f"/api/v1/claims/{claim_id}")
    assert single_claim_resp.status_code == 200
    assert single_claim_resp.json()["id"] == claim_id
    assert single_claim_resp.json()["document_id"] == doc_id

    # 4. Test GET claims for version
    ver_claims_resp = client.get(f"/api/v1/documents/{doc_id}/versions/{version_id}/claims")
    assert ver_claims_resp.status_code == 200
    assert len(ver_claims_resp.json()) == ext_data["claims_count"]

    # 5. Test GET claims for document
    doc_claims_resp = client.get(f"/api/v1/documents/{doc_id}/claims")
    assert doc_claims_resp.status_code == 200
    assert doc_claims_resp.json()["total"] >= 1
