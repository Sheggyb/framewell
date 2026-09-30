"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale, useT } from "@/i18n";
import { LanguageButton } from "./i18n/Language";
import { PageTitle } from "./i18n/PageTitle";

/**
 * Who runs Framewell and how to reach them, shown on the Privacy and Terms pages.
 */
export const OPERATOR = {
  name: "Sargon Dafid",
  email: "sargondafid+framewell@gmail.com",
};

/** When the legal pages last changed (year, month 1-12, day). */
const LEGAL_UPDATED = [2026, 9, 28] as const;

/** Plain-language legal page: readable on a phone, same look as the rest of the site. */
export function LegalPage({
  page,
  title,
  intro,
  children,
}: {
  page: "privacy" | "terms";
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const [y, m, d] = LEGAL_UPDATED;
  // English keeps the "28 September 2026" style.
  const updated = new Date(y, m - 1, d).toLocaleDateString(locale === "en" ? "en-GB" : locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <main className="min-h-dvh bg-[#09090b] text-neutral-100">
      <div className="mx-auto max-w-2xl px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-16">
        <PageTitle page={page} />
        <nav className="flex h-14 items-center justify-between">
          <Link href="/" className="-ms-2 flex items-center gap-1 rounded-full px-2 py-1.5 text-sm text-neutral-300 hover:bg-white/[0.06]">
            <ChevronLeft className="size-5 rtl:rotate-180" /> Framewell
          </Link>
          <LanguageButton />
        </nav>
        {locale !== "en" && (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neutral-400">
            {t("legal.translationNote")}
          </p>
        )}
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-neutral-500">{t("legal.lastUpdated", { date: updated })}</p>
        <p className="mt-6 rounded-2xl border border-gold/25 bg-gold/[0.05] p-5 leading-relaxed text-neutral-200">{intro}</p>
        <div className="mt-10 flex flex-col gap-8 text-[15px] leading-relaxed text-neutral-300 [&_a]:text-gold [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-neutral-100 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:ps-5">
          {children}
        </div>
        <p className="mt-12 flex gap-4 text-sm text-neutral-500">
          <Link href="/privacy" className="hover:text-neutral-300">
            {t("legal.privacyLink")}
          </Link>
          <Link href="/terms" className="hover:text-neutral-300">
            {t("legal.termsLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
