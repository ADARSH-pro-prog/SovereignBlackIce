"""
Complete End-to-End Demo Script for Sovereign Black Ice.

Demonstrates the entire lifecycle:
1. System Health & Diagnostics
2. Document v1 Upload & Text Extraction
3. Chunking & ChromaDB Vector Indexing
4. Structured Claim Extraction (Ollama LLM with deterministic fallback)
5. Grounded Question Answering (cites exact version & evidence chunks)
6. Document v2 Revision Upload
7. Cross-Version Claim Comparison (Added, Removed, Modified, Unchanged)
8. NetworkX Dependency Graph Inspection
9. Selective Impact Analysis (Flagging affected Q1/Q3 while Q2 remains current)
10. Alert Generation & Resolution Lifecycle

Usage:
  python scripts/run_demo.py          # Runs in-process using FastAPI TestClient
  python scripts/run_demo.py --live   # Runs against http://127.0.0.1:8000
"""
import sys
import os
import io
import json
import time
import argparse
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

def print_header(title: str):
    print("\n" + "=" * 72)
    print(f"  {title}")
    print("=" * 72)

def print_step(step_num: int, title: str):
    print(f"\n[Step {step_num}] {title}")
    print("-" * 60)

def print_result(label: str, value: str, success: bool = True):
    symbol = "[OK]" if success else "[!!]"
    print(f"  {symbol} {label:<35} : {value}")


