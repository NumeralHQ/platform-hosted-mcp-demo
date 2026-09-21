import { Sidebar } from "@/components/shell/sidebar";
import { DemoModeBanner } from "@/components/shell/demo-mode-banner";
import { PoweredBy } from "@/components/shell/powered-by";
import { currentMode, listFilings } from "@/lib/numeral";
import { requireMerchant } from "@/lib/session";
import { currentSkin } from "@/lib/skin";
import { currentStaff } from "@/lib/staff";
import { DateTime } from "luxon";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const merchant = await requireMerchant();
  const skin = await currentSkin();
  const [mode, staff] = await Promise.all([currentMode(), currentStaff()]);
  // The little red dot on the Tax nav item: anything due in the next 30 days.
  const today = DateTime.utc();
  const dueSoon = await listFilings(merchant.merchantId, {
    dueAfter: today.toISODate() ?? undefined,
    dueBefore: today.plus({ days: 30 }).toISODate() ?? undefined,
    limit: 50,
  });
  const dueSoonCount = dueSoon.ok
    ? dueSoon.data.filings.filter((filing) => filing.status !== "filed").length
    : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <DemoModeBanner
        mode={mode.mode}
        scenario={mode.scenario}
        staffEmail={staff?.email}
      />
      <div className="flex flex-1">
        <Sidebar
          skin={skin}
          merchantName={merchant.merchantName}
          taxBadge={dueSoonCount}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
          <footer className="border-t px-6 py-4">
            <PoweredBy />
          </footer>
        </div>
      </div>
    </div>
  );
}
