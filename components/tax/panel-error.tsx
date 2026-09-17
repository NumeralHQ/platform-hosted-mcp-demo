import { AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

/**
 * A panel that could not load and is not the "not connected" case (that one
 * has its own card). Says what happened without a stack trace.
 */
export function PanelError({ title, message, code }: { title: string; message: string; code?: string | null }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-start gap-3 pt-6">
        <AlertTriangle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground">
            {message}
            {code ? <span className="ml-1 font-mono text-xs">({code})</span> : null}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
