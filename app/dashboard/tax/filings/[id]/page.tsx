import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConnectCard } from "@/components/tax/connect-card";
import { PanelError } from "@/components/tax/panel-error";
import { RecordedBadge } from "@/components/tax/recorded-badge";
import { UnderTheHood } from "@/components/tax/under-the-hood";
import { CalculatedSalesData } from "@/components/tax/filings/calculated-sales-data";
import { FilingStatusBadge } from "@/components/tax/filings/filing-status-badge";
import {
  filingBucket,
  filingStatusLabel,
} from "@/components/tax/filings/filing-status";
import { dueLabel } from "@/components/tax/filings/grouping";
import { PeriodSalesCard } from "@/components/tax/filings/period-sales-card";
import { daysUntil, formatDate, formatPeriod, formatUsd } from "@/lib/format";
import {
  currentMode,
  currentTrace,
  getFiling,
  getSalesSummary,
  type FilingDetail,
  type Panel,
  type SalesSummary,
} from "@/lib/numeral";
import { requireMerchant } from "@/lib/session";
import { currentSkin } from "@/lib/skin";
import { cn } from "@/lib/utils";

function parseFilingId(raw: string): number | null {
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

export default async function FilingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const filingId = parseFilingId(id);
  if (filingId === null) {
    notFound();
  }
  const merchant = await requireMerchant();
  const skin = await currentSkin();
  const filing = await getFiling(merchant.merchantId, filingId);

  if (!filing.ok && filing.code === "filing_not_found") {
    notFound();
  }

  let summary: Panel<SalesSummary> | null = null;
  if (filing.ok && filing.data.period_starts_at && filing.data.period_ends_at) {
    summary = await getSalesSummary(merchant.merchantId, {
      from: filing.data.period_starts_at.slice(0, 10),
      to: filing.data.period_ends_at.slice(0, 10),
    });
  }
  const trace = await currentTrace();
  const mode = (await currentMode()).mode;

  if (!filing.ok) {
    return (
      <div className="space-y-6">
        <BackLink />
        {filing.code === "merchant_not_linked" ? (
          <ConnectCard skin={skin} />
        ) : (
          <PanelError
            title="This return could not be loaded"
            message={filing.error.message}
            code={filing.code}
          />
        )}
        <UnderTheHood trace={trace} mode={mode} />
      </div>
    );
  }

  const detail = filing.data;
  const isFiled = filingBucket(detail.status) === "filed";
  const days = isFiled ? null : daysUntil(detail.due_on);
  const totalRemitted =
    detail.tax_collected + detail.penalty_amount + detail.interest_amount;

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {detail.state ?? detail.jurisdiction_id} ·{" "}
              {formatPeriod(detail.period_starts_at, detail.period_ends_at)}
            </h2>
            <FilingStatusBadge status={detail.status} />
            <RecordedBadge trace={filing.trace} />
          </div>
          <p className="text-muted-foreground text-sm">
            {isFiled ? (
              <>
                Filed on {formatDate(detail.filed_at)} with these amounts. Due{" "}
                {formatDate(detail.due_on)}.
              </>
            ) : (
              <>
                {filingStatusLabel(detail.status)}. Due{" "}
                {formatDate(detail.due_on)}
                {days !== null ? (
                  <span className={cn("ml-1", days < 0 ? "text-red-700" : "")}>
                    ({dueLabel(days)})
                  </span>
                ) : null}
                .
              </>
            )}
            <span className="ml-1 font-mono text-xs">filing {detail.id}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<a href={`/api/export/filing/${detail.id}`} />}
          nativeButton={false}
        >
          <Download aria-hidden /> Download JSON
        </Button>
      </div>

      <AmountGrid
        detail={detail}
        isFiled={isFiled}
        totalRemitted={totalRemitted}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <CalculatedSalesData data={detail.calculated_sales_data} />
        <div className="space-y-6">
          {summary === null ? null : summary.ok ? (
            <PeriodSalesCard
              skin={skin}
              filing={detail}
              summary={summary.data}
              trace={summary.trace}
            />
          ) : (
            <PanelError
              title={`${skin.name} sales unavailable`}
              message={summary.error.message}
              code={summary.code}
            />
          )}
          <Card className="border-dashed">
            <CardContent className="text-muted-foreground text-xs leading-relaxed">
              Read-only view of what Numeral holds for this return. {skin.name}{" "}
              cannot change, approve, or file a return from here; that happens
              in Numeral.
            </CardContent>
          </Card>
        </div>
      </div>

      <UnderTheHood trace={trace} mode={mode} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/tax/filings"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
    >
      <ArrowLeft className="size-4" aria-hidden /> All filings
    </Link>
  );
}

function AmountGrid({
  detail,
  isFiled,
  totalRemitted,
}: {
  detail: FilingDetail;
  isFiled: boolean;
  totalRemitted: number;
}) {
  const tiles: Array<{
    label: string;
    value: number;
    emphasis?: "penalty" | "total";
    hint?: string;
  }> = [
    { label: "Taxable sales", value: detail.taxable_sales },
    { label: "Non-taxable sales", value: detail.non_taxable_sales },
    { label: "Tax collected", value: detail.tax_collected },
    { label: "Penalty", value: detail.penalty_amount, emphasis: "penalty" },
    { label: "Interest", value: detail.interest_amount, emphasis: "penalty" },
  ];
  if (isFiled) {
    tiles.push({
      label: "Total remitted",
      value: totalRemitted,
      emphasis: "total",
      hint: "Tax collected + penalty + interest",
    });
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <Card
          key={tile.label}
          size="sm"
          className={
            tile.emphasis === "total" ? "ring-foreground/30" : undefined
          }
        >
          <CardContent>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {tile.label}
            </p>
            <p
              className={cn(
                "mt-1 text-xl font-semibold tabular-nums tracking-tight",
                tile.emphasis === "penalty" && tile.value > 0 && "text-red-700",
                tile.emphasis === "penalty" &&
                  tile.value === 0 &&
                  "text-muted-foreground",
              )}
            >
              {formatUsd(tile.value)}
            </p>
            {tile.hint ? (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {tile.hint}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
