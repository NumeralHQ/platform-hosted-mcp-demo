import { readFileSync } from "node:fs";
import path from "node:path";
import { BookOpen, ExternalLink } from "lucide-react";
import { CodePanel } from "@/components/dev/code-panel";
import { ErrorMatrix } from "@/components/dev/error-matrix";
import { KeyTable } from "@/components/dev/key-table";
import { DevSection } from "@/components/dev/section";
import { ToolCatalog, type CatalogEntry } from "@/components/dev/tool-catalog";
import { PoweredBy } from "@/components/shell/powered-by";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasKey, listTools, mcpUrl } from "@/lib/numeral/client";
import { getSkin } from "@/platform.config";

const REPO_URL = "https://github.com/NumeralHQ/platform-hosted-mcp-demo";

/**
 * Public page; no session and no cookies (the skin comes from the env, not
 * the admin override), so it is static and revalidates once a minute in
 * production: the live catalog costs one call per minute, not one per view.
 */
export const revalidate = 60;

const CALLS_PER_MINUTE = 100;

function readSource(relative: string): string | null {
  try {
    return readFileSync(path.join(process.cwd(), relative), "utf8");
  } catch {
    return null;
  }
}

/** The `panel()` function only, lifted from the real file so it cannot drift. */
function extractPanel(source: string): string | null {
  const start = source.indexOf("async function panel<T>(");
  if (start === -1) {
    return null;
  }
  const end = source.indexOf("\n}\n", start);
  if (end === -1) {
    return null;
  }
  const docStart = source.lastIndexOf("/**", start);
  return source.slice(docStart === -1 ? start : docStart, end + 2);
}

