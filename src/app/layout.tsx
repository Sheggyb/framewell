import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic, Instrument_Serif } from "next/font/google";
import { LOCALE_HEAD_SCRIPT, LocaleBoot } from "@/components/i18n/LocaleBoot";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  // No automatic Arial stand-in: it has Arabic letters on some systems and would win over the
  // Arabic font below (the font list is set in globals.css).
  adjustFontFallback: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Display serif for headline accents on the home page. */
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

/**
 * Arabic letters for the app's own text (Geist has none). Its @font-face only covers Arabic
 * characters, so browsers download it only when Arabic is on screen.
 */
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "Framewell — free video editor for creators", template: "%s · Framewell" },
  description: "Edit TikToks, Reels and Shorts in your browser. No watermark, no account, your videos never leave your device.",
  applicationName: "Framewell",
  // The page runs under the status bar (newer iOS versions do this for Home Screen apps whatever
  // the setting), so the layout pads by the safe area and paints that strip solid; see <body>.
  appleWebApp: { capable: true, title: "Framewell", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The editor handles its own pinch-zoom on the timeline.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // lang/dir are set before paint by the script below (and later by LocaleBoot), hence suppressHydrationWarning.
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${plexArabic.variable} dark h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_HEAD_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <LocaleBoot />
        {children}
        {/* Solid strip behind the clock and battery, so content never shows through it blurred. */}
        <div aria-hidden className="status-bar-shim" />
      </body>
    </html>
  );
}
