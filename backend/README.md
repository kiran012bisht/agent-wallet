# Agent Wallet Python policy API (demo)

## Start the Python service
From the `backend` folder:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Health check: http://127.0.0.1:8000/health  
Interactive API docs: http://127.0.0.1:8000/docs

## Start the React website
Open a second terminal in the project root:

```bash
npm install
npm run dev
```

The website calls `http://127.0.0.1:8000/evaluate` by default. To use a different backend URL, set `VITE_API_URL` in a local `.env` file. Never put secrets in frontend environment variables.

## Important boundaries
- React now asks this Python API for a policy decision.
- The supplied Python script is rule-based, not a machine-learning/LLM model.
- No blockchain transaction is sent yet. The Solidity AgentWallet needs a test-network deployment address, ABI, network configuration, and an intentional transaction-signing approach.
- Never put private keys or seed phrases in React, `VITE_` environment variables, or source control.
- The original expiry (`2027-01-01T00:00:00+00:00`) is retained from the supplied script.
- This demo uses the approved totals visible in the website and is not a production ledger. The Solidity contract must remain the on-chain enforcement layer.
