from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum


class ComplianceState(str, Enum):
    PENDING_HUMAN_APPROVAL = "PENDING_HUMAN_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    FLAGGED = "FLAGGED"


class RBILedgerSchema(BaseModel):
    """RBI-compliant invoice extraction schema"""
    invoice_number: str = Field(..., description="Unique merchant document key string")
    remitter_corporate_name: str = Field(..., description="Legal entity name of foreign client")
    extracted_total_usd: float = Field(..., description="Calculated invoice balance value")
    predicted_rbi_purpose_code: str = Field(..., description="RBI Purpose code mapping, e.g., P0802")
    compliance_state: ComplianceState = Field(
        default=ComplianceState.PENDING_HUMAN_APPROVAL,
        description="Current compliance state"
    )
    extracted_at: Optional[str] = Field(default=None, description="ISO timestamp of extraction")
    raw_text_hash: Optional[str] = Field(default=None, description="Hash of source invoice text")


class InvoiceAuditRequest(BaseModel):
    """Request to audit an invoice"""
    raw_invoice_text: str = Field(..., description="Raw text content of invoice")
    merchant_id: str = Field(..., description="Merchant identifier")
    payment_id: Optional[str] = Field(default=None, description="Associated payment ID")


class InvoiceAuditResponse(BaseModel):
    """Response from invoice audit"""
    compliance_record: RBILedgerSchema
    processing_time_ms: int
    model_used: str = "gpt-4o-mini"