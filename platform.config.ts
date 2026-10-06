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
    /** Hex for charts, where Tailwind classes cannot reach. */
    chart: string
  }
  /**
   * Platform-side copy for the merchant home page. These panels (payouts,
   * audience, catalog) belong to the platform, not the tax provider, so the
   * demo fills them with platform-shaped placeholder data keyed off the
   * merchant's real sales.
   */
  home: {
    /** What the platform calls the merchant's buyers, plural: "members", "regulars". */
    audienceNoun: string
    /** A short, platform-flavoured headline verb pair for the page's primary actions. */
    primaryAction: string
    secondaryAction: string
    /** Catalog rows, best seller first. Shares are of the latest month's net sales and sum to 1. */
    products: readonly { name: string; kind: string; share: number }[]
    /** A physical line that can sit in a "ready to ship" to-do. */
    shippableProduct: string
    /** The platform's own to-dos, alongside the real tax ones. */
    todos: readonly { title: string; detail: string; action: string }[]
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
    chart: "#0369a1",
  },
  home: {
    audienceNoun: "members",
    primaryAction: "New drop",
    secondaryAction: "View storefront",
    products: [
      { name: "Ridgeline Trading Community", kind: "Monthly membership", share: 0.46 },
      { name: "Ridgeline Playbook", kind: "PDF download", share: 0.24 },
      { name: "Printed Trading Journal", kind: "Physical", share: 0.18 },
      { name: "Ridgeline Hoodie", kind: "Merch", share: 0.12 },
    ],
    shippableProduct: "Printed Trading Journal",
    todos: [
      {
        title: "3 members are waiting for community access",
        detail: "Approve or decline join requests so new members can post.",
        action: "Review requests",
      },
      {
        title: "Your September drop page has no cover image",
        detail: "Drops with a cover convert about twice as well on Tundra Discover.",
        action: "Add image",
      },
    ],
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
    chart: "#c2410c",
  },
  home: {
    audienceNoun: "regulars",
    primaryAction: "Update menu",
    secondaryAction: "View online ordering",
    products: [
      { name: "Dinner service", kind: "Dine-in", share: 0.52 },
      { name: "Online orders", kind: "Pickup and delivery", share: 0.31 },
      { name: "Catering", kind: "Events", share: 0.11 },
      { name: "Gift cards", kind: "Retail", share: 0.06 },
    ],
    shippableProduct: "Catering order",
    todos: [
      {
        title: "2 menu items are out of stock online",
        detail: "Hide them or restock so guests stop hitting errors at checkout.",
        action: "Update menu",
      },
      {
        title: "Weekend staff schedule is not published",
        detail: "Publish by Thursday so shifts land in everyone's app.",
        action: "Publish",
      },
    ],
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
