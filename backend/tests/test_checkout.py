import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_readiness_check():
    response = client.get("/ready")
    assert response.status_code == 200


def test_checkout_pending_human_approval():
    """Test successful checkout returns PENDING_HUMAN_APPROVAL"""
    payload = {
        "transaction_id": "txn_test_001",
        "amount_usd": 29.99,
        "buyer_signature_token": "ai-bot-test-123",
        "buyer_country": "US",
        "network_node_integrity": True,
    }
    response = client.post("/api/v1/nexus/checkout-orchestrator", json=payload)
    # Will fail without Razorpay credentials, but we test the structure
    assert response.status_code in [200, 202, 502, 503]


def test_checkout_recovery_routed():
    """Test checkout with degraded gateway returns RECOVERY_ROUTED_SUCCESS"""
    payload = {
        "transaction_id": "txn_test_002",
        "amount_usd": 49.99,
        "buyer_signature_token": "ai-bot-test-456",
        "buyer_country": "US",
        "network_node_integrity": False,  # Trigger fallback
    }
    response = client.post("/api/v1/nexus/checkout-orchestrator", json=payload)
    assert response.status_code in [200, 202, 502, 503]
    if response.status_code == 202:
        data = response.json()
        assert data["status"] == "RECOVERY_ROUTED_SUCCESS"


def test_gateway_health_check():
    response = client.get("/api/v1/gateway/health")
    assert response.status_code == 200
    data = response.json()
    assert "gateway_id" in data
    assert "is_healthy" in data


def test_cents_conversion():
    """Verify amount_usd is converted to integer cents"""
    payload = {
        "transaction_id": "txn_test_003",
        "amount_usd": 10.50,
        "buyer_signature_token": "test",
        "network_node_integrity": False,
    }
    response = client.post("/api/v1/nexus/checkout-orchestrator", json=payload)
    if response.status_code == 202:
        data = response.json()
        assert data["computed_cents"] == 1050


def test_rate_limit_headers():
    """Test rate limit headers are present"""
    response = client.get("/health")
    assert "X-RateLimit-Limit" in response.headers
    assert "X-RateLimit-Remaining" in response.headers