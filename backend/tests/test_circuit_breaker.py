import pytest
import asyncio
from app.core.circuit_breaker import CircuitBreaker, CircuitBreakerConfig, CircuitState, CircuitBreakerOpenError


@pytest.mark.asyncio
async def test_circuit_breaker_closed_by_default():
    cb = CircuitBreaker("test", CircuitBreakerConfig(failure_threshold=3))
    assert cb.state == CircuitState.CLOSED


@pytest.mark.asyncio
async def test_circuit_breaker_opens_after_threshold():
    cb = CircuitBreaker("test", CircuitBreakerConfig(failure_threshold=3, timeout_seconds=1))

    async def failing_func():
        raise Exception("Simulated failure")

    # Fail 3 times
    for _ in range(3):
        with pytest.raises(Exception):
            await cb.call(failing_func)

    assert cb.state == CircuitState.OPEN


@pytest.mark.asyncio
async def test_circuit_breaker_rejects_when_open():
    cb = CircuitBreaker("test", CircuitBreakerConfig(failure_threshold=2, timeout_seconds=1))

    async def failing_func():
        raise Exception("Simulated failure")

    # Trigger open
    for _ in range(2):
        with pytest.raises(Exception):
            await cb.call(failing_func)

    # Should reject immediately
    with pytest.raises(CircuitBreakerOpenError):
        await cb.call(failing_func)


@pytest.mark.asyncio
async def test_circuit_breaker_half_open_after_timeout():
    cb = CircuitBreaker("test", CircuitBreakerConfig(failure_threshold=2, timeout_seconds=0.1))

    async def failing_func():
        raise Exception("Simulated failure")

    # Trigger open
    for _ in range(2):
        with pytest.raises(Exception):
            await cb.call(failing_func)

    assert cb.state == CircuitState.OPEN

    # Wait for timeout
    await asyncio.sleep(0.2)

    # Next call should go to half-open
    async def success_func():
        return "success"

    result = await cb.call(success_func)
    assert result == "success"
    assert cb.state == CircuitState.HALF_OPEN


@pytest.mark.asyncio
async def test_circuit_breaker_closes_after_successes():
    cb = CircuitBreaker("test", CircuitBreakerConfig(failure_threshold=2, success_threshold=2, timeout_seconds=0.1))

    async def failing_func():
        raise Exception("Simulated failure")

    # Trigger open
    for _ in range(2):
        with pytest.raises(Exception):
            await cb.call(failing_func)

    await asyncio.sleep(0.2)

    # Two successes should close
    async def success_func():
        return "success"

    await cb.call(success_func)
    assert cb.state == CircuitState.HALF_OPEN

    await cb.call(success_func)
    assert cb.state == CircuitState.CLOSED


@pytest.mark.asyncio
async def test_circuit_breaker_stats():
    cb = CircuitBreaker("test", CircuitBreakerConfig(failure_threshold=3))

    async def success_func():
        return "ok"

    async def fail_func():
        raise Exception("fail")

    await cb.call(success_func)
    await cb.call(success_func)

    with pytest.raises(Exception):
        await cb.call(fail_func)

    stats = cb.get_state()
    assert stats["stats"]["total_calls"] == 3
    assert stats["stats"]["successful_calls"] == 2
    assert stats["stats"]["failed_calls"] == 1


def test_circuit_breaker_reset():
    cb = CircuitBreaker("test", CircuitBreakerConfig(failure_threshold=2))

    async def fail_func():
        raise Exception("fail")

    # Trigger failures to open circuit
    for _ in range(2):
        try:
            asyncio.run(cb.call(fail_func))
        except Exception:
            pass

    assert cb.state == CircuitState.OPEN

    cb.reset()
    assert cb.state == CircuitState.CLOSED
    assert cb.stats.total_calls == 0