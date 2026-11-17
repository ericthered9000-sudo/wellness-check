# HomeBeacon Backend — MUST-SURVIVE Regression Checklist

This file is a guard rail. Every item below must remain true after any refactor.
Before committing a change that touches the listed files/routes, run the smoke
commands in the **Verify** column and confirm the behavior still works.

Legend: `[ ]` = manual / integration smoke test; `✅` = already covered by a smoke
command in this doc.

## Authentication & Account

| # | What must survive | Where it lives | How to verify |
|---|-------------------|----------------|---------------|
| 1 | `POST /api/v1/auth/register` creates a user and returns a token | `backend/src/index.ts` lines ~654-672 | `curl -X POST http://localhost:3001/api/v1/auth/register -H 'Content-Type: application/json' -d '{"email":"...","password":"...","role":"senior"}'` |
| 2 | `POST /api/v1/auth/login` returns a token | `backend/src/index.ts` lines ~628-653 | `curl -X POST http://localhost:3001/api/v1/auth/login ...` |
| 3 | `GET /api/v1/account` returns the authenticated user's profile | `backend/src/index.ts` line ~391 (`/api/v1/account`) | `curl -H "Authorization: Bearer ***" http://localhost:3001/api/v1/account` |
| 4 | `PATCH /api/v1/account` updates display name / profile | `backend/src/routes/account.ts` + `backend/src/index.ts` | `curl -X PATCH ... http://localhost:3001/api/v1/account` |

## Family Connections

| # | What must survive | Where it lives | How to verify |
|---|-------------------|----------------|---------------|
| 5 | `GET /api/v1/connections/family/:familyMemberId` lists a family member's connected seniors | `backend/src/index.ts` line ~380 | `curl -H "Authorization: Bearer ***" http://localhost:3001/api/v1/connections/family/$FAMILY_ID` |
| 6 | `POST /api/connections` creates a new family connection (legacy v0, still used) | `backend/src/index.ts` line ~674 | `curl -X POST -H "Authorization: Bearer ***" http://localhost:3001/api/connections -d '{"familyMemberId":"...","seniorEmail":"..."}'` |
| 7 | `POST /api/connections/:id/role` updates a connection role | `backend/src/index.ts` line ~743 | `curl -X PUT ... http://localhost:3001/api/connections/.../role` |

## Check-In API

| # | What must survive | Where it lives | How to verify |
|---|-------------------|----------------|---------------|
| 8 | `POST /api/v1/checkin` exists and works for a senior checking in for themselves | `backend/src/index.ts` line ~781 | `curl -X POST -H "Authorization: Bearer ***" http://localhost:3001/api/v1/checkin -d '{"status":"ok"}'` |
| 9 | `POST /api/v1/checkin` works for a family user. When the body contains `userId`, the server resolves it to a connected senior; otherwise it falls back to the most recent family connection | `backend/src/index.ts` lines ~835-866 | Family token + body `{ "userId": "<senior_id>", "status":"pending" }` must create a check-in request under that senior |
| 10 | `POST /api/checkin` legacy alias still works (do not remove) | `backend/src/index.ts` line ~781 | Same smoke as #8 but against `/api/checkin` |
| 11 | Check-ins are stored in `activity_events` with `type = 'checkin'` | `backend/src/index.ts` lines ~794-796 | `sqlite3 backend/wellness.db "SELECT type FROM activity_events ORDER BY rowid DESC LIMIT 1;"` must return `checkin` |
| 12 | Senior check-in auto-emits family WebSocket updates | `backend/src/index.ts` lines ~811-823 | Family client receives `type: 'checkin'` event |

## Pending Requests

| # | What must survive | Where it lives | How to verify |
|---|-------------------|----------------|---------------|
| 13 | `GET /api/v1/checkin/requests/:seniorId` returns unresolved check-in requests (senior or connected family) | `backend/src/index.ts` lines ~916-944 | `curl -H "Authorization: Bearer ***" http://localhost:3001/api/v1/checkin/requests/$SENIOR_ID` |
| 14 | `POST /api/v1/checkin/requests/:id/resolve` resolves a request | `backend/src/index.ts` lines ~947-980 | `curl -X POST ... http://localhost:3001/api/v1/checkin/requests/$ID/resolve` |
| 15 | Senior check-in auto-resolves any open pending request for that senior | `backend/src/index.ts` lines ~818-825 | Create request → senior checks in → GET checkin/requests returns empty |

## Wellness Score

| # | What must survive | Where it lives | How to verify |
|---|-------------------|----------------|---------------|
| 16 | Wellness score counts check-ins using `type = 'checkin'` (never `'check_in'`) | `backend/src/routes/wellness.ts` line ~89 | `grep -R "type = 'checkin'" backend/src/` and `grep -R "type = 'check_in'" backend/src/` must return only the former |
| 17 | Wellness score reads from `activity_events`, not a dropped `activity_logs` table | `backend/src/routes/wellness.ts` lines ~79-89 | `grep -R "activity_logs" backend/src/` must be empty |
| 18 | `GET /api/wellness/:userId` and `GET /api/wellness/:userId/history` work | `backend/src/routes/wellness.ts` | `curl -H "Authorization: Bearer ***" http://localhost:3001/api/wellness/$USER_ID` |

