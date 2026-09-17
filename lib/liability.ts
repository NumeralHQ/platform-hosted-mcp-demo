import type { PlatformSkin } from "@/platform.config"

/**
 * The liability categories `get_sales_summary` returns. Each row of the
 * summary says who is responsible for remitting the tax on those sales.
 * These literals come from the Numeral MCP (sales-summary.ts) and must not
 * be renamed here; only the human labels are the platform's to choose.
 */
export const LIABILITIES = [
  "marketplace_facilitated",
  "platform_merchant_of_record",
  "marketplace_and_merchant_of_record",
  "merchant_responsible",
  "platform_fees",
  "direct",
] as const

export type Liability = (typeof LIABILITIES)[number]

/**
 * The four buckets the Tax page shows. Three MCP categories collapse into
 * "platform remits" because in all three the platform, not the merchant, is
 * the party that files.
 */
export type LiabilityBucket =
  | "platform_remits"
  | "merchant_remits"
  | "platform_fees"
  | "off_platform"

export const BUCKET_ORDER: readonly LiabilityBucket[] = [
  "platform_remits",
  "merchant_remits",
  "platform_fees",
  "off_platform",
]

export function bucketOf(liability: string): LiabilityBucket {
  switch (liability) {
    case "marketplace_facilitated":
    case "platform_merchant_of_record":
    case "marketplace_and_merchant_of_record":
      return "platform_remits"
    case "merchant_responsible":
      return "merchant_remits"
    case "platform_fees":
      return "platform_fees"
    default:
      return "off_platform"
  }
}

export function bucketLabel(bucket: LiabilityBucket, skin: PlatformSkin): string {
  switch (bucket) {
    case "platform_remits":
      return skin.liability.platformRemits
    case "merchant_remits":
      return skin.liability.merchantRemits
    case "platform_fees":
      return skin.liability.platformFees
    case "off_platform":
      return skin.liability.offPlatform
  }
}

/** Plain-language explanation shown in tooltips, with the Numeral literal. */
export function bucketExplanation(
  bucket: LiabilityBucket,
  skin: PlatformSkin
): { summary: string; roles: readonly string[] } {
  switch (bucket) {
    case "platform_remits":
      return {
        summary: `${skin.name} collected this tax as the marketplace facilitator and files it. You do not remit it, but in many states these sales still count toward your economic-nexus thresholds.`,
        roles: [
          "marketplace_facilitated",
          "platform_merchant_of_record",
          "marketplace_and_merchant_of_record",
        ],
      }
    case "merchant_remits":
      return {
        summary: `${skin.name} only processed the payment. You collected this tax and you file it.`,
        roles: ["merchant_responsible"],
      }
    case "platform_fees":
      return {
        summary: `Tax on ${skin.name}'s own fees. ${skin.name} remits it; shown so the totals reconcile.`,
        roles: ["platform_fees"],
      }
    case "off_platform":
      return {
        summary: "Sales recorded without a platform role, for example imported from another channel.",
        roles: ["direct"],
      }
  }
}

/** Chart colors per bucket, chosen to read in light and dark. */
export const BUCKET_COLORS: Record<LiabilityBucket, string> = {
  platform_remits: "#0369a1",
  merchant_remits: "#b45309",
  platform_fees: "#64748b",
  off_platform: "#a1a1aa",
}
