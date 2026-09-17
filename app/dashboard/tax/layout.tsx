import { TaxTabs } from "@/components/tax/tax-tabs"
import { currentSkin } from "@/lib/skin"

export default async function TaxLayout({ children }: { children: React.ReactNode }) {
  const skin = await currentSkin()
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tax</h1>
          <p className="text-muted-foreground text-sm">
            What {skin.name} collected for you, what you owe, and where you stand in every state.
            <span className="ml-1">Data from Numeral.</span>
          </p>
        </div>
      </div>
      <TaxTabs />
      <div>{children}</div>
    </div>
  )
}
