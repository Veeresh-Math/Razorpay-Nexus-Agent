from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class ReconciliationException(BaseModel):
    """Individual exception in reconciliation"""
    invoice_uuid: str
    error_class: str = Field(..., description="Exception category")
    narrative: str = Field(..., description="Human-readable description")
    expected_value: Optional[int] = None
    actual_value: Optional[int] = None
    field_name: Optional[str] = None


class FinancialLineItem(BaseModel):
    """Single line item for batch reconciliation"""
    invoice_uuid: str = Field(..., description="Unique invoice identifier")
    target_payment_id: str = Field(..., description="Payment ID to match against webhook")
    expected_cents: int = Field(..., description="Expected amount in cents")
    rbi_regulatory_purpose_code: str = Field(..., description="RBI purpose code (must start with P0)")


class VerificationAuditOutput(BaseModel):
    """Complete batch audit result"""
    total_records_analyzed: int
    validated_reconciliations: int
    system_accuracy_percentage: str
    honest_exception_registry: List[ReconciliationException]
    processed_at: Optional[str] = None


class BatchAuditRequest(BaseModel):
    """Request to process a batch of financial line items"""
    batch_set: List[FinancialLineItem]


class BatchAuditResponse(BaseModel):
    """Response from batch audit"""
    audit_result: VerificationAuditOutput
    processing_time_ms: int