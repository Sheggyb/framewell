"use client";

import type { ReactNode } from "react";
import { LegalPage, OPERATOR } from "@/components/LegalPage";
import { Rich } from "@/components/i18n/Rich";
import { useT, type MessageKey } from "@/i18n";

const TAGS = {
  b: (s: ReactNode) => <b>{s}</b>,
  vercel: (s: ReactNode) => (
    <a href="https://vercel.com/legal/privacy-policy" rel="noopener noreferrer" target="_blank">
      {s}
    </a>
  ),
  imy: (s: ReactNode) => (
    <a href="https://www.imy.se/en/" rel="noopener noreferrer" target="_blank">
      {s}
    </a>
  ),
};

/** The Privacy policy, in the chosen language. */
export function PrivacyContent() {
  const t = useT();
  const r = (key: MessageKey) => <Rich text={t(key, { name: OPERATOR.name, email: OPERATOR.email })} tags={TAGS} />;
  return (
    <LegalPage
      page="privacy" title={t("legal.privacy.title")} intro={t("legal.privacy.intro")}>
      <section>
        <h2>{t("legal.privacy.who.title")}</h2>
        <p>{r("legal.privacy.who.body")}</p>
      </section>

      <section>
        <h2>{t("legal.privacy.device.title")}</h2>
        <p>{r("legal.privacy.device.lead")}</p>
        <ul>
          <li>{r("legal.privacy.device.media")}</li>
          <li>{r("legal.privacy.device.projects")}</li>
          <li>{r("legal.privacy.device.exports")}</li>
        </ul>
        <p className="mt-3">{r("legal.privacy.device.body")}</p>
      </section>

      <section>
        <h2>{t("legal.privacy.mic.title")}</h2>
        <p>{r("legal.privacy.mic.body")}</p>
      </section>

      <section>
        <h2>{t("legal.privacy.hosting.title")}</h2>
        <p>{r("legal.privacy.hosting.body")}</p>
      </section>

      <section>
        <h2>{t("legal.privacy.cookies.title")}</h2>
        <p>{r("legal.privacy.cookies.body")}</p>
      </section>

      <section>
        <h2>{t("legal.privacy.sharing.title")}</h2>
        <p>{r("legal.privacy.sharing.body")}</p>
      </section>

      <section>
        <h2>{t("legal.privacy.tips.title")}</h2>
        <p>{r("legal.privacy.tips.body")}</p>
        <p className="mt-3">{r("legal.privacy.tips.controller")}</p>
        <ul>
          <li>{r("legal.privacy.tips.what")}</li>
          <li>{r("legal.privacy.tips.why")}</li>
          <li>{r("legal.privacy.tips.basis")}</li>
          <li>{r("legal.privacy.tips.howLong")}</li>
        </ul>
      </section>

      <section>
        <h2>{t("legal.privacy.rights.title")}</h2>
        <p>{r("legal.privacy.rights.body")}</p>
        <p className="mt-3">{r("legal.privacy.rights.device")}</p>
      </section>

      <section>
        <h2>{t("legal.privacy.changes.title")}</h2>
        <p>{r("legal.privacy.changes.body")}</p>
      </section>
    </LegalPage>
  );
}
