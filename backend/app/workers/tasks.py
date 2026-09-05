import logging
from celery import shared_task
from app.workers.celery_app import celery_app
from app.services.compliance import process_invoice_compliance_sync

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def queue_compliance_job(
    self,
    payment_id: str,
    order_id: str,
    amount_cents: int,
    currency: str,
    merchant_id: str = "default_merchant",
):
    """
    Background task to process invoice compliance after payment confirmation.
    This is called from the webhook handler.
    """
    logger.info(f"[CELERY] Processing compliance for payment {payment_id}")

    try:
        # In production, fetch invoice text from database/storage
        # For now, simulate with a mock invoice based on payment data
        mock_invoice_text = f"""
        INVOICE
        Invoice Number: INV-{order_id}
        Date: 2026-09-05
        
        Bill To: International Client Corp
        Address: 123 Business Ave, San Francisco, CA 94102, USA
        
        Ship To: Razorpay Merchant India Pvt Ltd
        Address: Bangalore, Karnataka, India
        
        Description: Software Development Services - Q3 2026
        Service Period: July - September 2026
        Amount: ${amount_cents / 100:.2f} {currency}
        
        Total Due: ${amount_cents / 100:.2f} {currency}
        Payment Terms: Net 30
        RBI Purpose Code: P0802 (Software consultancy / IT services)
        """

        # Process compliance
        result = process_invoice_compliance_sync(
            raw_invoice_text=mock_invoice_text,
            merchant_id=merchant_id,
            payment_id=payment_id,
        )

        logger.info(f"[CELERY] Compliance processed for {payment_id}: {result.compliance_record.compliance_state}")

        # In production, save to database and notify merchant for approval
        # save_compliance_record(result.compliance_record, payment_id)
        # send_merchant_notification(merchant_id, payment_id, result.compliance_record)

        return {
            "status": "completed",
            "payment_id": payment_id,
            "compliance_state": result.compliance_record.compliance_state,
            "rbi_purpose_code": result.compliance_record.predicted_rbi_purpose_code,
        }

    except Exception as exc:
        logger.error(f"[CELERY] Compliance job failed for {payment_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task
def batch_reconciliation_task(batch_data: list[dict]):
    """Background task for batch reconciliation"""
    from app.api.v1.reconciliation import process_financial_batch_audit
    from schemas.reconciliation import FinancialLineItem

    items = [FinancialLineItem(**item) for item in batch_data]
    result = process_financial_batch_audit(items)

    return {
        "total_records": result.total_records_analyzed,
        "validated": result.validated_reconciliations,
        "accuracy": result.system_accuracy_percentage,
        "exceptions_count": len(result.honest_exception_registry),
    }


@shared_task
def cleanup_old_rate_limit_keys():
    """Periodic task to clean up old rate limit keys"""
    # In production, use Redis SCAN to find and delete old keys
    logger.info("[CELERY] Running rate limit key cleanup")
    return {"status": "cleanup_completed"}