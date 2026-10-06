import { DateTime } from "luxon"
import type { PlatformSkin } from "@/platform.config"
import { formatMinorUsd } from "@/lib/format"
import type { AttentionItem, Headline } from "./aggregate"

/**
 * The platform's side of the home page: balance, payouts, audience, catalog,
 * and the platform's own to-dos. None of this comes from Numeral. It is
 * placeholder data, but it is derived from the merchant's real sales so the
 * proportions hold together (a payout is roughly a week of net sales less
 * the platform's cut), and it is deterministic so the page is stable between
 * loads.
 */

export interface Payout {
  /** ISO date. */
  on: string
  /** Minor units. */
  amount: number
  status: "paid" | "scheduled"
}

export interface Balance {
  /** Minor units, ready to pay out. */
  available: number
  /** Minor units, still clearing. */
  pending: number
  next: Payout
  recent: Payout[]
}

const WEEKS_PER_MONTH = 4.33
const PAYOUT_WEEKDAY = 2 // Tuesday

/** Balance and payouts scaled from the latest closed month. */
export function balance(args: { headline: Headline | null; feeRate: number; today?: DateTime }): Balance {
  const today = args.today ?? DateTime.utc()
  const monthly = args.headline?.sales ?? 0
  const weeklyNet = Math.round((monthly / WEEKS_PER_MONTH) * (1 - args.feeRate))
  const nextTuesday = nextWeekday(today, PAYOUT_WEEKDAY)
  const recent: Payout[] = [0.97, 1.04, 0.91].map((factor, index) => ({
    on: nextTuesday.minus({ weeks: index + 1 }).toISODate() ?? "",
    amount: Math.round(weeklyNet * factor),
    status: "paid",
  }))
  return {
    available: Math.round(weeklyNet * 0.62),
    pending: Math.round(weeklyNet * 0.38),
    next: { on: nextTuesday.toISODate() ?? "", amount: Math.round(weeklyNet * 0.62), status: "scheduled" },
    recent,
  }
}

function nextWeekday(from: DateTime, weekday: number): DateTime {
  const diff = (weekday - from.weekday + 7) % 7 || 7
  return from.startOf("day").plus({ days: diff })
}

export interface Audience {
  active: number
  joinedThisMonth: number
  /** Fractional change month over month. */
  delta: number
}

/** Audience size in proportion to order volume. */
export function audience(headline: Headline | null): Audience {
  const orders = headline?.orders ?? 0
  const active = Math.max(120, Math.round(orders * 9.4))
  const joined = Math.max(4, Math.round(orders * 0.55))
  return { active, joinedThisMonth: joined, delta: 0.031 }
}

export interface CatalogRow {
  name: string
  kind: string
  /** Minor units for the latest closed month. */
  sales: number
  share: number
}

/** The skin's catalog with the latest month's net sales split across it. */
export function catalog(skin: PlatformSkin, headline: Headline | null): CatalogRow[] {
  const monthly = headline?.sales ?? 0
  return skin.home.products.map((product) => ({
    name: product.name,
    kind: product.kind,
    sales: Math.round(monthly * product.share),
    share: product.share,
  }))
}

/** The platform's own to-dos, shaped like the tax ones so the list reads as one. */
export function platformAttention(args: {
  skin: PlatformSkin
  balance: Balance
  shippable: number
}): AttentionItem[] {
  const { skin } = args
  const items: AttentionItem[] = [
    {
      key: "ship",
      dueOn: null,
      tone: "soon",
      title: `${args.shippable} ${skin.home.shippableProduct} orders are ready to ship`,
      detail: "Print labels and mark them shipped so buyers get tracking.",
      href: "/dashboard",
      action: "Print labels",
    },
    {
      key: "payout",
      dueOn: args.balance.next.on,
      tone: "info",
      title: `${formatMinorUsd(args.balance.next.amount)} pays out ${DateTime.fromISO(args.balance.next.on, { zone: "utc" }).toFormat("cccc")}`,
      detail: `Arrives in your bank account 1–2 business days after ${skin.name} sends it.`,
      href: "/dashboard",
      action: "Payouts",
    },
  ]
  for (const [index, todo] of skin.home.todos.entries()) {
    items.push({
      key: `todo-${index}`,
      dueOn: null,
      tone: "info",
      title: todo.title,
      detail: todo.detail,
      href: "/dashboard",
      action: todo.action,
    })
  }
  return items
}
