import Link from "next/link";
import { Download, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConnectCard } from "@/components/tax/connect-card";
import { PanelError } from "@/components/tax/panel-error";
import { RecordedBadge } from "@/components/tax/recorded-badge";
import { UnderTheHood } from "@/components/tax/under-the-hood";
import { NexusExplorer } from "@/components/tax/nexus/nexus-explorer";
import { NexusStatusChips } from "@/components/tax/nexus/nexus-status-chips";
import { OutsideUsList } from "@/components/tax/nexus/outside-us-list";
import { PhysicalPresenceList } from "@/components/tax/nexus/physical-presence-list";
import {
  buildRows,
  outsideUsRows,
  sortRows,
  statusCounts,
  usRows,
} from "@/components/tax/nexus/model";
import {
  currentMode,
  currentTrace,
  getNexusStudy,
  listRegistrations,
} from "@/lib/numeral";
import { requireMerchant } from "@/lib/session";
import { currentSkin } from "@/lib/skin";

export default async function NexusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const merchant = await requireMerchant();
  const skin = await currentSkin();
  const params = await searchParams;
  const requested =
    typeof params.state === "string" ? params.state.toUpperCase() : null;

  const [study, registrations] = await Promise.all([
    getNexusStudy(merchant.merchantId),
    listRegistrations(merchant.merchantId),
  ]);
  const trace = await currentTrace();
  const mode = await currentMode();

  if (!study.ok) {
    return (
      <div className="space-y-6">
        {study.code === "merchant_not_linked" ? (
          <ConnectCard skin={skin} />
        ) : (
          <PanelError
            title="Nexus study unavailable"
            message={study.error.message}
            code={study.code}
          />
        )}
        <UnderTheHood trace={trace} mode={mode.mode} />
      </div>
    );
  }

  if (study.data.study_status === "pending_first_run") {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Landmark className="size-4" /> Your first nexus study is
                running
              </CardTitle>
              <RecordedBadge trace={study.trace} />
            </div>
            <CardDescription>
              Numeral is running your first nexus study across every state you
              have sold into, including your {skin.marketplaceChannel} sales.
              Check back tomorrow; this page fills in on its own.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              render={<Link href="/dashboard/tax" />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              Back to overview
            </Button>
          </CardContent>
        </Card>
        <UnderTheHood trace={trace} mode={mode.mode} />
      </div>
    );
  }

  const rows = sortRows(
    buildRows({
      study: study.data,
      registrations: registrations.ok ? registrations.data : null,
    }),
  );
  const us = usRows(rows);
  const counts = statusCounts(us);
  const unregistered = us.filter(
    (row) =>
      row.status === "has_nexus" && row.registration.state !== "registered",
  ).length;
  const jurisdictionNames = new Map(
    rows.map((row) => [row.jurisdictionId, row.name]),
  );
  const joinTrace = registrations.ok
    ? [study.trace, registrations.trace]
    : [study.trace];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Nexus</h2>
          <p className="text-muted-foreground text-sm">
            Where your sales, through {skin.marketplaceChannel} and{" "}
            {skin.storefrontChannel.toLowerCase()}, have created a tax
            obligation, and where you are getting close.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RecordedBadge trace={joinTrace} />
          <Button
            render={<a href="/api/export/nexus" download />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            <Download className="size-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      <NexusStatusChips
        counts={counts}
        runDate={study.data.run_date}
        unregisteredCount={unregistered}
      />

      {!registrations.ok && registrations.code !== "merchant_not_linked" && (
        <PanelError
          title="Registration status unavailable"
          message="The nexus study loaded, but registrations did not, so the registration column reads Unavailable."
          code={registrations.code}
        />
      )}

      <NexusExplorer
        rows={us}
        initialState={requested}
        marketplaceChannel={skin.marketplaceChannel}
        storefrontChannel={skin.storefrontChannel}
        mapHeader={<RecordedBadge trace={joinTrace} />}
        tableHeader={<RecordedBadge trace={joinTrace} />}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <PhysicalPresenceList
          presences={study.data.physical_presences}
          jurisdictionNames={jurisdictionNames}
          trace={study.trace}
        />
        <OutsideUsList rows={outsideUsRows(rows)} trace={study.trace} />
      </div>

      <UnderTheHood trace={trace} mode={mode.mode} />
    </div>
  );
}
