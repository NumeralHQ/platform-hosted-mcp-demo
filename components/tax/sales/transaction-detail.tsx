import Link from "next/link";
import { X } from "lucide-react";
import { PanelError } from "@/components/tax/panel-error";
import { RecordedBadge } from "@/components/tax/recorded-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatMinorUsd, formatPercent } from "@/lib/format";
import type { LineItem, Panel, TransactionDetail } from "@/lib/numeral";
import { describeError } from "./aggregate";
import { TypeBadge } from "./transactions-table";

/**
 * The `get_transaction` view: the only place amounts appear per order. Line
 * items are minor units; jurisdiction rates are fractions (0.0725 = 7.25%).
 */
export function TransactionDetailPanel({
  panel,
  closeHref,
}: {
  panel: Panel<TransactionDetail>;
  closeHref: string;
}) {
  if (!panel.ok) {
    return (
      <div className="space-y-2">
        <PanelError
          title="Transaction could not be loaded"
          message={describeError(panel.code, panel.error.message)}
          code={panel.code}
        />
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={closeHref} scroll={false} />}
          nativeButton={false}
        >
          Close
        </Button>
      </div>
    );
  }

  const transaction = panel.data;
  let subtotal = 0;
  let tax = 0;
  for (const line of transaction.line_items) {
    subtotal += line.amount_excluding_tax;
    tax += line.tax_amount;
  }

  return (
    <Card size="sm" className="h-fit">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 font-mono text-sm">
          {transaction.reference_order_id ?? transaction.id}
          <TypeBadge type={transaction.type} />
          {transaction.testmode && <Badge variant="outline">test mode</Badge>}
          <RecordedBadge trace={panel.trace} />
        </CardTitle>
        <CardDescription>
          Processed{" "}
          {formatDate(
            transaction.transaction_processed_at,
            "LLL d, yyyy HH:mm 'UTC'",
          )}{" "}
          · {transaction.customer_currency_code ?? "USD"}
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close details"
            render={<Link href={closeHref} scroll={false} />}
            nativeButton={false}
          >
            <X className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Ship to</dt>
            <dd className="mt-0.5">{formatAddress(transaction)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Transaction</dt>
            <dd className="mt-0.5 font-mono break-all">{transaction.id}</dd>
          </div>
        </dl>

        <ol className="divide-y rounded-lg border">
          {transaction.line_items.map((line) => (
            <li key={line.line_item_id} className="space-y-2 p-3">
              <LineHeader line={line} />
              {line.tax_jurisdictions.length > 0 && (
                <ul className="text-muted-foreground space-y-0.5 text-xs">
                  {line.tax_jurisdictions.map((jurisdiction, index) => (
                    <li
                      key={`${line.line_item_id}-${index}`}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="truncate">
                        {jurisdiction.tax_authority_name}
                        <span className="ml-1.5 opacity-70">
                          {titleCase(jurisdiction.rate_type)}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatPercent(jurisdiction.tax_rate * 100, 2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>

        <dl className="space-y-1 text-sm tabular-nums">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal (excl. tax)</dt>
            <dd>{formatMinorUsd(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tax</dt>
            <dd>{formatMinorUsd(tax)}</dd>
          </div>
          <div className="flex justify-between border-t pt-1 font-medium">
            <dt>Total</dt>
            <dd>{formatMinorUsd(subtotal + tax)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function LineHeader({ line }: { line: LineItem }) {
  const name =
    line.product.reference_product_name ??
    line.product.reference_product_id ??
    line.line_item_id;
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        <p className="text-muted-foreground font-mono text-xs">
          {line.product.product_tax_code ?? "—"} · qty {line.quantity}
        </p>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <p>{formatMinorUsd(line.amount_excluding_tax)}</p>
        <p className="text-muted-foreground text-xs">
          tax {formatMinorUsd(line.tax_amount)}
        </p>
      </div>
    </div>
  );
}

function formatAddress(transaction: TransactionDetail): string {
  const parts: string[] = [];
  for (const part of [
    transaction.address_line_1,
    transaction.address_line_2,
    transaction.address_city,
    [transaction.address_province, transaction.address_postal_code]
      .filter(Boolean)
      .join(" "),
    transaction.address_country,
  ]) {
    if (part) {
      parts.push(part);
    }
  }
  return parts.length > 0 ? parts.join(", ") : "—";
}

function titleCase(literal: string): string {
  return literal
    .toLowerCase()
    .split(/[\s_]+/)
    .filter((word) => word.length > 0)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");
}
