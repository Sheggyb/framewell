"use client";

import { Check, ChevronRight, Languages, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LOCALES, useI18n, useT, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

const nameOf = (id: Locale) => LOCALES.find((l) => l.id === id)!.name;

/**
 * The language list: each language written in itself, so anyone can find theirs even when the
 * app is in a language they can't read. Bottom sheet on phones, dialog on larger screens.
 */
export function LanguageSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const current = useI18n((s) => s.locale);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const choose = (id: Locale) => {
    void useI18n.getState().setLocale(id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("common.language")}
        className="w-full max-w-sm rounded-t-2xl bg-[#111114] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-white/10 sm:rounded-2xl"
      >
        <div className="flex items-center gap-2 px-2 pt-1 pb-2">
          <Languages className="size-4 text-gold" aria-hidden />
          <h2 className="text-base font-semibold text-neutral-100">{t("common.language")}</h2>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="ms-auto flex size-8 items-center justify-center rounded-full bg-white/10 text-neutral-300"
          >
            <X className="size-4" />
          </button>
        </div>
        <ul className="flex flex-col">
          {LOCALES.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                lang={l.id}
                aria-pressed={current === l.id}
                onClick={() => choose(l.id)}
                className={cn(
                  "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-start text-[15px] transition-colors",
                  current === l.id ? "bg-gold/10 text-white" : "text-neutral-200 hover:bg-white/[0.06]",
                )}
              >
                {/* Isolated so Arabic letters render right-to-left, but lined up with the other rows. */}
                <bdi>{l.name}</bdi>
                {current === l.id && <Check className="ms-auto size-4 text-gold" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Compact language button for top bars: globe + language code (EN, SV…). */
export function LanguageButton({ className }: { className?: string }) {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("common.languageButton", { name: nameOf(locale) })}
        title={t("common.languageButton", { name: nameOf(locale) })}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold uppercase tracking-wide text-neutral-200 transition-colors hover:bg-white/10",
          className,
        )}
      >
        <Languages className="size-4 text-gold" aria-hidden />
        {locale}
      </button>
      {open && <LanguageSheet onClose={() => setOpen(false)} />}
    </>
  );
}

/** A settings row ("Language · Svenska ›") that opens the language list. */
export function LanguageRow() {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-start text-sm text-neutral-200 hover:bg-white/[0.06] [&_svg]:size-4"
      >
        <Languages className="text-neutral-400" aria-hidden />
        <span className="flex-1">{t("common.language")}</span>
        <span className="text-neutral-400">{nameOf(locale)}</span>
        <ChevronRight className="text-neutral-600 rtl:rotate-180" />
      </button>
      {open && <LanguageSheet onClose={() => setOpen(false)} />}
    </>
  );
}
