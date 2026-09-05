import hmac
import hashlib
import json
from fastapi import APIRouter, Request, HTTPException, status, Header, BackgroundTasks
from app.core.config import get_settings
from app.services.compliance import process_invoice_compliance
from app.workers.tasks import queue_compliance_job
from schemas.payment import WebhookPayload

router = APIRouter()

settings = get_settings()


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify Razorpay webhook signature"""
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature)


@router.post("/webhooks/razorpay", status_code=status.HTTP_200_OK)
async def razorpay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_razorpay_signature: str = Header(None),
):
    """
    Handle Razorpay webhooks.
    Acknowledges immediately, processes compliance asynchronously.
    """
    # Get raw body for signature verification
    body = await request.body()

    # Verify signature
    if not x_razorpay_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing webhook signature"
        )

    if not verify_webhook_signature(body, x_razorpay_signature, settings.razorpay_webhook_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature"
        )

    # Parse payload
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload"
        )

    event = payload.get("event")
    payment_data = payload.get("payload", {}).get("payment", {}).get("entity", {})

    print(f"[WEBHOOK] Received event: {event}, Payment ID: {payment_data.get('id')}")

    # Handle order.paid event - trigger compliance processing
    if event == "order.paid":
        payment_id = payment_data.get("id")
        order_id = payment_data.get("order_id")
        amount = payment_data.get("amount")  # In cents
        currency = payment_data.get("currency")

        # Queue compliance job for background processing
        # This returns immediately with 200 OK
        background_tasks.add_task(
            queue_compliance_job,
            payment_id=payment_id,
            order_id=order_id,
            amount_cents=amount,
            currency=currency,
        )

        print(f"[WEBHOOK] Queued compliance job for payment {payment_id}")

    elif event == "payment.captured":
        payment_id = payment_data.get("id")
        print(f"[WEBHOOK] Payment captured: {payment_id}")

    elif event == "payment.failed":
        payment_id = payment_data.get("id")
        error_code = payment_data.get("error_code")
        error_description = payment_data.get("error_description")
        print(f"[WEBHOOK] Payment failed: {payment_id}, Error: {error_code} - {error_description}")

    # Always return 200 OK to acknowledge receipt
    return {"status": "received", "event": event}


@router.post("/webhooks/test", status_code=status.HTTP_200_OK)
async def test_webhook(payload: WebhookPayload):
    """Test endpoint for webhook simulation"""
    print(f"[TEST WEBHOOK] Event: {payload.event}")
    return {"status": "test_received", "event": payload.event}