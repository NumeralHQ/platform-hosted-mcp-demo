import Link from "next/link";
import { Link2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlatformSkin } from "@/platform.config";

/**
 * What the account panels collapse to when the merchant has not connected
 * their Numeral account to the platform (or has not switched on sharing).
 * The sales split still renders above it: that data is the platform's own.
 */
export function ConnectCard({
  skin,
  compact = false,
}: {
  skin: PlatformSkin;
  compact?: boolean;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 className="size-4" />
          <CardTitle className="text-base">
            Connect your Numeral account
          </CardTitle>
        </div>
        <CardDescription>
          See your filings, nexus position, and registrations here in{" "}
          {skin.name}. {skin.name} can only read what you choose to share, and
          you can switch it off at any time.
        </CardDescription>
      </CardHeader>
      {!compact && (
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button
            render={<Link href="/dashboard/tax/connect" />}
            nativeButton={false}
            size="sm"
          >
            How to connect
          </Button>
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ShieldCheck className="size-3.5" /> Read-only. Never your login or
            account credentials.
          </span>
        </CardContent>
      )}
    </Card>
  );
}
