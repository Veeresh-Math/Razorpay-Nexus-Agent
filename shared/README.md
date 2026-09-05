# Nexus-Agent Schemas

Shared Pydantic schemas used across the Razorpay Nexus-Agent system for type safety and data validation between FastAPI backend, Celery workers, and potential frontend integrations.

## Overview

This package contains the core data models that define the contracts between different components of the Nexus-Agent system:
- **Payment processing** (Track 01: Agentic Commerce)
- **RBI compliance validation** (Track 01/03/04 overlap)
- **Financial reconciliation** (Track 04: Finance Controller)

By centralizing these schemas, we ensure consistent data structures and validation rules throughout the microservices architecture.

## Installation

Install in development mode from the shared directory:

```bash
pip install -e .
```

Or from the project root:

```bash
pip install -e ./shared
```

The package will be available as `nexus-agent-schemas`.

## Available Schemas

### Payment Schemas (`schemas.payment`)

Used in checkout orchestration, webhook handling, and gateway health monitoring.

| Schema | Description |
|--------|-------------|
| `TransactionIntent` | Incoming transaction request from frontend or AI agent containing payment details |
| `CheckoutResponse` | Response from checkout orchestrator with status, mitigation targets, and audit trails |
| `GatewayHealthCheck` | Health status of payment gateway for circuit breaker functionality |
| `WebhookPayload` | Structure for validating incoming Razorpay webhook events |

### Compliance Schemas (`schemas.compliance`)

Used in RBI compliance validation and invoice auditing workflows.

| Schema | Description |
|--------|-------------|
| `RBILedgerSchema` | RBI-compliant invoice extraction with purpose code mapping and compliance state |
| `ComplianceState` | Enum tracking compliance workflow states (PENDING, APPROVED, REJECTED, FLAGGED) |
| `InvoiceAuditRequest` | Request to audit raw invoice text through the compliance engine |
| `InvoiceAuditResponse` | Response containing extracted compliance record and processing metadata |

### Reconciliation Schemas (`schemas.reconciliation`)

Used in batch financial reconciliation and exception tracking (Track 04).

| Schema | Description |
|--------|-------------|
| `FinancialLineItem` | Single line item for batch reconciliation with expected payment details |
| `VerificationAuditOutput` | Complete batch audit results with accuracy metrics and exception registry |
| `ReconciliationException` | Individual exception record with error classification and narrative |
| `BatchAuditRequest` | Request container for processing a batch of financial line items |
| `BatchAuditResponse` | Response containing audit results and processing timing |

## Usage Examples

### Importing Schemas

```python
# Import all available schemas
from nexus_agent_schemas import (
    TransactionIntent,
    CheckoutResponse,
    GatewayHealthCheck,
    WebhookPayload,
    RBILedgerSchema,
    ComplianceState,
    InvoiceAuditRequest,
    InvoiceAuditResponse,
    FinancialLineItem,
    VerificationAuditOutput,
    ReconciliationException,
    BatchAuditRequest,
    BatchAuditResponse,
)

# Or import by module
from nexus_agent_schemas.schemas.payment import TransactionIntent, CheckoutResponse
from nexus_agent_schemas.schemas.compliance import RBILedgerSchema, ComplianceState
from nexus_agent_schemas.schemas.reconciliation import FinancialLineItem, BatchAuditRequest
```

### Using in FastAPI Endpoints

```python
from fastapi import FastAPI
from nexus_agent_schemas import TransactionIntent, CheckoutResponse

app = FastAPI()

@app.post("/api/v1/checkout")
async def process_checkout(intent: TransactionIntent) -> CheckoutResponse:
    # Process payment intent
    return CheckoutResponse(
        status="PENDING_HUMAN_APPROVAL",
        message="Payment requires human approval",
        timestamp=time.time()
    )
```

### Data Validation

```python
from nexus_agent_schemas import RBILedgerSchema, ComplianceState

# Create and validate a compliance record
compliance_record = RBILedgerSchema(
    invoice_number="INV-2026-001",
    remitter_corporate_name="Global Corp Inc",
    extracted_total_usd=1250.50,
    predicted_rbi_purpose_code="P0802",
    compliance_state=ComplianceState.PENDING_HUMAN_APPROVAL
)

# Access validated fields
print(compliance_record.extracted_total_usd)  # 1250.50
```

## Version Information

- **Package Name**: `nexus-agent-schemas`
- **Current Version**: 1.0.0
- **Python Requirements**: >=3.11
- **Dependencies**:
  - pydantic>=2.0
  - pydantic-settings>=2.0

## Development

When modifying schemas:
1. Update the relevant schema file in `schemas/`
2. Ensure imports are updated in `schemas/__init__.py` if adding new exports
3. Update version in `pyproject.toml` if making breaking changes
4. Run validation tests in services that depend on these schemas

## License

Proprietary - Razorpay AI Buildathon 2026 Submission