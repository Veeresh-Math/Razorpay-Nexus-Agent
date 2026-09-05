import time
from typing import Optional
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import get_settings


class MockRedis:
    """Mock Redis client for local development"""
    
    def __init__(self):
        self.data = {}
        self.expires = {}
    
    async def hgetall(self, key: str):
        return self.data.get(key, {})
    
    async def hset(self, key: str, mapping=None, **kwargs):
        if key not in self.data:
            self.data[key] = {}
        if mapping:
            self.data[key].update(mapping)
        self.data[key].update(kwargs)
        return True
    
    async def expire(self, key: str, seconds: int):
        self.expires[key] = seconds
        return True
    
    async def ping(self):
        return True


class TokenBucketRateLimiter:
    """Token bucket rate limiter using Redis (Upstash or Mock)"""
    
    def __init__(self, redis_client, requests_per_window: int, window_seconds: int):
        self.redis = redis_client
        self.capacity = requests_per_window
        self.window_seconds = window_seconds
        self.refill_rate = requests_per_window / window_seconds

    async def consume(self, key: str, tokens: int = 1) -> tuple[bool, dict]:
        """
        Try to consume tokens from the bucket.
        Returns (allowed, bucket_state)
        """
        now = time.time()
        bucket_key = f"ratelimit:{key}"

        # Get current state
        bucket_data = await self.redis.hgetall(bucket_key)

        if not bucket_data:
            # New bucket - start full
            tokens_available = self.capacity
            last_refill = now
        else:
            tokens_available = float(bucket_data.get("tokens", self.capacity))
            last_refill = float(bucket_data.get("last_refill", now))

            # Refill tokens based on time passed
            elapsed = now - last_refill
            refill_amount = elapsed * self.refill_rate
            tokens_available = min(self.capacity, tokens_available + refill_amount)
            last_refill = now

        allowed = tokens_available >= tokens

        if allowed:
            tokens_available -= tokens

        # Save updated state
        await self.redis.hset(bucket_key, mapping={
            "tokens": str(tokens_available),
            "last_refill": str(last_refill),
        })
        # Set expiry to window_seconds * 2 to clean up old keys
        await self.redis.expire(bucket_key, self.window_seconds * 2)

        bucket_state = {
            "tokens_remaining": tokens_available,
            "capacity": self.capacity,
            "refill_rate": self.refill_rate,
            "retry_after": 0 if allowed else (tokens - tokens_available) / self.refill_rate,
        }

        return allowed, bucket_state


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for rate limiting"""
    
    def __init__(self, app, redis_client, requests_per_window: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.limiter = TokenBucketRateLimiter(redis_client, requests_per_window, window_seconds)

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/healthz", "/ready"]:
            return await call_next(request)

        # Use client IP as key (in production, use API key or user ID)
        client_ip = request.client.host if request.client else "unknown"
        key = f"ip:{client_ip}"

        try:
            allowed, bucket_state = await self.limiter.consume(key)
        except Exception as e:
            # If Redis fails, allow request but log error
            print(f"[RATE LIMITER ERROR] {e}")
            return await call_next(request)

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    "X-RateLimit-Limit": str(bucket_state["capacity"]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(bucket_state["retry_after"])),
                    "Retry-After": str(int(bucket_state["retry_after"]) + 1),
                }
            )

        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(bucket_state["capacity"])
        response.headers["X-RateLimit-Remaining"] = str(int(bucket_state["tokens_remaining"]))

        return response


class MockRedis:
    """Mock Redis client for local development"""
    
    def __init__(self):
        self.data = {}
        self.expires = {}
    
    async def hgetall(self, key: str):
        return self.data.get(key, {})
    
    async def hset(self, key: str, mapping=None, **kwargs):
        if key not in self.data:
            self.data[key] = {}
        if mapping:
            self.data[key].update(mapping)
        self.data[key].update(kwargs)
        return True
    
    async def expire(self, key: str, seconds: int):
        self.expires[key] = seconds
        return True
    
    async def ping(self):
        return True


def get_redis_client():
    """Get Redis client - uses MockRedis for local development"""
    settings = get_settings()
    
    # Use mock Redis for local development
    if settings.app_env == "development" or settings.upstash_redis_rest_url in ["http://localhost:6379", "http://redis:6379"]:
        return MockRedis()
    
    # Production: use Upstash Redis
    try:
        from upstash_redis import Redis
        return Redis(
            url=settings.upstash_redis_rest_url,
            token=settings.upstash_redis_rest_token,
        )
    except Exception:
        # Fallback to mock if Upstash fails
        return MockRedis()