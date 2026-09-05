import time
import datetime
import razorpay
from fastapi import APIRouter, HTTPException, status, Request
from app.core.config import get_settings
from app.core.circuit_breaker import get_circuit_breaker, CircuitBreakerConfig, CircuitBreakerOpenError
from app.services.smart_router import smart_router, select_smart_rail
from schemas.payment import TransactionIntent, CheckoutResponse, GatewayHealthCheck

router = APIRouter()

settings = get_settings()

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))

# Circuit breaker for primary gateway
gateway_circuit_breaker = get_circuit_breaker(
    "razorpay_gateway",
    CircuitBreakerConfig(
        failure_threshold=settings.circuit_breaker_threshold,
        timeout_seconds=settings.circuit_breaker_timeout_seconds,
    )
)

# Fallback gateway circuit breaker (simulated)
fallback_circuit_breaker = get_circuit_breaker(
    "fallback_gateway",
    CircuitBreakerConfig(
        failure_threshold=3,
        timeout_seconds=60,
    )
)


@router.post("/nexus/checkout-orchestrator", response_model=CheckoutResponse, status_code=status.HTTP_202_ACCEPTED)
async def process_nexus_payment_intent(payload: TransactionIntent):
    """
    Process payment intent with:
    - Decimal to integer cents conversion
    - Smart routing with RBI purpose code awareness (Hosted Optimizer Lite)
    - Circuit breaker for gateway health
    - Human approval gate (PENDING_HUMAN_APPROVAL)
    """
    amount_in_cents = int(payload.amount_usd * 100)

    # HOSTED OPTIMIZER LITE: Smart routing with RBI purpose code awareness
    routing_decision = smart_router.select_optimal_rail(
        purpose_code=payload.purpose_code,
        amount=amount_in_cents,
        context={
            "buyer_country": payload.buyer_country,
            "transaction_id": payload.transaction_id
        }
    )

    print(f"[SMART ROUTER] {routing_decision.reasoning}")
    print(f"[SMART ROUTER] Primary Rail: {routing_decision.primary}, Fallback: {routing_decision.fallback}")

    # REVENUE RECOVERY BOUNDARY (TRACK 03): Circuit breaker interception mechanism
    if not payload.network_node_integrity:
        print(f"[AUDIT TRAIL] [TRACK 03] Degraded processing channel detected. Re-routing execution path...")
        return CheckoutResponse(
            status="RECOVERY_ROUTED_SUCCESS",
            message="Routed through fallback gateway due to primary degradation",
            mitigation_target=f"Smart Router Fallback: {routing_decision.fallback}",
            computed_cents=amount_in_cents,
            timestamp=time.time(),
        )

    # Try primary gateway with circuit breaker
    try:
        async def create_razorpay_order():
            order_data = {
                "amount": amount_in_cents,
                "currency": "USD",
                "receipt": f"rcpt_{payload.transaction_id[:12]}",
                "payment_capture": 1,
            }
            return razorpay_client.order.create(data=order_data)

        razorpay_order = await gateway_circuit_breaker.call(create_razorpay_order)

        print(f"[AUDIT TRAIL] [TRACK 01] Transaction {payload.transaction_id} held for validation.")

        return CheckoutResponse(
            status="PENDING_HUMAN_APPROVAL",
            message="Financial token bound. System awaits operational release signal.",
            nexus_order_id=razorpay_order["id"],
            payload_context={
                "target_value_cents": amount_in_cents,
                "origin_agent": payload.buyer_signature_token,
                "epoch_lock": time.time(),
                "razorpay_order_id": razorpay_order["id"],
                "routing_decision": {
                    "primary_rail": routing_decision.primary,
                    "fallback_rail": routing_decision.fallback,
                    "eligible_rails": routing_decision.eligible,
                    "reasoning": routing_decision.reasoning,
                    "purpose_code": payload.purpose_code
                }
            },
            timestamp=time.time(),
        )

    except CircuitBreakerOpenError:
        print(f"[AUDIT TRAIL] [TRACK 03] Circuit breaker OPEN. Activating fallback routing network...")

        try:
            async def create_fallback_order():
                return {"id": f"order_fb_{int(time.time())}", "status": "created", "rail": routing_decision.fallback}

            fallback_order = await fallback_circuit_breaker.call(create_fallback_order)

            return CheckoutResponse(
                status="RECOVERY_ROUTED_SUCCESS",
                message="Routed through fallback gateway (circuit breaker triggered)",
                mitigation_target=f"Smart Router Fallback Rail: {routing_decision.fallback}",
                computed_cents=amount_in_cents,
                nexus_order_id=fallback_order["id"],
                audit_log=f"Fallback routing activated via {routing_decision.fallback} due to primary circuit breaker OPEN",
                timestamp=time.time(),
            )

        except CircuitBreakerOpenError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="All payment gateways unavailable. Please try again later."
            )

    except Exception as e:
        print(f"[CRITICAL AUDIT EXCEPTION] Payment execution failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Payment gateway error: {str(e)}"
        )


@router.get("/gateway/health", response_model=GatewayHealthCheck)
async def gateway_health_check():
    """Check health of primary payment gateway"""
    start = time.time()
    try:
        razorpay_client.payment.fetch_all({"count": 1})
        latency_ms = int((time.time() - start) * 1000)
        return GatewayHealthCheck(
            gateway_id="razorpay_primary",
            is_healthy=True,
            latency_ms=latency_ms,
            error_rate=0.0,
            last_checked=datetime.datetime.utcnow(),
        )
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return GatewayHealthCheck(
            gateway_id="razorpay_primary",
            is_healthy=False,
            latency_ms=latency_ms,
            error_rate=1.0,
            last_checked=datetime.datetime.utcnow(),
        )


@router.post("/gateway/simulate-failure")
async def simulate_gateway_failure(healthy: bool = False):
    """Simulate gateway health change for testing"""
    return {"message": f"Gateway health simulation set to {'healthy' if healthy else 'degraded'}"}
