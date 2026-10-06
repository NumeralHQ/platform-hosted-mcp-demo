"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatMonth } from "@/lib/format"
import { BUCKET_COLORS, BUCKET_ORDER, type LiabilityBucket } from "@/lib/liability"
import { formatMetric, type Metric, type MonthlyPoint } from "./aggregate"

/**
 * Stacked bars, one per month, one segment per liability bucket. Buckets that
 * are zero across the whole range are left out so the legend only names
 * series that appear; the colors still follow the bucket, never its position.
 */
export function MonthlyTrendChart({
  data,
  metric,
  labels,
}: {
  data: readonly MonthlyPoint[]
  metric: Metric
  labels: Record<LiabilityBucket, string>
}) {
  const present: LiabilityBucket[] = []
  for (const bucket of BUCKET_ORDER) {
    if (data.some((point) => point[bucket] !== 0)) {
      present.push(bucket)
    }
  }
  const config: ChartConfig = {}
  for (const bucket of present) {
    config[bucket] = { label: labels[bucket], color: BUCKET_COLORS[bucket] }
  }

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={[...data]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
          tickFormatter={(value: string) => formatMonth(value)}
        />
        <YAxis
          width={64}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickFormatter={(value: number) => formatMetric(value, metric, { compact: true })}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
          content={
            <ChartTooltipContent
              labelFormatter={(label) => (typeof label === "string" ? formatMonth(label) : label)}
              formatter={(value, name) => (
                <div className="flex flex-1 items-center gap-2 leading-none">
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: isBucket(name) ? BUCKET_COLORS[name] : undefined }}
                  />
                  <span className="text-muted-foreground flex-1">
                    {isBucket(name) ? labels[name] : String(name ?? "")}
                  </span>
                  <span className="text-foreground font-mono font-medium tabular-nums">
                    {typeof value === "number" ? formatMetric(value, metric) : String(value ?? "")}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {present.map((bucket) => (
          <Bar
            key={bucket}
            dataKey={bucket}
            name={bucket}
            stackId="metric"
            fill={BUCKET_COLORS[bucket]}
            stroke="var(--background)"
            strokeWidth={1}
            maxBarSize={32}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

function isBucket(name: unknown): name is LiabilityBucket {
  return typeof name === "string" && (BUCKET_ORDER as readonly string[]).includes(name)
}
