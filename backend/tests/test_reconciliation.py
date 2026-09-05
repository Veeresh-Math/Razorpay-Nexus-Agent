import pytest
from fastapi.testclient import TestClient
from app.main import app
from schemas.reconciliation import FinancialLineItem

client = TestClient(app)


def test_reconciliation_perfect_match():
    """Test batch with all matching records"""
    batch = [
        FinancialLineItem(
            invoice_uuid="inv_001",
            target_payment_id="pay_tx_001",
            expected_cents=2500,
            rbi_regulatory_purpose_code="P0802",
        ),
        FinancialLineItem(
            invoice_uuid="inv_002",
            target_payment_id="pay_tx_002",
            expected_cents=1450,
            rbi_regulatory_purpose_code="P0803",
        ),
    ]
    response = client.post("/api/v1/reconciliation/batch-audit", json={"batch_set": [b.model_dump() for b in batch]})
    assert response.status_code == 200
    data = response.json()
    assert data["audit_result"]["system_accuracy_percentage"] == "100.0%"
    assert data["audit_result"]["validated_reconciliations"] == 2
    assert len(data["audit_result"]["honest_exception_registry"]) == 0


def test_reconciliation_missing_webhook():
    """Test batch with missing webhook records"""
    batch = [
        FinancialLineItem(
            invoice_uuid="inv_003",
            target_payment_id="pay_missing_001",
            expected_cents=1000,
            rbi_regulatory_purpose_code="P0802",
        ),
    ]
    response = client.post("/api/v1/reconciliation/batch-audit", json={"batch_set": [b.model_dump() for b in batch]})
    assert response.status_code == 200
    data = response.json()
    assert data["audit_result"]["system_accuracy_percentage"] == "0.0%"
    assert len(data["audit_result"]["honest_exception_registry"]) == 1
    exc = data["audit_result"]["honest_exception_registry"][0]
    assert exc["error_class"] == "MISSING_WEBHOOK_SOURCE_RECORD"


def test_reconciliation_amount_mismatch():
    """Test batch with amount discrepancy"""
    batch = [
        FinancialLineItem(
            invoice_uuid="inv_004",
            target_payment_id="pay_tx_001",  # Expected 2500
            expected_cents=9999,  # Mismatch
            rbi_regulatory_purpose_code="P0802",
        ),
    ]
    response = client.post("/api/v1/reconciliation/batch-audit", json={"batch_set": [b.model_dump() for b in batch]})
    assert response.status_code == 200
    data = response.json()
    assert data["audit_result"]["system_accuracy_percentage"] == "0.0%"
    exc = data["audit_result"]["honest_exception_registry"][0]
    assert exc["error_class"] == "BALANCE_SHEET_DISCREPANCY"
    assert exc["expected_value"] == 9999
    assert exc["actual_value"] == 2500


def test_reconciliation_invalid_purpose_code():
    """Test batch with invalid RBI purpose code"""
    batch = [
        FinancialLineItem(
            invoice_uuid="inv_005",
            target_payment_id="pay_tx_001",
            expected_cents=2500,
            rbi_regulatory_purpose_code="INVALID_CODE",
        ),
    ]
    response = client.post("/api/v1/reconciliation/batch-audit", json={"batch_set": [b.model_dump() for b in batch]})
    assert response.status_code == 200
    data = response.json()
    assert data["audit_result"]["system_accuracy_percentage"] == "0.0%"
    exc = data["audit_result"]["honest_exception_registry"][0]
    assert exc["error_class"] == "COMPLIANCE_CODE_INVALID"


def test_reconciliation_mixed_batch():
    """Test batch with mixed valid and invalid records"""
    batch = [
        FinancialLineItem(invoice_uuid="inv_001", target_payment_id="pay_tx_001", expected_cents=2500, rbi_regulatory_purpose_code="P0802"),
        FinancialLineItem(invoice_uuid="inv_002", target_payment_id="pay_missing", expected_cents=1000, rbi_regulatory_purpose_code="P0802"),
        FinancialLineItem(invoice_uuid="inv_003", target_payment_id="pay_tx_002", expected_cents=9999, rbi_regulatory_purpose_code="P0802"),
        FinancialLineItem(invoice_uuid="inv_004", target_payment_id="pay_tx_003", expected_cents=8900, rbi_regulatory_purpose_code="INVALID"),
    ]
    response = client.post("/api/v1/reconciliation/batch-audit", json={"batch_set": [b.model_dump() for b in batch]})
    assert response.status_code == 200
    data = response.json()
    assert data["audit_result"]["total_records_analyzed"] == 4
    assert data["audit_result"]["validated_reconciliations"] == 1
    assert data["audit_result"]["system_accuracy_percentage"] == "25.0%"
    assert len(data["audit_result"]["honest_exception_registry"]) == 3


def test_generate_test_batch():
    response = client.post("/api/v1/reconciliation/generate-test-batch?count=10")
    assert response.status_code == 200
    data = response.json()
    assert "batch_set" in data
    assert len(data["batch_set"]) == 10


def test_empty_batch_rejected():
    response = client.post("/api/v1/reconciliation/batch-audit", json={"batch_set": []})
    assert response.status_code == 400


def test_oversized_batch_rejected():
    batch = [
        FinancialLineItem(
            invoice_uuid=f"inv_{i}",
            target_payment_id="pay_tx_001",
            expected_cents=1000,
            rbi_regulatory_purpose_code="P0802",
        )
        for i in range(1001)
    ]
    response = client.post("/api/v1/reconciliation/batch-audit", json={"batch_set": [b.model_dump() for b in batch]})
    assert response.status_code == 400