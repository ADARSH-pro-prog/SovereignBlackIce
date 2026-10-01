"""
Pytest configuration and shared fixtures for Sovereign Black Ice.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import init_db
from app.api.dependencies import get_current_user
from app.database.models import User


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database schema is created before tests run."""
    init_db()


@pytest.fixture(autouse=True)
def mock_current_user():
    """
    Default autouse fixture that mocks get_current_user for integration test suites.
    Individual auth tests can remove this override via:
    app.dependency_overrides.pop(get_current_user, None)
    """
    dummy_user = User(
        id="test-operator-id",
        google_sub="test-google-sub-mock",
        email="operator@sovereignblackice.internal",
        name="Test Operator",
    )
    app.dependency_overrides[get_current_user] = lambda: dummy_user
    yield dummy_user
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def client():
    """Provides a TestClient instance for testing routes."""
    with TestClient(app) as test_client:
        yield test_client
