import { BRAND, IMG } from "./images";

/* ============================================================
   Insights — evergreen, keyword-targeted guides.
   Each article owns one primary search topic and links back to
   the commercial pages (projects, approach, contact) so search
   equity flows to the pages that convert.
   Display headings stay short per the brand copy rule; the long
   keyword-rich copy lives in body paragraphs + metaDescription.
   ============================================================ */

export interface InsightSection {
  heading: string;
  paras: string[];
  /** Optional bullet list rendered after the paragraphs. */
  points?: string[];
}

export interface Insight {
  slug: string;
  title: string;
  /** Short display heading for cards and the article hero. */
  displayTitle: string;
  category: "Buying" | "Investing" | "Commercial" | "Guides";
  date: string; // ISO
  readTime: string;
  cover: string;
  excerpt: string;
  metaDescription: string;
  keywords: string[];
  intro: string;
  sections: InsightSection[];
  /** Slugs of related insights (2 each, hand-picked). */
  related: string[];
  /** Project slugs this article should funnel readers toward. */
  relatedProjects: string[];
}

export const INSIGHTS: Insight[] = [
  {
    slug: "buying-an-apartment-in-colombo-guide",
    title: "Buying an Apartment in Colombo: The Complete Guide",
    displayTitle: "Buying an apartment in Colombo.",
    category: "Buying",
    date: "2026-06-15",
    readTime: "7 min read",
    cover: IMG.warmLiving,
    excerpt:
      "Location, developer track record, build quality and paperwork — what actually matters when buying an apartment in Colombo.",
    metaDescription:
      "A practical guide to buying an apartment in Colombo, Sri Lanka — how to judge location, developer track record, construction quality, payment plans and legal due diligence before you commit.",
    keywords: [
      "buying an apartment in Colombo",
      "apartments for sale Colombo",
      "luxury apartments Colombo",
      "Colombo property guide",
      "Sri Lanka apartment buying process",
    ],
    intro:
      "Colombo's apartment market rewards buyers who look past the brochure. This guide covers what to evaluate — location fundamentals, the developer behind the tower, construction quality and the paperwork — before you sign.",
    sections: [
      {
        heading: "Location is a decade-long decision.",
        paras: [
          "In Colombo, micro-location matters more than the city itself. Colombo 07's established streets, Colombo 05's connectivity and emerging corridors such as Rajagiriya and Battaramulla each behave differently as investments. Ask how the neighbourhood will look in ten years, not how it photographs today.",
          "Proximity to schools, hospitals and daily conveniences drives both liveability and resale demand for apartments in Colombo — and unlike finishes, location can never be renovated.",
        ],
      },
      {
        heading: "The developer matters more than the render.",
        paras: [
          "Any render can look spectacular. What separates a safe purchase from a risky one is the property developer's record of finishing what they start — on schedule, to specification, with owners who would buy again.",
          "Look for completed, occupied projects you can walk through, corporate backing that guarantees staying power, and after-handover support. A developer backed by an established group, as Makro Developers is by the Wheels Lanka Group, carries a different risk profile from a single-project company.",
        ],
        points: [
          "Visit a completed project — occupied buildings tell the truth",
          "Check the corporate structure behind the brand",
          "Ask who handles defects after handover, and for how long",
        ],
      },
      {
        heading: "Judge the build, not the finishes.",
        paras: [
          "Marble lobbies date; structure and services endure. In a tropical climate, cross-ventilation, shading, glazing quality and waterproofing decide what an apartment costs to run and how it ages. Ask about floor-to-ceiling heights, natural light, backup power and water, and lift capacity at peak hours.",
          "Quality you feel years after handover — not just on the day you receive the keys — is the standard worth paying for.",
        ],
      },
      {
        heading: "Paperwork, payments and due diligence.",
        paras: [
          "Confirm clear title to the land, approved building plans and, for apartments, the condominium plan registration. Payment schedules tied to construction milestones protect you; heavy upfront payments to thinly capitalised developers do not.",
          "Engage your own lawyer early. A reputable developer will welcome scrutiny — hesitation to share documentation is itself an answer.",
        ],
      },
    ],
    related: ["how-to-choose-a-property-developer-in-sri-lanka", "sri-lanka-real-estate-investment-guide"],
    relatedProjects: ["makro-heights"],
  },
  {
    slug: "sri-lanka-real-estate-investment-guide",
    title: "Investing in Sri Lanka Real Estate: What to Know",
    displayTitle: "Investing in Sri Lankan real estate.",
    category: "Investing",
    date: "2026-06-01",
    readTime: "8 min read",
    cover: IMG.skylineWarm,
    excerpt:
      "Why disciplined investors are looking at Sri Lankan property — and how to separate durable value from speculation.",
    metaDescription:
      "An investor's guide to Sri Lanka real estate — market fundamentals, residential vs commercial property returns, what foreign buyers should know, and how to evaluate long-term value in Colombo and beyond.",
    keywords: [
      "Sri Lanka real estate investment",
      "property investment Sri Lanka",
      "invest in Colombo property",
      "Sri Lanka commercial property",
      "foreigners buying property in Sri Lanka",
    ],
    intro:
      "Sri Lankan real estate rewards patience and punishes speculation. Here is how disciplined investors evaluate the market — residential and commercial — and where durable value is actually created.",
    sections: [
      {
        heading: "The fundamentals favour the long view.",
        paras: [
          "Urbanising demographics, a growing professional class and constrained supply of well-built stock in prime Colombo underpin the market's long-term case. Land in established districts is finite; quality construction is scarcer still.",
          "The investors who do well in Sri Lankan property buy assets they would be comfortable holding for a decade — because the compounding happens in the holding, not the flipping.",
        ],
      },
      {
        heading: "Residential or commercial?",
        paras: [
          "Prime residential property in Colombo offers steady rental demand from professionals and expatriates, with capital appreciation concentrated in well-located, well-built projects. Waterfront and boutique developments in destinations like Galle add a lifestyle-asset dimension with strong holiday-let potential.",
          "Grade-A commercial space is a different instrument: longer leases, corporate tenants and returns driven by specification and location. Colombo's supply of genuinely Grade-A office space remains thin — which is precisely the opportunity.",
        ],
      },
      {
        heading: "What foreign investors should know.",
        paras: [
          "Foreign nationals can freely purchase condominium apartments in Sri Lanka (freehold land carries restrictions), which makes well-structured apartment and mixed-use projects the natural entry point for international capital.",
          "Work with developers who understand cross-border transactions and can evidence clean title, approvals and a compliant payment structure. Professional advice on tax and repatriation is essential — and cheap relative to the asset.",
        ],
      },
      {
        heading: "Judging durable value.",
        paras: [
          "The same tests apply to a villa and a tower: the land's ten-year trajectory, the developer's completed track record, construction quality that controls running costs, and an exit story that doesn't rely on a greater fool.",
          "Our own investment discipline is simple — we only build what we would be content to hold. That filter is available to investors too.",
        ],
        points: [
          "Buy the location's future, not its present",
          "Underwrite the developer before the deal",
          "Prefer quality that lowers lifetime cost",
          "Model the hold, not the flip",
        ],
      },
    ],
    related: ["buying-an-apartment-in-colombo-guide", "grade-a-office-space-colombo"],
    relatedProjects: ["makro-heights"],
  },
  {
    slug: "grade-a-office-space-colombo",
    title: "What Grade-A Office Space Means in Colombo",
    displayTitle: "What Grade-A really means.",
    category: "Commercial",
    date: "2026-05-18",
    readTime: "6 min read",
    cover: BRAND.texturePeaks,
    excerpt:
      "'Grade A' is Colombo's most overused label. Here is the specification the term is supposed to guarantee.",
    metaDescription:
      "What qualifies as Grade-A office space in Colombo, Sri Lanka — floor plates, ceilings, lifts, power redundancy, façade performance and the specification checklist occupiers and investors should demand.",
    keywords: [
      "Grade A office space Colombo",
      "commercial property Colombo",
      "office space Sri Lanka",
      "Grade A building specification",
      "commercial real estate Sri Lanka",
    ],
    intro:
      "Every second tower in Colombo calls itself Grade A. The label has a real meaning — a specification that determines what a building costs to occupy, how it performs and what it is worth in fifteen years.",
    sections: [
      {
        heading: "The specification, not the lobby.",
        paras: [
          "Grade-A is a technical standard, not an aesthetic one. It lives in the floor plates, the cores, the services and the façade — the parts of a commercial building that cannot be refurbished later.",
        ],
        points: [
          "Column-light floor plates of 10,000+ sq ft for flexible fit-outs",
          "Finished ceilings of 2.7m or higher",
          "Destination-control lifts sized for peak loads",
          "N+1 backup power and independent water reserves",
          "High-performance glazing that controls solar gain",
          "Efficient net-to-gross ratios — you pay for usable space",
        ],
      },
      {
        heading: "Why it matters to occupiers.",
        paras: [
          "For a business, the difference between genuine Grade-A office space and a well-dressed Grade B building shows up monthly: cooling loads, downtime, churn costs when teams grow, and the talent question of whether people actually want to be in the building.",
          "Multinationals and their auditors increasingly require certified, resilient space — which keeps genuine Grade-A stock in Colombo structurally under-supplied.",
        ],
      },
      {
        heading: "Why it matters to investors.",
        paras: [
          "Specification is what separates assets that re-let quickly at premium rents from those that discount every cycle. A commercial building engineered to international standards holds tenants, holds rents and holds value.",
          "It is why every commercial space Makro plans is engineered around column-light plates, redundant services and a high-performance façade from the first feasibility study — the specification global occupiers audit for, held to the same standard that governs every Makro development.",
        ],
      },
    ],
    related: ["sri-lanka-real-estate-investment-guide", "how-to-choose-a-property-developer-in-sri-lanka"],
    relatedProjects: ["makro-heights"],
  },
  {
    slug: "how-to-choose-a-property-developer-in-sri-lanka",
    title: "How to Choose a Property Developer in Sri Lanka",
    displayTitle: "Choosing a developer you can trust.",
    category: "Guides",
    date: "2026-05-02",
    readTime: "6 min read",
    cover: IMG.concreteLines,
    excerpt:
      "The developer is the single biggest variable in any purchase. Five tests that separate reliable builders from marketing.",
    metaDescription:
      "How to evaluate property developers in Sri Lanka before you buy — track record, financial backing, construction standards, transparency and after-sales support. Five tests every buyer should apply.",
    keywords: [
      "property developers in Sri Lanka",
      "best property developer Colombo",
      "how to choose a property developer",
      "trusted developers Sri Lanka",
      "real estate developer track record",
    ],
    intro:
      "In property, you never really buy a building — you buy the organisation that promises to deliver it. These five tests tell you whether that promise will hold.",
    sections: [
      {
        heading: "One — a track record you can walk through.",
        paras: [
          "Completed, occupied, ageing-well buildings are the only evidence that matters. Visit a project the developer handed over years ago and look at how it has weathered. And where a developer's flagship is still in planning — as Makro Heights is — scrutinise what you can verify instead: the group behind it, the professionals it has appointed and the standards it publishes. Substance you can check beats any promise.",
        ],
      },
      {
        heading: "Two — the strength behind the brand.",
        paras: [
          "Construction is capital-hungry, and half-finished towers are usually financing failures, not engineering ones. A developer backed by an established group — as Makro Developers is by the Wheels Lanka Group — can hold its schedule and its standards through market cycles.",
        ],
      },
      {
        heading: "Three — standards you can inspect.",
        paras: [
          "Ask what standard the structure is engineered to, who supervises quality on site, and how materials are selected. Specific answers signal a real process; vague reassurance signals its absence. Our four-stage approach — plan, design, build, endure — exists precisely so the answer is never vague.",
        ],
      },
      {
        heading: "Four — transparency before you commit.",
        paras: [
          "Title documents, approvals, specifications and payment structures should be offered, not extracted. Developers with nothing to hide behave that way.",
        ],
      },
      {
        heading: "Five — presence after handover.",
        paras: [
          "The keys are the midpoint of the relationship, not the end. Ask how defects are handled, who maintains common property, and whether earlier buyers would purchase again. After-sales behaviour is where a developer's real character shows.",
        ],
      },
    ],
    related: ["buying-an-apartment-in-colombo-guide", "grade-a-office-space-colombo"],
    relatedProjects: ["makro-heights"],
  },
];

export function getInsight(slug: string): Insight | undefined {
  return INSIGHTS.find((i) => i.slug === slug);
}

export const INSIGHT_SLUGS = INSIGHTS.map((i) => i.slug);
