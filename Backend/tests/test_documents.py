import io
import pytest
import pymupdf
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import init_db
from app.core.config import settings


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def make_pdf_bytes(text: str = "Corporate policy reimbursement deadline is 30 days.") -> bytes:
    """Creates in-memory valid PDF bytes with embedded text using PyMuPDF."""
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 100), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def make_empty_pdf_bytes() -> bytes:
    """Creates in-memory PDF page with no text (simulates blank or image-only scan)."""
    doc = pymupdf.open()
    doc.new_page()  # blank page
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_upload_valid_txt_file(client: TestClient):
    """Test uploading a valid TXT document creates version 1."""
    txt_content = b"All expense claims must be filed within 30 days of purchase.\nParagraph two details."
    files = {"file": ("travel_policy.txt", io.BytesIO(txt_content), "text/plain")}
    data = {"document_name": "Travel Expense Policy"}

    response = client.post("/api/v1/documents/upload", files=files, data=data)
    assert response.status_code == 201
    res = response.json()

    assert res["status"] == "created"
    assert res["is_duplicate"] is False
    assert res["document"]["name"] == "Travel Expense Policy"
    assert res["version"]["version_number"] == 1
    assert len(res["version"]["file_hash"]) == 64  # SHA-256 length
    assert res["version"]["page_count"] == 1

    doc_id = res["document"]["id"]
    version_id = res["version"]["id"]

    # Verify extracted text route
    text_resp = client.get(f"/api/v1/documents/{doc_id}/versions/{version_id}/text")
    assert text_resp.status_code == 200
    assert "within 30 days of purchase" in text_resp.json()["full_text"]


def test_upload_valid_pdf_file(client: TestClient):
    """Test uploading a valid PDF document extracts text properly."""
    pdf_bytes = make_pdf_bytes("Sovereign Black Ice standard operating procedure. Page 1 content.")
    files = {"file": ("sop.pdf", io.BytesIO(pdf_bytes), "application/pdf")}

    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 201
    res = response.json()

    assert res["status"] == "created"
    assert res["version"]["version_number"] == 1
    assert res["version"]["page_count"] == 1

    doc_id = res["document"]["id"]
    version_id = res["version"]["id"]

    # Check extracted text
    text_resp = client.get(f"/api/v1/documents/{doc_id}/versions/{version_id}/text")
    assert text_resp.status_code == 200
    assert "standard operating procedure" in text_resp.json()["full_text"]


def test_reject_unsupported_file_extension(client: TestClient):
    """Test that unsupported formats (e.g. .docx, .exe) are rejected with 400 Bad Request."""
    files = {"file": ("unsupported.exe", io.BytesIO(b"binary content"), "application/octet-stream")}
    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 400
    res = response.json()
    assert res["error"]["code"] == "INVALID_FILE"
    assert "Unsupported file format" in res["error"]["message"]


def test_reject_empty_or_image_only_pdf(client: TestClient):
    """Test that blank or image-only PDFs without readable text are rejected with 422."""
    empty_pdf = make_empty_pdf_bytes()
    files = {"file": ("blank_scan.pdf", io.BytesIO(empty_pdf), "application/pdf")}

    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 422
    res = response.json()
    assert res["error"]["code"] == "DOCUMENT_PROCESSING_FAILED"
    assert "contains no readable text" in res["error"]["message"]


def test_reject_oversized_file(client: TestClient, monkeypatch):
    """Test that uploads exceeding MAX_UPLOAD_SIZE_MB are rejected."""
    # Temporarily set max upload limit to 1 KB for test
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 0.001)  # ~1000 bytes
    large_content = b"A" * 2048
    files = {"file": ("large_file.txt", io.BytesIO(large_content), "text/plain")}

    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 400
    res = response.json()
    assert res["error"]["code"] == "INVALID_FILE"
    assert "exceeds maximum allowed limit" in res["error"]["message"]


def test_list_and_get_document(client: TestClient):
    """Test listing documents and fetching by ID."""
    # Upload a document
    txt_content = b"Content for listing test."
    files = {"file": ("list_test.txt", io.BytesIO(txt_content), "text/plain")}
    up_resp = client.post("/api/v1/documents/upload", files=files)
    doc_id = up_resp.json()["document"]["id"]

    # List documents
    list_resp = client.get("/api/v1/documents")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] >= 1
    found = any(d["id"] == doc_id for d in data["documents"])
    assert found is True

    # Get single document
    get_resp = client.get(f"/api/v1/documents/{doc_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == doc_id
    assert get_resp.json()["latest_version"]["version_number"] == 1


def test_delete_document(client: TestClient):
    """Test deleting a document removes it and its versions."""
    txt_content = b"Content to delete."
    files = {"file": ("delete_me.txt", io.BytesIO(txt_content), "text/plain")}
    up_resp = client.post("/api/v1/documents/upload", files=files)
    doc_id = up_resp.json()["document"]["id"]

    # Delete
    del_resp = client.delete(f"/api/v1/documents/{doc_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "deleted"

    # Verify not found now
    get_resp = client.get(f"/api/v1/documents/{doc_id}")
    assert get_resp.status_code == 404
