/**
 * The fictional platform's skin. Everything brand-specific lives here so a
 * prospect-shaped variant (a POS platform, a course marketplace) is a label
 * swap, not a data-model change. Numeral is only ever referenced in the
 * footer attribution and the "Data from Numeral" note on the Tax tab.
 */
export interface LiabilityLabels {
  /** Tax the platform collected and remits as marketplace facilitator. */
  platformRemits: string
  /** Tax the merchant collected through the platform and remits themselves. */
  merchantRemits: string
  /** Tax on the platform's own fees. */
  platformFees: string
  /** Sales recorded without a platform role. */
  offPlatform: string
}

export interface PlatformSkin {
  slug: string
  name: string
  tagline: string
  /** What the platform calls its marketplace channel in merchant-facing copy. */
  marketplaceChannel: string
  /** What the platform calls the merchant's own checkout / storefront. */
  storefrontChannel: string
  /** What the platform calls the people selling on it. */
  sellerNoun: string
  liability: LiabilityLabels
  /** Tailwind classes for the brand accent. */
  accent: {
    bg: string
    text: string
    ring: string
    soft: string
  }
}

export const TUNDRA: PlatformSkin = {
  slug: "tundra",
  name: "Tundra",
  tagline: "Sell courses, communities and drops.",
  marketplaceChannel: "Tundra Discover",
  storefrontChannel: "Your storefront",
  sellerNoun: "creator",
  liability: {
    platformRemits: "Remitted by Tundra",
    merchantRemits: "Remitted by you",
    platformFees: "Tundra fees",
    offPlatform: "Off-platform",
  },
  accent: {
    bg: "bg-sky-700",
    text: "text-sky-700",
    ring: "ring-sky-700/30",
    soft: "bg-sky-50 text-sky-900",
  },
}

/** A POS-shaped variant for the close of a demo to a payments platform. */
export const HEARTH: PlatformSkin = {
  slug: "hearth",
  name: "Hearth",
  tagline: "Point of sale for independent restaurants.",
  marketplaceChannel: "Hearth Local",
  storefrontChannel: "Direct orders",
  sellerNoun: "restaurant",
  liability: {
    platformRemits: "Remitted by Hearth",
    merchantRemits: "Remitted by your restaurant",
    platformFees: "Hearth fees",
    offPlatform: "Off-platform",
  },
  accent: {
    bg: "bg-orange-700",
    text: "text-orange-700",
    ring: "ring-orange-700/30",
    soft: "bg-orange-50 text-orange-900",
  },
}

export const SKINS: Record<string, PlatformSkin> = {
  tundra: TUNDRA,
  hearth: HEARTH,
}

export const DEFAULT_SKIN = TUNDRA

export function getSkin(slug: string | undefined): PlatformSkin {
  return (slug && SKINS[slug]) || DEFAULT_SKIN
}
