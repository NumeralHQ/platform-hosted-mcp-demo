import "server-only"
import { cookies } from "next/headers"
import { getSkin, type PlatformSkin } from "@/platform.config"

/** The active skin: an admin cookie override, else the deployment default. */
export async function currentSkin(): Promise<PlatformSkin> {
  const jar = await cookies()
  return getSkin(jar.get("demo_skin")?.value ?? process.env.PLATFORM_SKIN)
}