## Medications, Visits, Activity

| # | What must survive | Where it lives | How to verify |
|---|-------------------|----------------|---------------|
| 19 | `GET /api/v1/medications/user/:userId` returns medications scoped to the user or connected senior | `backend/src/routes/medications.ts` + `backend/src/index.ts` line ~368 | `curl -H "Authorization: Bearer ***" http://localhost:3001/api/v1/medications/user/$USER_ID` |
| 20 | `POST /api/v1/medications/user/:userId` creates medication | `backend/src/routes/medications.ts` | `curl -X POST ...` |
| 21 | `PUT /api/v1/medications/:id` updates medication | `backend/src/routes/medications.ts` | `curl -X PUT ...` |
| 22 | `GET /api/v1/visits/user/:userId` returns visits scoped to the user or connected senior | `backend/src/routes/visits.ts` + `backend/src/index.ts` line ~374 | `curl -H "Authorization: Bearer ***" ...` |
| 23 | `POST /api/v1/visits/user/:userId` creates visit | `backend/src/routes/visits.ts` | `curl -X POST ...` |
| 24 | `PUT /api/v1/visits/:id` updates visit | `backend/src/routes/visits.ts` | `curl -X PUT ...` |
| 25 | `GET /api/v1/activity/:seniorId` is family-scoped (requester must be connected to senior) | `backend/src/routes/activity.ts` lines ~101-136 + `backend/src/index.ts` line ~445 | Family token can read senior activity; stranger token gets 403 |

## Invites & Redemption

| # | What must survive | Where it lives | How to verify |
|---|---|-------------------|----------------|---------------|
| 26 | `POST /api/v1/invites` creates an invite code for a senior | `backend/src/routes/invites.ts` + `backend/src/index.ts` line ~388 | `curl -X POST -H "Authorization: Bearer ***" http://localhost:3001/api/v1/invites` |
| 27 | `GET /api/v1/invites/:seniorId` returns the senior's invite code | `backend/src/routes/invites.ts` + `backend/src/index.ts` | `curl ...` |
| 28 | `POST /api/v1/redeem` resolves the senior from the invite code server-side and creates a family connection | `backend/src/routes/invites.ts` lines ~62-95 + `backend/src/index.ts` line ~388 | Family token + body `{ "code": "..." }` returns senior user object and connection |

## Subscriptions & Google Play Verification

| # | What must survive | Where it lives | How to verify |
|---|---|-------------------|----------------|---------------|
| 29 | `POST /api/v1/subscriptions/verify` and `POST /api/subscriptions/verify` require a `purchaseToken`; without one they return `422` | `backend/src/routes/subscriptions.ts` | `curl -X POST -H "Authorization: Bearer ***" http://localhost:3001/api/v1/subscriptions/verify -H 'Content-Type: application/json' -d '{"productId":"homebeacon_premium_monthly"}'` must return HTTP 422 |
| 30 | Server-side Google Play verification calls `purchases.subscriptions.get` using the env-injected service account and grants entitlement only for active paid or valid trial purchases | `backend/src/routes/subscriptions.ts` | With a valid test purchase token, route returns `200 { success: true, tier, billingCycle }` and writes a row with `purchase_token`, `product_id`, `verified_at`, `current_period_end`, `payment_state`, and `offer_info` |
| 31 | Stripe webhook route continues to exist and verify signatures | `backend/src/routes/subscriptions.ts` | `curl -X POST http://localhost:3001/api/v1/subscriptions/webhook -H "Stripe-Signature: test" -d '{}' ` returns a non-404 response (signature failure is acceptable) |

## Smoke-Test Script

Run all grep-based checks in one pass from the repo root:

```bash
cd backend

echo "=== checkin route ==="
grep -n "'/api/checkin'" src/index.ts
grep -n "'/api/v1/checkin'" src/index.ts

echo "=== checkin type stored ==="
grep -n "'checkin'" src/index.ts

echo "=== wellness must use checkin (not check_in) ==="
grep -R "type = 'checkin'" src/ || true
grep -R "type = 'check_in'" src/ && echo "FAIL: found check_in" || echo "OK: no check_in"

echo "=== no dropped activity_logs references ==="
grep -R "activity_logs" src/ && echo "FAIL: found activity_logs" || echo "OK: no activity_logs"

echo "=== v1 activity route mounted ==="
grep -n "api/v1/activity" src/index.ts

echo "=== v1 connections/meds/visits/redeem/invites mounted ==="
grep -nE "v1.*(connections|medications|visits|redeem|invites)" src/index.ts

echo "=== pending request routes mounted ==="
grep -nE "/api/v1/checkin/requests" src/index.ts
```

If any check above prints `FAIL`, stop the commit and fix the regression first.
