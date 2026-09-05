from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import random
import time

router = APIRouter(prefix="/contextual", tags=["Contextual Payments"])


class Offer(BaseModel):
    id: str
    type: str
    title: str
    description: str
    value: str
    max_discount: Optional[str] = None
    min_amount: Optional[int] = None
    valid_until: Optional[str] = None


class EMIOption(BaseModel):
    tenure_months: int
    interest_rate: float
    monthly_installment: float
    total_payable: float
    bank: str
    processing_fee: Optional[float] = None


class FraudSignal(BaseModel):
    score: float
    level: str
    factors: List[str]
    recommendation: str


class LoyaltyReward(BaseModel):
    type: str
    value: str
    description: str
    expires_at: Optional[str] = None


class ContextualResponse(BaseModel):
    offers: List[Offer]
    emi_options: List[EMIOption]
    fraud_signals: FraudSignal
    loyalty_rewards: List[LoyaltyReward]
    contextual_insights: Dict[str, Any]
    generated_at: float


# Mock data generators for realistic contextual intelligence
def generate_offers(amount: int, currency: str, merchant: str) -> List[Offer]:
    offers = []
    
    # Amount-based offers
    if amount >= 50000:  # 500 INR+
        offers.append(Offer(
            id=f"offer_amt_{random.randint(1000,9999)}",
            type="instant_discount",
            title="High Value Discount",
            description=f"Flat 10% off on orders above ₹500",
            value="10%",
            max_discount="₹1,000",
            min_amount=50000
        ))
    
    if amount >= 100000:  # 1000 INR+
        offers.append(Offer(
            id=f"offer_amt_{random.randint(1000,9999)}",
            type="volume_discount",
            title="Bulk Order Savings",
            description="Additional 5% off on orders above ₹1,000",
            value="5%",
            max_discount="₹2,500",
            min_amount=100000
        ))
    
    # First-time user offer
    offers.append(Offer(
        id=f"offer_ftu_{random.randint(1000,9999)}",
        type="first_transaction",
        title="Welcome Offer",
        description="Extra 5% off on your first transaction",
        value="5%",
        max_discount="₹500",
        min_amount=10000
    ))
    
    # Velocity-based offer
    offers.append(Offer(
        id=f"offer_vel_{random.randint(1000,9999)}",
        type="velocity",
        title="Loyalty Bonus",
        description="Complete 3 transactions this month for extra 3% cashback",
        value="3% cashback",
        max_discount="₹300"
    ))
    
    return offers


def generate_emi_options(amount: int, currency: str, issuer_bank: str = None) -> List[EMIOption]:
    base_amount = amount / 100  # Convert from paise
    
    banks = ["HDFC Bank", "ICICI Bank", "Axis Bank", "SBI", "Kotak Mahindra", "Yes Bank"]
    if issuer_bank and issuer_bank in banks:
        banks = [issuer_bank] + [b for b in banks if b != issuer_bank]
    
    emi_options = []
    tenures = [3, 6, 9, 12, 18, 24]
    
    for tenure in tenures:
        bank = random.choice(banks)
        # Interest rates vary by bank and tenure
        base_rate = 13.5 + (tenure * 0.3) + random.uniform(-1.5, 1.5)
        rate = round(max(10.5, min(18.0, base_rate)), 1)
        
        # Calculate EMI
        monthly_rate = rate / 12 / 100
        if monthly_rate > 0:
            emi = base_amount * monthly_rate * (1 + monthly_rate)**tenure / ((1 + monthly_rate)**tenure - 1)
        else:
            emi = base_amount / tenure
        
        total = emi * tenure
        processing_fee = round(base_amount * 0.01, 2)
        
        emi_options.append(EMIOption(
            tenure_months=tenure,
            interest_rate=rate,
            monthly_installment=round(emi, 2),
            total_payable=round(total + processing_fee, 2),
            bank=bank,
            processing_fee=processing_fee
        ))
    
    # Add no-cost EMI for specific amounts/banks
    if base_amount >= 5000:
        emi_options.insert(0, EMIOption(
            tenure_months=3,
            interest_rate=0.0,
            monthly_installment=round(base_amount / 3, 2),
            total_payable=base_amount,
            bank="HDFC Bank",
            processing_fee=0.0
        ))
        emi_options.insert(1, EMIOption(
            tenure_months=6,
            interest_rate=0.0,
            monthly_installment=round(base_amount / 6, 2),
            total_payable=base_amount,
            bank="ICICI Bank",
            processing_fee=0.0
        ))
    
    return emi_options[:6]  # Return top 6 options


def generate_fraud_signals(amount: int, buyer_country: str, buyer_token: str) -> FraudSignal:
    # Simulate fraud scoring based on various factors
    base_score = 0.05  # Low base risk
    
    factors = []
    score = base_score
    
    # High amount check
    if amount > 500000:  # 5000 INR+
        score += 0.15
        factors.append("High transaction amount")
    
    # Cross-border check
    if buyer_country not in ["IN", "US", "GB", "SG", "AE"]:
        score += 0.20
        factors.append("High-risk country")
    
    # New buyer check (simulated)
    if "new" in buyer_token.lower() or random.random() < 0.1:
        score += 0.25
        factors.append("New buyer pattern detected")
    
    # Velocity check (simulated)
    if random.random() < 0.05:
        score += 0.30
        factors.append("High velocity transaction pattern")
    
    score = min(score, 0.95)
    
    if score < 0.3:
        level = "Low"
        recommendation = "Approve - Standard processing"
    elif score < 0.6:
        level = "Medium"
        recommendation = "Approve with additional verification"
    elif score < 0.8:
        level = "High"
        recommendation = "Challenge - Require 2FA/OTP"
    else:
        level = "Critical"
        recommendation = "Block - Manual review required"
    
    return FraudSignal(
        score=round(score, 2),
        level=level,
        factors=factors if factors else ["No risk factors detected"],
        recommendation=recommendation
    )


