"use client";

import {
  ArrowRight,
  BadgeCheck,
  Blend,
  Captions,
  Download,
  Focus,
  HardDrive,
  LayoutTemplate,
  Lock,
  Plus,
  Sparkles,
  Type,
  Upload,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Rich } from "@/components/i18n/Rich";
import { LanguageButton } from "@/components/i18n/Language";
import { PageTitle } from "@/components/i18n/PageTitle";
import { useT } from "@/i18n";
import { SUPPORT_URL } from "@/lib/support";
import { HomeTabs, TabLink } from "./HomeTabs";
import { LatestProject, MyVideos } from "./ProjectList";

const FEATURES: { id: "templates" | "captions" | "fonts" | "animations" | "zoom" | "transitions"; icon: LucideIcon }[] = [
  { id: "templates", icon: LayoutTemplate },
  { id: "captions", icon: Captions },
  { id: "fonts", icon: Type },
  { id: "animations", icon: Sparkles },
  { id: "zoom", icon: Focus },
  { id: "transitions", icon: Blend },
];

const PROMISES: { id: "noWatermark" | "noAccount" | "onDevice"; icon: LucideIcon }[] = [
  { id: "noWatermark", icon: BadgeCheck },
  { id: "noAccount", icon: UserRound },
  { id: "onDevice", icon: Lock },
];

const STEPS: { id: "add" | "style" | "export"; icon: LucideIcon }[] = [
  { id: "add", icon: Upload },
  { id: "style", icon: Sparkles },
  { id: "export", icon: Download },
];

const FAQ = ["where", "lose", "free", "music"] as const;

/** The gold, italic words of a heading (`<accent>` in the translation). */
function accent(className: string) {
  return function Accent(s: ReactNode) {
    return <span className={className}>{s}</span>;
  };
}

