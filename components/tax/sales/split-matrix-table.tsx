import { TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BUCKET_COLORS, BUCKET_ORDER, bucketExplanation, bucketLabel, type LiabilityBucket } from "@/lib/liability"
import { cn } from "@/lib/utils"
import type { PlatformSkin } from "@/platform.config"
import { formatMetric, type Metric, type SplitMatrix } from "./aggregate"
import { BucketTooltip } from "./bucket-tooltip"

/**
 * States down, liability buckets across. The table scrolls inside its card
 * with the header and totals row pinned, so the column meaning and the
 * reconciling total are always visible while a prospect scans the states.
 */
export function SplitMatrixTable({ matrix, metric, skin }: { matrix: SplitMatrix; metric: Metric; skin: PlatformSkin }) {
  return (
    <div className="relative max-h-[34rem] overflow-auto rounded-lg border">
      <table className="w-full caption-bottom text-sm">
        <TableHeader className="bg-background sticky top-0 z-10 shadow-[inset_0_-1px_0_var(--border)]">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-56">State</TableHead>
            {BUCKET_ORDER.map((bucket) => (
              <TableHead key={bucket} className="text-right">
                <BucketHead bucket={bucket} skin={skin} />
              </TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrix.rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>
                <span className="font-medium">{row.label}</span>
                {row.detail && <span className="text-muted-foreground ml-2 text-xs">{row.detail}</span>}
              </TableCell>
              {BUCKET_ORDER.map((bucket) => (
                <Cell key={bucket} value={row.cells[bucket]} metric={metric} />
              ))}
              <Cell value={row.total} metric={metric} emphasis />
            </TableRow>
          ))}
          {matrix.rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={BUCKET_ORDER.length + 2} className="text-muted-foreground py-8 text-center">
                No sales recorded in this range.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter className="bg-muted sticky bottom-0 z-10">
          <TableRow className="hover:bg-transparent">
            <TableCell>Total</TableCell>
            {BUCKET_ORDER.map((bucket) => (
              <Cell key={bucket} value={matrix.totals.cells[bucket]} metric={metric} emphasis />
            ))}
            <Cell value={matrix.totals.total} metric={metric} emphasis />
          </TableRow>
        </TableFooter>
      </table>
    </div>
  )
}

function BucketHead({ bucket, skin }: { bucket: LiabilityBucket; skin: PlatformSkin }) {
  const explanation = bucketExplanation(bucket, skin)
  return (
    <BucketTooltip
      label={bucketLabel(bucket, skin)}
      summary={explanation.summary}
      roles={explanation.roles}
      color={BUCKET_COLORS[bucket]}
    />
  )
}

function Cell({ value, metric, emphasis = false }: { value: number; metric: Metric; emphasis?: boolean }) {
  const zero = value === 0
  return (
    <TableCell
      className={cn("text-right tabular-nums", zero && "text-muted-foreground/60", emphasis && !zero && "font-medium")}
    >
      {zero ? "—" : formatMetric(value, metric)}
    </TableCell>
  )
}
