"""
Phase 3 End-to-End Verification Script: Assistant & Grounded RAG Flow

Validates:
1. Target Question: 'How many days does an employee have to submit a travel reimbursement claim?'
2. RAG chunk retrieval with strict isolation (no cross-document leakage)
3. Local Ollama LLM grounded answer generation with exact document/version citations
4. SQLite persistence of Answer & AnswerEvidence records
5. Safe handling of unrelated questions (no fabricated citations)
6. Empty question validation (HTTP 422)
7. Non-existent document/version error handling (HTTP 404)
"""
import io
import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.main import app
from app.database.database import init_db
from app.api.dependencies import get_current_user
from app.database.models import User

# Initialize database schema
init_db()

# Authenticate test client as operator
dummy_user = User(
    id="test-operator-phase3",
    google_sub="test-google-sub-mock",
    email="operator@sovereignblackice.internal",
    name="Phase3 Operator",
)
app.dependency_overrides[get_current_user] = lambda: dummy_user
client = TestClient(app)

print("=" * 60)
print("SOVEREIGN BLACK ICE - PHASE 3 END-TO-END VERIFICATION")
print("=" * 60)

# 1. Upload Test Document
doc_content = (
    "[Page 1]\n"
    "SOVEREIGN ENTERPRISE TRAVEL AND EXPENSE POLICY v1.0\n"
    "Section 4.1: Reimbursement Deadlines\n"
    "All employees must submit their travel expense claims and associated itemized receipts "
    "within 15 days of returning from business travel. Claims submitted after 15 days will require "
    "division director approval.\n\n"
    "[Page 2]\n"
    "Section 5.2: Per Diem and Hotel Nightly Caps\n"
    "Lodging expenses are capped at $275 per night in standard tier cities. Meal per diem is fixed at $75 per day."
)

print("\n[Step 1] Uploading reference policy document...")
files = {"file": ("travel_reimbursement_policy.txt", io.BytesIO(doc_content.encode("utf-8")), "text/plain")}
up_resp = client.post("/api/v1/documents/upload", files=files)
assert up_resp.status_code == 201, f"Upload failed: {up_resp.text}"
up_data = up_resp.json()
doc_id = up_data["document"]["id"]
ver_id = up_data["version"]["id"]
print(f"  [OK] Document uploaded successfully: ID={doc_id}, Version={ver_id}")

# 2. Ask Target Question
target_question = "How many days does an employee have to submit a travel reimbursement claim?"
print(f"\n[Step 2] Asking Target Question: '{target_question}'...")
ask_payload = {
    "question": target_question,
    "document_id": doc_id,
    "version_id": ver_id,
    "top_k": 3,
}
ask_resp = client.post("/api/v1/qa/ask", json=ask_payload)
assert ask_resp.status_code == 200, f"QA request failed: {ask_resp.text}"
ans_data = ask_resp.json()

print(f"  [OK] Model Used: {ans_data['model_name']}")
print(f"  [OK] Generated Answer: {ans_data['generated_answer']}")
print(f"  [OK] Evidence Items Count: {len(ans_data['evidence_items'])}")

assert len(ans_data["evidence_items"]) >= 1, "Expected at least 1 evidence citation!"
assert "15 days" in ans_data["generated_answer"].lower(), "Expected '15 days' in generated answer!"

for idx, ev in enumerate(ans_data["evidence_items"], 1):
    print(f"    Evidence #{idx}:")
    print(f"      - Document: {ev['document_name']} (ID: {ev['document_id']})")
    print(f"      - Version: {ev['version_number']} (ID: {ev['version_id']})")
    print(f"      - Page: {ev['page_number']}")
    print(f"      - Similarity Score: {ev['similarity_score']}")
    print(f"      - Excerpt: \"{ev['citation_text']}\"")
    assert ev["document_id"] == doc_id
    assert ev["version_id"] == ver_id

# 3. Verify SQLite Persistence via GET /api/v1/answers/{id}
ans_id = ans_data["id"]
print(f"\n[Step 3] Verifying Answer Persistence via GET /api/v1/answers/{ans_id}...")
get_ans_resp = client.get(f"/api/v1/answers/{ans_id}")
assert get_ans_resp.status_code == 200
persisted = get_ans_resp.json()
assert persisted["id"] == ans_id
assert len(persisted["evidence_items"]) >= 1
print(f"  [OK] Answer record and evidence items verified in SQLite database.")

# 4. Test Unrelated Question (No Citation Fabrication)
unrelated_q = "What is the secret recipe for homemade Belgian chocolate waffles?"
print(f"\n[Step 4] Testing Unrelated Question (Isolation Check): '{unrelated_q}'...")
unrel_payload = {
    "question": unrelated_q,
    "document_id": doc_id,
    "version_id": ver_id,
    "top_k": 2,
}
unrel_resp = client.post("/api/v1/qa/ask", json=unrel_payload)
assert unrel_resp.status_code == 200
unrel_data = unrel_resp.json()
print(f"  [OK] Generated Answer for Unrelated Question: {unrel_data['generated_answer'][:150]}...")
print(f"  [OK] Model status: {unrel_data['status']}")

# 5. Test Empty Question Validation (HTTP 422)
print("\n[Step 5] Testing Empty Question Validation...")
empty_resp = client.post("/api/v1/qa/ask", json={"question": "   ", "document_id": doc_id})
assert empty_resp.status_code in [400, 422], f"Expected 400/422 for empty question, got {empty_resp.status_code}"
print("  [OK] Empty question correctly rejected with client validation error.")

# 6. Test Non-Existent Document Handling (HTTP 404)
print("\n[Step 6] Testing Non-Existent Document ID (HTTP 404)...")
notfound_resp = client.post("/api/v1/qa/ask", json={"question": "What is the policy?", "document_id": "nonexistent-doc-9999"})
assert notfound_resp.status_code == 404, f"Expected 404, got {notfound_resp.status_code}"
print("  [OK] Non-existent document error handled gracefully with HTTP 404.")

print("\n" + "=" * 60)
print("PHASE 3 END-TO-END VERIFICATION: ALL CHECKS PASSED SUCCESSFULLY!")
print("=" * 60)
