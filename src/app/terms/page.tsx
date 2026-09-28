import type { Metadata } from "next";
import { LegalPage, OPERATOR } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The simple rules for using Framewell, the free, private video editor.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro="Short version: Framewell is free to use. What you make is yours, and you're responsible for having the right to use the music, clips and images you put in it. Keep backups: your work lives only on your device."
    >
      <section>
        <h2>Using Framewell</h2>
        <p>
          Framewell is a free video editor that runs in your browser, provided by {OPERATOR.name}. By using it you agree
          to these terms. If you don&apos;t agree, please don&apos;t use it.
        </p>
      </section>

      <section>
        <h2>Your content is yours</h2>
        <p>
          You keep all rights to the videos you make. Framewell never receives your content, and we claim no rights to
          it. No watermark is added.
        </p>
      </section>

      <section>
        <h2>Your responsibility</h2>
        <ul>
          <li>
            Only use music, video, images and fonts you have the right to use. Many popular songs are copyrighted: for
            trending sounds, add them inside TikTok, Instagram or YouTube when you post.
          </li>
          <li>Get permission from people who appear in your videos where the law requires it.</li>
          <li>Follow the law and the rules of the platforms you post to.</li>
          <li>Don&apos;t use Framewell to make content that is illegal, harms others or infringes their rights.</li>
        </ul>
      </section>

      <section>
        <h2>Keep backups</h2>
        <p>
          Your projects are stored only in your browser on your device. They can be lost if you clear your browser data,
          change device, or the browser frees up space. We can&apos;t recover them. Use <b>Back up</b> in My videos to keep a
          copy.
        </p>
      </section>

      <section>
        <h2>No guarantees</h2>
        <p>
          Framewell is provided free, &quot;as is&quot; and &quot;as available&quot;. We work to make it reliable, but we can&apos;t
          promise it will always work on every device, be free of errors, or keep every feature. We may change or stop
          the service at any time.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          As far as the law allows, we aren&apos;t liable for lost projects, lost content or other indirect loss from using
          Framewell. Nothing in these terms limits rights you have under consumer law that can&apos;t be excluded.
        </p>
      </section>

      <section>
        <h2>Other companies&apos; names</h2>
        <p>
          Framewell mentions TikTok, Instagram, Reels, YouTube and Shorts so you know which formats it makes videos
          for. These are trademarks of their respective owners. Framewell is independent and isn&apos;t affiliated with,
          sponsored by or endorsed by any of them.
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          We may update these terms; the date at the top shows the latest version. These terms are governed by the laws
          of {OPERATOR.country}. Questions: {OPERATOR.email}.
        </p>
      </section>
    </LegalPage>
  );
}