async function loadCatalog(): Promise<{
  live: CatalogEntry[] | null;
  error: string | null;
}> {
  if (!hasKey("test")) {
    return { live: null, error: "NUMERAL_TEST_API_KEY is not set" };
  }
  try {
    const tools = await listTools("test");
    return {
      live: tools.map((t) => ({ name: t.name, description: t.description })),
      error: null,
    };
  } catch (error) {
    return {
      live: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default async function IntegrationPage() {
  const skin = getSkin(process.env.PLATFORM_SKIN);
  const catalog = await loadCatalog();
  const clientSource = readSource("lib/numeral/client.ts");
  const indexSource = readSource("lib/numeral/index.ts");
  const panelSource = indexSource ? extractPanel(indexSource) : null;

  const sections = [
    ["how", "How it works"],
    ["keys", "Two keys"],
    ["errors", "Error codes"],
    ["catalog", "Tool catalog"],
    ["budget", "Request budget"],
    ["code", "The code"],
    ["modes", "Data modes"],
  ] as const;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-12 px-6 py-10 lg:px-10">
      <header className="space-y-4">
        <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
          <BookOpen className="size-3.5" /> For platform engineers
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          How {skin.name} reads a merchant&apos;s tax data
        </h1>
        <p className="text-muted-foreground max-w-3xl text-base leading-relaxed">
          The Tax tab in this demo is built on the Numeral MCP at{" "}
          <span className="font-mono">{mcpUrl()}</span>. There is no SDK, no
          session, and no per-merchant credential: one stateless POST per read,
          authenticated with the platform&apos;s own secret key, with{" "}
          <span className="font-mono">merchant_id</span> filled in on the server
          from the signed-in session. This page is the whole integration.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            render={<a href={REPO_URL} target="_blank" rel="noreferrer" />}
            nativeButton={false}
            size="sm"
          >
            Source on GitHub <ExternalLink className="ml-1 size-4" />
          </Button>
          <Button
            render={<a href="/dashboard/tax" />}
            nativeButton={false}
            size="sm"
            variant="outline"
          >
            See it in the dashboard
          </Button>
        </div>
        <nav
          aria-label="On this page"
          className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
        >
          {sections.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <DevSection
        id="how"
        title="How it works"
        lede="Four facts cover the whole design. Everything else on this page is detail."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Fact
            title="One stateless POST per tool call"
            body={
              <>
                JSON-RPC <span className="font-mono">tools/call</span> over
                HTTPS (MCP Streamable HTTP). No{" "}
                <span className="font-mono">initialize</span>, no session id, no
                long-lived connection. A tool result is JSON in a text content
                block; a structured tool error sets{" "}
                <span className="font-mono">isError</span> and returns{" "}
                <span className="font-mono">error_code</span>.
              </>
            }
          />
          <Fact
            title="The platform's key is the Bearer token"
            body={
              <>
                <span className="font-mono">Authorization: Bearer sk_…</span>.
                The key identifies the platform&apos;s Numeral account and the
                mode, so no tool takes an account id and a request cannot cross
                tenants.
              </>
            }
          />
          <Fact
            title="merchant_id is injected server-side"
            body={
              <>
                The only argument this app adds is the merchant id, read from
                the signed session cookie. The browser never chooses whose data
                it sees; there is no client-side call to Numeral at all.
              </>
            }
          />
          <Fact
            title="The merchant consents, in Numeral"
            body={
              <>
                Merchant-linked reads (nexus, filings, registrations) return{" "}
                <span className="font-mono">merchant_not_linked</span> until the
                merchant adds {skin.name} under Connections in their Numeral
                account, verifies by email code, and switches on &ldquo;Share
                with {skin.name}&rdquo;. The platform never holds the
                merchant&apos;s credentials, and the merchant can switch sharing
                off.
              </>
            }
          />
        </div>
      </DevSection>

      <DevSection
        id="keys"
        title="Two keys"
        lede={
          <>
            Sales tools read the platform&apos;s own transactions and work on
            the sandbox key. Merchant and account tools read through the
            merchant&apos;s consent, which Numeral only honours on the live key.
            This table is rendered from{" "}
            <span className="font-mono">TOOL_KEY_KIND</span> in{" "}
            <span className="font-mono">lib/numeral/schemas.ts</span>.
          </>
        }
      >
        <KeyTable />
      </DevSection>

      <DevSection
        id="errors"
        title="Error codes"
        lede={
          <>
            A tool error is a normal result with{" "}
            <span className="font-mono">isError: true</span> and a body of{" "}
            <span className="font-mono">{"{ error_code, error_message }"}</span>
            . The client throws{" "}
            <span className="font-mono">NumeralToolError</span> with the code;
            the page branches on it. Rendered from{" "}
            <span className="font-mono">NUMERAL_ERROR_CODES</span> in{" "}
            <span className="font-mono">lib/numeral/errors.ts</span>.
          </>
        }
      >
        <ErrorMatrix />
      </DevSection>

      <DevSection
        id="catalog"
        title="Tool catalog"
        lede={
          <>
            <span className="font-mono">tools/list</span> on the same endpoint
            returns every tool with its JSON schema. This demo uses nine read
            tools.
          </>
        }
      >
        <ToolCatalog live={catalog.live} error={catalog.error} />
      </DevSection>

      <DevSection
        id="budget"
        title="Request budget"
        lede="Plan reads per page, not per component, and cache what does not change between visits."
      >
        <Card>
          <CardContent className="grid gap-4 pt-0 sm:grid-cols-3">
            <Stat
              value={`${CALLS_PER_MINUTE}/min`}
              label="Calls per platform account"
            />
            <Stat value="1" label="POST per tool call, no handshake" />
            <Stat value="60 s" label="This page's cache in production" />
          </CardContent>
        </Card>
        <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
          The budget is per platform account, shared across all merchants, so a
          dashboard page should make a handful of calls (the Tax overview here
          makes four) and cache list results server-side. The heaviest read in
          this demo, <span className="font-mono">list_filings</span> with{" "}
          <span className="font-mono">limit: 500</span>, is one call. Fetch
          per-filing detail only when the merchant opens a filing.
        </p>
      </DevSection>

      <DevSection
        id="code"
        title="The code"
        lede={
          <>
            These panels read the real files at request time. The first is the
            complete client a platform needs; the second is the one function
            that turns a call into a typed result or a code to branch on.
          </>
        }
      >
        {clientSource ? (
          <CodePanel
            file="lib/numeral/client.ts"
            code={clientSource}
            note="complete file"
          />
        ) : (
          <SourceUnavailable file="lib/numeral/client.ts" />
        )}
        {panelSource ? (
          <CodePanel
            file="lib/numeral/index.ts"
            code={panelSource}
            note="panel() only"
          />
        ) : (
          <SourceUnavailable file="lib/numeral/index.ts" />
        )}
      </DevSection>

      <DevSection
        id="modes"
        title="Data modes"
        lede={
          <>
            <span className="font-mono">NUMERAL_MODE</span> decides where a
            panel&apos;s data comes from. The client is identical in every mode;
            only the data source in front of it changes.
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <ModeCard
            name="live"
            body="Every panel calls the MCP with the keys in the environment. Errors surface as panel states, never as a broken page."
          />
          <ModeCard
            name="replay"
            body="Every panel reads fixtures/<scenario>/<tool>.json, recorded with `bun run record` and redacted. Zero keys; what a fresh clone runs."
          />
          <ModeCard
            name="auto"
            body="Live, but a panel falls back to its fixture when the live call cannot succeed here: no key, sandbox key on a live-only tool, merchant not linked. Fallbacks are badged “Recorded data”."
          />
        </div>
        <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
          Default: <span className="font-mono">auto</span> when any key is set,
          otherwise <span className="font-mono">replay</span>. See{" "}
          <span className="font-mono">.env.example</span> in the repo for every
          variable.
        </p>
      </DevSection>

      <footer className="border-t pt-6">
        <PoweredBy />
      </footer>
    </main>
  );
}

function Fact({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="leading-relaxed">{body}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

function ModeCard({ name, body }: { name: string; body: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="font-mono">{name}</CardTitle>
        <CardDescription className="leading-relaxed">{body}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function SourceUnavailable({ file }: { file: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="font-mono text-sm">{file}</CardTitle>
        <CardDescription>
          The source file is not bundled in this deployment. Read it on{" "}
          <a
            href={REPO_URL}
            className="underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          .
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
