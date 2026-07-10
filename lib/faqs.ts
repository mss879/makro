/* ============================================================
   FAQ content — single source of truth.
   The /faq page renders every group (and emits FAQPage schema
   from the same data); the homepage shows HOME_FAQS.
   Answers are written to carry the site's target keywords
   naturally: Sri Lanka, Colombo, property developer, apartments,
   commercial, Wheels Lanka Group.
   ============================================================ */

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  group: string;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    group: "The Company",
    items: [
      {
        q: "Where does Makro Developers build?",
        a: "We focus on residential and commercial developments across Sri Lanka, with a concentration in and around Colombo. Each site is selected for its long-term potential rather than short-term appeal.",
      },
      {
        q: "Is Makro part of a larger group?",
        a: "Yes. Makro Developers is a fully owned subsidiary of the Wheels Lanka Group — an established corporate group whose scale and stability underpin everything we build.",
      },
      {
        q: "How long has Makro Developers been operating?",
        a: "Our first development was completed and handed over more than six years ago, and it remains fully occupied today. Since then we have continued to grow a portfolio of residential, commercial and mixed-use projects across Sri Lanka.",
      },
      {
        q: "What makes a Makro home different?",
        a: "Thoughtful planning, quality execution and materials chosen to age gracefully — it is quality you feel years after handover, not just on the day you receive the keys.",
      },
    ],
  },
  {
    group: "Buying",
    items: [
      {
        q: "How do I enquire about a specific project?",
        a: "Every development has its own page with full details. From there, or from our contact form, you can register your interest and a member of our team will be in touch.",
      },
      {
        q: "What types of property does Makro offer?",
        a: "Our portfolio spans luxury apartments in Colombo, waterfront villas on the southern coast, family home communities and Grade-A commercial space — from residences now selling to masterplanned quarters in planning.",
      },
      {
        q: "How are payments structured when buying off-plan?",
        a: "Payment schedules are tied to construction milestones, so your payments track real, verifiable progress on site. Full schedules are shared transparently before you reserve, together with title and approval documentation.",
      },
      {
        q: "Can I visit a completed Makro development before buying?",
        a: "Yes — and we encourage it. Walking through a completed, occupied project such as Meridian Park Homes is the most honest evidence of how we plan, build and deliver.",
      },
    ],
  },
  {
    group: "Investing",
    items: [
      {
        q: "Can I invest in a Makro development?",
        a: "We welcome conversations with investors. Our approach to capital is disciplined and long-term; reach out via our contact page and our team will share current opportunities.",
      },
      {
        q: "Can foreigners buy property in Sri Lanka?",
        a: "Foreign nationals can freely purchase condominium apartments in Sri Lanka, which makes well-structured apartment developments the natural entry point for international buyers. Freehold land carries restrictions, so we recommend independent legal advice — and we support cross-border purchasers through the process.",
      },
      {
        q: "Why invest in Sri Lankan real estate now?",
        a: "Urbanising demographics, a growing professional class and a limited supply of genuinely well-built stock in prime Colombo underpin the market's long-term case. Investors who buy quality assets in strong locations — and hold them — have historically been rewarded.",
      },
    ],
  },
  {
    group: "After Handover",
    items: [
      {
        q: "Do you provide support after handover?",
        a: "Yes. We stand behind what we deliver and design it to endure, so our developments keep rewarding the people and investors who trust them.",
      },
      {
        q: "How are defects handled after I move in?",
        a: "Every handover includes a defect liability commitment. Issues raised during that period are made good by our team — and because we build for durability from the start, the list is short.",
      },
    ],
  },
];

export const ALL_FAQS: FaqItem[] = FAQ_GROUPS.flatMap((g) => g.items);

/** The six questions surfaced on the homepage accordion. */
export const HOME_FAQS: FaqItem[] = [
  FAQ_GROUPS[0].items[0],
  FAQ_GROUPS[0].items[1],
  FAQ_GROUPS[2].items[0],
  FAQ_GROUPS[1].items[0],
  FAQ_GROUPS[0].items[3],
  FAQ_GROUPS[3].items[0],
];
