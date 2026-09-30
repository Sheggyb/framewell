import type { Metadata } from "next";
import { TermsContent } from "@/components/legal/TermsContent";

export const metadata: Metadata = {
  title: "Terms",
  description: "The simple rules for using Framewell, the free, private video editor.",
};

/** The text lives in a client component so it follows the chosen language; the page is still prerendered. */
export default function TermsPage() {
  return <TermsContent />;
}
