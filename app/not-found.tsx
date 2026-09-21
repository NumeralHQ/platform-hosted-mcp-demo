import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Nothing here</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        That page is not part of the demo. The Tax tab is where everything
        happens.
      </p>
      <Button render={<Link href="/dashboard/tax" />} nativeButton={false}>
        Go to Tax
      </Button>
    </main>
  );
}