def generate_loyalty_rewards(buyer_token: str) -> List[LoyaltyReward]:
    rewards = []
    
    # Razorpay Coins
    coins = random.randint(100, 5000)
    rewards.append(LoyaltyReward(
        type="razorpay_coins",
        value=f"{coins} Coins",
        description=f"Earn {coins} Razorpay Coins on this transaction",
        expires_at="2026-12-31"
    ))
    
    # Cashback
    if random.random() < 0.3:
        cashback = random.randint(50, 500)
        rewards.append(LoyaltyReward(
            type="cashback",
            value=f"₹{cashback}",
            description=f"Instant ₹{cashback} cashback to wallet",
            expires_at="2026-11-30"
        ))
    
    # Brand vouchers
    brands = ["Amazon", "Flipkart", "Blinkit", "Swiggy", "Zomato"]
    brand = random.choice(brands)
    voucher_value = random.randint(100, 1000)
    rewards.append(LoyaltyReward(
        type="brand_voucher",
        value=f"₹{voucher_value} {brand} Voucher",
        description=f"Redeemable on {brand} app/website",
        expires_at="2026-12-15"
    ))
    
    return rewards


def generate_contextual_insights(amount: int, currency: str, purpose_code: str, buyer_country: str) -> Dict[str, Any]:
    insights = {
        "payment_intelligence": {
            "recommended_rail": "upi" if amount < 200000 else "card",
            "optimal_timing": "Instant" if amount < 200000 else "2-4 hours",
            "success_probability": 0.985 if amount < 200000 else 0.925,
        },
        "merchant_intelligence": {
            "preferred_currency": currency,
            "settlement_cycle": "T+1" if purpose_code.startswith("P0") else "T+2",
            "compliance_status": "Compliant" if purpose_code.startswith("P0") else "Review Required"
        },
        "buyer_intelligence": {
            "country": buyer_country,
            "preferred_payment_method": "upi" if buyer_country == "IN" else "card",
            "kyc_status": "Verified",
            "risk_profile": "Low"
        },
        "regulatory": {
            "purpose_code": purpose_code,
            "rbi_compliant": purpose_code.startswith("P0"),
            "reporting_required": purpose_code in ["P0802", "P1005", "P1006"],
            "settlement_timeline": "T+1 (RBI mandate for exports)"
        }
    }
    return insights


@router.get("/enrich", response_model=ContextualResponse)
async def enrich_payment_context(
    amount: int = Query(..., description="Amount in smallest currency unit (paise/cents)"),
    currency: str = Query("INR", description="Currency code"),
    purpose_code: str = Query("P0802", description="RBI Purpose Code"),
    merchant: str = Query("razorpay", description="Merchant identifier"),
    buyer_country: str = Query("US", description="Buyer's country code"),
    buyer_token: str = Query("ai-bot-default", description="Buyer identifier"),
    issuer_bank: Optional[str] = Query(None, description="Issuer bank for EMI options")
):
    """
    Get contextual intelligence for a payment - aligned with Razorpay Contextual Payments on UPI
    Returns real-time offers, EMI options, fraud signals, and loyalty rewards
    """
    start_time = time.time()
    
    offers = generate_offers(amount, currency, merchant)
    emi_options = generate_emi_options(amount, currency, issuer_bank)
    fraud_signals = generate_fraud_signals(amount, buyer_country, f"buyer_{buyer_token}")
    loyalty_rewards = generate_loyalty_rewards(f"buyer_{buyer_token}")
    contextual_insights = generate_contextual_insights(amount, currency, purpose_code, buyer_country)
    
    processing_time = int((time.time() - start_time) * 1000)
    
    return ContextualResponse(
        offers=offers,
        emi_options=emi_options,
        fraud_signals=fraud_signals,
        loyalty_rewards=loyalty_rewards,
        contextual_insights={
            **contextual_insights,
            "processing_time_ms": processing_time,
            "version": "1.0.0",
            "source": "nexus-agent-contextual-intelligence"
        },
        generated_at=time.time()
    )


@router.get("/offers")
async def get_offers(
    amount: int = Query(...),
    currency: str = Query("INR"),
    merchant: str = Query("razorpay")
):
    """Get available offers for amount"""
    return {"offers": generate_offers(amount, currency, merchant)}


@router.get("/emi-options")
async def get_emi_options(
    amount: int = Query(...),
    currency: str = Query("INR"),
    issuer_bank: Optional[str] = Query(None)
):
    """Get EMI options for amount"""
    return {"emi_options": generate_emi_options(amount, currency, issuer_bank)}


@router.get("/fraud-check")
async def fraud_check(
    amount: int = Query(...),
    buyer_country: str = Query("US"),
    buyer_token: str = Query("unknown")
):
    """Quick fraud risk check"""
    return generate_fraud_signals(amount, buyer_country, buyer_token)


@router.get("/loyalty-rewards")
async def loyalty_rewards(
    buyer_token: str = Query("unknown")
):
    """Get loyalty rewards for buyer"""
    return {"rewards": generate_loyalty_rewards(buyer_token)}