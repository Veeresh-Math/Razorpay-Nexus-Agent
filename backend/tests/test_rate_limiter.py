import pytest
import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.rate_limiter import TokenBucketRateLimiter


class MockRedis:
    """Mock Redis client for testing"""
    
    def __init__(self):
        self.data = {}
        self.expires = {}
    
    async def hgetall(self, key):
        return self.data.get(key, {})
    
    async def hset(self, key, mapping=None, **kwargs):
        if key not in self.data:
            self.data[key] = {}
        if mapping:
            self.data[key].update(mapping)
        self.data[key].update(kwargs)
        return True
    
    async def expire(self, key, seconds):
        self.expires[key] = seconds
        return True
    
    async def ping(self):
        return True


@pytest.fixture
def mock_redis():
    """Provide a mock Redis client"""
    return MockRedis()


@pytest.mark.asyncio
async def test_token_bucket_allows_initial_requests(mock_redis):
    limiter = TokenBucketRateLimiter(mock_redis, requests_per_window=10, window_seconds=60)

    allowed, state = await limiter.consume("test_key", tokens=1)
    assert allowed is True
    assert state["tokens_remaining"] == 9
    assert state["capacity"] == 10


@pytest.mark.asyncio
async def test_token_bucket_tracks_consumption(mock_redis):
    limiter = TokenBucketRateLimiter(mock_redis, requests_per_window=5, window_seconds=60)

    for i in range(5):
        allowed, state = await limiter.consume("test_key", tokens=1)
        assert allowed is True
        # Allow for tiny refill due to elapsed time
        expected = 4 - i
        assert abs(state["tokens_remaining"] - expected) < 0.01

    # 6th request should be denied
    allowed, state = await limiter.consume("test_key", tokens=1)
    assert allowed is False
    # Allow for tiny refill
    assert state["tokens_remaining"] < 0.01


@pytest.mark.asyncio
async def test_token_bucket_refill_over_time(mock_redis):
    """Test token refill based on elapsed time"""
    limiter = TokenBucketRateLimiter(mock_redis, requests_per_window=10, window_seconds=10)

    # Consume all tokens
    for _ in range(10):
        await limiter.consume("test_key", tokens=1)

    allowed, _ = await limiter.consume("test_key", tokens=1)
    assert allowed is False

    # Simulate time passing by directly manipulating the mock data
    import time
    old_time = time.time() - 5  # 5 seconds ago
    mock_redis.data["ratelimit:test_key"] = {
        "tokens": "0",
        "last_refill": str(old_time),
    }

    # Should have refilled ~5 tokens (5 seconds * 1 token/second)
    allowed, state = await limiter.consume("test_key", tokens=1)
    assert allowed is True
    assert state["tokens_remaining"] >= 4  # Approximately 5 refilled - 1 consumed


@pytest.mark.asyncio
async def test_different_keys_independent(mock_redis):
    limiter = TokenBucketRateLimiter(mock_redis, requests_per_window=2, window_seconds=60)

    # Consume key1
    await limiter.consume("key1", tokens=1)
    await limiter.consume("key1", tokens=1)
    allowed, _ = await limiter.consume("key1", tokens=1)
    assert allowed is False

    # key2 should still have tokens
    allowed, state = await limiter.consume("key2", tokens=1)
    assert allowed is True
    assert state["tokens_remaining"] == 1


@pytest.mark.asyncio
async def test_token_bucket_expires_key(mock_redis):
    limiter = TokenBucketRateLimiter(mock_redis, requests_per_window=10, window_seconds=60)

    await limiter.consume("test_key", tokens=1)

    # Verify expire was called with 2x window
    assert "ratelimit:test_key" in mock_redis.expires
    assert mock_redis.expires["ratelimit:test_key"] == 120