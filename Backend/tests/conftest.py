"""
Pytest configuration and shared fixtures for Sovereign Black Ice.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import init_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database schema is created before tests run."""
    init_db()


@pytest.fixture
def client():
    """Provides a TestClient instance for testing routes."""
    with TestClient(app) as test_client:
        yield test_client
