import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    // Replay fixtures are read at request time; /dev/integration shows the
    // real client source. Both must ship with the serverless bundle.
    "/**": ["./fixtures/**/*", "./lib/numeral/*.ts"],
  },
}

export default nextConfig
