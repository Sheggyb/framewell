import type { MetadataRoute } from "next";

// Required for static export.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Framewell",
    short_name: "Framewell",
    description: "Free video editor for creators. No watermark, no account, your videos stay on your device.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    // TODO(launch): add 192px and 512px PNG icons for Android install prompts.
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
