import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { NUMERAL_ERROR_CODES, type NumeralErrorCode } from "@/lib/numeral/errors"

interface ErrorRow {
  code: NumeralErrorCode | "study_status: pending_first_run"
  meaning: string
  uiDoes: string
}

const ROWS: readonly ErrorRow[] = [
  {
    code: NUMERAL_ERROR_CODES.merchantNotLinked,
    meaning: "The merchant has not connected their Numeral account, or has not switched on sharing with the platform.",
    uiDoes: "Collapse the account panels to the connect card. The sales split (platform data) keeps rendering.",
  },
  {
    code: NUMERAL_ERROR_CODES.liveModeRequired,
    meaning: "A merchant-linked tool was called with an sk_test_ key. Those reads exist only in live mode.",
    uiDoes: "Configuration error, not a merchant state: use the sk_prod_ key for that tool. In auto mode the fixture stands in.",
  },
  {
    code: NUMERAL_ERROR_CODES.merchantNotFound,
    meaning: "merchant_id is not a merchant on this platform account.",
    uiDoes: "Treated as a bug in the session mapping: show a panel error with the code, never a stack trace.",
  },
  {
    code: NUMERAL_ERROR_CODES.internalError,
    meaning: "Numeral could not complete the call.",
    uiDoes: "Panel error with a retry hint. Other panels on the page are unaffected because each call is independent.",
  },
  {
    code: NUMERAL_ERROR_CODES.filingNotFound,
    meaning: "filing_id is not a filing on the linked account.",
    uiDoes: "Filing detail shows a not-found message; the list stays.",
  },
  {
    code: NUMERAL_ERROR_CODES.transactionNotFound,
    meaning: "transaction_id is not one of the platform's transactions.",
    uiDoes: "Transaction detail shows a not-found message.",
  },
  {
    code: "study_status: pending_first_run",
    meaning: "Not an error. get_nexus_study succeeded but Numeral has not run the merchant's first study yet, so jurisdictions is empty.",
    uiDoes: "Nexus panel shows a pending state instead of an empty map.",
  },
]

/** Every code the UI branches on and what it does for each. */
export function ErrorMatrix() {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableHead>Code</TableHead>
            <TableHead>Meaning</TableHead>
            <TableHead>What this UI does</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.code}>
              <TableCell className="align-top font-mono text-xs">{row.code}</TableCell>
              <TableCell className="text-muted-foreground max-w-xs align-top whitespace-normal text-xs leading-relaxed">
                {row.meaning}
              </TableCell>
              <TableCell className="max-w-sm align-top whitespace-normal text-xs leading-relaxed">{row.uiDoes}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
