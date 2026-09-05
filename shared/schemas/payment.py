from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime


class TransactionIntent(BaseModel):
    """Incoming transaction request from frontend or AI agent"""
    transaction_id: str = Field(..., description="Unique transaction identifier")
    amount_usd: float = Field(..., gt=0, description="Amount in USD (will be converted to cents)")
    buyer_signature_token: str = Field(..., description="Cryptographic token from buyer/agent")
    buyer_country: str = Field(default="US", description="Buyer's country code")
    purpose_code: str = Field(default="P0802", description="RBI Purpose Code for cross-border payment")
    network_node_integrity: bool = Field(default=True, description="Primary gateway health status")
    metadata: Optional[dict] = Field(default=None, description="Additional context")


class CheckoutResponse(BaseModel):
    """Response from checkout orchestrator"""
    status: Literal[
        "PENDING_HUMAN_APPROVAL",
        "RECOVERY_ROUTED_SUCCESS",
        "SUCCESS",
        "FAILED"
    ]
    message: str
    payload_context: Optional[dict] = None
    nexus_order_id: Optional[str] = None
    audit_log: Optional[str] = None
    mitigation_target: Optional[str] = None
    computed_cents: Optional[int] = None
    timestamp: float


class GatewayHealthCheck(BaseModel):
    """Health status of payment gateway"""
    gateway_id: str
    is_healthy: bool
    latency_ms: Optional[int] = None
    error_rate: Optional[float] = None
    last_checked: datetime


class WebhookPayload(BaseModel):
    """Razorpay webhook payload structure"""
    event: str
    payload: dict
    signature: Optional[str] = None