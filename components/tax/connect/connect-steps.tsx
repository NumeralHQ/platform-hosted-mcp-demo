import {
  ExternalLink,
  KeyRound,
  Link2,
  Search,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlatformSkin } from "@/platform.config";
import type { Merchant } from "@/lib/numeral";
import type { ReactNode } from "react";

export const NUMERAL_APP_URL = "https://dashboard.numeralhq.com/dashboard";

/**
 * The consent flow, as the merchant will see it in Numeral. Nothing here
 * happens inside the platform: the platform waits until the merchant has
 * switched on sharing, then its reads start succeeding.
 */
export function ConnectSteps({
  skin,
  merchant,
}: {
  skin: PlatformSkin;
  merchant: Merchant | null;
}) {
  const steps: Array<{ icon: ReactNode; title: string; body: ReactNode }> = [
    {
      icon: <Link2 className="size-4" />,
      title: `Open Numeral and add ${skin.name} under Connections`,
      body: (
        <>
          Sign in to your own Numeral account, go to{" "}
          <span className="font-medium">Connections</span>, and choose{" "}
          <span className="font-medium">{skin.name}</span> from the list of
          platforms.
        </>
      ),
    },
    {
      icon: <Search className="size-4" />,
      title: `Find your ${skin.name} business`,
      body: (
        <>
          Search for your business by name
          {merchant ? (
            <>
              {" "}
              (here that is <span className="font-medium">{merchant.name}</span>
              )
            </>
          ) : null}
          . Numeral matches it to the {skin.sellerNoun} record {skin.name} keeps
          for you.
        </>
      ),
    },
    {
      icon: <KeyRound className="size-4" />,
      title: "Enter the code Numeral emails you",
      body: (
        <>
          Numeral sends a one-time code to the email on your {skin.name} account
          to confirm you own it. The code never passes through {skin.name}.
        </>
      ),
    },
    {
      icon: <ToggleRight className="size-4" />,
      title: `Switch on "Share with ${skin.name}"`,
      body: (
        <>
          The switch is the consent. Until it is on, {skin.name} sees nothing
          from your Numeral account; the moment it is on, this tab fills in.
          Switch it off any time to stop sharing.
        </>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect in Numeral</CardTitle>
        <CardDescription>
          Four steps, all inside your Numeral account. {skin.name} never asks
          for your Numeral login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <div className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums">
                {index + 1}
              </div>
              <div className="space-y-1 pt-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {step.icon}
                  {step.title}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <Button
          render={<a href={NUMERAL_APP_URL} target="_blank" rel="noreferrer" />}
          nativeButton={false}
        >
          Open Numeral <ExternalLink className="ml-1 size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
