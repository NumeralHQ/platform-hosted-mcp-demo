# Embedding your merchants' tax position with the Numeral MCP

This is the guide for a platform engineer who wants what Tundra has: a Tax page inside
your own product, showing each merchant what you remitted for them, what they owe, and
where they stand with the states, without building a tax data pipeline.

## The shape of the integration

The Numeral MCP is one endpoint, `https://mcp.numeralhq.com/mcp`, speaking JSON-RPC
over HTTP (the Model Context Protocol's Streamable HTTP transport, stateless). You
need three things:

1. **Your Numeral secret key** as a Bearer token. The key decides the account and the
   mode (`sk_test_` sandbox, `sk_prod_` live). Tools never accept an account id, so a
   request cannot cross tenants.
2. **A `merchant_id`** for the signed-in merchant: either Numeral's `mer_...` id or the
   `reference_merchant_id` you gave Numeral when you created the merchant through the
   Platform API.
3. **One POST per tool call.** No session, no `initialize` handshake required.

```ts
const response = await fetch("https://mcp.numeralhq.com/mcp", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.NUMERAL_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "get_nexus_study", arguments: { merchant_id: "ridgeline-trading" } },
  }),
})
```

The tool result is `result.content[0].text`, a JSON string. Structured errors come
back with `result.isError: true` and a body of `{ error_code, error_message }`.

`lib/numeral/client.ts` in this repo is that call with parsing and error mapping. It is
the whole Numeral-specific surface.

## Two kinds of data, two keys

**Your data.** `get_sales_summary`, `list_transactions`, and `get_transaction` read the
transactions you recorded through the Platform API, scoped to one merchant with
`merchant_id`. `get_sales_summary` groups by month, destination, currency, and
**liability**: who remits the tax.

| `liability` | Meaning |
| --- | --- |
| `marketplace_facilitated` | You remit as marketplace facilitator. The merchant does not, but these sales usually still count toward the merchant's nexus thresholds. |
| `platform_merchant_of_record` | You are the seller of record. |
| `marketplace_and_merchant_of_record` | Both roles declared on the transaction. |
| `merchant_responsible` | You only processed the payment; the merchant remits. |
| `platform_fees` | Tax on your own fees. |
| `direct` | Transactions recorded without a platform role. |

These work on a sandbox key. Tundra uses `sk_test_` for them.

**The merchant's data.** `get_nexus_study`, `list_registrations`, `list_filings`, and
`get_filing` with `merchant_id` read the merchant's **own Numeral account**. That is only
possible when the merchant has:

1. added your platform under **Connections** in their Numeral dashboard,
2. verified they own the merchant record (a code emailed to the merchant address you
   registered), and
3. switched on **"Share with {your platform}"**.

Until then those tools return `merchant_not_linked`, and `get_merchant` reports
`linked: false`. Sharing is the merchant's switch and is revocable. Numeral only serves
these reads in live mode, so use your `sk_prod_` key for them. You never receive
credentials; account numbers arrive as data you should mask.

## Error codes to branch on

| `error_code` | What Tundra does |
| --- | --- |
| `merchant_not_linked` | Collapses the account panels into a "Connect your Numeral account" card. The sales split still renders. |
| `live_mode_required` | Configuration error: the tool was called with a sandbox key. |
| `merchant_not_found` | The id is not on your roster. |
| `internal_error` | Shows a calm error panel; retries on the next request. |

Also check `study_status` on `get_nexus_study`: `pending_first_run` means the merchant
linked recently and Numeral has not run their first nightly study yet.

## Units

Read carefully, they differ by tool:

- `get_sales_summary`: `total_sales` and `tax_collected` are **minor-unit strings**.
- `get_nexus_study`: every amount, including `rule.sales_threshold`, is a **minor-unit number**.
- `list_filings` / `get_filing`: **decimal strings in dollars**.
- `get_transaction` line items: **minor-unit numbers**.

Tundra normalizes these in one place (`lib/numeral/schemas.ts`) with zod.

## Rules Tundra follows that you should too

- **The merchant id comes from your session, never from the browser.** Tundra stores it
  in a signed cookie at login and every server function reads it from there.
- **Keys stay on the server.** Server components and route handlers only.
- **No generic tool proxy.** Each view hard-codes its tool and builds its own arguments.
- **Budget.** The MCP allows about 100 calls per minute per platform account. Tundra fans
  out per page with `Promise.all` and caches for 60 seconds in production.
- **Say where numbers came from.** Tundra badges any panel served from a recorded
  fixture and lists every call in the Under-the-hood drawer.

## What is not there yet

- No per-transaction "who remitted" field on `list_transactions`; the split is available
  by month and state from `get_sales_summary`.
- No filing documents or confirmation numbers; `filed_at` and the amounts are what you
  can show. Say "filed on {date} with these amounts", not "proof of remittance".
- No filing frequency on registrations; Tundra infers it from recent filing periods.
- No link timestamps; `linked` is a boolean by design.

Questions: your Numeral contact, or the MCP docs at https://docs.numeralhq.com.
