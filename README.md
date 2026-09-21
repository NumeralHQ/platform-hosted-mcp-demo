# Tundra: a platform-hosted tax page on the Numeral MCP

Tundra is a fictional creator platform. Its merchant dashboard has a **Tax** tab that
shows a seller, inside the platform's own product, what the platform collected and
remitted for them, what they owe themselves, where they have nexus, where they are
registered, and every filing Numeral has made on their behalf. All of it is read live
from [Numeral](https://www.numeralhq.com) through the **Numeral MCP**, a single HTTPS
endpoint that speaks the Model Context Protocol.

This repo is both the demo we show platform prospects and the reference implementation
a platform engineer can copy. The Numeral-specific code is about 150 lines in
`lib/numeral/`.

## Run it in two minutes, no keys

```bash
bun install
bun run dev
# open http://localhost:3000
```

With no `.env` the app runs in **replay** mode against recorded Numeral responses in
`fixtures/`, so every page renders exactly as it does on a call. Pick "Ridgeline
Trading Co." on the login screen, or deep-link straight in:
`http://localhost:3000/login/as/ridgeline-trading`.

## Run it live against Numeral

```bash
cp .env.example .env.local
# fill in NUMERAL_TEST_API_KEY and NUMERAL_LIVE_API_KEY
bun run dev
```

Two keys, because the Numeral MCP splits its tools by mode:

| Tools | Key | Why |
| --- | --- | --- |
| `get_sales_summary`, `list_transactions`, `get_transaction` | `sk_test_` | Read the platform's own transactions. Test mode bypasses the collection gate, so marketplace tax is non-zero without the platform holding registrations everywhere. |
| `list_merchants`, `get_merchant`, `get_nexus_study`, `list_filings`, `get_filing`, `list_registrations` | `sk_prod_` | `merchant_id` on these tools reads the **merchant's own Numeral account** through a link the merchant approved. Numeral only allows that in live mode. |

`NUMERAL_MODE` chooses `live`, `replay`, or `auto` (live with a per-panel fallback to
the recorded fixture when the live call cannot succeed in this environment). Fallbacks
are always badged **Recorded data** so nobody mistakes a fixture for a live number.

## What the Tax tab shows

| Route | Panels | Numeral tools |
| --- | --- | --- |
| `/dashboard/tax` | Connection status, the remittance split (what Tundra remitted vs what you remit vs Tundra fees), nexus summary, next filing, registrations, what changed | `get_merchant`, `get_sales_summary`, `get_nexus_study`, `list_filings`, `list_registrations` |
| `/dashboard/tax/sales` | State x month split matrix, monthly trend, transactions with line items, CSV exports | `get_sales_summary`, `list_transactions`, `get_transaction` |
| `/dashboard/tax/nexus` | US map, threshold meters, "do marketplace sales count here?" per state, crossing details, export | `get_nexus_study`, `list_registrations` |
| `/dashboard/tax/registrations` | Registrations grouped by status, masked account numbers, export | `list_registrations`, `get_nexus_study` |
| `/dashboard/tax/filings` | Filing timeline, detail with the calculated sales data behind each return, exports | `list_filings`, `get_filing`, `get_sales_summary` |
| `/dashboard/tax/connect` | How a merchant connects their Numeral account and what sharing means | `get_merchant` |
| `/dev/integration` | The engineer's view: how the calls work, error codes, live tool catalog, the client code | `tools/list` |
| `/admin` | Demo controls: mode, scenario, simulate not-connected, skin | |

Every page has an **Under the hood** drawer listing each MCP call that produced it,
with arguments, key, latency, scope, and whether a fixture stood in.

## How it is wired

```
Browser ──> Next.js server components / route handlers ──> Numeral MCP (Bearer sk_ key)
```

- The Numeral keys never reach the browser. Everything under `lib/numeral/` is
  `server-only`.
- The merchant id comes from a signed session cookie set on the login screen, never
  from a query string or form field. That is the one rule a real integration must keep.
- Each panel hard-codes its tool and builds its own arguments. There is no generic
  "call any tool" proxy.
- Client components (`"use client"`) must import types and constants from
  `lib/numeral/schemas.ts`, never from `lib/numeral` (that barrel is `server-only`
  and Turbopack fails the client build silently if it leaks in).
- `merchant_id` is the only thing the platform injects. When the merchant has not
  connected their Numeral account, the account tools return `merchant_not_linked` and
  the page collapses those panels into a connect card. The sales split keeps rendering:
  it is the platform's own data.

See [`docs/INTEGRATION.md`](docs/INTEGRATION.md) for the partner-facing walkthrough.

## Units

The MCP returns amounts in different units per tool, and the app normalizes them at
the schema boundary (`lib/numeral/schemas.ts`), never in components:

- `get_sales_summary`, `get_nexus_study`, transaction line items: **minor units** (cents)
- `list_filings`, `get_filing`: **dollars**

## Demo controls

`/admin?token=<ADMIN_TOKEN>` switches the data mode, the fixture scenario
(`ridgeline-linked`, `unlinked`, `pending-first-run`), a "simulate not connected"
flip, and the platform skin (`tundra`, or the POS-shaped `hearth`) with cookies, so
a presenter can show the not-connected path or a prospect-shaped brand mid-call.

Set `DEMO_PASSCODE` on a hosted build to put a passcode in front of everything except
`/dev/integration`.

## Recording fixtures

With live keys in `.env.local`:

```bash
bun run record
```

writes redacted responses for every tool the demo calls into
`fixtures/ridgeline-linked/`. Merchant emails and street addresses are scrubbed.
Never commit a key; the repo runs gitleaks in CI.

## Tests

```bash
bun run typecheck && bun run lint && bun run test
```

Vitest checks that every fixture parses with the tool schemas, that units land where
the components expect them, and that fixture lookup keys resolve.

## Deploying

A standard Next.js app. On Vercel: set the env vars from `.env.example`, keep
`NUMERAL_MODE=auto` in production and `replay` on previews, and add `DEMO_PASSCODE`.
`fixtures/` is included in the server bundle via `outputFileTracingIncludes`.

---

Tundra, Ridgeline Trading Co., and every number in `fixtures/` are fictional. Tax data
is powered by Numeral.
