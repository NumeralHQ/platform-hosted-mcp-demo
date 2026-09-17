"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCount, formatDate, formatMinorUsd } from "@/lib/format"
import { MarketplaceInclusionBadge } from "./marketplace-inclusion-badge"
import {
  REGISTRATION_LABELS,
  formatPercentReal,
  formatWindow,
  humanizePresence,
  periodLabel,
  sourceLabel,
  type JurisdictionRow,
} from "./model"
import { StatusBadge } from "./status-badge"
import { ThresholdMeter, toneFor } from "./threshold-meter"

/**
 * Everything the study says about one state: the rule, the window being
 * measured (and how much marketplace volume was excluded from it), when and
 * how the threshold was crossed, totals since collection began, physical
 * presence, and the registration. No deadlines: the MCP does not have any.
 */
export function JurisdictionDetailDrawer({
  row,
  open,
  onOpenChange,
  marketplaceChannel,
  storefrontChannel,
}: {
  row: JurisdictionRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  marketplaceChannel: string
  storefrontChannel: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        {row && (
          <>
            <SheetHeader className="pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-lg">{row.name}</SheetTitle>
                <StatusBadge status={row.status} registered={row.registration.state === "registered"} />
              </div>
              <SheetDescription>
                {row.jurisdictionId} · Nexus source: {sourceLabel(row.source)}
                {row.collectionStart ? ` · Collecting since ${formatDate(row.collectionStart)}` : ""}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-7rem)] px-4 pb-6">
              <div className="space-y-6 text-sm">
                <Section title="Economic-nexus rule">
                  {row.jurisdiction.economic?.rule ? (
                    <>
                      <p className="font-medium">{row.rule}</p>
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                        <Dt>Measured over</Dt>
                        <Dd>{periodLabel(row.jurisdiction.economic.rule.period_type)}</Dd>
                        <Dt>{marketplaceChannel} sales</Dt>
                        <Dd>
                          <MarketplaceInclusionBadge counts={row.marketplaceCounts} marketplaceChannel={marketplaceChannel} />
                          <span className="text-muted-foreground ml-2">
                            {row.marketplaceCounts
                              ? "count toward the threshold"
                              : `are excluded; only ${storefrontChannel.toLowerCase()} sales count`}
                          </span>
                        </Dd>
                        <Dt>Wholesale sales</Dt>
                        <Dd>{row.jurisdiction.economic.rule.wholesale_sales_count_toward_threshold ? "Count" : "Excluded"}</Dd>
                      </dl>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No economic-nexus rule on file for this jurisdiction.</p>
                  )}
                </Section>

                {row.jurisdiction.economic && (
                  <Section title="Current window">
                    <p className="text-muted-foreground">
                      {formatWindow(row.jurisdiction.economic.current_window_start, row.jurisdiction.economic.current_window_end)}
                    </p>
                    <div className="mt-2">
                      <ThresholdMeter
                        percent={row.thresholdPercent}
                        tone={toneFor(row.status, row.registration.state === "registered")}
                        className="w-full"
                      />
                    </div>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                      <Dt>Qualifying sales</Dt>
                      <Dd className="tabular-nums">
                        {formatMinorUsd(row.jurisdiction.economic.current_qualifying_sales_amount, { cents: false })}
                        {row.jurisdiction.economic.rule?.sales_threshold !== null && row.jurisdiction.economic.rule ? (
                          <span className="text-muted-foreground">
                            {" "}of {formatMinorUsd(row.jurisdiction.economic.rule.sales_threshold, { cents: false })} threshold
                          </span>
                        ) : null}
                      </Dd>
                      <Dt>Qualifying orders</Dt>
                      <Dd className="tabular-nums">
                        {formatCount(row.jurisdiction.economic.current_qualifying_transaction_count)}
                        {row.jurisdiction.economic.rule?.volume_threshold !== null && row.jurisdiction.economic.rule ? (
                          <span className="text-muted-foreground">
                            {" "}of {formatCount(row.jurisdiction.economic.rule.volume_threshold)} threshold
                          </span>
                        ) : null}
                      </Dd>
                      <Dt>Total sales</Dt>
                      <Dd className="tabular-nums">
                        {formatMinorUsd(row.jurisdiction.economic.current_sales_amount, { cents: false })}
                        <span className="text-muted-foreground"> · {formatCount(row.jurisdiction.economic.current_transaction_count)} orders</span>
                      </Dd>
                      {row.jurisdiction.economic.current_marketplace_sales_amount !== null && (
                        <>
                          <Dt>{marketplaceChannel}</Dt>
                          <Dd className="tabular-nums">
                            {formatMinorUsd(row.jurisdiction.economic.current_marketplace_sales_amount, { cents: false })}
                            <span className="text-muted-foreground">
                              {" "}· {formatCount(row.jurisdiction.economic.current_marketplace_transaction_count)} orders
                              {row.marketplaceCounts === false ? ", excluded from the threshold" : ", included"}
                            </span>
                          </Dd>
                        </>
                      )}
                    </dl>
                    {row.marketplaceCounts === false &&
                      row.jurisdiction.economic.current_sales_amount !== null &&
                      row.jurisdiction.economic.current_qualifying_sales_amount !== null && (
                        <p className="bg-muted mt-3 rounded-md p-2.5 text-xs leading-relaxed">
                          This state only counts your {storefrontChannel.toLowerCase()} sales.{" "}
                          {formatMinorUsd(
                            row.jurisdiction.economic.current_sales_amount - row.jurisdiction.economic.current_qualifying_sales_amount,
                            { cents: false }
                          )}{" "}
                          of {marketplaceChannel} volume in this window does not count toward the threshold.
                        </p>
                      )}
                  </Section>
                )}

                {row.jurisdiction.economic?.earliest_crossing_date && (
                  <Section title="Threshold crossed">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                      <Dt>Crossed on</Dt>
                      <Dd className="tabular-nums">{formatDate(row.jurisdiction.economic.earliest_crossing_date)}</Dd>
                      <Dt>Window</Dt>
                      <Dd>{formatWindow(row.jurisdiction.economic.crossing_window_start, row.jurisdiction.economic.crossing_window_end)}</Dd>
                      <Dt>Sales in window</Dt>
                      <Dd className="tabular-nums">{formatMinorUsd(row.jurisdiction.economic.crossing_sales_amount, { cents: false })}</Dd>
                      <Dt>Orders in window</Dt>
                      <Dd className="tabular-nums">{formatCount(row.jurisdiction.economic.crossing_transaction_count)}</Dd>
                    </dl>
                  </Section>
                )}

                {row.jurisdiction.physical?.has_physical_nexus && (
                  <Section title="Physical presence">
                    <ul className="list-disc space-y-0.5 pl-4">
                      {row.jurisdiction.physical.current_presence_types.map((type) => (
                        <li key={type}>{humanizePresence(type)}</li>
                      ))}
                    </ul>
                    <p className="text-muted-foreground mt-1.5 text-xs">
                      Since {formatDate(row.jurisdiction.physical.earliest_nexus_date)}
                      {row.jurisdiction.physical.nexus_ended_date ? ` · ended ${formatDate(row.jurisdiction.physical.nexus_ended_date)}` : ""}
                    </p>
                  </Section>
                )}

                {row.collectionStart && (
                  <Section title={`Since collection began (${formatDate(row.collectionStart)})`}>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Stat label="Sales" value={formatMinorUsd(row.jurisdiction.since_collection.total_sales, { cents: false })} />
                      <Stat label="Taxable sales" value={formatMinorUsd(row.jurisdiction.since_collection.taxable_sales, { cents: false })} />
                      <Stat label="Orders" value={formatCount(row.jurisdiction.since_collection.transaction_count)} />
                      <Stat label="Tax collected" value={formatMinorUsd(row.jurisdiction.since_collection.tax_collected)} />
                      <Stat label="Tax owed" value={formatMinorUsd(row.jurisdiction.since_collection.tax_owed)} />
                    </dl>
                  </Section>
                )}

                <Section title="Registration">
                  <p className="font-medium">{REGISTRATION_LABELS[row.registration.state]}</p>
                  <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                    {row.registration.detail && row.registration.state !== "registered" && (
                      <>
                        <Dt>Numeral status</Dt>
                        <Dd>{row.registration.detail}</Dd>
                      </>
                    )}
                    {row.registration.accountNumber && (
                      <>
                        <Dt>Account number</Dt>
                        <Dd className="font-mono">{row.registration.accountNumber}</Dd>
                      </>
                    )}
                    {row.registration.startDate && (
                      <>
                        <Dt>Effective</Dt>
                        <Dd className="tabular-nums">{formatDate(row.registration.startDate)}</Dd>
                      </>
                    )}
                  </dl>
                  {row.status === "has_nexus" && row.registration.state === "none" && (
                    <p className="mt-2 rounded-md bg-red-50 p-2.5 text-xs leading-relaxed text-red-900">
                      You have nexus here and no registration on file. Numeral can register you; the details live in your Numeral account.
                    </p>
                  )}
                </Section>

                <p className="text-muted-foreground text-xs">
                  {formatPercentReal(row.thresholdPercent)} of threshold as of the latest study. Percentages above 100% mean the
                  threshold has already been met in the window shown.
                </p>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">{title}</h3>
      {children}
    </section>
  )
}

function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="text-muted-foreground">{children}</dt>
}

function Dd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dd className={className}>{children}</dd>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tracking-tight">{value}</dd>
    </div>
  )
}
