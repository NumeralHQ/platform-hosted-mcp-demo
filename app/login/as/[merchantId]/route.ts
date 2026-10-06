import { redirect } from "next/navigation"
import { getMerchant } from "@/lib/numeral"
import { getSession } from "@/lib/session"

/**
 * Deep link into the demo as a merchant: /login/as/ridgeline-trading.
 * Handy on a sales call and for scripted checks. The merchant must exist on
 * the platform's roster; the id still never comes from the browser at call
 * time because every later page reads it from the signed session.
 */
export async function GET(_request: Request, ctx: RouteContext<"/login/as/[merchantId]">): Promise<Response> {
  const { merchantId } = await ctx.params
  const merchant = await getMerchant(merchantId)
  if (!merchant.ok) {
    return new Response(`Unknown merchant "${merchantId}"`, { status: 404 })
  }
  const session = await getSession()
  session.merchantId = merchant.data.reference_merchant_id
  session.merchantName = merchant.data.name
  await session.save()
  redirect("/dashboard/tax")
}
