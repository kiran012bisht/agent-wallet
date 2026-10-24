from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Agent Wallet Policy API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


POLICY = {
    "permission_expiry": "2027-01-01T00:00:00+00:00",
    "max_transaction_limit": 5000,
    "max_daily_limit": 50000,
}


class TransactionRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    category: str = Field(default="Other", max_length=50)
    recipientTrusted: bool = False
    paymentLimit: float = Field(gt=0)
    dailyLimit: float = Field(gt=0)
    approvedSpent: float = Field(ge=0)


class Decision(BaseModel):
    status: Literal["approved", "review", "denied"]
    reason: str
    checks: list[str]


@app.get("/health")
def health():
    return {"ok": True, "service": "Agent Wallet Python policy API", "mode": "demo-only"}


@app.post("/evaluate", response_model=Decision)
def evaluate(tx: TransactionRequest):
    # Transparent rule-based policy evaluator, not an LLM.
    expiry = datetime.fromisoformat(POLICY["permission_expiry"])
    if datetime.now(timezone.utc) >= expiry:
        return Decision(status="denied", reason="Agent permission expired", checks=["expiry: failed"])

    if tx.amount > min(tx.paymentLimit, POLICY["max_transaction_limit"]):
        return Decision(status="review", reason="Exceeds per-payment limit", checks=["amount: failed"])

    if tx.dailyLimit > POLICY["max_daily_limit"]:
        return Decision(status="review", reason="Requested daily limit exceeds the agent's maximum policy", checks=["daily_limit: failed"])

    if tx.approvedSpent + tx.amount > tx.dailyLimit:
        return Decision(status="review", reason="Would exceed daily spending limit", checks=["daily_limit: failed"])

    if not tx.recipientTrusted:
        return Decision(status="review", reason="Recipient is not on the trusted recipient list", checks=["recipient: review"])

    return Decision(
        status="approved",
        reason="All demo policy checks passed",
        checks=["expiry: passed", "amount: passed", "daily_limit: passed", "recipient: passed"],
    )
