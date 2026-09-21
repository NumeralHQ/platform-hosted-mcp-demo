import { provenanceLine } from "@/lib/csv"
import { getFiling } from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"

/** One return as pretty-printed JSON, exactly as Numeral returned it, with provenance. */
export async function GET(_request: Request, ctx: RouteContext<"/api/export/filing/[id]">): Promise<Response> {
  const { id } = await ctx.params
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "invalid_filing_id" }, { status: 400 })
  }
  const merchant = await requireMerchant()
  const filing = await getFiling(merchant.merchantId, Number(id))
  if (!filing.ok) {
    const status =
      filing.code === "filing_not_found" ? 404 : filing.code === "merchant_not_linked" ? 409 : 502
    return Response.json({ error: filing.code ?? "error", message: filing.error.message }, { status })
  }
  const payload = {
    provenance: provenanceLine(filing.trace.source === "fixture" ? "fixture" : "live"),
    tool: filing.trace.tool,
    scope: filing.trace.scope,
    filing: filing.data,
  }
  return new Response(`${JSON.stringify(payload, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${merchant.merchantId}-filing-${filing.data.id}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
