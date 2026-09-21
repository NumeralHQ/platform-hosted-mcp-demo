import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlatformMark } from "@/components/shell/platform-mark";
import { DemoModeBanner } from "@/components/shell/demo-mode-banner";
import { PoweredBy } from "@/components/shell/powered-by";
import { currentMode, listMerchants } from "@/lib/numeral";
import { getSession } from "@/lib/session";
import { currentSkin } from "@/lib/skin";
import { currentStaff } from "@/lib/staff";

async function signIn(formData: FormData): Promise<void> {
  "use server";
  const merchantId = formData.get("merchant_id");
  const merchantName = formData.get("merchant_name");
  if (typeof merchantId !== "string" || merchantId.length === 0) {
    return;
  }
  const session = await getSession();
  session.merchantId = merchantId;
  session.merchantName =
    typeof merchantName === "string" ? merchantName : merchantId;
  await session.save();
  redirect("/dashboard");
}

export default async function LoginPage() {
  const skin = await currentSkin();
  const [merchants, mode, staff] = await Promise.all([
    listMerchants(25),
    currentMode(),
    currentStaff(),
  ]);

  return (
    <main className="flex min-h-screen flex-col">
      <DemoModeBanner
        mode={mode.mode}
        scenario={mode.scenario}
        staffEmail={staff?.email}
      />
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg space-y-8">
          <div className="space-y-3 text-center">
            <PlatformMark skin={skin} size="lg" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in to {skin.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {skin.tagline} Pick a {skin.sellerNoun} account to continue.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your accounts</CardTitle>
              <CardDescription>
                This is a demo. Each account is a real merchant on the
                platform&apos;s Numeral roster.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {merchants.ok ? (
                merchants.data.merchants.map((merchant) => (
                  <form key={merchant.id} action={signIn}>
                    <input
                      type="hidden"
                      name="merchant_id"
                      value={merchant.reference_merchant_id}
                    />
                    <input
                      type="hidden"
                      name="merchant_name"
                      value={merchant.name}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      className="h-auto w-full justify-between px-4 py-3 text-left"
                    >
                      <span className="flex flex-col">
                        <span className="font-medium">{merchant.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {merchant.default_address.address_city},{" "}
                          {merchant.default_address.address_province}
                        </span>
                      </span>
                      {merchant.linked ? (
                        <Badge variant="secondary">Numeral connected</Badge>
                      ) : (
                        <Badge variant="outline">Not connected</Badge>
                      )}
                    </Button>
                  </form>
                ))
              ) : (
                <p className="text-destructive text-sm">
                  Could not load the merchant roster: {merchants.error.message}
                </p>
              )}
            </CardContent>
          </Card>

          <PoweredBy />
        </div>
      </div>
    </main>
  );
}
