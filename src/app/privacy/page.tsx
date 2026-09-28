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
      intro="Short version: Framewell doesn't collect your personal data. Your videos, photos, sound and projects stay in the browser on your device. There are no accounts, ads, analytics or tracking cookies."
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
        <h2>Your rights</h2>
        <p>
          Because we don&apos;t collect or store personal data about you, there is nothing held by us to access, correct or
          delete. To remove everything Framewell stored on your device, delete your projects in <b>My videos</b> or clear
          this site&apos;s data in your browser settings. If you think we hold data about you, contact {OPERATOR.email}.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>If this policy changes, we&apos;ll update this page and the date at the top.</p>
      </section>
    </LegalPage>
  );
}
