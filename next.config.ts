import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Keep in sync with vercel.json, which applies the same headers in production.
const securityHeaders = [
  // Cross-origin isolation enables SharedArrayBuffer for worker-based decode/export.
  // Side effect: every cross-origin resource must send CORP/CORS headers, so keep assets self-hosted.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  // No guessing file types, no embedding Framewell in other sites (clickjacking).
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Only what the editor uses: microphone (voiceover), full screen, keeping the screen on during export.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), midi=(), browsing-topics=(), microphone=(self), fullscreen=(self), screen-wake-lock=(self)",
  },
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
      return [{ source: "/:path*", headers: securityHeaders }];
    },
  }),
};

export default nextConfig;
