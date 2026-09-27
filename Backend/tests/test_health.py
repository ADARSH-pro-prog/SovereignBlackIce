import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from app.main import app
from app.database.database import engine, init_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database schema is created before tests run."""
    init_db()


@pytest.fixture
def client():
    """Provides a TestClient instance for testing routes."""
    with TestClient(app) as test_client:
        yield test_client


def test_root_endpoint(client: TestClient):
    """Test the root welcome route."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "docs_url" in data
    assert data["name"] == "Sovereign Black Ice"


def test_health_endpoints(client: TestClient):
    """Test both /health and /api/v1/health endpoints."""
    # Test root-level /health
    resp_root = client.get("/health")
    assert resp_root.status_code == 200
    data_root = resp_root.json()
    assert data_root["status"] == "ok"
    assert "version" in data_root
    assert "timestamp" in data_root

    # Test /api/v1/health
    resp_v1 = client.get("/api/v1/health")
    assert resp_v1.status_code == 200
    assert resp_v1.json()["status"] == "ok"


def test_system_status_endpoint(client: TestClient):
    """Test /api/v1/system/status returns all subsystems without throwing."""
    response = client.get("/api/v1/system/status")
    assert response.status_code == 200
    data = response.json()

    assert data["app_name"] == "Sovereign Black Ice"
    assert "status" in data
    assert data["database"]["status"] == "connected"
    assert data["chromadb"]["status"] == "connected"
    assert data["ollama"]["status"] in ["connected", "disconnected", "warning"]
    assert "configured_models" in data
    assert data["configured_models"]["llm_model"] is not None
    assert data["configured_models"]["embedding_model"] is not None


def test_database_tables_exist():
    """Verify that all core SQLAlchemy tables are created in the database."""
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    expected_tables = [
        "documents",
        "document_versions",
        "claims",
        "claim_changes",
        "evidence_chunks",
        "answers",
        "answer_evidence",
        "alerts",
    ]

    for table in expected_tables:
        assert table in table_names, f"Expected table '{table}' was not found in database tables: {table_names}"
