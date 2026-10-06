import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metric, MonthsOption } from "./aggregate";

/** Links to the two CSV route handlers, carrying the page's current range and metric. */
export function ExportButtons({
  months,
  metric,
}: {
  months: MonthsOption;
  metric: Metric;
}) {
  const salesCsvHref = `/api/export/sales?${new URLSearchParams({ months: String(months), metric }).toString()}`;
  const transactionsCsvHref = `/api/export/transactions?${new URLSearchParams({ months: String(months) }).toString()}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        render={<a href={salesCsvHref} download />}
        nativeButton={false}
      >
        <Download className="size-3.5" /> Split by state (CSV)
      </Button>
      <Button
        variant="outline"
        size="sm"
        render={<a href={transactionsCsvHref} download />}
        nativeButton={false}
      >
        <Download className="size-3.5" /> Transactions (CSV)
      </Button>
    </div>
  );
}
