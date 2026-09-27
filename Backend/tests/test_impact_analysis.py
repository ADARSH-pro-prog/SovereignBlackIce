import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import init_db
from app.services.graph_service import graph_service


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_dependency_graph_topology(client: TestClient):
    """
    Verifies that the NetworkX dependency graph models all entity nodes
    (document, version, chunk, claim, answer) and directed edges (HAS_VERSION,
    CONTAINS_CHUNK, CONTAINS_CLAIM, GROUNDS).
    """
    # 1. Upload a document
    text = (
        "Expense Policy\n\n"
        "Employees can claim reimbursement within 30 days of purchase.\n\n"
        "Annual leave allowance is 20 days per year."
    )
    files = {"file": ("graph_test_policy.txt", io.BytesIO(text.encode("utf-8")), "text/plain")}
    up_resp = client.post("/api/v1/documents/upload", files=files)
    assert up_resp.status_code == 201
    doc_id = up_resp.json()["document"]["id"]
    ver_id = up_resp.json()["version"]["id"]

    # 2. Ask a question to create an Answer and AnswerEvidence node
    ask_payload = {
        "question": "What is the reimbursement deadline?",
        "document_id": doc_id,
        "version_id": ver_id,
    }
    ans_resp = client.post("/api/v1/qa/ask", json=ask_payload)
    assert ans_resp.status_code == 200

    # 3. Call GET /api/v1/impact/graph
    graph_resp = client.get(f"/api/v1/impact/graph?document_id={doc_id}")
    assert graph_resp.status_code == 200
    g_data = graph_resp.json()

    assert g_data["total_nodes"] >= 5
    assert g_data["total_edges"] >= 4

    types = g_data["node_counts_by_type"]
    assert types.get("document", 0) >= 1
    assert types.get("version", 0) >= 1
    assert types.get("chunk", 0) >= 1
    assert types.get("claim", 0) >= 1
    assert types.get("answer", 0) >= 1

    relations = {e["relation"] for e in g_data["edges"]}
    assert "HAS_VERSION" in relations
    assert "CONTAINS_CHUNK" in relations
    assert "CONTAINS_CLAIM" in relations
    assert "GROUNDS" in relations


