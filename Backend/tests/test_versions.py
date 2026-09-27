import io
import pytest
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


def test_versioning_and_duplicate_detection(client: TestClient):
    """
    Scenario:
    1. Upload policy document (Version 1: "30 days").
    2. Upload the exact same file again -> Duplicate detected, returns unchanged status, no new version.
    3. Upload updated document (Version 2: "15 days") -> Version 2 created.
    4. Upload exact same updated document again -> Duplicate detected against v2.
    5. Revert back to original "30 days" content -> Safe version 3 created, preserving history.
    """
    v1_content = b"Policy: Employees can claim reimbursement within 30 days of purchase."
    v2_content = b"Policy: Employees can claim reimbursement within 15 days of purchase."

    # Step 1: Initial upload -> v1
    files_v1 = {"file": ("reimbursement_policy.txt", io.BytesIO(v1_content), "text/plain")}
    res_v1 = client.post("/api/v1/documents/upload", files=files_v1)
    assert res_v1.status_code == 201
    doc_id = res_v1.json()["document"]["id"]
    v1_id = res_v1.json()["version"]["id"]
    v1_hash = res_v1.json()["version"]["file_hash"]
    assert res_v1.json()["version"]["version_number"] == 1

    # Step 2: Upload identical file to /versions -> Duplicate detected
    dup_files = {"file": ("reimbursement_policy.txt", io.BytesIO(v1_content), "text/plain")}
    res_dup = client.post(f"/api/v1/documents/{doc_id}/versions", files=dup_files)
    assert res_dup.status_code == 200
    dup_data = res_dup.json()
    assert dup_data["status"] == "unchanged"
    assert dup_data["is_duplicate"] is True
    assert dup_data["version"]["version_number"] == 1
    assert dup_data["version"]["file_hash"] == v1_hash
    assert "No duplicate version was created" in dup_data["message"]

    # Step 3: Upload modified content -> Version 2
    files_v2 = {"file": ("reimbursement_policy.txt", io.BytesIO(v2_content), "text/plain")}
    res_v2 = client.post(f"/api/v1/documents/{doc_id}/versions", files=files_v2)
    assert res_v2.status_code == 201
    v2_data = res_v2.json()
    assert v2_data["status"] == "created"
    assert v2_data["is_duplicate"] is False
    assert v2_data["version"]["version_number"] == 2
    v2_id = v2_data["version"]["id"]
    v2_hash = v2_data["version"]["file_hash"]
    assert v2_hash != v1_hash

    # Step 4: Upload identical v2 content again -> Duplicate detected against v2
    dup_v2_files = {"file": ("reimbursement_policy.txt", io.BytesIO(v2_content), "text/plain")}
    res_dup2 = client.post(f"/api/v1/documents/{doc_id}/versions", files=dup_v2_files)
    assert res_dup2.status_code == 200
    assert res_dup2.json()["status"] == "unchanged"
    assert res_dup2.json()["version"]["version_number"] == 2

    # Step 5: Version Reversion - Re-upload v1 content while currently on v2
    files_revert = {"file": ("reimbursement_policy.txt", io.BytesIO(v1_content), "text/plain")}
    res_v3 = client.post(f"/api/v1/documents/{doc_id}/versions", files=files_revert)
    assert res_v3.status_code == 201
    v3_data = res_v3.json()
    assert v3_data["status"] == "created"
    assert v3_data["version"]["version_number"] == 3
    assert v3_data["version"]["file_hash"] == v1_hash  # matches v1 hash
    assert v3_data["is_reversion"] is True
    assert v3_data["reverted_from_version"] == 1
    assert "reversion detected" in v3_data["message"]

    # Step 6: Verify full version history preserves all versions (v3, v2, v1)
    history_resp = client.get(f"/api/v1/documents/{doc_id}/versions")
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert len(history) == 3

    # Check version numbers in history (newest to oldest)
    v_numbers = [item["version_number"] for item in history]
    assert v_numbers == [3, 2, 1]

    # Verify individual extracted texts are preserved intact
    text_v1 = client.get(f"/api/v1/documents/{doc_id}/versions/{v1_id}/text")
    assert text_v1.status_code == 200
    assert "30 days" in text_v1.json()["full_text"]

    text_v2 = client.get(f"/api/v1/documents/{doc_id}/versions/{v2_id}/text")
    assert text_v2.status_code == 200
    assert "15 days" in text_v2.json()["full_text"]


def test_upload_version_to_nonexistent_document(client: TestClient):
    """Test uploading version to a missing document returns 404."""
    files = {"file": ("policy.txt", io.BytesIO(b"some content"), "text/plain")}
    response = client.post("/api/v1/documents/nonexistent-id-1234/versions", files=files)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "DOCUMENT_NOT_FOUND"
