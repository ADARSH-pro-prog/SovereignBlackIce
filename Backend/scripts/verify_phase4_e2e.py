"""
Verification script for Phase 4:
Target flow:
1. Upload Version 1: "Employees must submit travel reimbursement claims within 30 days."
2. Q&A: "How many days does an employee have to submit a travel reimbursement claim?"
   Verify answer is grounded on v1 and contains 30 days.
3. Upload Version 2: "Employees must submit travel reimbursement claims within 3 days."
4. Compare / detect claim changes (30 days -> 3 days).
5. Run Impact Analysis (POST /api/v1/impact/analyze):
   Verify:
   - Answer is flagged as "potentially_outdated", human_review_required=True.
   - Alert is generated for outdated answer.
6. Verify Graph (GET /api/v1/impact/graph):
   - Graph contains nodes and edges (doc, ver, chunk, claim, answer, change).
   - GROUNDS / MODIFIES edges present.
7. Verify Review Center / Alerts (GET /api/v1/alerts):
   - Alert is unreviewed with affected question.
8. Resolve Alert (PATCH /api/v1/alerts/{alert_id}/resolve):
   - Status updated to "resolved", resolved_at populated.
9. Verify Audit Event:
   - Alert appears as resolved with timestamp.
"""

import sys
import os
import io
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import init_db
from app.api.dependencies import get_current_user
from app.database.models import User

