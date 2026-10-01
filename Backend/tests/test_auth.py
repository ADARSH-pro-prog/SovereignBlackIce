"""
Tests for Google OAuth Authentication endpoint and flow,
application JWT session issuance, and route protection.
"""
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.api.dependencies import get_current_user
from app.core.security import create_access_token


def test_google_login_missing_credential(client: TestClient):
    """Calling /api/v1/auth/google with empty credential returns 400."""
    response = client.post("/api/v1/auth/google", json={"credential": ""})
    assert response.status_code == 400
    assert "required" in response.json()["detail"].lower()


def test_google_login_invalid_credential(client: TestClient):
    """Calling /api/v1/auth/google with an invalid credential returns 401."""
    response = client.post("/api/v1/auth/google", json={"credential": "invalid_fake_token"})
    assert response.status_code == 401
    assert "Invalid Google authentication token" in response.json()["detail"]


def test_google_login_unverified_email(client: TestClient):
    """Google user with unverified email should be rejected with 401."""
    mock_payload = {
        "sub": "mock_google_sub_12345",
        "email": "unverified@example.com",
        "email_verified": False,
        "name": "Unverified User",
        "picture": "https://example.com/photo.jpg",
        "aud": "mock_client_id",
    }
    with patch("app.api.routes.auth.id_token.verify_oauth2_token", return_value=mock_payload):
        with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "mock_client_id"):
            response = client.post("/api/v1/auth/google", json={"credential": "mock_token"})
            assert response.status_code == 401
            assert "verified" in response.json()["detail"].lower()


def test_google_login_success_and_jwt_generation(client: TestClient):
    """Valid Google token creates new user, returns JWT access_token, safe fields, and updates on second login."""
    mock_payload = {
        "sub": "mock_google_sub_unique_9999",
        "email": "analyst@sovereignblackice.internal",
        "email_verified": True,
        "name": "Black Ice Operator",
        "picture": "https://example.com/avatar.png",
        "aud": "mock_client_id",
    }

    with patch("app.api.routes.auth.id_token.verify_oauth2_token", return_value=mock_payload):
        with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "mock_client_id"):
            # First login: creates user and issues JWT
            res1 = client.post("/api/v1/auth/google", json={"credential": "valid_token_1"})
            assert res1.status_code == 200
            data1 = res1.json()
            assert data1["message"] == "Google login successful"
            assert "access_token" in data1
            assert data1["token_type"] == "bearer"
            assert len(data1["access_token"]) > 20

            user1 = data1["user"]
            assert user1["email"] == "analyst@sovereignblackice.internal"
            assert user1["name"] == "Black Ice Operator"
            assert user1["picture"] == "https://example.com/avatar.png"
            assert "id" in user1
            # Ensure google_sub is NOT leaked to frontend
            assert "google_sub" not in user1

            # Second login: updates user, returns updated info and new token
            mock_payload_updated = {
                **mock_payload,
                "name": "Black Ice Senior Operator",
            }
            with patch("app.api.routes.auth.id_token.verify_oauth2_token", return_value=mock_payload_updated):
                res2 = client.post("/api/v1/auth/google", json={"credential": "valid_token_2"})
                assert res2.status_code == 200
                data2 = res2.json()
                assert "access_token" in data2
                user2 = data2["user"]
                assert user2["id"] == user1["id"]
                assert user2["name"] == "Black Ice Senior Operator"


def test_logout_endpoint(client: TestClient):
    """Logout endpoint acknowledges request."""
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"


def test_protected_routes_require_authentication(client: TestClient):
    """Unauthenticated requests to business endpoints must return 401."""
    # Temporarily remove dependency override to test raw unauthenticated requests
    override = app.dependency_overrides.pop(get_current_user, None)
    try:
        # Business endpoints require authentication
        res_docs = client.get("/api/v1/documents")
        assert res_docs.status_code == 401

        res_claims = client.get("/api/v1/documents/doc-1/claims")
        assert res_claims.status_code == 401

        res_qa = client.post("/api/v1/qa/ask", json={"question": "test"})
        assert res_qa.status_code == 401

        res_alerts = client.get("/api/v1/alerts")
        assert res_alerts.status_code == 401

        res_me = client.get("/api/v1/auth/me")
        assert res_me.status_code == 401

        # Invalid token must also return 401
        res_invalid = client.get(
            "/api/v1/documents",
            headers={"Authorization": "Bearer invalid_token_12345"},
        )
        assert res_invalid.status_code == 401
    finally:
        if override:
            app.dependency_overrides[get_current_user] = override


def test_protected_routes_with_valid_jwt(client: TestClient):
    """Valid JWT Bearer token grants access to protected routes and /api/v1/auth/me."""
    mock_payload = {
        "sub": "mock_google_sub_jwt_test",
        "email": "operator_jwt@sovereignblackice.internal",
        "email_verified": True,
        "name": "JWT Test Operator",
        "picture": "https://example.com/jwt.png",
        "aud": "mock_client_id",
    }

    with patch("app.api.routes.auth.id_token.verify_oauth2_token", return_value=mock_payload):
        with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "mock_client_id"):
            login_res = client.post("/api/v1/auth/google", json={"credential": "token_for_jwt_test"})
            assert login_res.status_code == 200
            token = login_res.json()["access_token"]
            user_id = login_res.json()["user"]["id"]

    # Temporarily remove mock override so real get_current_user verifies the token
    override = app.dependency_overrides.pop(get_current_user, None)
    try:
        headers = {"Authorization": f"Bearer {token}"}

        # Check /api/v1/auth/me
        me_res = client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["id"] == user_id
        assert me_res.json()["email"] == "operator_jwt@sovereignblackice.internal"

        # Check /api/v1/documents
        docs_res = client.get("/api/v1/documents", headers=headers)
        assert docs_res.status_code == 200
    finally:
        if override:
            app.dependency_overrides[get_current_user] = override


def test_public_health_endpoints_remain_accessible(client: TestClient):
    """Health endpoints are public and do not require authentication."""
    # Temporarily remove override
    override = app.dependency_overrides.pop(get_current_user, None)
    try:
        res1 = client.get("/health")
        assert res1.status_code == 200
        assert res1.json()["status"] == "ok"

        res2 = client.get("/api/v1/system/status")
        assert res2.status_code == 200
        assert res2.json()["status"] in ["ok", "ready", "degraded", "online"]
    finally:
        if override:
            app.dependency_overrides[get_current_user] = override


def test_dev_login_in_development_mode(client: TestClient):
    """Dev login returns a valid JWT token that can access protected endpoints."""
    res = client.post("/api/v1/auth/dev-login")
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "analyst@sovereignblackice.internal"

    token = data["access_token"]
    override = app.dependency_overrides.pop(get_current_user, None)
    try:
        me_res = client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "analyst@sovereignblackice.internal"
    finally:
        if override:
            app.dependency_overrides[get_current_user] = override
