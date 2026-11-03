import { describe, expect, it } from "vitest"
import { toCsv, type CsvColumn } from "@/lib/csv"

interface Row {
  city: string | null
  amount: string | number
}

const columns: CsvColumn<Row>[] = [
  { header: "city", value: (row) => row.city },
  { header: "amount", value: (row) => row.amount },
]

function dataLine(row: Row): string {
  return toCsv([row], columns).split("\r\n")[1]
}

describe("toCsv", () => {
  it("prefixes cells a spreadsheet would run as a formula", () => {
    expect(dataLine({ city: '=HYPERLINK("http://x.test","Austin")', amount: 1 })).toBe(
      `"'=HYPERLINK(""http://x.test"",""Austin"")",1`
    )
    expect(dataLine({ city: "+1+2", amount: 1 })).toBe("'+1+2,1")
    expect(dataLine({ city: "@SUM(A1)", amount: 1 })).toBe("'@SUM(A1),1")
    expect(dataLine({ city: "-2+3", amount: 1 })).toBe("'-2+3,1")
    expect(dataLine({ city: "\tTAB", amount: 1 })).toBe("'\tTAB,1")
  })

  it("leaves plain negative amounts and ordinary text alone", () => {
    expect(dataLine({ city: "Austin", amount: "-12.50" })).toBe("Austin,-12.50")
    expect(dataLine({ city: "Winston-Salem", amount: -3 })).toBe("Winston-Salem,-3")
    expect(dataLine({ city: null, amount: "0.00" })).toBe(",0.00")
  })

  it("still quotes commas, quotes and newlines", () => {
    expect(dataLine({ city: 'St. "Paul", MN', amount: 1 })).toBe('"St. ""Paul"", MN",1')
  })
})
