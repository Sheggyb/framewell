import type { Metadata } from "next";
import { PrivacyContent } from "@/components/legal/PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Framewell doesn't collect your videos or personal data. Everything stays on your device.",
};

/** The text lives in a client component so it follows the chosen language; the page is still prerendered. */
export default function PrivacyPage() {
  return <PrivacyContent />;
}
