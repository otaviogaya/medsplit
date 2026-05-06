import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

if (process.env.NEXT_USE_CLOUDFLARE_DEV === "1") {
  void import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) => {
    initOpenNextCloudflareForDev();
  });
}
