import { Mountain } from "lucide-react"
import type { PlatformSkin } from "@/platform.config"
import { cn } from "@/lib/utils"

export function PlatformMark({ skin, size = "md" }: { skin: PlatformSkin; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "size-12 rounded-2xl" : size === "sm" ? "size-7 rounded-lg" : "size-9 rounded-xl"
  const icon = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5"
  return (
    <div className="flex items-center justify-center gap-3">
      <div className={cn("flex items-center justify-center text-white", box, skin.accent.bg)}>
        <Mountain className={icon} strokeWidth={2.25} />
      </div>
      {size !== "sm" && <span className="text-lg font-semibold tracking-tight">{skin.name}</span>}
    </div>
  )
}
