import time
from fastapi import APIRouter, HTTPException, status
from schemas.reconciliation import (
    BatchAuditRequest,
    BatchAuditResponse,
    VerificationAuditOutput,
    ReconciliationException,
    FinancialLineItem,
)

router = APIRouter()

# Mock database store reflecting successful payment webhook inputs processed by Razorpay Network
MOCK_SETTLED_WEBHOOK_REGISTRY = {
    "pay_tx_001": {"captured_amount_cents": 2500, "status": "captured"},
    "pay_tx_002": {"captured_amount_cents": 1450, "status": "captured"},
    "pay_tx_003": {"captured_amount_cents": 8900, "status": "captured"},
    "pay_tx_004": {"captured_amount_cents": 1200, "status": "captured"},
    "pay_tx_005": {"captured_amount_cents": 5500, "status": "captured"},
}


def process_financial_batch_audit(batch_set: list[FinancialLineItem]) -> VerificationAuditOutput:
    """
    Process a batch of financial line items against webhook registry.
    Returns accuracy percentage and honest exception registry.
    """
    successful_matches = 0
    exceptions = []

    for item in batch_set:
        tx_ref = item.target_payment_id

        # EXCEPTION EVALUATION 1: Unlinked transaction source
        if tx_ref not in MOCK_SETTLED_WEBHOOK_REGISTRY:
            exceptions.append(ReconciliationException(
                invoice_uuid=item.invoice_uuid,
                error_class="MISSING_WEBHOOK_SOURCE_RECORD",
                narrative="No matching capture event signature resolved within database tables.",
                field_name="target_payment_id",
            ))
            continue

        webhook_record = MOCK_SETTLED_WEBHOOK_REGISTRY[tx_ref]

        # EXCEPTION EVALUATION 2: Numeric value discrepancy (Decimal drift protection)
        if webhook_record["captured_amount_cents"] != item.expected_cents:
            exceptions.append(ReconciliationException(
                invoice_uuid=item.invoice_uuid,
                error_class="BALANCE_SHEET_DISCREPANCY",
                narrative=f"Webhook recorded {webhook_record['captured_amount_cents']} cents, but invoice expected {item.expected_cents}.",
                expected_value=item.expected_cents,
                actual_value=webhook_record["captured_amount_cents"],
                field_name="expected_cents",
            ))
            continue

        # EXCEPTION EVALUATION 3: Compliance Validation Check (RBI Cross-Border Licencing parameters)
        if not item.rbi_regulatory_purpose_code.startswith("P0"):
            exceptions.append(ReconciliationException(
                invoice_uuid=item.invoice_uuid,
                error_class="COMPLIANCE_CODE_INVALID",
                narrative=f"Purpose indicator code '{item.rbi_regulatory_purpose_code}' fails regulatory taxonomy checks.",
                field_name="rbi_regulatory_purpose_code",
            ))
            continue

        successful_matches += 1

    total_len = len(batch_set)
    accuracy_metric = (successful_matches / total_len) * 100 if total_len > 0 else 0.0

    return VerificationAuditOutput(
        total_records_analyzed=total_len,
        validated_reconciliations=successful_matches,
        system_accuracy_percentage=f"{round(accuracy_metric, 2)}%",
        honest_exception_registry=exceptions,
    )


@router.post("/reconciliation/batch-audit", response_model=BatchAuditResponse, status_code=status.HTTP_200_OK)
async def batch_reconciliation_audit(request: BatchAuditRequest):
    """
    Track 04: Finance Controller - Batch Accounting Reconciliation Engine
    Analyzes financial line sets, computing precise matching accuracy rates
    and compiling honest exception objects for anomalies.
    """
    start_time = time.time()

    if not request.batch_set:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch set cannot be empty"
        )

    if len(request.batch_set) > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch size exceeds maximum of 1000 records"
        )

    audit_result = process_financial_batch_audit(request.batch_set)
    processing_time_ms = int((time.time() - start_time) * 1000)

    return BatchAuditResponse(
        audit_result=audit_result,
        processing_time_ms=processing_time_ms,
    )


@router.get("/reconciliation/mock-registry")
async def get_mock_registry():
    """Get the mock webhook registry for testing"""
    return MOCK_SETTLED_WEBHOOK_REGISTRY


@router.post("/reconciliation/generate-test-batch", response_model=dict)
async def generate_test_batch(count: int = 50):
    """Generate a test batch with deliberate anomalies for demo"""
    import random
    import uuid

    valid_purpose_codes = ["P0802", "P0803", "P0804", "P1005", "P1006"]
    invalid_purpose_codes = ["P9999", "X0001", "INVALID", "P0"]

    payment_ids = list(MOCK_SETTLED_WEBHOOK_REGISTRY.keys())
    batch = []

    for i in range(count):
        # 80% valid, 20% with anomalies
        has_anomaly = random.random() < 0.2

        if has_anomaly and random.random() < 0.5:
            # Missing webhook record
            payment_id = f"pay_missing_{uuid.uuid4().hex[:8]}"
        elif has_anomaly:
            # Amount mismatch
            payment_id = random.choice(payment_ids)
        else:
            payment_id = random.choice(payment_ids)

        purpose_code = random.choice(invalid_purpose_codes) if has_anomaly and random.random() < 0.3 else random.choice(valid_purpose_codes)

        # Get expected amount (or wrong amount for anomaly)
        if payment_id in MOCK_SETTLED_WEBHOOK_REGISTRY and not (has_anomaly and random.random() < 0.5):
            expected_cents = MOCK_SETTLED_WEBHOOK_REGISTRY[payment_id]["captured_amount_cents"]
        else:
            expected_cents = random.randint(100, 10000)

        batch.append(FinancialLineItem(
            invoice_uuid=f"inv_{uuid.uuid4().hex[:12]}",
            target_payment_id=payment_id,
            expected_cents=expected_cents,
            rbi_regulatory_purpose_code=purpose_code,
        ))

    return {"batch_set": batch, "count": len(batch)}