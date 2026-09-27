import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import init_db
from app.database.models import Claim
from app.services.claim_comparison_service import claim_comparison_service


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_comparison_logic_all_categories():
    """
    Direct unit test for claim_comparison_service verifying:
    - modified (value changed: 30 days -> 15 days)
    - unchanged (identical statement)
    - added (new claim in v2)
    - removed (claim in v1 missing in v2)
    - uncertain (ambiguous rule restructuring requiring human review)
    - exact source reference inclusion
    """
    # Version 1 Claims
    c1_old = Claim(
        id="c1_old",
        document_id="doc1",
        version_id="v1",
        claim_text="Employees can claim reimbursement within 30 days of purchase.",
        subject="Reimbursement Deadline",
        predicate="must be submitted within",
        value="30 days",
        unit="days",
        category="deadline",
        source_location="Page 1, Paragraph 1",
        confidence=0.95,
    )
    c2_old = Claim(
        id="c2_old",
        document_id="doc1",
        version_id="v1",
        claim_text="Annual leave entitlement is 20 days per calendar year.",
        subject="Annual Leave Allowance",
        predicate="is allocated",
        value="20 days",
        unit="days",
        category="policy_rule",
        source_location="Page 1, Paragraph 2",
        confidence=0.95,
    )
    c3_old = Claim(
        id="c3_old",
        document_id="doc1",
        version_id="v1",
        claim_text="Employees may work remotely up to 2 days per week with manager approval.",
        subject="Remote Work Policy",
        predicate="is permitted up to",
        value="2 days per week",
        unit="days",
        category="policy_rule",
        source_location="Page 2, Paragraph 1",
        confidence=0.90,
    )
    c4_old = Claim(
        id="c4_old",
        document_id="doc1",
        version_id="v1",
        claim_text="Smoking is permitted in designated outdoor zones.",
        subject="Smoking Policy",
        predicate="is permitted in",
        value="designated outdoor zones",
        unit=None,
        category="policy_rule",
        source_location="Page 3, Paragraph 4",
        confidence=0.90,
    )

    # Version 2 Claims
    c1_new = Claim(
        id="c1_new",
        document_id="doc1",
        version_id="v2",
        claim_text="Employees can claim reimbursement within 15 days of purchase.",
        subject="Reimbursement Deadline",
        predicate="must be submitted within",
        value="15 days",  # MODIFIED: 30 days -> 15 days
        unit="days",
        category="deadline",
        source_location="Page 1, Paragraph 1",
        confidence=0.95,
    )
    c2_new = Claim(
        id="c2_new",
        document_id="doc1",
        version_id="v2",
        claim_text="Annual leave entitlement is 20 days per calendar year.",
        subject="Annual Leave Allowance",
        predicate="is allocated",
        value="20 days",  # UNCHANGED
        unit="days",
        category="policy_rule",
        source_location="Page 1, Paragraph 2",
        confidence=0.95,
    )
    c3_new = Claim(
        id="c3_new",
        document_id="doc1",
        version_id="v2",
        claim_text="Remote work arrangements are subject to quarterly departmental review.",
        subject="Remote Work Policy",
        predicate="is subject to",
        value="quarterly departmental review",  # UNCERTAIN: structurally altered condition
        unit=None,
        category="policy_rule",
        source_location="Page 2, Paragraph 1",
        confidence=0.85,
    )
    c5_new = Claim(
        id="c5_new",
        document_id="doc1",
        version_id="v2",
        claim_text="Travel by personal vehicle is reimbursed at $0.58 per mile.",
        subject="Travel & Mileage Policy",
        predicate="is reimbursed at",
        value="$0.58 per mile",  # ADDED: new claim
        unit="USD",
        category="financial_limit",
        source_location="Page 2, Paragraph 3",
        confidence=0.95,
    )
    # Note: c4_old ("Smoking Policy") is REMOVED in v2

    old_claims = [c1_old, c2_old, c3_old, c4_old]
    new_claims = [c1_new, c2_new, c3_new, c5_new]

    changes = claim_comparison_service.compare_claims_lists(
        old_claims=old_claims,
        new_claims=new_claims,
        document_id="doc1",
        old_version_id="v1",
        new_version_id="v2",
        old_version_number=1,
        new_version_number=2,
    )

    types = [c["change_type"] for c in changes]

    # 1. Assert all required change types are detected
    assert "modified" in types, "Failed to detect modified claim"
    assert "unchanged" in types, "Failed to detect unchanged claim"
    assert "uncertain" in types, "Failed to detect uncertain claim"
    assert "added" in types, "Failed to detect added claim"
    assert "removed" in types, "Failed to detect removed claim"

    # 2. Verify MODIFIED claim details
    mod_change = next(c for c in changes if c["change_type"] == "modified")
    assert mod_change["old_claim_id"] == "c1_old"
    assert mod_change["new_claim_id"] == "c1_new"
    assert mod_change["changed_field"] in ["value", "value_and_unit"]
    assert "30 days" in mod_change["explanation"]
    assert "15 days" in mod_change["explanation"]
    assert mod_change["source_reference_old"] == "Page 1, Paragraph 1"
    assert mod_change["source_reference_new"] == "Page 1, Paragraph 1"

    # 3. Verify UNCHANGED claim details
    unchanged_change = next(c for c in changes if c["change_type"] == "unchanged")
    assert unchanged_change["old_claim_id"] == "c2_old"
    assert unchanged_change["new_claim_id"] == "c2_new"
    assert unchanged_change["human_review_required"] is False
    assert unchanged_change["source_reference_old"] == "Page 1, Paragraph 2"
    assert unchanged_change["source_reference_new"] == "Page 1, Paragraph 2"

    # 4. Verify UNCERTAIN claim details
    uncertain_change = next(c for c in changes if c["change_type"] == "uncertain")
    assert uncertain_change["human_review_required"] is True
    assert "Remote Work" in uncertain_change["explanation"]
    assert uncertain_change["source_reference_old"] == "Page 2, Paragraph 1"
    assert uncertain_change["source_reference_new"] == "Page 2, Paragraph 1"

    # 5. Verify ADDED claim details
    added_change = next(c for c in changes if c["change_type"] == "added")
    assert added_change["old_claim_id"] is None
    assert added_change["new_claim_id"] == "c5_new"
    assert added_change["source_reference_old"] is None
    assert added_change["source_reference_new"] == "Page 2, Paragraph 3"

    # 6. Verify REMOVED claim details
    removed_change = next(c for c in changes if c["change_type"] == "removed")
    assert removed_change["old_claim_id"] == "c4_old"
    assert removed_change["new_claim_id"] is None
    assert removed_change["source_reference_old"] == "Page 3, Paragraph 4"
    assert removed_change["source_reference_new"] is None


