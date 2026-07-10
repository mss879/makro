import Link from "next/link";
import { SITE } from "@/lib/site";
import { pageMetadata, breadcrumbSchema, webPageSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";

const DESCRIPTION =
  "How Makro Developers collects, uses and protects the personal information you share with us — including enquiries made through this website.";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description: DESCRIPTION,
  path: "/privacy-policy",
});

const SECTIONS = [
  {
    heading: "What we collect",
    body: [
      "When you make an enquiry through this website, we collect the details you choose to share — typically your name, email address, phone number and the content of your message.",
      "Like most websites, we may also collect standard technical information such as browser type, device and pages visited, used in aggregate to understand how the site performs.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "We use your information to respond to your enquiry, share details of developments or investment opportunities you have asked about, and improve our website and services.",
      "We do not sell your personal information. Where relevant to your enquiry, information may be shared within the Wheels Lanka Group and with service providers who help us operate — under obligations of confidentiality.",
    ],
  },
  {
    heading: "Retention & security",
    body: [
      "We keep personal information only as long as needed for the purposes above or as required by law, and we apply reasonable technical and organisational measures to protect it.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You may ask us at any time to access, correct or delete the personal information we hold about you, or to stop contacting you. Write to us at the address below and we will act promptly.",
    ],
  },
  {
    heading: "Contact",
    body: [
      `Questions about this policy or your data can be sent to ${SITE.email}, or by post to ${SITE.legal}, ${SITE.address}.`,
      "We may update this policy from time to time; the latest version will always live on this page.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: "Privacy Policy — Makro Developers",
            description: DESCRIPTION,
            path: "/privacy-policy",
          }),
          breadcrumbSchema([{ name: "Privacy Policy", path: "/privacy-policy" }]),
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
            text="Privacy Policy"
            className="mt-6 font-display display-lg text-bone"
          />
          <Reveal delay={0.1}>
            <p className="mt-6 font-body text-base leading-relaxed text-mist">
              {DESCRIPTION}
            </p>
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
                href="/terms-of-use"
                className="text-mist underline decoration-rose/50 underline-offset-4 transition-colors hover:text-rose"
              >
                Terms of Use
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
