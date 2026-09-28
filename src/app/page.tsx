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
import { SUPPORT_URL } from "@/lib/support";
import type { CSSProperties, ReactNode } from "react";
import { HomeTabs, TabLink } from "@/components/home/HomeTabs";
import { LatestProject, MyVideos } from "@/components/home/ProjectList";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: LayoutTemplate, title: "60 ready-made templates", body: "Hooks, lists, stories, promos and endings, already written. Tap one, change the words." },
  { icon: Captions, title: "Captions that land", body: "Tap along to time your script. The spoken word lights up, karaoke style." },
  { icon: Type, title: "35 fonts, 38 text styles", body: "Outlines, boxes, soft shadows and glow. One tap to restyle, or save your own look." },
  { icon: Sparkles, title: "59 text animations", body: "Pop, slam, typewriter, word by word and more. Every one placed by you." },
  { icon: Focus, title: "Zoom & punch-ins", body: "Snap in on the moment that matters, on every beat if you like, plus slow camera moves." },
  { icon: Blend, title: "Transitions & filters", body: "13 transitions, 12 colour filters, blurred backgrounds for landscape clips." },
];

const PROMISES: { icon: LucideIcon; label: string }[] = [
  { icon: BadgeCheck, label: "No watermark" },
  { icon: UserRound, label: "No account" },
  { icon: Lock, label: "Stays on your device" },
];

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Upload, title: "Add your clips", body: "Pick videos, photos and music straight from your phone." },
  { icon: Sparkles, title: "Make it yours", body: "Cut, caption, style and animate. Everything is manual, nothing is guessed." },
  { icon: Download, title: "Export & post", body: "Get a clean 1080p MP4 and post it anywhere." },
];

const CAPTION = ["THIS", "EDITOR", "IS", "FREE"];

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
  return (
    <div className="relative mx-auto w-[240px] sm:w-[270px]">
      <FloatingChip className="-left-4 top-16 sm:-left-20" style={{ "--fw-tilt": "-4deg" } as CSSProperties}>
        <Captions className="size-3.5 text-gold" /> Word highlight
      </FloatingChip>
      <FloatingChip className="-right-3 top-40 sm:-right-16" style={{ animationDelay: "1.4s", "--fw-tilt": "3deg" } as CSSProperties}>
        <Sparkles className="size-3.5 text-gold" /> 59 animations
      </FloatingChip>
      <FloatingChip className="-left-3 bottom-24 sm:-left-14" style={{ animationDelay: "2.8s", "--fw-tilt": "3deg" } as CSSProperties}>
        <Download className="size-3.5 text-gold" /> 1080p · no watermark
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
            LINK IN BIO
          </div>

          {/* Karaoke caption */}
          <div className="absolute inset-x-0 bottom-[30%] flex justify-center gap-1.5 px-4 text-center text-xl font-black tracking-tight text-white [paint-order:stroke_fill] [-webkit-text-stroke:5px_#000]">
            {CAPTION.map((word, i) => (
              <span
                key={word}
                className="inline-block animate-[fw-word_4s_linear_infinite]"
                style={{ animationDelay: `${i}s` }}
              >
                {word}
              </span>
            ))}
          </div>

          {/* Mini timeline */}
          <div className="absolute inset-x-3 bottom-4 rounded-xl border border-white/10 bg-black/60 p-2 backdrop-blur">
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
      <ArrowRight className="relative size-5 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function SectionTitle({ lead, accent }: { lead: string; accent: string }) {
  return (
    <h2 className="text-center text-3xl font-semibold tracking-tight text-neutral-100 sm:text-4xl">
      {lead} <span className="font-display text-[1.15em] font-normal italic text-gold-soft">{accent}</span>
    </h2>
  );
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "Where are my videos stored?",
    a: "In this browser on this device, and nowhere else. Framewell has no servers that receive your footage.",
  },
  {
    q: "Can I lose my projects?",
    a: "If you clear this browser's data, or the phone runs very low on space, the browser may delete them. Use Back up (in My videos) to keep a copy as a file.",
  },
  {
    q: "Is it really free?",
    a: "Yes. No watermark, no account, no trial. Export as many videos as you like.",
  },
  {
    q: "Can I use any music?",
    a: "Only music you have the right to use. For trending sounds, add them in TikTok, Instagram or YouTube when you post.",
  },
];

