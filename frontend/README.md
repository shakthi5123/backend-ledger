# Ledger frontend

A JavaScript and React dashboard built with the Next.js App Router. It lives in `frontend/` so the backend API and its dependencies remain untouched.

## Run locally

1. Start the backend from the project root with `npm run dev` (defaults to port 3000).
2. In a second terminal, run `cd frontend && npm install && npm run dev`.
3. Open `http://localhost:3001`.

The Next.js rewrite proxies `/api/*` to `http://localhost:3000/api/*`, so the browser uses same-origin requests and the backend's HttpOnly cookie can be used without adding CORS configuration. Set `BACKEND_URL` in `.env.local` if the backend runs at another address; see `.env.example`.

## Backend coverage

- Register, sign in, and sign out.
- Create accounts, list accounts, and load each account balance.
- Submit account-to-account transfers with a fresh idempotency key per transfer.
- Submit system initial-funding requests. The backend still enforces the system-user role, so ordinary users receive its authorization error.

The backend treasury is provisioned separately from the UI. From the backend project root, run `SYSTEM_USER_ID=<your-user-id> SYSTEM_TREASURY_OPENING_BALANCE=1000 npm run provision:system-treasury`. This is an operator-only script: it marks that user as a system user, creates one treasury account and one internal capital account, and records the opening reserve as balanced debit and credit ledger entries. It is safe to rerun; it will not add a second opening balance.

To add more reserve later, run `SYSTEM_USER_ID=<your-user-id> TREASURY_TOPUP_AMOUNT=500 TREASURY_TOPUP_REFERENCE=manual-2026-11-21-01 npm run treasury:topup`. Use a new reference for each distinct top-up; rerunning a reference with the same amount is idempotent and will not add funds twice. Each top-up writes a completed transaction with matching capital debit and treasury credit ledger entries.

The backend does not currently expose a transaction-history endpoint. The dashboard therefore displays actions made in the current browser session only; it does not imply that this is a complete ledger history.

Treasury account: 6b0178d138919116dc9402b5
Treasury balance: ₹1,000
Your personal account: 6b01738d2d17f5db025f48f4
system user email : codex-smoke-1795255499295-system
system user pass : 

From the backend project folder, run this whenever you want to add reserve funds:
SYSTEM_USER_ID=6afebf3308f111cec4deaeff \
TREASURY_TOPUP_AMOUNT=1000 \
TREASURY_TOPUP_REFERENCE=manual-2026-11-21-01 \
npm run treasury:topup

SYSTEM_USER_ID=6afebf3308f111cec4deaeff \
TREASURY_TOPUP_AMOUNT=10000 \
TREASURY_TOPUP_REFERENCE=manual-2026-11-21-02 \
npm run treasury:topup

To move it to your account:
1. Sign in to Ledger with your own email and password.
2. Open System funding.
3. Enter your personal account ID: 6b01738d2d17f5db025f48f4
4. Enter 1000 and click Add initial funds.