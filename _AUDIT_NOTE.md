# Audit Apply Note — AINotaryDocumentVerification

Source: `_AUDIT/reports/batch_06.md` section 2.

## Original Recommendations
### Missing AI counterparts
- `/witness-vetting`
- `/fee-optimization`
- `/client-risk-score`
- `/template-suggestion`

### Missing non-AI
- E-signature integration; background-check service connector; bulk PDF import; state notary board integration

### Custom suggestions
- Agentic compliance monitoring; multi-document correlation; e-signature embed; video attestation; notary marketplace

## Implemented
Added three endpoints in `backend/routes/ai.js`:
- `POST /api/ai/witness-vetting`
- `POST /api/ai/client-risk-score`
- `POST /api/ai/template-suggestion`

Reused `callOpenRouter`, `parseAIJson`, `logAudit`, `auth`, `aiRateLimiter`, and `ai_analyses` table.

## Backlog
| Item | Tag |
|---|---|
| `/fee-optimization` | MECHANICAL |
| E-signature (DocuSign/HelloSign) | NEEDS-CREDS |
| Background-check connector | NEEDS-CREDS |
| Bulk PDF import + OCR | NEEDS-PRODUCT-DECISION |
| State notary board integration | NEEDS-CREDS |
| Notary marketplace | NEEDS-PRODUCT-DECISION |
| Video attestation | NEEDS-PRODUCT-DECISION |

## Apply pass 3 (frontend)

Inspected `frontend/src/App.jsx` (Vite/React + axios). The pass-2 AI
endpoints (`witness-vetting`, `client-risk-score`, `template-suggestion`)
already have a fully-wired frontend page:

- `frontend/src/pages/AIRiskAnalysis.jsx` — three-tab UI (Witness Vetting /
  Client Risk Score / Template Suggestion). Each tab has its own input
  form, calls the corresponding `POST /ai/<endpoint>` via the shared axios
  instance from `frontend/src/api/axios.js`, and renders structured output
  via `components/AIResultDisplay`. Routed at `/ai-risk-analysis` and
  reachable from the sidebar.

Other AI endpoints (`analyze-document`, `verify-identity`, `detect-fraud`,
`check-compliance`, `generate-summary`, `extract-entities`) are surfaced
through `pages/AIAnalyses.jsx`, `IdentityVerifications.jsx`,
`FraudDetections.jsx`, and `ComplianceChecks.jsx`. AI history at
`/ai-history`. JWT carried via axios interceptor.

Backend AI router mounted at `/api/ai` in `backend/server.js:75`.

**Action: LEFT-AS-IS — frontend already wired.**

## Apply pass 4 (mechanical backlog)

Implemented the one MECHANICAL backlog item:

1. `POST /api/ai/fee-optimization` — body `{document_type, jurisdiction?, complexity?, target_margin?}`. Reads recent `notarizations` (filtered by `document_type` when supplied) plus recent `payments` rows for context, sends them through the existing `callOpenRouter` helper, parses with `parseAIJson`, and persists the result via the existing `ai_analyses` insert + `logAudit` audit-trail call. Returns `{optimization, metadata}` matching the other AI endpoints. Short-circuits to HTTP 503 + `{error: "AI service unavailable: OPENROUTER_API_KEY not configured"}` when `OPENROUTER_API_KEY` is missing.

Frontend wiring:

- `frontend/src/pages/AIRiskAnalysis.jsx` — added a fourth tab `Fee Optimization` alongside Witness Vetting / Client Risk Score / Template Suggestion. Form fields: document type, jurisdiction, complexity, target margin. Reuses the existing `api.post` axios call (JWT carried via the shared interceptor) and the shared `AIResultDisplay` component. 503 responses surface a "AI service unavailable — OPENROUTER_API_KEY is not configured on the server." message.

No new dependencies, no `npm install`, no edits to working AI endpoints.

Smoke test: booted backend on a free port (`BACKEND_PORT=4488`, `OPENROUTER_API_KEY=""`), logged in as `admin@notary.com / password123`, and confirmed `POST /api/ai/fee-optimization` returns HTTP 503 with the expected error body. Process killed afterwards.

### Backlog still open
- E-signature (DocuSign / HelloSign) — NEEDS-CREDS.
- Background-check connector — NEEDS-CREDS.
- Bulk PDF import + OCR — NEEDS-PRODUCT-DECISION.
- State notary board integration — NEEDS-CREDS.
- Notary marketplace, video attestation — NEEDS-PRODUCT-DECISION.

## Apply pass 5 (all backlog)

Implemented 7 additive backlog endpoints in `backend/routes/ai.js` (cap 10):

| Endpoint | Category | Env / Default |
|---|---|---|
| `POST /api/ai/esign-docusign` | NEEDS-CREDS | `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_USER_ID`, `DOCUSIGN_ACCOUNT_ID` |
| `POST /api/ai/esign-hellosign` | NEEDS-CREDS | `HELLOSIGN_API_KEY` |
| `POST /api/ai/background-check` | NEEDS-CREDS | `BACKGROUND_CHECK_API_KEY`, `BACKGROUND_CHECK_API_URL` |
| `POST /api/ai/state-notary-board-sync` | NEEDS-CREDS | `STATE_NOTARY_BOARD_API_KEY` |
| `POST /api/ai/video-attestation` | NEEDS-PRODUCT-DECISION | stub session in new `video_attestation_sessions` (`CREATE TABLE IF NOT EXISTS`) — vendor (Twilio/Daily) deferred |
| `POST /api/ai/marketplace-listing` | NEEDS-PRODUCT-DECISION | new `notary_marketplace_listings` table; default `visibility=private` |
| `POST /api/ai/bulk-pdf-import` | NEEDS-PRODUCT-DECISION | new `bulk_pdf_jobs` table; default `status=queued` (OCR engine choice deferred) |

NEEDS-CREDS endpoints return HTTP 503 + `{ error, missing: <ENV_NAME> }` when env unset. Each PRODUCT-DECISION default is documented inline with a `// PRODUCT-DECISION:` comment.

Smoke test (port 4821): logged in as `admin@notary.com / password123`. All four NEEDS-CREDS endpoints returned 503 with the expected `missing` field; the three PRODUCT-DECISION endpoints returned 200 with their stub default payload. No new deps. All new tables created via `CREATE TABLE IF NOT EXISTS` (additive only).
