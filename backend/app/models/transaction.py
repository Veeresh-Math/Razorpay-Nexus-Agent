from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON
from datetime import datetime
from app.core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, nullable=False)
    product_name = Column(String, nullable=False)
    product_sku = Column(String)
    buyer_token = Column(String, nullable=False)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String, default="USD")
    status = Column(String, default="PENDING_HUMAN_APPROVAL")
    nexus_order_id = Column(String)
    razorpay_order_id = Column(String)
    mitigation_target = Column(String)
    audit_log = Column(Text)
    payload_context = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
