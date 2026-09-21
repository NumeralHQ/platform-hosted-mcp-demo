"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatCount, formatMinorUsd, formatMonth } from "@/lib/format"
import type { MonthPoint } from "@/lib/home/aggregate"

/** Net sales per month, one bar each, in the platform's accent colour. */
export function NetSalesChart({ data, color }: { data: readonly MonthPoint[]; color: string }) {
  const config: ChartConfig = { sales: { label: "Net sales", color } }
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={[...data]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
          tickFormatter={(value: string) => formatMonth(value).slice(0, 3)}
        />
        <YAxis
          width={56}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickFormatter={(value: number) => formatMinorUsd(value, { compact: true, cents: false })}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
          content={
            <ChartTooltipContent
              labelFormatter={(label) => (typeof label === "string" ? formatMonth(label) : label)}
              formatter={(value, _name, item) => {
                const point = item.payload as MonthPoint | undefined
                return (
                  <div className="flex flex-1 flex-col gap-1 leading-none">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
                      <span className="text-muted-foreground flex-1">Net sales</span>
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {typeof value === "number" ? formatMinorUsd(value) : String(value ?? "")}
                      </span>
                    </div>
                    {point && (
                      <div className="flex items-center gap-2 pl-4.5">
                        <span className="text-muted-foreground flex-1">Orders</span>
                        <span className="text-foreground font-mono font-medium tabular-nums">{formatCount(point.orders)}</span>
                      </div>
                    )}
                  </div>
                )
              }}
            />
          }
        />
        <Bar dataKey="sales" name="sales" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  )
}
