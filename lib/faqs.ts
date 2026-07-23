/* ============================================================
   FAQ content — single source of truth.
   The /faq page renders every group (and emits FAQPage schema
   from the same data); the homepage shows HOME_FAQS, a standalone
   set with shorter, home-specific answers.
   Answers are written to carry the site's target keywords
   naturally: Sri Lanka, Colombo, Dehiwala, Makro Heights,
   property developer, apartments, Wheels Lanka Group.
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
        a: "Makro Developers is committed exclusively to Sri Lanka, with our current flagship development, Makro Heights, located on Rohini Place in Dehiwala — moments from Colombo. As our portfolio grows, we remain focused on strengthening our understanding of the Sri Lankan market rather than expanding beyond it.",
      },
      {
        q: "Is Makro part of a larger group?",
        a: "Yes. Makro Developers is a wholly owned subsidiary of the Wheels Lanka Group, one of Sri Lanka's established diversified business groups. That relationship provides the financial strength, governance and long-term stability behind every development we undertake.",
      },
      {
        q: "How long has Makro Developers been operating?",
        a: "Makro Developers was incorporated in 2013 as the real estate development arm of the Wheels Lanka Group, giving us over a decade of experience navigating Sri Lanka's planning, construction and property landscape.",
      },
      {
        q: "What makes a Makro home different?",
        a: "Every Makro home is the product of thousands of interconnected decisions — in planning, engineering, material selection and construction — all measured against the same benchmark, The Standard Above. We build for how a home performs decades after handover, not just how it looks on completion day.",
      },
      {
        q: 'What does "The Standard Above" mean?',
        a: "The Standard Above is our commitment to measuring every decision — in planning, design, engineering and construction — against a higher benchmark than what's typically expected in the industry. It's not a slogan; it's the discipline behind every Makro development, including Makro Heights.",
      },
    ],
  },
  {
    group: "Buying",
    items: [
      {
        q: "How do I enquire about a specific project?",
        a: "You can enquire about any current or upcoming development, including Makro Heights, through our contact form. Select the project you're interested in and our team will follow up with detailed information and availability.",
      },
      {
        q: "What types of property does Makro offer?",
        a: "Our primary focus is residential condominiums, exemplified by Makro Heights in Dehiwala, alongside commercial, mixed-use and select hospitality and greenfield developments across Sri Lanka.",
      },
      {
        q: "How are payments structured when buying off-plan?",
        a: "Off-plan purchases are typically structured around a booking deposit followed by staged payments tied to construction milestones, through to final settlement at handover. Exact schedules are confirmed per project in the sale and purchase agreement, and our sales team can walk you through the structure for any current release.",
      },
      {
        q: "Can I visit a completed Makro development before buying?",
        a: "We welcome site visits wherever a development or show apartment is available for viewing. As Makro Heights progresses, we'll arrange site visits and a show apartment so prospective buyers can experience the quality firsthand before committing.",
      },
      {
        q: "Is a mortgage or bank financing available for Makro Heights?",
        a: "Many buyers finance their purchase through a bank mortgage, and we can put you in touch with financial institutions we've worked with on previous developments. Financing terms depend on your bank and personal circumstances, so we recommend speaking with a lender early in your decision process.",
      },
      {
        q: "How is car parking allocated to each apartment?",
        a: "Makro Heights is planned with dedicated parking across two basement levels, including provision for visitor parking. Allocation is confirmed at the point of sale and detailed in your sale and purchase agreement — our sales team can walk you through availability for your chosen unit.",
      },
      {
        q: "Is VAT included in the purchase price?",
        a: "Purchase prices and any applicable VAT treatment are set out clearly in our sale and purchase agreement. Tax treatment can vary by buyer status and unit type, so we recommend confirming the exact figure for your unit with our sales team before signing.",
      },
    ],
  },
  {
    group: "Investing",
    items: [
      {
        q: "Can I invest in a Makro development?",
        a: "Yes. Beyond owner-occupiers, Makro developments attract investors seeking long-term rental demand and capital appreciation. Our sales team can advise on investment-focused unit types and expected returns for any current release.",
      },
      {
        q: "Can foreigners buy property in Sri Lanka?",
        a: "Foreign nationals can generally purchase condominium units in Sri Lanka, including apartments from the fourth floor upward, subject to conditions under Sri Lankan law. We recommend confirming current eligibility and any applicable taxes with your legal advisor — our team is glad to guide you through the process.",
      },
      {
        q: "Why invest in Sri Lankan real estate now?",
        a: "Colombo and its surrounding suburbs continue to offer strong long-term fundamentals — central, high-demand locations, growing professional and expatriate demand, and comparatively attainable entry prices against the region. Developments like Makro Heights sit in established residential areas with strong long-term investment characteristics.",
      },
      {
        q: "What rental yields can I expect from a Makro Heights apartment?",
        a: "Rental performance depends on unit type, floor and market conditions at the time of leasing. Dehiwala's central, highly residential location — close to Colombo and well suited to professionals and young families — supports strong long-term rental demand, and our sales team can share indicative yield estimates for specific unit types.",
      },
    ],
  },
  {
    group: "After Handover",
    items: [
      {
        q: "Do you provide support after handover?",
        a: "Yes. Our responsibility doesn't end at handover — it's when a long-term relationship begins. We provide structured after-sales support, respond to maintenance concerns and use every project's feedback to improve the next.",
      },
      {
        q: "How are defects handled after I move in?",
        a: "Defects identified within the applicable defect liability period are addressed by our team and appointed contractors at no cost to the homeowner. Owners report issues through our after-sales channel, and we track every case through to resolution.",
      },
      {
        q: "What does the condominium management fee cover?",
        a: "The monthly management fee covers the upkeep of shared facilities, common-area utilities, security, building insurance and the professional management of the condominium corporation. A detailed fee schedule is provided before handover so owners know exactly what to expect.",
      },
    ],
  },
];

export const ALL_FAQS: FaqItem[] = FAQ_GROUPS.flatMap((g) => g.items);

/** The six questions surfaced on the homepage accordion — standalone
    copies with shorter, home-specific answers. */
export const HOME_FAQS: FaqItem[] = [
  {
    q: "Where does Makro Developers build?",
    a: "Makro Developers is committed exclusively to Sri Lanka, with our current flagship development, Makro Heights, located on Rohini Place in Dehiwala — moments from Colombo.",
  },
  {
    q: "Is Makro part of a larger group?",
    a: "Yes. Makro Developers is a wholly owned subsidiary of the Wheels Lanka Group, giving every development financial strength, governance and long-term stability.",
  },
  {
    q: "Can I invest in a Makro development?",
    a: "Yes. Beyond owner-occupiers, our developments attract investors seeking long-term rental demand and capital appreciation — our sales team can advise on investment-focused unit types.",
  },
  {
    q: "How do I enquire about a specific project?",
    a: "Use our contact form and select the project you're interested in, including Makro Heights, and our team will follow up with detailed information and availability.",
  },
  {
    q: "What makes a Makro home different?",
    a: "Every Makro home is measured against The Standard Above — the same discipline in planning, engineering and construction, regardless of budget or market segment.",
  },
  {
    q: "Do you provide support after handover?",
    a: "Yes. Our responsibility doesn't end at handover — it's when a long-term relationship begins, backed by structured after-sales support.",
  },
];
