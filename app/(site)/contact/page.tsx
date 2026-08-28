import Link from "next/link";
import { SITE, SOCIALS } from "@/lib/site";
import { IMG } from "@/lib/images";
import { pageMetadata, breadcrumbSchema, webPageSchema, localBusinessSchema } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import ContactForm from "@/components/contact/ContactForm";
import { getProjects } from "@/lib/projects-data";
import TextReveal from "@/components/anim/TextReveal";
import Reveal from "@/components/anim/Reveal";
import Drift from "@/components/anim/Drift";
import { PeakMark } from "@/components/brand/PeakMark";
import { SocialIcon } from "@/components/brand/SocialIcon";

/**
 * Admin-editable content, so this page must not be frozen at build time.
 *
 * Every public page here was fully static with no revalidate window, which
 * meant a project, article or image saved in the admin only appeared after the
 * next deploy. `revalidatePath()` in the Server Actions is still the fast path
 * — it invalidates immediately — but it cannot be the ONLY path: it depends on
 * the host's on-demand revalidation working, and when it does not, the page
 * simply never updates and nothing says so.
 *
 * 60s is the backstop. Cached and fast for visitors, and an edit that misses
 * the on-demand hook still lands within a minute instead of never.
 */
export const revalidate = 60;

const DESCRIPTION =
  "Contact Makro Developers in Colombo, Sri Lanka — enquire about Makro Heights in Dehiwala, upcoming developments or investment opportunities. Call or email us.";

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
  { label: "Head Office", value: SITE.address, href: undefined },
  { label: "Hours", value: "Mon – Fri · 9.00 – 17.00", href: undefined },
];

export default async function ContactPage() {
  const projects = await getProjects();

  return (
    <>
      {/* Box metrics deliberately mirror components/ui/PageHero — every other
          inner page uses that component, and this one cannot (it has no
          background image; the drifting peak watermark stands in for one), so
          the sizing is matched by hand instead. Keep the two in step. */}
      <section className="relative flex flex-col justify-center overflow-hidden bg-ink pb-14 pt-[calc(var(--nav-h)+3rem)] md:pb-16 md:pt-[calc(var(--nav-h)+4rem)]">
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

        {/* w-full because the section is now a flex container — without it the
            content box shrink-wraps and container-edge stops centring. */}
        <div className="container-edge relative w-full">
          <div className="flex items-center gap-4">
            <span className="line-hair w-12" />
            <span className="eyebrow text-rose">Contact Us</span>
          </div>
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-xl font-body text-lg leading-relaxed text-mist">
              Have a site, a vision or an idea worth exploring? Tell us what
              you have in mind, and our team will be in touch.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section-light pb-24 pt-16 md:pb-32 md:pt-20">
        <div className="container-edge">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
            {/* Details */}
            <div className="lg:col-span-4">
              <div className="grid grid-cols-1 gap-px border border-hair bg-hair sm:grid-cols-2 lg:grid-cols-1">
                {DETAILS.map((d) => (
                  <div key={d.label} className="bg-shell p-6">
                    <p className="eyebrow text-fog">{d.label}</p>
                    {d.href ? (
                      <a
                        href={d.href}
                        className="mt-2 block font-display text-2xl text-ink transition-colors hover:text-rose-deep"
                      >
                        {d.value}
                      </a>
                    ) : (
                      <p className="mt-2 font-display text-2xl text-ink">{d.value}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Icon tiles rather than the old text buttons (client note,
                  Aug 2026 — "make it more graphic"). The label stays as the
                  accessible name: the glyph itself is aria-hidden, so a
                  screen reader still hears "Instagram", not "link". */}
              <div className="mt-8">
                <p className="eyebrow text-fog">Follow</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {SOCIALS.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      aria-label={s.label}
                      title={s.label}
                      className="group grid h-12 w-12 place-items-center border border-hair-strong text-mist transition-colors duration-300 hover:border-rose-deep hover:bg-rose-deep hover:text-ink"
                    >
                      <SocialIcon
                        name={s.icon}
                        className="h-5 w-5 transition-transform duration-500 group-hover:scale-110"
                      />
                    </a>
                  ))}
                </div>
              </div>

              <p className="mt-8 flex items-center gap-3 font-body text-xs text-fog">
                <PeakMark className="h-4 w-auto text-rose-deep" strokeWidth={11} />
                A subsidiary of the {SITE.parent}.
              </p>

              <p className="mt-8 border-t border-hair pt-6 font-body text-sm text-fog">
                Prefer to browse first? Explore{" "}
                <Link
                  href="/projects"
                  className="text-mist underline decoration-rose-deep/50 underline-offset-4 transition-colors hover:text-rose-deep"
                >
                  our developments
                </Link>{" "}
                or read the{" "}
                <Link
                  href="/faq"
                  className="text-mist underline decoration-rose-deep/50 underline-offset-4 transition-colors hover:text-rose-deep"
                >
                  frequently asked questions
                </Link>
                .
              </p>
            </div>

            {/* Form */}
            <div className="lg:col-span-7 lg:col-start-6">
              <ContactForm projects={projects} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
