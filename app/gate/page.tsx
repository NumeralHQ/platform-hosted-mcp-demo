import { Lock, ShieldCheck } from "lucide-react";
import { PlatformMark } from "@/components/shell/platform-mark";
import { PoweredBy } from "@/components/shell/powered-by";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentSkin } from "@/lib/skin";
import { allowedEmailDomains, gateMode } from "@/lib/staff-gate";
import { unlockGate } from "./actions";
import { safeNextPath } from "./gate-cookie";

const ERROR_COPY: Record<string, string> = {
  domain: "That Google account is not on an allowed domain.",
  state: "The sign-in attempt expired or was tampered with. Try again.",
  oauth: "Google did not complete the sign-in. Try again.",
  "1": "That passcode did not match. Try again.",
};

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const [skin, params] = await Promise.all([currentSkin(), searchParams]);
  const next = safeNextPath(params.next);
  const mode = gateMode();
  const error = params.error ? ERROR_COPY[params.error] : undefined;
  const domains = allowedEmailDomains();
  const domainList = domains.map((domain) => `@${domain}`).join(", ");

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3 text-center">
          <PlatformMark skin={skin} size="lg" />
          <h1 className="text-2xl font-semibold tracking-tight">
            This demo is private
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === "google"
              ? `Sign in with your ${domainList} Google account to continue.`
              : "Enter the passcode you were given to continue."}
          </p>
        </div>

        {mode === "google" ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                <CardTitle>Staff sign-in</CardTitle>
              </div>
              <CardDescription>
                Only {domainList} accounts are admitted. Stays signed in on this
                browser for 30 days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button
                render={
                  <a
                    href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
                  />
                }
                nativeButton={false}
                className="w-full"
              >
                <GoogleMark />
                Continue with Google
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="size-4" />
                <CardTitle>Passcode</CardTitle>
              </div>
              <CardDescription>
                Stays unlocked in this browser for 30 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={unlockGate} className="space-y-4">
                <input type="hidden" name="next" value={next} />
                <div className="space-y-2">
                  <Label htmlFor="passcode">Passcode</Label>
                  <Input
                    id="passcode"
                    name="passcode"
                    type="password"
                    autoComplete="off"
                    autoFocus
                    required
                    aria-invalid={error ? true : undefined}
                  />
                  {error && <p className="text-destructive text-xs">{error}</p>}
                </div>
                <Button type="submit" className="w-full">
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <PoweredBy />
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="mr-2 size-4">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.68-.06-1.36-.19-2.02H12v3.83h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.32 2.98-7.33Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.24-2.5c-.9.6-2.04.96-3.38.96a5.99 5.99 0 0 1-5.64-4.15H3.02v2.58A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.36 13.87A6 6 0 0 1 6.05 12c0-.65.11-1.28.31-1.87V7.55H3.02A10 10 0 0 0 2 12c0 1.61.39 3.14 1.02 4.45l3.34-2.58Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.98c1.47 0 2.78.5 3.82 1.5l2.86-2.86A9.97 9.97 0 0 0 12 2 9.99 9.99 0 0 0 3.02 7.55l3.34 2.58A5.99 5.99 0 0 1 12 5.98Z"
      />
    </svg>
  );
}