def test_version_comparison_endpoints_full_workflow(client: TestClient):
    """
    Integration test via FastAPI REST APIs:
    1. Upload document v1 ("30 days reimbursement").
    2. Upload document v2 ("15 days reimbursement" + "$0.58 per mile").
    3. Call GET /documents/{id}/compare.
    4. Call POST /documents/{id}/compare.
    5. Call GET /documents/{id}/changes to verify historical diff audit trail.
    """
    v1_text = (
        "Expense Reimbursement Policy\n\n"
        "Employees can claim reimbursement within 30 days of purchase.\n\n"
        "Annual leave entitlement is 20 days per calendar year."
    )
    v2_text = (
        "Expense Reimbursement Policy\n\n"
        "Employees can claim reimbursement within 15 days of purchase.\n\n"
        "Annual leave entitlement is 20 days per calendar year.\n\n"
        "Travel by personal car is reimbursed at $0.58 per mile."
    )

    # Step 1: Upload Version 1
    files_v1 = {"file": ("corporate_policy.txt", io.BytesIO(v1_text.encode("utf-8")), "text/plain")}
    res_v1 = client.post("/api/v1/documents/upload", files=files_v1)
    assert res_v1.status_code == 201
    doc_id = res_v1.json()["document"]["id"]
    v1_id = res_v1.json()["version"]["id"]

    # Step 2: Upload Version 2
    files_v2 = {"file": ("corporate_policy.txt", io.BytesIO(v2_text.encode("utf-8")), "text/plain")}
    res_v2 = client.post(f"/api/v1/documents/{doc_id}/versions", files=files_v2)
    assert res_v2.status_code == 201
    v2_id = res_v2.json()["version"]["id"]

    # Step 3: GET /documents/{id}/compare (default comparing latest v2 with v1)
    cmp_resp = client.get(f"/api/v1/documents/{doc_id}/compare")
    assert cmp_resp.status_code == 200
    cmp_data = cmp_resp.json()

    assert cmp_data["document_id"] == doc_id
    assert cmp_data["new_version_number"] == 2
    assert cmp_data["old_version_number"] == 1

    summary = cmp_data["summary"]
    assert summary["modified_count"] >= 1
    assert summary["unchanged_count"] >= 1
    assert summary["added_count"] >= 1

    # Verify changes list contains source references
    for ch in cmp_data["changes"]:
        assert ch["explanation"] != ""
        if ch["change_type"] == "modified":
            assert ch["source_reference_old"] is not None
            assert ch["source_reference_new"] is not None
            assert "value" in ch["changed_field"]

    # Step 4: POST /documents/{id}/compare with explicit version IDs
    post_cmp = client.post(
        f"/api/v1/documents/{doc_id}/compare",
        json={
            "old_version_id": v1_id,
            "new_version_id": v2_id,
            "save_changes": True,
        },
    )
    assert post_cmp.status_code == 200
    assert post_cmp.json()["summary"]["total_new_claims"] >= 3

    # Step 5: GET /documents/{id}/changes
    changes_resp = client.get(f"/api/v1/documents/{doc_id}/changes")
    assert changes_resp.status_code == 200
    history = changes_resp.json()
    assert len(history) >= 3
    change_types = [item["change_type"] for item in history]
    assert "modified" in change_types
    assert "added" in change_types


def test_compare_version_to_itself(client: TestClient):
    """Comparing a version to itself should report all claims as unchanged."""
    text = "Employees can claim reimbursement within 30 days of purchase."
    files = {"file": ("self_compare.txt", io.BytesIO(text.encode("utf-8")), "text/plain")}
    res = client.post("/api/v1/documents/upload", files=files)
    assert res.status_code == 201
    doc_id = res.json()["document"]["id"]
    v1_id = res.json()["version"]["id"]

    cmp_resp = client.get(f"/api/v1/documents/{doc_id}/compare?old_version_id={v1_id}&new_version_id={v1_id}")
    assert cmp_resp.status_code == 200
    data = cmp_resp.json()
    assert data["summary"]["added_count"] == 0
    assert data["summary"]["removed_count"] == 0
    assert data["summary"]["modified_count"] == 0
    assert data["summary"]["unchanged_count"] >= 1
