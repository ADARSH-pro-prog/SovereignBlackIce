"""
Tests for Google OAuth Authentication endpoint and flow.
"""
from unittest.mock import patch
from fastapi.testclient import TestClient


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


def test_google_login_success_and_upsert(client: TestClient):
    """Valid Google token creates new user, returns safe fields, and updates on second login."""
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
            # First login: creates user
            res1 = client.post("/api/v1/auth/google", json={"credential": "valid_token_1"})
            assert res1.status_code == 200
            data1 = res1.json()
            assert data1["message"] == "Google login successful"
            user1 = data1["user"]
            assert user1["email"] == "analyst@sovereignblackice.internal"
            assert user1["name"] == "Black Ice Operator"
            assert user1["picture"] == "https://example.com/avatar.png"
            assert "id" in user1
            # Ensure google_sub is NOT leaked to frontend
            assert "google_sub" not in user1

            # Second login: updates user and keeps same ID
            mock_payload_updated = {
                **mock_payload,
                "name": "Black Ice Senior Operator",
            }
            with patch("app.api.routes.auth.id_token.verify_oauth2_token", return_value=mock_payload_updated):
                res2 = client.post("/api/v1/auth/google", json={"credential": "valid_token_2"})
                assert res2.status_code == 200
                data2 = res2.json()
                user2 = data2["user"]
                assert user2["id"] == user1["id"]
                assert user2["name"] == "Black Ice Senior Operator"


def test_logout_endpoint(client: TestClient):
    """Logout endpoint acknowledges request."""
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"
