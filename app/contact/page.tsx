import Link from "next/link";
import { SITE, SOCIALS } from "@/lib/site";
import { IMG } from "@/lib/images";
import { pageMetadata, breadcrumbSchema, webPageSchema, localBusinessSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import ContactForm from "@/components/contact/ContactForm";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import Drift from "@/components/anim/Drift";
import { PeakMark } from "@/components/brand/PeakMark";

const DESCRIPTION =
  "Contact Makro Developers in Colombo, Sri Lanka — enquire about luxury apartments, villas, Grade-A commercial space or investment opportunities. Call, email or visit our Colombo 07 office.";

export const metadata = pageMetadata({
  title: "Contact a Property Developer in Colombo",
  description: DESCRIPTION,
  path: "/contact",
  imageId: IMG.cityNight,
  keywords: [
    "contact Makro Developers",
    "property developer Colombo contact",
    "property enquiry Sri Lanka",
    "real estate developer phone number Colombo",
  ],
});

const DETAILS = [
  { label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
  { label: "Phone", value: SITE.phone, href: `tel:${SITE.phone.replace(/\s/g, "")}` },
  { label: "Office", value: SITE.address, href: undefined },
  { label: "Hours", value: "Mon – Fri · 9.00 – 18.00", href: undefined },
];

export default function ContactPage() {
  return (
    <section className="relative overflow-hidden bg-ink pb-24 pt-40 md:pb-32">
      <JsonLd
        data={[
          webPageSchema({
            type: "ContactPage",
            name: "Contact Makro Developers",
            description: DESCRIPTION,
            path: "/contact",
          }),
          localBusinessSchema(),
          breadcrumbSchema([{ name: "Contact", path: "/contact" }]),
        ]}
      />
      <Drift className="pointer-events-none absolute -right-20 top-24 opacity-[0.05]">
        <PeakMark className="h-[40rem] w-auto text-rose" strokeWidth={1.5} />
      </Drift>

      <div className="container-edge relative">
        <div className="flex items-center gap-4">
          <span className="line-hair w-12" />
          <span className="eyebrow text-rose">Contact</span>
        </div>
        <TextReveal
          as="h1"
          text="Let's build something lasting."
          className="mt-6 max-w-3xl font-display display-lg text-bone"
        />
        <Reveal delay={0.1}>
          <p className="mt-8 max-w-xl font-body text-lg leading-relaxed text-mist">
            A site, a vision, or simply a question — tell us what you have in
            mind and we&rsquo;ll take it from there.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-12">
          {/* Details */}
          <div className="lg:col-span-4">
            <div className="grid grid-cols-1 gap-px border border-hair bg-hair sm:grid-cols-2 lg:grid-cols-1">
              {DETAILS.map((d) => (
                <div key={d.label} className="bg-ink p-6">
                  <p className="eyebrow text-fog">{d.label}</p>
                  {d.href ? (
                    <a
                      href={d.href}
                      className="mt-2 block font-display text-2xl text-bone transition-colors hover:text-rose"
                    >
                      {d.value}
                    </a>
                  ) : (
                    <p className="mt-2 font-display text-2xl text-bone">{d.value}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8">
              <p className="eyebrow text-fog">Follow</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    className="rounded-full border border-hair-strong px-5 py-2.5 font-body text-sm text-mist transition-colors hover:border-rose hover:text-rose"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>

            <p className="mt-8 flex items-center gap-3 font-body text-xs text-fog">
              <PeakMark className="h-4 w-auto text-rose" strokeWidth={11} />
              A subsidiary of the {SITE.parent}
            </p>

            <p className="mt-8 border-t border-hair pt-6 font-body text-sm text-fog">
              Prefer to browse first? Explore{" "}
              <Link
                href="/projects"
                className="text-mist underline decoration-rose/50 underline-offset-4 transition-colors hover:text-rose"
              >
                our developments
              </Link>{" "}
              or read the{" "}
              <Link
                href="/faq"
                className="text-mist underline decoration-rose/50 underline-offset-4 transition-colors hover:text-rose"
              >
                frequently asked questions
              </Link>
              .
            </p>
          </div>

          {/* Form */}
          <div className="lg:col-span-7 lg:col-start-6">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