export default function Home() {
  const hero = (
    <section className="grid items-center gap-12 pt-8 md:grid-cols-[1.1fr_1fr] md:pt-16">
      <div className="flex flex-col items-center text-center md:items-start md:text-left">
        <Rise>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium tracking-wide text-neutral-400">
            <span className="size-1.5 rounded-full bg-gold shadow-[0_0_10px_#e2bf7e]" />
            Free video editor · works in your browser
          </span>
        </Rise>
        <Rise delay={120}>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-neutral-50 sm:text-6xl lg:text-7xl">
            Edit your TikToks, Reels &amp; Shorts{" "}
            <span className="font-display text-[1.12em] font-normal italic text-transparent bg-gradient-to-r from-gold-soft via-gold to-gold-soft bg-[length:200%_auto] bg-clip-text animate-[fw-gradient_8s_ease-in-out_infinite]">
              right on your phone.
            </span>
          </h1>
        </Rise>
        <Rise delay={240}>
          <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-neutral-400">
            Cut your clips, add captions, text, music and transitions, then save a clean video with no watermark. No
            account needed, and your videos never leave your device.
          </p>
        </Rise>
        <Rise delay={360} className="mt-9 flex flex-col items-center gap-4">
          <LatestProject />
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <PrimaryButton href="/editor">Start a new video</PrimaryButton>
            <TabLink
              tab="features"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
            >
              See what it can do
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </TabLink>
          </div>
        </Rise>
        <Rise delay={480}>
          <ul className="mt-9 flex flex-wrap justify-center gap-2 md:justify-start">
            {PROMISES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-neutral-300"
              >
                <Icon className="size-4 text-gold" /> {label}
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
      <SectionTitle lead="My" accent="videos" />
      <p className="mx-auto mt-3 mb-8 max-w-md text-center text-sm text-neutral-400">
        Everything you make is saved here automatically. Tap a video to keep editing.
      </p>
      <MyVideos />
    </section>
  );

  const features = (
    <div className="pt-8 md:pt-14">
      <section>
        <SectionTitle lead="Everything a creator" accent="needs." />
        <p className="mx-auto mt-4 max-w-lg text-center text-neutral-400">
          Built for vertical video. Every cut and every word is placed by you, never guessed.
        </p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="group bg-[#0c0c0f] p-7 transition-colors hover:bg-[#111116]">
              <div className="flex size-10 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.06] transition-colors group-hover:border-gold/60">
                <Icon className="size-[18px] text-gold" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-neutral-100">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <SectionTitle lead="Three steps." accent="That's it." />
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-7">
              <span className="absolute right-6 top-3 font-display text-6xl italic text-gold/20">{i + 1}</span>
              <Icon className="size-5 text-gold" />
              <h3 className="mt-4 text-lg font-semibold text-neutral-100">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex justify-center">
          <PrimaryButton href="/editor">Start a new video</PrimaryButton>
        </div>
      </section>
    </div>
  );

  const privacy = (
    <div className="pt-8 md:pt-14">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-8 text-center sm:p-14">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-40 w-2/3 -translate-x-1/2 rounded-full bg-[#e2bf7e]/10 blur-3xl" />
        <Lock className="relative mx-auto size-7 text-gold" />
        <h2 className="relative mt-5 text-balance text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">
          Your videos <span className="font-display text-[1.15em] font-normal italic text-gold-soft">never leave</span>{" "}
          your phone.
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg leading-relaxed text-neutral-400">
          Framewell edits and exports right on your device. Nothing is uploaded, nobody else sees your footage, there
          are no ads or trackers, and there&apos;s no account to make.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-2xl">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-100">
          <HardDrive className="size-5 text-gold" /> Good to know
        </h2>
        <div className="flex flex-col gap-2">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 open:bg-white/[0.04]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-neutral-100 [&::-webkit-details-marker]:hidden">
                {q}
                <Plus className="size-4 shrink-0 text-gold transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-neutral-500">
          The details: <Link href="/privacy" className="text-gold underline-offset-4 hover:underline">Privacy policy</Link> ·{" "}
          <Link href="/terms" className="text-gold underline-offset-4 hover:underline">Terms of use</Link>
        </p>
      </section>
    </div>
  );

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#09090b] text-neutral-100">
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
            <Link
              href="/editor"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition-transform active:scale-95"
            >
              <Plus className="size-4" /> New video
            </Link>
          }
          panels={{ home: hero, videos, features, privacy }}
        />

        <footer className="mt-16 flex flex-col items-center gap-2 text-center text-xs text-neutral-500">
          <p>
            <span className="font-display text-sm italic text-neutral-300">Framewell</span> · a free, private video editor
            for creators
          </p>
          <p className="flex gap-3">
            <Link href="/privacy" className="hover:text-neutral-300">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-neutral-300">
              Terms
            </Link>
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="text-gold/80 hover:text-gold">
              Support Framewell ☕
            </a>
          </p>
          <p className="mt-2 max-w-md text-[11px] leading-relaxed text-neutral-600">
            TikTok, Instagram, Reels, YouTube and Shorts are trademarks of their respective owners. Framewell is
            independent and not affiliated with or endorsed by them.
          </p>
        </footer>
      </div>
    </main>
  );
}
