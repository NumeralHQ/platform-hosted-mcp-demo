import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MERCHANT_LINKED_TOOLS, TOOL_KEY_KIND, TOOL_NAMES, type ToolName } from "@/lib/numeral/schemas"

const PURPOSE: Record<ToolName, string> = {
  list_merchants: "The platform's merchant roster, with each merchant's link state",
  get_merchant: "One merchant: address, tax ids, and whether they share their Numeral account",
  get_sales_summary: "Monthly sales and tax by state and liability, from the platform's own transactions",
  list_transactions: "The platform's transactions for one merchant, newest first",
  get_transaction: "One transaction with line items and per-jurisdiction tax",
  get_nexus_study: "The merchant's nexus study from their own Numeral account",
  list_filings: "The merchant's returns: period, due date, status, amounts",
  get_filing: "One return, including calculated sales data",
  list_registrations: "The merchant's sales tax registrations",
}

/** Which key each tool needs, generated from the same table the client uses. */
export function KeyTable() {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableHead>Tool</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Needs merchant consent</TableHead>
            <TableHead className="w-full">Reads</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TOOL_NAMES.map((tool) => {
            const kind = TOOL_KEY_KIND[tool]
            return (
              <TableRow key={tool}>
                <TableCell className="font-mono text-xs">{tool}</TableCell>
                <TableCell>
                  <Badge variant={kind === "live" ? "default" : "secondary"} className="font-mono">
                    {kind === "live" ? "sk_prod_" : "sk_test_"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {MERCHANT_LINKED_TOOLS.has(tool) ? "Yes: merchant_not_linked until shared" : "No"}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-normal text-xs">{PURPOSE[tool]}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