def test_impact_tracing_affected_vs_unaffected_answers(client: TestClient):
    """
    CRITICAL PHASE 5 VERIFICATION:
    1. Upload document v1:
       - Rule A: reimbursement within 30 days.
       - Rule B: annual leave is 20 days.
    2. Answer Q1 ("What is the reimbursement deadline?") -> grounds on Rule A ("30 days").
    3. Answer Q2 ("How many days of annual leave?") -> grounds on Rule B ("20 days").
    4. Both answers start as status="current", human_review_required=False.
    5. Upload document v2:
       - Rule A is MODIFIED: reimbursement within 15 days.
       - Rule B is UNCHANGED: annual leave is 20 days.
    6. Run impact analysis:
       - Answer 1 MUST BE FLAGGED as status="potentially_outdated", human_review_required=True, with an Alert!
       - Answer 2 MUST REMAIN status="current", human_review_required=False, with NO Alert!
    """
    v1_text = (
        "Corporate Employee Handbook\n\n"
        "Employees can claim reimbursement within 30 days of purchase.\n\n"
        "Annual leave allowance is 20 days per calendar year."
    )
    v2_text = (
        "Corporate Employee Handbook\n\n"
        "Employees can claim reimbursement within 15 days of purchase.\n\n"
        "Annual leave allowance is 20 days per calendar year."
    )

    # Step 1: Upload Version 1
    files_v1 = {"file": ("handbook.txt", io.BytesIO(v1_text.encode("utf-8")), "text/plain")}
    res_v1 = client.post("/api/v1/documents/upload", files=files_v1)
    assert res_v1.status_code == 201
    doc_id = res_v1.json()["document"]["id"]
    v1_id = res_v1.json()["version"]["id"]

    # Step 2: Answer Q1 (Reimbursement - will become outdated in v2)
    ask_q1 = {
        "question": "What is the reimbursement submission window?",
        "document_id": doc_id,
        "version_id": v1_id,
    }
    ans1_resp = client.post("/api/v1/qa/ask", json=ask_q1)
    assert ans1_resp.status_code == 200
    ans1_data = ans1_resp.json()
    ans1_id = ans1_data["id"]
    assert ans1_data["status"] == "current"
    assert ans1_data["human_review_required"] is False
    assert "30 days" in ans1_data["generated_answer"]

    # Step 3: Answer Q2 (Annual Leave - remains valid in v2)
    ask_q2 = {
        "question": "How many days of annual leave do employees receive?",
        "document_id": doc_id,
        "version_id": v1_id,
    }
    ans2_resp = client.post("/api/v1/qa/ask", json=ask_q2)
    assert ans2_resp.status_code == 200
    ans2_data = ans2_resp.json()
    ans2_id = ans2_data["id"]
    assert ans2_data["status"] == "current"
    assert ans2_data["human_review_required"] is False
    assert "20 days" in ans2_data["generated_answer"]

    # Step 4: Upload Version 2 (Reimbursement deadline changed: 30 days -> 15 days)
    files_v2 = {"file": ("handbook.txt", io.BytesIO(v2_text.encode("utf-8")), "text/plain")}
    res_v2 = client.post(f"/api/v1/documents/{doc_id}/versions", files=files_v2)
    assert res_v2.status_code == 201
    v2_id = res_v2.json()["version"]["id"]

    # Step 5: Trigger Impact Analysis
    impact_payload = {
        "document_id": doc_id,
        "old_version_id": v1_id,
        "new_version_id": v2_id,
    }
    impact_resp = client.post("/api/v1/impact/analyze", json=impact_payload)
    assert impact_resp.status_code == 200
    impact_result = impact_resp.json()

    assert impact_result["document_id"] == doc_id
    assert impact_result["changed_claims_count"] >= 1
    assert impact_result["affected_answers_count"] == 1
    assert impact_result["unaffected_answers_count"] >= 1
    assert impact_result["alerts_generated"] >= 1

    # Step 6: Verify Q1 is FLAGGED as potentially_outdated
    ans1_after = client.get(f"/api/v1/answers/{ans1_id}").json()
    assert ans1_after["status"] == "potentially_outdated"
    assert ans1_after["human_review_required"] is True
    assert "Outdated by version" in ans1_after["review_notes"]

    # Step 7: Verify Q2 REMAINS current and unaffected
    ans2_after = client.get(f"/api/v1/answers/{ans2_id}").json()
    assert ans2_after["status"] == "current"
    assert ans2_after["human_review_required"] is False

    # Step 8: Verify Alert is generated for Q1 and NOT for Q2
    alerts_q1 = client.get(f"/api/v1/answers/{ans1_id}/impact").json()
    assert len(alerts_q1) >= 1
    assert alerts_q1[0]["affected_answer_id"] == ans1_id
    assert alerts_q1[0]["alert_type"] == "answer_potentially_outdated"
    assert alerts_q1[0]["severity"] in ["high", "critical"]
    assert "potentially outdated" in alerts_q1[0]["explanation"]

    alerts_q2 = client.get(f"/api/v1/answers/{ans2_id}/impact").json()
    assert len(alerts_q2) == 0


def test_alert_management_and_resolution_api(client: TestClient):
    """Test listing alerts, filtering, and resolving alerts via PATCH."""
    # 1. Fetch unreviewed alerts
    list_resp = client.get("/api/v1/alerts?status=unreviewed")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] >= 1
    target_alert = data["alerts"][0]
    alert_id = target_alert["id"]

    # 2. Get single alert
    get_resp = client.get(f"/api/v1/alerts/{alert_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == alert_id

    # 3. Resolve alert
    resolve_resp = client.patch(
        f"/api/v1/alerts/{alert_id}/resolve",
        json={"status": "resolved"},
    )
    assert resolve_resp.status_code == 200
    resolved_data = resolve_resp.json()
    assert resolved_data["status"] == "resolved"
    assert resolved_data["resolved_at"] is not None

    # 4. Verify no longer in unreviewed list if resolved
    check_resp = client.get(f"/api/v1/alerts/{alert_id}")
    assert check_resp.json()["status"] == "resolved"
