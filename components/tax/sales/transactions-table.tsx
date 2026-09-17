import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { ListTransactions } from "@/lib/numeral";
import { cn } from "@/lib/utils";
import type { PlatformSkin } from "@/platform.config";
import {
  newerPageHref,
  nextPageHref,
  salesHref,
  type SalesParams,
} from "./url";

/**
 * One page of `list_transactions`. Rows carry no amounts (the MCP only returns
 * those from `get_transaction`), so a row is a link that opens the detail
 * panel via `?tx=`. Paging is a cursor chain kept in the URL.
 */
export function TransactionsTable({
  page,
  params,
  skin,
}: {
  page: ListTransactions;
  params: SalesParams;
  skin: PlatformSkin;
}) {
  // In replay the recording only has the first page, so a cursor that comes
  // back unchanged means there is nothing further to show.
  const nextCursor =
    page.has_more && page.cursor && page.cursor !== params.cursor
      ? page.cursor
      : null;
  const exhaustedRecording =
    page.has_more && page.cursor !== null && page.cursor === params.cursor;
  const canGoNewer = params.cursor !== null;

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Processed</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead className="w-10" aria-label="Open" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {page.transactions.map((transaction) => {
            const selected = transaction.id === params.tx;
            const href = salesHref(params, {
              tx: selected ? null : transaction.id,
            });
            return (
              <TableRow
                key={transaction.id}
                data-state={selected ? "selected" : undefined}
              >
                <TableCell className="tabular-nums">
                  {formatDate(
                    transaction.transaction_processed_at,
                    "LLL d, yyyy HH:mm",
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={href}
                    scroll={false}
                    className="font-mono text-xs hover:underline"
                  >
                    {transaction.reference_order_id ?? transaction.id}
                  </Link>
                </TableCell>
                <TableCell>
                  <TypeBadge type={transaction.type} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {destination(transaction)}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={href}
                    scroll={false}
                    aria-label={selected ? "Close details" : "Open details"}
                    className={cn(
                      "text-muted-foreground hover:text-foreground inline-flex",
                      selected && "text-foreground",
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        "size-4 transition-transform",
                        selected && "rotate-90",
                      )}
                    />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
          {page.transactions.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground py-8 text-center"
              >
                No transactions in this range.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs leading-relaxed">
          Amounts live on each transaction&apos;s detail. Per-order remitter (
          {skin.name} vs. you) is coming in a later Numeral release; the split
          above is the authoritative view until then.
        </p>
        <div className="flex items-center gap-1">
          {canGoNewer ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={newerPageHref(params)} scroll={false} />}
              nativeButton={false}
            >
              <ChevronLeft className="size-3.5" /> Newer
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="size-3.5" /> Newer
            </Button>
          )}
          {nextCursor ? (
            <Button
              variant="outline"
              size="sm"
              render={
                <Link href={nextPageHref(params, nextCursor)} scroll={false} />
              }
              nativeButton={false}
            >
              Older <ChevronRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              title={
                exhaustedRecording
                  ? "The recording only includes the first page"
                  : undefined
              }
            >
              Older <ChevronRight className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      {exhaustedRecording && (
        <p className="text-muted-foreground text-xs">
          Recorded demo data includes only the first page of transactions.
        </p>
      )}
    </div>
  );
}

export function TypeBadge({ type }: { type: string }) {
  switch (type) {
    case "PURCHASE":
      return <Badge variant="secondary">Purchase</Badge>;
    case "REFUND":
      return <Badge variant="destructive">Refund</Badge>;
    case "REFUND_REVERSAL":
      return <Badge variant="outline">Refund reversal</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function destination(transaction: {
  address_city: string | null;
  address_province: string | null;
  address_country: string | null;
}): string {
  const parts: string[] = [];
  for (const part of [
    transaction.address_city,
    transaction.address_province,
    transaction.address_country,
  ]) {
    if (part) {
      parts.push(part);
    }
  }
  return parts.length > 0 ? parts.join(", ") : "—";
}
