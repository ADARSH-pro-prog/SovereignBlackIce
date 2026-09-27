"""
Phase 6 End-to-End Integration Verification Test for Sovereign Black Ice.

Tests the complete multi-phase workflow:
1. Ingest Document v1 (Travel Policy)
2. Verify Chunking & Structured Claim Extraction
3. Ask grounded questions (cites exact version & chunk citations)
4. Ingest Document v2 (Reimbursement 30d->15d, Hotel $200->$250, Meal $75 unchanged)
5. Verify cross-version claim diffs (2 modified, 1 unchanged)
6. Inspect NetworkX dependency graph topology & relations
7. Verify selective impact analysis:
   - Q1 (Reimbursement) -> status="potentially_outdated", human_review_required=True
   - Q2 (Meal allowance) -> status="current", human_review_required=False (zero false positives)
   - Q3 (Hotel rate) -> status="potentially_outdated", human_review_required=True
8. Verify impact alerts generated and resolve alert via API
"""
import io
import pytest
from fastapi.testclient import TestClient


def test_complete_phase6_end_to_end_lifecycle(client: TestClient):
    # 1. Health check & Diagnostics
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "ok"

    res_diag = client.get("/api/v1/system/status")
    assert res_diag.status_code == 200
    assert res_diag.json()["database"]["status"] == "connected"

    # 2. Upload Document v1
    v1_text = (
        "ACME Corp - Corporate Travel & Expense Policy (2025 Edition)\n\n"
        "Section 1: Submission Deadlines\n"
        "All employee travel reimbursement claims must be submitted within 30 days of the travel date.\n\n"
        "Section 2: Meal Allowances\n"
        "The daily meal allowance for business travel is capped at $75 per day without prior approval.\n\n"
        "Section 3: Hotel Accommodations\n"
        "Standard hotel room rate reimbursement maximum is $200 per night for domestic travel."
    )
    files_v1 = {"file": ("travel_policy.txt", io.BytesIO(v1_text.encode("utf-8")), "text/plain")}
    res_v1 = client.post("/api/v1/documents/upload", files=files_v1)
    assert res_v1.status_code == 201
    v1_data = res_v1.json()
    doc_id = v1_data["document"]["id"]
    v1_id = v1_data["version"]["id"]

    # 3. Verify chunks & claims for v1
    res_chunks = client.get(f"/api/v1/documents/{doc_id}/versions/{v1_id}/chunks")
    assert res_chunks.status_code == 200
    assert res_chunks.json()["total"] >= 1

    res_claims = client.get(f"/api/v1/documents/{doc_id}/versions/{v1_id}/claims")
    assert res_claims.status_code == 200
    claims_raw = res_claims.json()
    claims_v1 = claims_raw if isinstance(claims_raw, list) else claims_raw.get("claims", [])
    assert len(claims_v1) >= 3

    # 4. Generate AI Answers on v1
    # Q1: Reimbursement (will become outdated)
    q1_resp = client.post(
        "/api/v1/qa/ask",
        json={
            "question": "What is the deadline for submitting travel expense claims?",
            "document_id": doc_id,
            "version_id": v1_id,
        },
    )
    assert q1_resp.status_code == 200
    ans1 = q1_resp.json()
    ans1_id = ans1["id"]
    assert ans1["status"] == "current"
    assert ans1["human_review_required"] is False
    assert "30 days" in ans1["generated_answer"]
    assert len(ans1["evidence_items"]) >= 1

    # Q2: Meal allowance (remains valid)
    q2_resp = client.post(
        "/api/v1/qa/ask",
        json={
            "question": "What is the daily meal allowance limit for business travel?",
            "document_id": doc_id,
            "version_id": v1_id,
        },
    )
    assert q2_resp.status_code == 200
    ans2 = q2_resp.json()
    ans2_id = ans2["id"]
    assert ans2["status"] == "current"
    assert ans2["human_review_required"] is False
    assert "75" in ans2["generated_answer"]

    # Q3: Hotel rate (will become outdated)
    q3_resp = client.post(
        "/api/v1/qa/ask",
        json={
            "question": "What is the maximum nightly hotel rate covered for domestic travel?",
            "document_id": doc_id,
            "version_id": v1_id,
        },
    )
    assert q3_resp.status_code == 200
    ans3 = q3_resp.json()
    ans3_id = ans3["id"]
    assert ans3["status"] == "current"
    assert ans3["human_review_required"] is False
    assert "200" in ans3["generated_answer"]

    # 5. Upload Document v2 (reimbursement 30d->15d, hotel $200->$250, meal $75 untouched)
    v2_text = (
        "ACME Corp - Corporate Travel & Expense Policy (2026 Edition)\n\n"
        "Section 1: Submission Deadlines\n"
        "All employee travel reimbursement claims must be submitted within 15 days of the travel date.\n\n"
        "Section 2: Meal Allowances\n"
        "The daily meal allowance for business travel is capped at $75 per day without prior approval.\n\n"
        "Section 3: Hotel Accommodations\n"
        "Standard hotel room rate reimbursement maximum is $250 per night for domestic travel."
    )
    files_v2 = {"file": ("travel_policy.txt", io.BytesIO(v2_text.encode("utf-8")), "text/plain")}
    res_v2 = client.post(f"/api/v1/documents/{doc_id}/versions", files=files_v2)
    assert res_v2.status_code == 201
    v2_id = res_v2.json()["version"]["id"]

    # 6. Verify cross-version claim diffs
    res_diff = client.get(f"/api/v1/documents/{doc_id}/compare?old_version_id={v1_id}&new_version_id={v2_id}")
    assert res_diff.status_code == 200
    diff_data = res_diff.json()
    assert diff_data["summary"]["modified_count"] >= 1
    assert diff_data["summary"]["unchanged_count"] >= 1

    # 7. Verify NetworkX dependency graph
    res_graph = client.get("/api/v1/impact/graph")
    assert res_graph.status_code == 200
    g_data = res_graph.json()
    assert g_data["total_nodes"] >= 6
    assert g_data["total_edges"] >= 5
    edge_rels = {e["relation"] for e in g_data["edges"]}
    assert "GROUNDS" in edge_rels
    assert "HAS_VERSION" in edge_rels

    # 8. Selective Impact Tracing Verification
    # Q1 must be flagged
    res_ans1_updated = client.get(f"/api/v1/answers/{ans1_id}")
    assert res_ans1_updated.status_code == 200
    ans1_up = res_ans1_updated.json()
    assert ans1_up["status"] == "potentially_outdated"
    assert ans1_up["human_review_required"] is True
    assert "15 days" in (ans1_up["review_notes"] or "")

    # Q2 must remain current and unaffected
    res_ans2_updated = client.get(f"/api/v1/answers/{ans2_id}")
    assert res_ans2_updated.status_code == 200
    ans2_up = res_ans2_updated.json()
    assert ans2_up["status"] == "current"
    assert ans2_up["human_review_required"] is False

    # Q3 must be flagged
    res_ans3_updated = client.get(f"/api/v1/answers/{ans3_id}")
    assert res_ans3_updated.status_code == 200
    ans3_up = res_ans3_updated.json()
    assert ans3_up["status"] == "potentially_outdated"
    assert ans3_up["human_review_required"] is True

    # 9. Verify alerts & resolution
    res_alerts = client.get(f"/api/v1/answers/{ans1_id}/impact")
    assert res_alerts.status_code == 200
    raw_alerts = res_alerts.json()
    ans1_alerts = raw_alerts if isinstance(raw_alerts, list) else raw_alerts.get("alerts", [])
    assert len(ans1_alerts) >= 1
    alert_id = ans1_alerts[0]["id"]

    # Resolve alert
    res_resolve = client.patch(f"/api/v1/alerts/{alert_id}/resolve", json={"status": "resolved"})
    assert res_resolve.status_code == 200
    assert res_resolve.json()["status"] == "resolved"
    assert res_resolve.json()["resolved_at"] is not None
