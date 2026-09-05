from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional
import razorpay

from app.core.config import get_settings

router = APIRouter(prefix="/mcp", tags=["MCP Server"])

settings = get_settings()
razorpay_client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


class MCPToolCall(BaseModel):
    name: str
    arguments: Dict[str, Any]


class MCPResponse(BaseModel):
    result: Optional[Any] = None
    error: Optional[str] = None


class MCPTool(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any]


# Razorpay's 35 tools - implementing core 10 for buildathon
MCP_TOOLS = {
    "create_payment_link": MCPTool(
        name="create_payment_link",
        description="Create a Razorpay payment link for collecting payments",
        parameters={
            "type": "object",
            "properties": {
                "amount": {"type": "integer", "description": "Amount in smallest currency unit (paise)"},
                "currency": {"type": "string", "description": "Currency code (INR, USD)", "default": "INR"},
                "description": {"type": "string", "description": "Payment description"},
                "customer": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "email": {"type": "string"},
                        "contact": {"type": "string"}
                    }
                },
                "notify": {"type": "object", "properties": {"sms": {"type": "boolean"}, "email": {"type": "boolean"}}},
                "reminder_enable": {"type": "boolean"},
                "callback_url": {"type": "string"},
                "callback_method": {"type": "string", "enum": ["get", "post"]}
            },
            "required": ["amount", "currency"]
        }
    ),
    "fetch_payment_link": MCPTool(
        name="fetch_payment_link",
        description="Fetch payment link details by ID",
        parameters={
            "type": "object",
            "properties": {
                "payment_link_id": {"type": "string"}
            },
            "required": ["payment_link_id"]
        }
    ),
    "cancel_payment_link": MCPTool(
        name="cancel_payment_link",
        description="Cancel a payment link",
        parameters={
            "type": "object",
            "properties": {
                "payment_link_id": {"type": "string"}
            },
            "required": ["payment_link_id"]
        }
    ),
    "fetch_payment": MCPTool(
        name="fetch_payment",
        description="Fetch payment details by payment ID",
        parameters={
            "type": "object",
            "properties": {
                "payment_id": {"type": "string"}
            },
            "required": ["payment_id"]
        }
    ),
    "create_refund": MCPTool(
        name="create_refund",
        description="Create a refund for a payment",
        parameters={
            "type": "object",
            "properties": {
                "payment_id": {"type": "string"},
                "amount": {"type": "integer", "description": "Refund amount in smallest currency unit"},
                "speed": {"type": "string", "enum": ["normal", "optimum", "instant"]},
                "notes": {"type": "object"}
            },
            "required": ["payment_id"]
        }
    ),
    "fetch_refund": MCPTool(
        name="fetch_refund",
        description="Fetch refund details",
        parameters={
            "type": "object",
            "properties": {
                "refund_id": {"type": "string"}
            },
            "required": ["refund_id"]
        }
    ),
    "create_order": MCPTool(
        name="create_order",
        description="Create a Razorpay order",
        parameters={
            "type": "object",
            "properties": {
                "amount": {"type": "integer"},
                "currency": {"type": "string", "default": "INR"},
                "receipt": {"type": "string"},
                "partial_payment": {"type": "boolean"},
                "notes": {"type": "object"}
            },
            "required": ["amount", "currency"]
        }
    ),
    "fetch_order": MCPTool(
        name="fetch_order",
        description="Fetch order details by order ID",
        parameters={
            "type": "object",
            "properties": {
                "order_id": {"type": "string"}
            },
            "required": ["order_id"]
        }
    ),
    "create_customer": MCPTool(
        name="create_customer",
        description="Create a customer in Razorpay",
        parameters={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "email": {"type": "string"},
                "contact": {"type": "string"},
                "fail_existing": {"type": "boolean", "default": "0"},
                "notes": {"type": "object"}
            },
            "required": ["name", "email", "contact"]
        }
    ),
    "fetch_customer": MCPTool(
        name="fetch_customer",
        description="Fetch customer details",
        parameters={
            "type": "object",
            "properties": {
                "customer_id": {"type": "string"}
            },
            "required": ["customer_id"]
        }
    ),
    "create_token": MCPTool(
        name="create_token",
        description="Create a token for card tokenization",
        parameters={
            "type": "object",
            "properties": {
                "token_type": {"type": "string", "enum": ["card"]},
                "card": {
                    "type": "object",
                    "properties": {
                        "number": {"type": "string"},
                        "expiry_month": {"type": "string"},
                        "expiry_year": {"type": "string"},
                        "cvv": {"type": "string"}
                    },
                    "required": ["number", "expiry_month", "expiry_year", "cvv"]
                },
                "customer_id": {"type": "string"}
            },
            "required": ["token_type", "card"]
        }
    ),
    "fetch_settlement_report": MCPTool(
        name="fetch_settlement_report",
        description="Fetch settlement report for date range",
        parameters={
            "type": "object",
            "properties": {
                "start_date": {"type": "string", "format": "date"},
                "end_date": {"type": "string", "format": "date"}
            },
            "required": ["start_date", "end_date"]
        }
    ),
    "fetch_payouts": MCPTool(
        name="fetch_payouts",
        description="Fetch payouts list",
        parameters={
            "type": "object",
            "properties": {
                "from_date": {"type": "string"},
                "to_date": {"type": "string"},
                "status": {"type": "string"}
            }
        }
    ),
    "create_payout": MCPTool(
        name="create_payout",
        description="Create a payout to a contact",
        parameters={
            "type": "object",
            "properties": {
                "account_number": {"type": "string"},
                "amount": {"type": "integer"},
                "currency": {"type": "string", "default": "INR"},
                "mode": {"type": "string", "enum": ["IMPS", "NEFT", "RTGS", "UPI"]},
                "purpose": {"type": "string"},
                "fund_account": {"type": "object"},
                "queue_if_low_balance": {"type": "boolean", "default": True}
            },
            "required": ["account_number", "amount", "mode", "purpose", "fund_account"]
        }
    )
}


