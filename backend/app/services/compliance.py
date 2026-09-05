import time
import hashlib
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from app.core.config import get_settings
from schemas.compliance import RBILedgerSchema, InvoiceAuditRequest, InvoiceAuditResponse, ComplianceState

settings = get_settings()

# RBI Purpose Code reference for the LLM
RBI_PURPOSE_CODES = """
Common RBI Purpose Codes for Cross-Border Inward Remittances:
- P0802: Software consultancy / IT services
- P0803: Business management consultancy / PR services
- P0804: Technical consultancy / Engineering services
- P1005: Export of goods (non-software)
- P1006: Export of software
- P0701: Financial services
- P0702: Insurance services
- P1301: Maintenance services
- P1302: Repair services
- P0801: Legal/accounting/management consulting
"""

# LLM Prompt for invoice extraction
INVOICE_EXTRACTION_PROMPT = """You are an expert financial compliance officer specializing in RBI (Reserve Bank of India) cross-border remittance regulations.

Extract structured metadata from the provided invoice text for PA-CB (Payment Aggregator - Cross Border) compliance reporting.

RBI Purpose Codes Reference:
{rbi_codes}

Instructions:
1. Extract the invoice number (unique document identifier)
2. Identify the remitter's legal corporate name (foreign client sending payment)
3. Calculate the total invoice amount in USD
4. Predict the most appropriate RBI Purpose Code based on the service/goods description
5. Return ONLY valid JSON matching the schema

Invoice Text:
{document_context}

{format_instructions}"""


async def extract_invoice_metadata(raw_invoice_text: str) -> RBILedgerSchema:
    """
    Use LangChain + GPT-4o-mini to extract structured invoice metadata
    for RBI compliance reporting.
    """
    parser = JsonOutputParser(pydantic_object=RBILedgerSchema)

    prompt = ChatPromptTemplate.from_template(INVOICE_EXTRACTION_PROMPT)

    model = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.0,
        api_key=settings.openai_api_key,
    )

    chain = prompt | model | parser

    result = await chain.ainvoke({
        "document_context": raw_invoice_text,
        "rbi_codes": RBI_PURPOSE_CODES,
        "format_instructions": parser.get_format_instructions(),
    })

    # Ensure compliance_state is set correctly
    result["compliance_state"] = ComplianceState.PENDING_HUMAN_APPROVAL
    result["extracted_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    result["raw_text_hash"] = hashlib.sha256(raw_invoice_text.encode()).hexdigest()[:16]

    return RBILedgerSchema(**result)


async def process_invoice_compliance(
    raw_invoice_text: str,
    merchant_id: str,
    payment_id: Optional[str] = None,
) -> InvoiceAuditResponse:
    """
    Process invoice through compliance engine.
    Returns structured RBI ledger entry pending human approval.
    """
    start_time = time.time()

    try:
        compliance_record = await extract_invoice_metadata(raw_invoice_text)

        processing_time_ms = int((time.time() - start_time) * 1000)

        return InvoiceAuditResponse(
            compliance_record=compliance_record,
            processing_time_ms=processing_time_ms,
            model_used="gpt-4o-mini",
        )

    except Exception as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        # Return a minimal record on failure for audit trail
        error_record = RBILedgerSchema(
            invoice_number="EXTRACTION_FAILED",
            remitter_corporate_name="UNKNOWN",
            extracted_total_usd=0.0,
            predicted_rbi_purpose_code="P0000",
            compliance_state=ComplianceState.FLAGGED,
            extracted_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            raw_text_hash=hashlib.sha256(raw_invoice_text.encode()).hexdigest()[:16],
        )

        return InvoiceAuditResponse(
            compliance_record=error_record,
            processing_time_ms=processing_time_ms,
            model_used="gpt-4o-mini (failed)",
        )


# Synchronous version for Celery tasks
def process_invoice_compliance_sync(
    raw_invoice_text: str,
    merchant_id: str,
    payment_id: Optional[str] = None,
) -> InvoiceAuditResponse:
    """Synchronous wrapper for Celery worker"""
    import asyncio
    return asyncio.run(process_invoice_compliance(raw_invoice_text, merchant_id, payment_id))