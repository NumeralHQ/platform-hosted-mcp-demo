"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatMonth, formatUsd, fromMinor } from "@/lib/format"
import { BUCKET_COLORS, BUCKET_ORDER, type LiabilityBucket } from "@/lib/liability"
import type { MonthPoint } from "./aggregate"

function isBucket(value: unknown): value is LiabilityBucket {
  return typeof value === "string" && BUCKET_ORDER.some((bucket) => bucket === value)
}

interface Props {
  /** Ascending months; amounts in minor units per bucket. */
  months: readonly MonthPoint[]
  /** Buckets to draw, bottom of the stack first. */
  series: readonly LiabilityBucket[]
  /** Human label per bucket, already resolved against the platform skin. */
  labels: Record<LiabilityBucket, string>
}

type DollarPoint = { month: string } & Record<LiabilityBucket, number>

/**
 * Tax collected per month, stacked by who remits it. One axis, thin bars,
 * a surface-colored seam between segments, and the tooltip carries the
 * exact dollars so no segment needs an inline label.
 */
export function RemittanceChart({ months, series, labels }: Props) {
  const data = useMemo<DollarPoint[]>(
    () =>
      months.map((point) => ({
        month: point.month,
        platform_remits: fromMinor(point.platform_remits),
        merchant_remits: fromMinor(point.merchant_remits),
        platform_fees: fromMinor(point.platform_fees),
        off_platform: fromMinor(point.off_platform),
      })),
    [months]
  )

  const config = useMemo<ChartConfig>(() => {
    const entries: ChartConfig = {}
    for (const bucket of series) {
      entries[bucket] = { label: labels[bucket], color: BUCKET_COLORS[bucket] }
    }
    return entries
  }, [series, labels])

  const topSeries = series[series.length - 1]

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          tickFormatter={(value: string) => formatMonth(value).slice(0, 3)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickCount={4}
          tickFormatter={(value: number) => formatUsd(value, { compact: true, cents: false })}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={
            <ChartTooltipContent
              labelFormatter={(label) => formatMonth(String(label))}
              formatter={(value, name, item) => (
                <>
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: String(item.color ?? "") }}
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground flex-1">{isBucket(name) ? labels[name] : String(name)}</span>
                  <span className="text-foreground font-mono font-medium tabular-nums">
                    {formatUsd(typeof value === "number" ? value : Number(value))}
                  </span>
                </>
              )}
            />
          }
        />
        <ChartLegend verticalAlign="top" align="left" content={<ChartLegendContent className="justify-start pb-4 pt-0" />} />
        {series.map((bucket) => (
          <Bar
            key={bucket}
            dataKey={bucket}
            stackId="tax"
            fill={`var(--color-${bucket})`}
            stroke="var(--card)"
            strokeWidth={2}
            maxBarSize={24}
            radius={bucket === topSeries ? [4, 4, 0, 0] : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