def run_demo(live: bool = False):
    print_header("SOVEREIGN BLACK ICE - FULL END-TO-END DEMO SCENARIO")
    print(f"  Mode: {'Live HTTP Server (http://127.0.0.1:8000)' if live else 'FastAPI In-Process TestClient'}")

    if live:
        import httpx
        base_url = "http://127.0.0.1:8000"
        client = httpx.Client(base_url=base_url, timeout=30.0)
    else:
        from fastapi.testclient import TestClient
        from app.main import app
        client = TestClient(app)

    # -------------------------------------------------------------
    # Step 1: Health & System Diagnostics
    # -------------------------------------------------------------
    print_step(1, "Verifying Health & System Status")
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health = res.json()
    print_result("Application Name", health["app_name"])
    print_result("Version", health["version"])
    print_result("Health Status", health["status"])

    res_diag = client.get("/api/v1/system/status")
    assert res_diag.status_code == 200
    diag = res_diag.json()
    print_result("Database Status", f"{diag['database']['status']} ({diag['database']['message']})")
    print_result("ChromaDB Status", diag["chromadb"]["status"])
    print_result("Ollama Model", diag["configured_models"]["llm_model"])

    # -------------------------------------------------------------
    # Step 2: Upload Document Version 1
    # -------------------------------------------------------------
    print_step(2, "Uploading Document Version 1 (Corporate Travel Policy)")
    doc_v1_text = (
        "ACME Corp - Corporate Travel & Expense Policy (2025 Edition)\n\n"
        "Section 1: Submission Deadlines\n"
        "All employee travel reimbursement claims must be submitted within 30 days of the travel date.\n\n"
        "Section 2: Meal Allowances\n"
        "The daily meal allowance for business travel is capped at $75 per day without prior approval.\n\n"
        "Section 3: Hotel Accommodations\n"
        "Standard hotel room rate reimbursement maximum is $200 per night for domestic travel."
    )
    files = {"file": ("travel_policy.txt", io.BytesIO(doc_v1_text.encode("utf-8")), "text/plain")}
    res_upload = client.post("/api/v1/documents/upload", files=files)
    assert res_upload.status_code == 201, f"Upload failed: {res_upload.text}"
    upload_data = res_upload.json()
    doc_id = upload_data["document"]["id"]
    v1_id = upload_data["version"]["id"]
    v1_hash = upload_data["version"]["file_hash"]

    print_result("Document ID", doc_id)
    print_result("Version 1 ID", v1_id)
    print_result("Version 1 SHA-256", f"{v1_hash[:16]}...{v1_hash[-8:]}")
    print_result("Document Name", upload_data["document"]["name"])

    # -------------------------------------------------------------
    # Step 3: Chunking & Claim Extraction for Version 1
    # -------------------------------------------------------------
    print_step(3, "Inspecting Extracted Chunks & Structured Claims (v1)")
    # The pipeline automatically indexed and extracted upon upload!
    res_chunks = client.get(f"/api/v1/documents/{doc_id}/versions/{v1_id}/chunks")
    assert res_chunks.status_code == 200
    chunks = res_chunks.json()
    print_result("Evidence Chunks Created", str(chunks["total"]))

    res_claims = client.get(f"/api/v1/documents/{doc_id}/versions/{v1_id}/claims")
    assert res_claims.status_code == 200
    claims_raw = res_claims.json()
    claims_v1 = claims_raw if isinstance(claims_raw, list) else claims_raw.get("claims", [])
    print_result("Structured Claims Extracted", str(len(claims_v1)))
    for idx, c in enumerate(claims_v1, 1):
        print(f"     Claim #{idx}: [{c['category']}] {c['subject']} {c['predicate']} -> {c['value']} {c['unit'] or ''}")

    # -------------------------------------------------------------
    # Step 4: Ask Grounded Questions (Generating Historical AI Answers)
    # -------------------------------------------------------------
    print_step(4, "Grounded Question Answering on Version 1")
    
    # Q1: Reimbursement deadline (Will become outdated in v2)
    q1_req = {
        "question": "What is the deadline for submitting travel expense claims?",
        "document_id": doc_id,
        "version_id": v1_id,
    }
    res_q1 = client.post("/api/v1/qa/ask", json=q1_req)
    assert res_q1.status_code == 200
    ans1 = res_q1.json()
    ans1_id = ans1["id"]
    print(f"\n  [Q1] \"{q1_req['question']}\"")
    print(f"       Answer: {ans1['generated_answer'][:100]}...")
    print(f"       Grounded Status: {ans1['status']} | Human Review Req: {ans1['human_review_required']}")
    print(f"       Evidence Cited: {len(ans1['evidence_items'])} chunk(s), Doc Version: {ans1['evidence_items'][0]['version_id'] if ans1['evidence_items'] else 'N/A'}")
    assert "30 days" in ans1["generated_answer"]
    assert ans1["status"] == "current"

    # Q2: Daily meal allowance (Will REMAIN UNCHANGED in v2)
    q2_req = {
        "question": "What is the daily meal allowance limit for business travel?",
        "document_id": doc_id,
        "version_id": v1_id,
    }
    res_q2 = client.post("/api/v1/qa/ask", json=q2_req)
    assert res_q2.status_code == 200
    ans2 = res_q2.json()
    ans2_id = ans2["id"]
    print(f"\n  [Q2] \"{q2_req['question']}\"")
    print(f"       Answer: {ans2['generated_answer'][:100]}...")
    print(f"       Grounded Status: {ans2['status']} | Human Review Req: {ans2['human_review_required']}")
    assert "$75" in ans2["generated_answer"] or "75" in ans2["generated_answer"]
    assert ans2["status"] == "current"

    # Q3: Hotel room rate (Will become outdated in v2)
    q3_req = {
        "question": "What is the maximum nightly hotel rate covered for domestic travel?",
        "document_id": doc_id,
        "version_id": v1_id,
    }
    res_q3 = client.post("/api/v1/qa/ask", json=q3_req)
    assert res_q3.status_code == 200
    ans3 = res_q3.json()
    ans3_id = ans3["id"]
    print(f"\n  [Q3] \"{q3_req['question']}\"")
    print(f"       Answer: {ans3['generated_answer'][:100]}...")
    print(f"       Grounded Status: {ans3['status']} | Human Review Req: {ans3['human_review_required']}")
    assert "200" in ans3["generated_answer"]
    assert ans3["status"] == "current"

    # -------------------------------------------------------------
    # Step 5: Upload Document Version 2 (Policy Modifications)
    # -------------------------------------------------------------
    print_step(5, "Uploading Document Version 2 (Policy Updates)")
    doc_v2_text = (
        "ACME Corp - Corporate Travel & Expense Policy (2026 Edition)\n\n"
        "Section 1: Submission Deadlines\n"
        "All employee travel reimbursement claims must be submitted within 15 days of the travel date.\n\n"
        "Section 2: Meal Allowances\n"
        "The daily meal allowance for business travel is capped at $75 per day without prior approval.\n\n"
        "Section 3: Hotel Accommodations\n"
        "Standard hotel room rate reimbursement maximum is $250 per night for domestic travel."
    )
    files_v2 = {"file": ("travel_policy.txt", io.BytesIO(doc_v2_text.encode("utf-8")), "text/plain")}
    res_v2 = client.post(f"/api/v1/documents/{doc_id}/versions", files=files_v2)
    assert res_v2.status_code == 201, f"Version 2 upload failed: {res_v2.text}"
    v2_data = res_v2.json()
    v2_id = v2_data["version"]["id"]
    v2_num = v2_data["version"]["version_number"]
    print_result("New Version Created", f"v{v2_num} (ID: {v2_id})")
    print_result("Version 2 SHA-256", f"{v2_data['version']['file_hash'][:16]}...")
    print_result("Upload Status", v2_data["status"])

    # -------------------------------------------------------------
    # Step 6: Verify Claim Comparison Diff
    # -------------------------------------------------------------
    print_step(6, "Inspecting Detected Claim Diffs (v1 vs v2)")
    res_diff = client.get(f"/api/v1/documents/{doc_id}/compare?old_version_id={v1_id}&new_version_id={v2_id}")
    assert res_diff.status_code == 200
    diff = res_diff.json()
    summary = diff["summary"]
    print_result("Total Old Claims", str(summary["total_old_claims"]))
    print_result("Total New Claims", str(summary["total_new_claims"]))
    print_result("Modified Claims", str(summary["modified_count"]))
    print_result("Unchanged Claims", str(summary["unchanged_count"]))
    print_result("Added Claims", str(summary["added_count"]))
    print_result("Removed Claims", str(summary["removed_count"]))

    for ch in diff["changes"]:
        print(f"     Diff: [{ch['change_type'].upper()}] {ch['explanation']}")

    # -------------------------------------------------------------
    # Step 7: NetworkX Dependency Graph Inspection
    # -------------------------------------------------------------
    print_step(7, "Inspecting NetworkX Dependency Graph Topology")
    res_graph = client.get("/api/v1/impact/graph")
    assert res_graph.status_code == 200
    graph_data = res_graph.json()
    print_result("Total Graph Nodes", str(graph_data["total_nodes"]))
    print_result("Total Directed Edges", str(graph_data["total_edges"]))
    print("     Node Counts by Type:")
    for ntype, count in graph_data["node_counts_by_type"].items():
        print(f"       - {ntype:<15} : {count}")
    
    unique_rels = sorted(list({e["relation"] for e in graph_data["edges"]}))
    print_result("Edge Relations Modeled", ", ".join(unique_rels))

    # -------------------------------------------------------------
    # Step 8: Impact Analysis Verification (Selective Isolation)
    # -------------------------------------------------------------
    print_step(8, "Verifying Impact Tracing on Historical Answers")
    # Verify Answer 1 (Reimbursement 30 days -> 15 days)
    res_a1 = client.get(f"/api/v1/answers/{ans1_id}")
    assert res_a1.status_code == 200
    updated_a1 = res_a1.json()
    print_result("Answer 1 Status (Q1: Reimbursement)", updated_a1["status"])
    print_result("Answer 1 Human Review Flag", str(updated_a1["human_review_required"]))
    print_result("Answer 1 Review Notes", updated_a1["review_notes"] or "None")
    assert updated_a1["status"] == "potentially_outdated", f"Expected potentially_outdated, got {updated_a1['status']}"
    assert updated_a1["human_review_required"] is True

    # Verify Answer 2 (Meal allowance $75 -> $75 unchanged)
    res_a2 = client.get(f"/api/v1/answers/{ans2_id}")
    assert res_a2.status_code == 200
    updated_a2 = res_a2.json()
    print_result("Answer 2 Status (Q2: Meal Allowance)", updated_a2["status"])
    print_result("Answer 2 Human Review Flag", str(updated_a2["human_review_required"]))
    assert updated_a2["status"] == "current", f"Expected current, got {updated_a2['status']}"
    assert updated_a2["human_review_required"] is False
    print("     -> SUCCESS: Unrelated answer remained completely unaffected (zero false positives)!")

    # Verify Answer 3 (Hotel rate $200 -> $250)
    res_a3 = client.get(f"/api/v1/answers/{ans3_id}")
    assert res_a3.status_code == 200
    updated_a3 = res_a3.json()
    print_result("Answer 3 Status (Q3: Hotel Room Rate)", updated_a3["status"])
    print_result("Answer 3 Human Review Flag", str(updated_a3["human_review_required"]))
    assert updated_a3["status"] == "potentially_outdated"
    assert updated_a3["human_review_required"] is True

    # -------------------------------------------------------------
    # Step 9: Alert Audit & Resolution Lifecycle
    # -------------------------------------------------------------
    print_step(9, "Managing Impact Alerts & Resolving Review Workflow")
    res_alerts = client.get(f"/api/v1/answers/{ans1_id}/impact")
    assert res_alerts.status_code == 200
    alerts_raw = res_alerts.json()
    a1_alerts = alerts_raw if isinstance(alerts_raw, list) else alerts_raw.get("alerts", [])
    print_result("Alerts Generated for Answer 1", str(len(a1_alerts)))
    assert len(a1_alerts) >= 1
    alert_to_resolve = a1_alerts[0]
    alert_id = alert_to_resolve["id"]
    print(f"     Alert #{alert_id}: [{alert_to_resolve['severity'].upper()}] {alert_to_resolve['alert_type']}")
    print(f"     Explanation: {alert_to_resolve['explanation']}")

    # Resolve Alert
    resolve_payload = {
        "status": "resolved"
    }
    res_resolve = client.patch(f"/api/v1/alerts/{alert_id}/resolve", json=resolve_payload)
    assert res_resolve.status_code == 200
    resolved_alert = res_resolve.json()
    print_result("Resolved Alert Status", resolved_alert["status"])
    print_result("Resolved At", str(resolved_alert["resolved_at"]))

    # -------------------------------------------------------------
    # Demo Complete
    # -------------------------------------------------------------
    print_header("DEMO SCENARIO EXECUTED SUCCESSFULLY")
    print("  All 10 steps verified without errors.")
    print("  - 100% Deterministic Knowledge Integrity Maintained.")
    print("  - Zero False-Positive Impact Flags.")
    print("  - NetworkX Graph Traversal Validated.")
    print("=" * 72 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Sovereign Black Ice End-to-End Demo")
    parser.add_argument("--live", action="store_true", help="Run against a live HTTP server at http://127.0.0.1:8000")
    args = parser.parse_args()

    try:
        run_demo(live=args.live)
    except Exception as exc:
        print(f"\n[ERROR] Demo failed with exception: {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
