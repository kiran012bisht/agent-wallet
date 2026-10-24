# Agent Wallet integration starter

The original React design is preserved. The payment form now calls `backend/main.py` and uses the API response to decide whether the demo payment is approved, needs review, or is denied.

1. Read `backend/README.md`.
2. Start the Python backend in one terminal.
3. Start the Vite website in a second terminal.
4. Open the local Vite URL and submit a payment.

This connects React -> Python. It does **not** yet connect to Solidity or transfer funds. To wire the contract next, we need the test-chain/network, deployed AgentWallet address, ABI, and a safe transaction-signing approach. Never share a private key.
