import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Replay mode reads fixtures/ at request time; make sure they ship with the
  // serverless bundle on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./fixtures/**/*"],
  },
}

export default nextConfig
