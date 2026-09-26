import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Cross-origin isolation enables SharedArrayBuffer for worker-based decode/export.
// Side effect: every cross-origin resource must send CORP/CORS headers, so keep assets self-hosted.
// Keep in sync with vercel.json, which applies the same headers in production.
const crossOriginIsolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const nextConfig: NextConfig = {
  // Framewell is fully client-side: ship it as a static site (no server functions).
  output: "export",
  // Keep the dev badge off the editor's "Add" button.
  devIndicators: { position: "top-right" },
  // Let phones on the local network load dev assets (Next blocks non-localhost origins by default).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  // `headers` only works in `next dev` for static exports; production uses vercel.json.
  ...(isDev && {
    async headers() {
      return [{ source: "/:path*", headers: crossOriginIsolation }];
    },
  }),
};

export default nextConfig;
