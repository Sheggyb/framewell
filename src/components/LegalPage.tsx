import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Who runs Framewell and how to reach them, shown on the Privacy and Terms pages.
 */
export const OPERATOR = {
  name: "Sargon Dafid",
  email: "sargondafid+framewell@gmail.com",
  country: "Sweden",
};

export const LEGAL_UPDATED = "28 September 2026";

/** Plain-language legal page: readable on a phone, same look as the rest of the site. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#09090b] text-neutral-100">
      <div className="mx-auto max-w-2xl px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-16">
        <nav className="flex h-14 items-center">
          <Link href="/" className="-ml-2 flex items-center gap-1 rounded-full px-2 py-1.5 text-sm text-neutral-300 hover:bg-white/[0.06]">
            <ChevronLeft className="size-5" /> Framewell
          </Link>
        </nav>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-neutral-500">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-6 rounded-2xl border border-gold/25 bg-gold/[0.05] p-5 leading-relaxed text-neutral-200">{intro}</p>
        <div className="mt-10 flex flex-col gap-8 text-[15px] leading-relaxed text-neutral-300 [&_a]:text-gold [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-neutral-100 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
        <p className="mt-12 flex gap-4 text-sm text-neutral-500">
          <Link href="/privacy" className="hover:text-neutral-300">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-neutral-300">
            Terms
          </Link>
        </p>
      </div>
    </main>
  );
}
