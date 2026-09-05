from typing import Dict, List, Literal
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

RailType = Literal["upi", "card", "netbanking", "imps", "wallet", "emi"]

# RBI Purpose Code to Eligible Rails Mapping
# Based on RBI PA-CB guidelines for cross-border payments
PURPOSE_CODE_RAILS: Dict[str, List[str]] = {
    "P0802": ["upi", "card", "netbanking", "imps"],      # Software consultancy / IT services
    "P0803": ["card", "netbanking", "imps"],              # Business management consultancy
    "P0804": ["card", "netbanking", "imps"],              # Technical consultancy
    "P1005": ["card", "netbanking", "imps"],              # Export of goods
    "P1006": ["upi", "card", "netbanking", "imps"],       # Export of software
    "P0701": ["card", "netbanking", "imps"],              # Financial services
    "P0702": ["card", "netbanking"],                      # Insurance services
    "P1301": ["card", "netbanking", "imps"],              # Maintenance services
    "P1302": ["card", "netbanking", "imps"],              # Repair services
    "P0801": ["card", "netbanking", "imps"],              # Legal/accounting/management consulting
    "P0101": ["card", "netbanking", "imps"],              # Travel services
    "P0301": ["card", "netbanking"],                      # Education services
    "P0401": ["card", "netbanking"],                      # Medical services
    "P0501": ["card", "netbanking"],                      # Construction services
}

# Rail performance metrics (simulated based on industry data)
RAIL_METRICS = {
    "upi": {"success_rate": 0.985, "cost_bps": 10, "latency_ms": 45, "availability": 0.999},
    "card": {"success_rate": 0.925, "cost_bps": 200, "latency_ms": 180, "availability": 0.995},
    "netbanking": {"success_rate": 0.895, "cost_bps": 100, "latency_ms": 450, "availability": 0.99},
    "imps": {"success_rate": 0.955, "cost_bps": 50, "latency_ms": 90, "availability": 0.998},
    "wallet": {"success_rate": 0.970, "cost_bps": 150, "latency_ms": 60, "availability": 0.997},
    "emi": {"success_rate": 0.880, "cost_bps": 250, "latency_ms": 300, "availability": 0.985},
}

DEFAULT_RAILS = ["card", "netbanking"]


class RoutingDecision(BaseModel):
    primary: str
    fallback: str
    eligible: List[str]
    reasoning: str
    scores: Dict[str, float]


class SmartRouter:
    """Razorpay Hosted Optimizer Lite - Purpose-Code-Aware Smart Routing"""
    
    def __init__(self):
        self.purpose_code_rails = PURPOSE_CODE_RAILS
        self.rail_metrics = RAIL_METRICS
        self.default_rails = DEFAULT_RAILS
    
    def get_eligible_rails(self, purpose_code: str) -> List[str]:
        """Get RBI-compliant eligible rails for a purpose code"""
        return self.purpose_code_rails.get(purpose_code, self.default_rails)
    
    def calculate_rail_score(self, rail: str, amount: int, context: dict = None) -> float:
        """Calculate composite score for a rail"""
        metrics = self.rail_metrics.get(rail, {})
        
        # Weighted scoring: Success (50%) + Cost Efficiency (30%) + Latency (20%)
        success_score = metrics.get("success_rate", 0.9) * 0.50
        
        # Cost efficiency: lower cost = higher score (normalize to bps)
        cost_bps = metrics.get("cost_bps", 200)
        cost_score = (1 / (cost_bps / 100 + 1)) * 0.30
        
        # Latency score: lower latency = higher score
        latency_ms = metrics.get("latency_ms", 200)
        latency_score = (1 / (latency_ms / 100 + 1)) * 0.20
        
        # Amount-based adjustment: UPI better for small amounts, Card for large
        amount_factor = 1.0
        if rail == "upi" and amount > 100000:  # > 1000 INR
            amount_factor = 0.9
        elif rail == "card" and amount > 500000:  # > 5000 INR
            amount_factor = 1.05
        
        return (success_score + cost_score + latency_score) * amount_factor
    
    def select_optimal_rail(
        self, 
        purpose_code: str, 
        amount: int, 
        context: dict = None
    ) -> RoutingDecision:
        """Select optimal rail based on purpose code, amount, and context"""
        eligible = self.get_eligible_rails(purpose_code)
        
        if not eligible:
            eligible = self.default_rails
        
        context = context or {}
        
        # Score each eligible rail
        scores = {}
        for rail in eligible:
            scores[rail] = self.calculate_rail_score(rail, amount, context)
        
        # Sort by score descending
        sorted_rails = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        primary = sorted_rails[0][0]
        fallback = sorted_rails[1][0] if len(sorted_rails) > 1 else primary
        
        # Generate reasoning
        primary_metrics = self.rail_metrics.get(primary, {})
        reasoning = (
            f"RBI Purpose Code {purpose_code} -> Eligible: {', '.join(eligible)}. "
            f"Selected {primary} (Success: {primary_metrics.get('success_rate', 0)*100:.1f}%, "
            f"Cost: {primary_metrics.get('cost_bps', 0)}bps, "
            f"Latency: {primary_metrics.get('latency_ms', 0)}ms). "
            f"Score: {sorted_rails[0][1]:.3f}"
        )
        
        logger.info(f"[SMART ROUTER] {reasoning}")
        
        return RoutingDecision(
            primary=primary,
            fallback=fallback,
            eligible=eligible,
            reasoning=reasoning,
            scores=scores
        )
    
    def get_rail_config(self, rail: str) -> dict:
        """Get configuration for a specific rail"""
        return {
            "rail": rail,
            "metrics": self.rail_metrics.get(rail, {}),
            "eligible_for": [pc for pc, rails in PURPOSE_CODE_RAILS.items() if rail in rails]
        }


# Global instance
smart_router = SmartRouter()


def select_smart_rail(purpose_code: str, amount: int, context: dict = None) -> dict:
    """Convenience function for backward compatibility"""
    decision = smart_router.select_optimal_rail(purpose_code, amount, context)
    return {
        "primary": decision.primary,
        "fallback": decision.fallback,
        "eligible": decision.eligible,
        "reasoning": decision.reasoning,
        "scores": decision.scores
    }