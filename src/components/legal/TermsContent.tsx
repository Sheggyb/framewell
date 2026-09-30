"use client";

import type { ReactNode } from "react";
import { LegalPage, OPERATOR } from "@/components/LegalPage";
import { Rich } from "@/components/i18n/Rich";
import { useT, type MessageKey } from "@/i18n";

const TAGS = { b: (s: ReactNode) => <b>{s}</b> };

/** The Terms of use, in the chosen language. */
export function TermsContent() {
  const t = useT();
  const r = (key: MessageKey) => <Rich text={t(key, { name: OPERATOR.name, email: OPERATOR.email })} tags={TAGS} />;
  return (
    <LegalPage
      page="terms" title={t("legal.terms.title")} intro={t("legal.terms.intro")}>
      <section>
        <h2>{t("legal.terms.using.title")}</h2>
        <p>{r("legal.terms.using.body")}</p>
      </section>

      <section>
        <h2>{t("legal.terms.content.title")}</h2>
        <p>{r("legal.terms.content.body")}</p>
      </section>

      <section>
        <h2>{t("legal.terms.responsibility.title")}</h2>
        <ul>
          <li>{r("legal.terms.responsibility.rights")}</li>
          <li>{r("legal.terms.responsibility.people")}</li>
          <li>{r("legal.terms.responsibility.law")}</li>
          <li>{r("legal.terms.responsibility.harm")}</li>
        </ul>
      </section>

      <section>
        <h2>{t("legal.terms.backups.title")}</h2>
        <p>{r("legal.terms.backups.body")}</p>
      </section>

      <section>
        <h2>{t("legal.terms.guarantees.title")}</h2>
        <p>{r("legal.terms.guarantees.body")}</p>
      </section>

      <section>
        <h2>{t("legal.terms.liability.title")}</h2>
        <p>{r("legal.terms.liability.body")}</p>
      </section>

      <section>
        <h2>{t("legal.terms.names.title")}</h2>
        <p>{r("legal.terms.names.body")}</p>
      </section>

      <section>
        <h2>{t("legal.terms.contact.title")}</h2>
        <p>{r("legal.terms.contact.body")}</p>
      </section>
    </LegalPage>
  );
}