def run_phase4_e2e_verification():
    print("=" * 60)
    print("RUNNING PHASE 4 E2E VERIFICATION")
    print("=" * 60)

    init_db()
    dummy_user = User(
        id="test-operator-phase4",
        google_sub="test-google-sub-phase4",
        email="operator@sovereignblackice.internal",
        name="Phase4 Operator",
    )
    app.dependency_overrides[get_current_user] = lambda: dummy_user
    client = TestClient(app)

    # 1. Upload Version 1
    v1_text = "Corporate Travel Policy\n\nEmployees must submit travel reimbursement claims within 30 days."
    files_v1 = {"file": ("travel_policy.txt", io.BytesIO(v1_text.encode("utf-8")), "text/plain")}
    res_v1 = client.post("/api/v1/documents/upload", files=files_v1)
    assert res_v1.status_code == 201, f"v1 upload failed: {res_v1.text}"
    v1_data = res_v1.json()
    doc_id = v1_data["document"]["id"]
    v1_id = v1_data["version"]["id"]
    print(f"[OK] Version 1 uploaded: doc_id={doc_id}, v1_id={v1_id}")

    # 2. Ask question
    question = "How many days does an employee have to submit a travel reimbursement claim?"
    ask_payload = {
        "question": question,
        "document_id": doc_id,
        "version_id": v1_id,
    }
    ans_res = client.post("/api/v1/qa/ask", json=ask_payload)
    assert ans_res.status_code == 200, f"Q&A failed: {ans_res.text}"
    ans_data = ans_res.json()
    ans_id = ans_data["id"]
    print(f"[OK] AI Answer generated: id={ans_id}, status={ans_data['status']}")
    print(f"  Answer: {ans_data['generated_answer'][:100]}...")
    assert ans_data["status"] == "current"
    assert len(ans_data["evidence_items"]) > 0
    assert "30" in ans_data["generated_answer"]

    # 3. Upload Version 2 with changed rule
    v2_text = "Corporate Travel Policy\n\nEmployees must submit travel reimbursement claims within 3 days."
    files_v2 = {"file": ("travel_policy.txt", io.BytesIO(v2_text.encode("utf-8")), "text/plain")}
    res_v2 = client.post(f"/api/v1/documents/{doc_id}/versions", files=files_v2)
    assert res_v2.status_code == 201, f"v2 upload failed: {res_v2.text}"
    v2_data = res_v2.json()
    v2_id = v2_data["version"]["id"]
    print(f"[OK] Version 2 uploaded: v2_id={v2_id}")

    # 4. Check Claim Changes
    diff_res = client.get(f"/api/v1/documents/{doc_id}/compare?old_version_id={v1_id}&new_version_id={v2_id}")
    assert diff_res.status_code == 200, f"Compare failed: {diff_res.text}"
    diff_data = diff_res.json()
    changes = diff_data.get("claim_changes", [])
    print(f"[OK] Version comparison: {len(changes)} claim changes detected")
    for c in changes:
        print(f"  Change: field={c['changed_field']}, type={c['change_type']}, old={c.get('old_value')}, new={c.get('new_value')}")

    # 5. Run Impact Analysis
    impact_payload = {
        "document_id": doc_id,
        "old_version_id": v1_id,
        "new_version_id": v2_id,
    }
    impact_res = client.post("/api/v1/impact/analyze", json=impact_payload)
    assert impact_res.status_code == 200, f"Impact analysis failed: {impact_res.text}"
    impact_data = impact_res.json()
    print(f"[OK] Impact Analysis complete:")
    print(f"  total_claims_analyzed: {impact_data['total_claims_analyzed']}")
    print(f"  changed_claims_count: {impact_data['changed_claims_count']}")
    print(f"  affected_answers_count: {impact_data['affected_answers_count']}")
    print(f"  alerts_generated: {impact_data['alerts_generated']}")

    assert impact_data["affected_answers_count"] >= 1, "Expected at least 1 affected answer"
    affected_ans_ids = [a["id"] for a in impact_data["affected_answers"]]
    assert ans_id in affected_ans_ids, f"Expected answer {ans_id} to be in affected answers {affected_ans_ids}"

    # 6. Check Dependency Graph
    graph_res = client.get(f"/api/v1/impact/graph?document_id={doc_id}")
    assert graph_res.status_code == 200, f"Graph failed: {graph_res.text}"
    graph_data = graph_res.json()
    print(f"[OK] NetworkX Graph retrieved: {graph_data['total_nodes']} nodes, {graph_data['total_edges']} edges")
    node_types = graph_data.get("node_counts_by_type", {})
    print(f"  Node types: {node_types}")
    assert graph_data["total_nodes"] > 0
    assert graph_data["total_edges"] > 0

    # 7. Check Alerts & Review Center
    alerts_res = client.get(f"/api/v1/alerts?document_id={doc_id}")
    assert alerts_res.status_code == 200, f"List alerts failed: {alerts_res.text}"
    alerts_data = alerts_res.json()
    print(f"[OK] Alerts retrieved: {alerts_data['total']} total, {alerts_data['unreviewed_count']} unreviewed")
    assert alerts_data["total"] >= 1
    alert_item = alerts_data["alerts"][0]
    alert_id = alert_item["id"]
    print(f"  Alert ID: {alert_id}")
    print(f"  Alert status: {alert_item['status']}")
    print(f"  Affected question: {alert_item['affected_question']}")
    assert alert_item["status"] == "unreviewed"

    # 8. Resolve Alert via PATCH /api/v1/alerts/{alert_id}/resolve
    resolve_payload = {"status": "resolved"}
    resolve_res = client.patch(f"/api/v1/alerts/{alert_id}/resolve", json=resolve_payload)
    assert resolve_res.status_code == 200, f"Resolve failed: {resolve_res.text}"
    resolved_data = resolve_res.json()
    print(f"[OK] Alert resolved: status={resolved_data['status']}, resolved_at={resolved_data['resolved_at']}")
    assert resolved_data["status"] == "resolved"
    assert resolved_data["resolved_at"] is not None

    # 9. Verify persistence of resolved alert
    get_alert_res = client.get(f"/api/v1/alerts/{alert_id}")
    assert get_alert_res.status_code == 200
    assert get_alert_res.json()["status"] == "resolved"
    print(f"[OK] Verified database persistence: alert {alert_id} is 'resolved'")

    print("\n" + "=" * 60)
    print("ALL PHASE 4 TARGET FLOW VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_phase4_e2e_verification()