@router.get("/tools", response_model=Dict[str, MCPTool])
async def list_tools():
    """List all available MCP tools - compatible with Razorpay MCP Server"""
    return MCP_TOOLS


@router.post("/execute", response_model=MCPResponse)
async def execute_tool(call: MCPToolCall):
    """Execute an MCP tool - compatible with Razorpay MCP Server protocol"""
    try:
        tool_name = call.name
        args = call.arguments

        if tool_name == "create_payment_link":
            link = razorpay_client.payment_link.create(args)
            return MCPResponse(result=link)

        elif tool_name == "fetch_payment_link":
            link = razorpay_client.payment_link.fetch(args["payment_link_id"])
            return MCPResponse(result=link)

        elif tool_name == "cancel_payment_link":
            result = razorpay_client.payment_link.cancel(args["payment_link_id"])
            return MCPResponse(result=result)

        elif tool_name == "fetch_payment":
            payment = razorpay_client.payment.fetch(args["payment_id"])
            return MCPResponse(result=payment)

        elif tool_name == "create_refund":
            refund = razorpay_client.payment.refund(args["payment_id"], args)
            return MCPResponse(result=refund)

        elif tool_name == "fetch_refund":
            refund = razorpay_client.refund.fetch(args["refund_id"])
            return MCPResponse(result=refund)

        elif tool_name == "create_order":
            order = razorpay_client.order.create(args)
            return MCPResponse(result=order)

        elif tool_name == "fetch_order":
            order = razorpay_client.order.fetch(args["order_id"])
            return MCPResponse(result=order)

        elif tool_name == "create_customer":
            customer = razorpay_client.customer.create(args)
            return MCPResponse(result=customer)

        elif tool_name == "fetch_customer":
            customer = razorpay_client.customer.fetch(args["customer_id"])
            return MCPResponse(result=customer)

        elif tool_name == "create_token":
            token = razorpay_client.token.create(args)
            return MCPResponse(result=token)

        elif tool_name == "fetch_settlement_report":
            report = razorpay_client.settlement.report(args)
            return MCPResponse(result=report)

        elif tool_name == "fetch_payouts":
            payouts = razorpay_client.payout.fetch_all(args)
            return MCPResponse(result=payouts)

        elif tool_name == "create_payout":
            payout = razorpay_client.payout.create(args)
            return MCPResponse(result=payout)

        else:
            return MCPResponse(
                result=None,
                error=f"Tool '{tool_name}' not implemented. Available: {list(MCP_TOOLS.keys())}"
            )

    except razorpay.errors.BadRequestError as e:
        return MCPResponse(result=None, error=f"Bad Request: {str(e)}")
    except razorpay.errors.ServerError as e:
        return MCPResponse(result=None, error=f"Server Error: {str(e)}")
    except Exception as e:
        return MCPResponse(result=None, error=f"Execution Error: {str(e)}")