import Link from "next/link";
import { SITE } from "@/lib/site";
import { pageMetadata, breadcrumbSchema, webPageSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";

const DESCRIPTION =
  "The terms that govern your use of the Makro Developers website — including how project information, imagery and specifications on this site should be read.";

export const metadata = pageMetadata({
  title: "Terms of Use",
  description: DESCRIPTION,
  path: "/terms-of-use",
});

const SECTIONS = [
  {
    heading: "Using this website",
    body: [
      `This website is operated by ${SITE.legal}, a subsidiary of the ${SITE.parent}. By using it you accept these terms; if you do not, please do not use the site.`,
    ],
  },
  {
    heading: "Project information",
    body: [
      "Renderings, photography, floor plans, specifications, availability and completion dates shown on this website are indicative, may include artist's impressions, and may change as projects progress.",
      "Nothing on this website constitutes an offer, contract or investment advice. Purchases are governed solely by the formal agreements signed for a specific development, and we recommend independent legal and financial advice before any transaction.",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      "The Makro Developers name, logo, brand elements and the content of this website are our property or used with permission, and may not be reproduced without written consent.",
    ],
  },
  {
    heading: "Liability",
    body: [
      "We take care to keep this website accurate and available, but it is provided “as is”. To the extent permitted by law, we accept no liability for loss arising from reliance on the website's content or from interruptions to its availability.",
    ],
  },
  {
    heading: "Governing law",
    body: [
      "These terms are governed by the laws of Sri Lanka. We may update them from time to time; the latest version will always live on this page.",
    ],
  },
];

export default function TermsOfUsePage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: "Terms of Use — Makro Developers",
            description: DESCRIPTION,
            path: "/terms-of-use",
          }),
          breadcrumbSchema([{ name: "Terms of Use", path: "/terms-of-use" }]),
        ]}
      />
      <section className="relative bg-ink pb-24 pt-40 md:pb-32">
        <div className="container-edge mx-auto max-w-3xl">
          <div className="flex items-center gap-4">
            <span className="line-hair w-12" />
            <span className="eyebrow text-rose">Legal</span>
          </div>
          <TextReveal
            as="h1"
            text="Terms of Use"
            className="mt-6 font-display display-lg text-bone"
          />
          <Reveal delay={0.1}>
            <p className="mt-6 font-body text-base leading-relaxed text-mist">
              {DESCRIPTION}
            </p>
            <p className="mt-4 font-body text-sm text-fog">Last updated 10 July 2026</p>
          </Reveal>

          <div className="mt-16 space-y-12">
            {SECTIONS.map((s, i) => (
              <Reveal key={s.heading} delay={i * 0.04}>
                <h2 className="font-display text-2xl text-bone md:text-3xl">{s.heading}</h2>
                <div className="mt-4 space-y-4">
                  {s.body.map((p, pi) => (
                    <p key={pi} className="font-body text-base leading-relaxed text-mist">
                      {p}
                    </p>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-16 border-t border-hair pt-8">
            <p className="font-body text-sm text-fog">
              See also our{" "}
              <Link
                href="/privacy-policy"
                className="text-mist underline decoration-rose/50 underline-offset-4 transition-colors hover:text-rose"
              >
                Privacy Policy
              </Link>
              , or{" "}
              <Link
                href="/contact"
                className="text-mist underline decoration-rose/50 underline-offset-4 transition-colors hover:text-rose"
              >
                contact us
              </Link>{" "}
              with any question.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
