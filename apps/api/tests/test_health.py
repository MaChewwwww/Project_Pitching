"""Smoke tests for the application skeleton.

These do not need a database — they check that the app assembles, the error
envelope has the documented shape, and the auth primitives round-trip. The
database-backed tests arrive with the first real module.
"""

from __future__ import annotations

import jwt
import pytest
from fastapi.testclient import TestClient

from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from src.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def test_health_reports_status(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    # No database in the test environment, so "unavailable" is the expected answer.
    # What matters is that /health reports rather than raising (NFR-OBS-004).
    assert body["database"] in {"ok", "unavailable"}


def test_health_is_also_mounted_under_api_v1(client: TestClient) -> None:
    assert client.get("/api/v1/health").status_code == 200


def test_every_response_carries_a_request_id(client: TestClient) -> None:
    response = client.get("/health")
    assert response.headers.get("X-Request-ID")


def test_caller_supplied_request_id_is_echoed(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "trace-me"})
    assert response.headers["X-Request-ID"] == "trace-me"


def test_unknown_route_uses_the_problem_envelope(client: TestClient) -> None:
    body = client.get("/no-such-route").json()
    assert set(body) >= {"type", "title", "status", "detail", "errors"}
    assert body["status"] == 404


def test_openapi_schema_builds(client: TestClient) -> None:
    """`make types` depends on this. A broken schema breaks the frontend contract."""
    schema = client.get("/api/openapi.json").json()
    assert schema["openapi"].startswith("3.")
    assert "/api/v1/health" in schema["paths"]


class TestSecurity:
    def test_password_round_trip(self) -> None:
        hashed = hash_password("correct horse battery staple")
        assert hashed != "correct horse battery staple"
        assert hashed.startswith("$argon2")  # NFR-SEC-001
        assert verify_password("correct horse battery staple", hashed)
        assert not verify_password("wrong", hashed)

    def test_access_token_round_trip(self) -> None:
        token = create_access_token(subject="6f1c8b1e-0000-4000-8000-000000000000", role="bhw")
        payload = decode_token(token)
        assert payload["role"] == "bhw"
        assert payload["type"] == "access"

    def test_access_token_is_rejected_where_a_refresh_token_is_expected(self) -> None:
        token = create_access_token(subject="6f1c8b1e-0000-4000-8000-000000000000", role="head")
        with pytest.raises(jwt.InvalidTokenError):
            decode_token(token, expected_type="refresh")

    def test_refresh_token_plaintext_is_never_the_stored_value(self) -> None:
        plaintext, stored_hash, expires_at = create_refresh_token()
        assert plaintext != stored_hash
        assert hash_refresh_token(plaintext) == stored_hash
        assert expires_at.tzinfo is not None  # TIMESTAMPTZ, never naive
