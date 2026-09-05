import pytest
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test environment variables
os.environ.setdefault("RAZORPAY_KEY_ID", "rzp_test_dummy")
os.environ.setdefault("RAZORPAY_KEY_SECRET", "dummy_secret")
os.environ.setdefault("RAZORPAY_WEBHOOK_SECRET", "whsec_dummy")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("UPSTASH_REDIS_REST_URL", "http://localhost:6379")  # Local test placeholder - replace with actual Upstash REST URL in production
os.environ.setdefault("UPSTASH_REDIS_REST_TOKEN", "dummy_token")
os.environ.setdefault("OPENAI_API_KEY", "sk-dummy")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("BACKEND_URL", "http://localhost:8000")


@pytest.fixture(autouse=True)
def reset_singletons():
    """Reset singleton instances between tests"""
    from app.core.config import get_settings
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


# Skip integration tests that require external services
def pytest_configure(config):
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests requiring external services"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )


# Auto-mark integration tests
def pytest_collection_modifyitems(config, items):
    for item in items:
        # Mark tests that use TestClient as integration tests
        if "test_checkout" in item.nodeid or "test_reconciliation" in item.nodeid:
            item.add_marker(pytest.mark.integration)
        elif "test_circuit_breaker" in item.nodeid or "test_rate_limiter" in item.nodeid:
            item.add_marker(pytest.mark.unit)