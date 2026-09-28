import type { Metadata } from "next";
import { LegalPage, OPERATOR } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Framewell doesn't collect your videos or personal data. Everything stays on your device.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="Short version: the Framewell app doesn't collect your personal data. Your videos, photos, sound and projects stay in the browser on your device. There are no accounts, ads, analytics or tracking cookies. Only if you choose to tip us on Ko-fi do we receive a few details, explained below."
    >
      <section>
        <h2>Who we are</h2>
        <p>
          Framewell is run by {OPERATOR.name}. Questions about privacy: {OPERATOR.email}.
        </p>
      </section>

      <section>
        <h2>What stays on your device</h2>
        <p>Everything you make with Framewell is processed and stored only on your device, in your browser&apos;s own storage:</p>
        <ul>
          <li>the videos, photos and audio you add, and your voiceover recordings;</li>
          <li>your projects, saved text styles and editor settings;</li>
          <li>the videos you export.</li>
        </ul>
        <p className="mt-3">
          None of this is uploaded to us or to anyone else. We cannot see it, and we can&apos;t recover it for you if it&apos;s
          deleted. Use <b>Back up</b> to keep a copy as a file.
        </p>
      </section>

      <section>
        <h2>Microphone</h2>
        <p>
          Framewell asks for the microphone only when you record a voiceover. The recording goes straight into your
          project on your device. You can withdraw permission at any time in your browser settings.
        </p>
      </section>

      <section>
        <h2>What our hosting provider sees</h2>
        <p>
          The website is hosted by Vercel. Like any website, loading the page means your browser asks Vercel&apos;s servers
          for Framewell&apos;s files. That request includes technical details such as your IP address and browser type,
          which the host may keep in short-lived logs for security and to keep the service running. We don&apos;t use
          these to identify you or build profiles. See{" "}
          <a href="https://vercel.com/legal/privacy-policy" rel="noopener noreferrer" target="_blank">
            Vercel&apos;s privacy policy
          </a>
          .
        </p>
      </section>

      <section>
        <h2>No cookies, ads or trackers</h2>
        <p>
          Framewell uses no advertising, analytics or tracking cookies, and no third-party trackers. Fonts are served
          from our own site. The browser storage mentioned above is used only to keep your work on your device.
        </p>
      </section>

      <section>
        <h2>Sharing your videos</h2>
        <p>
          When you save or share an exported video, it goes wherever you choose (Photos, Files, TikTok, Instagram…). From
          then on, that app&apos;s own privacy policy applies.
        </p>
      </section>

      <section>
        <h2>Tips on Ko-fi</h2>
        <p>
          Framewell is free. If you choose to leave a tip, the &quot;Support Framewell&quot; links open our page on Ko-fi
          in a new tab; nothing from Ko-fi is loaded inside Framewell. Ko-fi (Ko-fi Labs Limited, UK) and its payment
          providers (Stripe or PayPal) handle the payment under their own privacy policies.
        </p>
        <p className="mt-3">
          When you tip, Ko-fi shares some details with us, and for those we are the data controller (independently of
          Ko-fi). This is what we receive and how we handle it:
        </p>
        <ul>
          <li>
            <b>What:</b> the amount and date, the name or username you give, your email address, and any message you
            write. We never receive your card or bank details.
          </li>
          <li>
            <b>Why:</b> to keep records of the tips we receive, as tax and accounting rules require, and to answer you
            if you contact us. We don&apos;t use your email for newsletters or marketing, and we don&apos;t share it with
            anyone.
          </li>
          <li>
            <b>Legal basis:</b> our legal obligation to keep records of income, and our legitimate interest in replying
            to messages.
          </li>
          <li>
            <b>How long:</b> as long as Swedish tax and accounting rules require, then deleted.
          </li>
        </ul>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          The only personal data we hold is from tips (see above). If you tipped, you can ask us to see, correct or
          delete your details, or object to how we use them, by writing to {OPERATOR.email}. We may keep what the law
          requires for our records. If you&apos;re unhappy with how we handle your data, you can complain to the Swedish
          Authority for Privacy Protection (
          <a href="https://www.imy.se/en/" rel="noopener noreferrer" target="_blank">
            IMY
          </a>
          ).
        </p>
        <p className="mt-3">
          Everything else Framewell stores stays on your device: to remove it, delete your projects in <b>My videos</b> or
          clear this site&apos;s data in your browser settings.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>If this policy changes, we&apos;ll update this page and the date at the top.</p>
      </section>
    </LegalPage>
  );
}
