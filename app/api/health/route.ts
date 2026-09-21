import { dataMode } from "@/lib/numeral/data-source"

export function GET(): Response {
  return Response.json({ ok: true, mode: dataMode() })
}