/** Staggered entrance: children rise in one after another. */
function Rise({ delay = 0, className, children }: { delay?: number; className?: string; children: ReactNode }) {
  return (
    <div
      className={`opacity-0 animate-[fw-rise_0.9s_cubic-bezier(0.2,0.8,0.2,1)_forwards] ${className ?? ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function FloatingChip({ className, style, children }: { className: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div
      className={`absolute z-20 flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-950/70 px-3 py-1.5 text-xs font-medium text-neutral-200 shadow-2xl backdrop-blur-md animate-[fw-float_6s_ease-in-out_infinite] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/** A looping, CSS-only demo of what the editor makes. */
function PhoneDemo() {
  const t = useT();
  const caption = t("home.demo.caption").split(/\s+/).filter(Boolean);
  return (
    <div className="relative mx-auto w-[240px] sm:w-[270px]">
      <FloatingChip className="-start-4 top-16 sm:-start-20" style={{ "--fw-tilt": "-4deg" } as CSSProperties}>
        <Captions className="size-3.5 text-gold" /> {t("home.demo.wordHighlight")}
      </FloatingChip>
      <FloatingChip className="-end-3 top-40 sm:-end-16" style={{ animationDelay: "1.4s", "--fw-tilt": "3deg" } as CSSProperties}>
        <Sparkles className="size-3.5 text-gold" /> {t("home.demo.animations")}
      </FloatingChip>
      <FloatingChip className="-start-3 bottom-24 sm:-start-14" style={{ animationDelay: "2.8s", "--fw-tilt": "3deg" } as CSSProperties}>
        <Download className="size-3.5 text-gold" /> {t("home.demo.export")}
      </FloatingChip>

      {/* Device */}
      <div className="relative rounded-[2.6rem] border border-white/10 bg-neutral-950 p-2.5 shadow-[0_50px_120px_-30px_rgba(226,191,126,0.28)] ring-1 ring-black">
        <div className="absolute left-1/2 top-3.5 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
        <div className="relative aspect-[9/19] overflow-hidden rounded-[2.1rem]">
          {/* "Video": a slow, cinematic shift of warm and cool tones */}
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#1c2430,#3a3326,#5c4a30,#1e2a2a)] bg-[length:300%_300%] animate-[fw-gradient_14s_ease-in-out_infinite]" />
          <div className="absolute -right-10 top-10 size-48 rounded-full bg-[#f3d9a4]/30 blur-3xl animate-[fw-blob_12s_ease-in-out_infinite]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55))]" />

          {/* Sticker + label */}
          <div className="absolute right-6 top-16 text-5xl animate-[fw-pop_4s_ease-out_infinite]">🔥</div>
          <div className="absolute left-4 top-32 rounded-full bg-white px-3 py-1 text-[11px] font-black tracking-wide text-neutral-900 animate-[fw-slide-in_4s_ease-out_infinite]">
            {t("home.demo.sticker")}
          </div>

          {/* Karaoke caption */}
          <div className="absolute inset-x-0 bottom-[30%] flex justify-center gap-1.5 px-4 text-center text-xl font-black tracking-tight text-white [paint-order:stroke_fill] [-webkit-text-stroke:5px_#000]">
            {caption.map((word, i) => (
              <span
                key={i}
                className="inline-block animate-[fw-word_4s_linear_infinite]"
                style={{ animationDelay: `${i}s` }}
              >
                {word}
              </span>
            ))}
          </div>

          {/* Mini timeline */}
          <div dir="ltr" className="absolute inset-x-3 bottom-4 rounded-xl border border-white/10 bg-black/60 p-2 backdrop-blur">
            <div className="relative flex flex-col gap-1">
              <div className="flex gap-1">
                <div className="h-2 w-[30%] rounded-sm bg-[#b39360]" />
                <div className="h-2 w-[22%] rounded-sm bg-[#6f7f95]" />
              </div>
              <div className="flex gap-0.5">
                <div className="h-5 flex-[3] rounded bg-[#46566b]" />
                <div className="h-5 flex-[2] rounded bg-[#55667c]" />
                <div className="h-5 flex-[2] rounded bg-[#46566b]" />
              </div>
              <div className="h-1.5 w-full rounded-sm bg-[#4f7766]" />
              <div className="absolute -inset-y-1 w-0.5 rounded bg-gold shadow-[0_0_8px_#e2bf7e] animate-[fw-playhead_4s_linear_infinite]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative inline-flex h-14 items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-8 text-base font-semibold text-neutral-950 shadow-[0_10px_40px_-10px_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#f3e2bd]/70 to-transparent animate-[fw-shimmer_3.5s_ease-in-out_infinite]" />
      <span className="relative">{children}</span>
      <ArrowRight className="relative size-5 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
    </Link>
  );
}

/** A section heading; the `<accent>` part of `text` is gold and italic. */
function SectionTitle({ text }: { text: string }) {
  return (
    <h2 className="text-center text-3xl font-semibold tracking-tight text-neutral-100 sm:text-4xl">
      <Rich text={text} tags={{ accent: accent("font-display text-[1.15em] font-normal italic text-gold-soft") }} />
    </h2>
  );
}

/** Everything on the home page (a client component, so it can follow the chosen language). */
export function HomeContent() {
  const t = useT();

  const hero = (
    <section className="grid items-center gap-12 pt-8 md:grid-cols-[1.1fr_1fr] md:pt-16">
      <div className="flex flex-col items-center text-center md:items-start md:text-start">
        <Rise>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium tracking-wide text-neutral-400">
            <span className="size-1.5 rounded-full bg-gold shadow-[0_0_10px_#e2bf7e]" />
            {t("home.hero.badge")}
          </span>
        </Rise>
        <Rise delay={120}>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-neutral-50 sm:text-6xl lg:text-7xl">
            <Rich
              text={t("home.hero.title")}
              tags={{
                accent: accent(
                  "font-display text-[1.12em] font-normal italic text-transparent bg-gradient-to-r from-gold-soft via-gold to-gold-soft bg-[length:200%_auto] bg-clip-text animate-[fw-gradient_8s_ease-in-out_infinite]",
                ),
              }}
            />
          </h1>
        </Rise>
        <Rise delay={240}>
          <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-neutral-400">{t("home.hero.body")}</p>
        </Rise>
        <Rise delay={360} className="mt-9 flex flex-col items-center gap-4">
          <LatestProject />
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <PrimaryButton href="/editor">{t("home.startNew")}</PrimaryButton>
            <TabLink
              tab="features"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
            >
              {t("home.hero.seeMore")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </TabLink>
          </div>
        </Rise>
        <Rise delay={480}>
          <ul className="mt-9 flex flex-wrap justify-center gap-2 md:justify-start">
            {PROMISES.map(({ id, icon: Icon }) => (
              <li
                key={id}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-neutral-300"
              >
                <Icon className="size-4 text-gold" /> {t(`home.promises.${id}`)}
              </li>
            ))}
          </ul>
        </Rise>
      </div>

      <Rise delay={200}>
        <PhoneDemo />
      </Rise>
    </section>
  );

  const videos = (
    <section className="pt-8 md:pt-14">
      <SectionTitle text={t("home.videos.title")} />
      <p className="mx-auto mt-3 mb-8 max-w-md text-center text-sm text-neutral-400">{t("home.videos.body")}</p>
      <MyVideos />
    </section>
  );

  const features = (
    <div className="pt-8 md:pt-14">
      <section>
        <SectionTitle text={t("home.features.title")} />
        <p className="mx-auto mt-4 max-w-lg text-center text-neutral-400">{t("home.features.body")}</p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ id, icon: Icon }) => (
            <div key={id} className="group bg-[#0c0c0f] p-7 transition-colors hover:bg-[#111116]">
              <div className="flex size-10 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.06] transition-colors group-hover:border-gold/60">
                <Icon className="size-[18px] text-gold" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-neutral-100">{t(`home.features.${id}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{t(`home.features.${id}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <SectionTitle text={t("home.steps.title")} />
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ id, icon: Icon }, i) => (
            <li key={id} className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-7">
              <span className="absolute end-6 top-3 font-display text-6xl italic text-gold/20">{i + 1}</span>
              <Icon className="size-5 text-gold" />
              <h3 className="mt-4 text-lg font-semibold text-neutral-100">{t(`home.steps.${id}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{t(`home.steps.${id}.body`)}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex justify-center">
          <PrimaryButton href="/editor">{t("home.startNew")}</PrimaryButton>
        </div>
      </section>
    </div>
  );

  const linkClass = "text-gold underline-offset-4 hover:underline";
  const privacy = (
    <div className="pt-8 md:pt-14">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-8 text-center sm:p-14">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-40 w-2/3 -translate-x-1/2 rounded-full bg-[#e2bf7e]/10 blur-3xl" />
        <Lock className="relative mx-auto size-7 text-gold" />
        <h2 className="relative mt-5 text-balance text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">
          <Rich text={t("home.privacy.title")} tags={{ accent: accent("font-display text-[1.15em] font-normal italic text-gold-soft") }} />
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg leading-relaxed text-neutral-400">{t("home.privacy.body")}</p>
      </section>

      <section className="mx-auto mt-12 max-w-2xl">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-100">
          <HardDrive className="size-5 text-gold" /> {t("home.privacy.goodToKnow")}
        </h2>
        <div className="flex flex-col gap-2">
          {FAQ.map((id) => (
            <details key={id} className="group rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 open:bg-white/[0.04]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-neutral-100 [&::-webkit-details-marker]:hidden">
                {t(`home.privacy.faq.${id}.q`)}
                <Plus className="size-4 shrink-0 text-gold transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{t(`home.privacy.faq.${id}.a`)}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-neutral-500">
          <Rich
            text={t("home.privacy.details")}
            tags={{
              privacy: (s) => (
                <Link href="/privacy" className={linkClass}>
                  {s}
                </Link>
              ),
              terms: (s) => (
                <Link href="/terms" className={linkClass}>
                  {s}
                </Link>
              ),
            }}
          />
        </p>
      </section>
    </div>
  );

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#09090b] text-neutral-100">
      <PageTitle page="home" />
      {/* Background: soft light from above, a faint cool glow below, a whisper of grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[56rem] -translate-x-1/2 rounded-full bg-[#e2bf7e]/[0.13] blur-[130px] animate-[fw-blob_24s_ease-in-out_infinite]" />
        <div className="absolute -right-40 top-[40rem] size-[30rem] rounded-full bg-slate-400/[0.07] blur-[120px] animate-[fw-blob_30s_ease-in-out_infinite_reverse]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      </div>

      {/* Bottom padding clears the phone tab bar. */}
      <div className="relative mx-auto flex max-w-6xl flex-col px-5 pb-28 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:pb-16">
        <HomeTabs
          brand={
            <Link href="/" className="flex shrink-0 items-center gap-2.5 text-lg font-semibold tracking-tight">
              <span className="flex size-8 items-center justify-center rounded-lg border border-gold/40 bg-gradient-to-b from-white/10 to-transparent font-display text-lg italic text-gold-soft">
                F
              </span>
              Framewell
            </Link>
          }
          action={
            <div className="flex shrink-0 items-center gap-2">
              <LanguageButton />
              <Link
                href="/editor"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition-transform active:scale-95"
              >
                <Plus className="size-4" /> {t("home.newVideo")}
              </Link>
            </div>
          }
          panels={{ home: hero, videos, features, privacy }}
        />

        <footer className="mt-16 flex flex-col items-center gap-2 text-center text-xs text-neutral-500">
          <p>
            <Rich
              text={t("home.footer.tagline")}
              tags={{ brand: (s) => <span className="font-display text-sm italic text-neutral-300">{s}</span> }}
            />
          </p>
          <p className="flex gap-3">
            <Link href="/privacy" className="hover:text-neutral-300">
              {t("home.footer.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-neutral-300">
              {t("home.footer.terms")}
            </Link>
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="text-gold/80 hover:text-gold">
              {t("home.footer.support")}
            </a>
          </p>
          <p className="mt-2 max-w-md text-[11px] leading-relaxed text-neutral-600">{t("home.footer.trademarks")}</p>
        </footer>
      </div>
    </main>
  );
}
