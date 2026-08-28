-- ============================================================================
-- Blog copy revision — client's "Makro Website - Revised Copy" sheet, Aug 2026.
--
-- 20260803000600_blog.sql seeds each article only `where not exists`, so it
-- deliberately never touches a row once it is in the table. That guard is what
-- protects admin-panel edits — and it is also why the revised copy cannot
-- reach an existing database through the seed alone. This migration carries it.
--
-- Scope is deliberately narrow: display_title, excerpt, intro and sections are
-- the only columns the sheet revises. Covers, categories, read times, dates,
-- keywords, meta descriptions, related links, publish state and sort order are
-- all left exactly as the admin panel has them.
--
-- Idempotent: re-running writes the same values. NOTE that unlike the seed this
-- DOES overwrite the four seeded articles' body copy, which is the point — if
-- any of them has since been rewritten in the admin panel, take a copy first.
-- ============================================================================

-- buying-an-apartment-in-colombo-guide
update public.blog_posts set
  display_title = $mk$Investing in an apartment in Colombo.$mk$,
  excerpt       = $mk$What matters when choosing an apartment to live in or invest in — from location and the developer to build quality and documentation.$mk$,
  intro         = $mk$Whether you are buying a home or an investment, an apartment is a decision with lasting implications. Look beyond the brochure to the fundamentals that shape both the experience of living there and the value it can hold over time — location, the developer, build quality and the documentation behind it.$mk$,
  sections      = $json$[
        {
            "heading": "Location is more than an address.",
            "paras": [
                "The right location should work for both the life you lead today and the value you may need tomorrow. Look beyond the address to the neighbourhood’s connectivity, amenities, infrastructure and potential for growth — because while an apartment can be renovated, its location cannot."
            ]
        },
        {
            "heading": "The developer matters as much as the property.",
            "paras": [
                "A compelling design is only as valuable as the developer’s ability to deliver it. Look beyond the render to completed projects, delivery standards, financial strength and what happens after handover. A developer’s track record tells you far more about what you are buying than a promise on a page."
            ],
            "points": [
                "Visit a completed project — occupied buildings tell the truth",
                "Check the corporate structure behind the brand",
                "Ask who handles defects after handover, and for how long"
            ]
        },
        {
            "heading": "Look beyond the finishes.",
            "paras": [
                "What matters most is often what you cannot see. Consider the structure, services, ventilation, natural light, waterproofing, glazing, backup systems and the quality of the spaces themselves — the elements that determine how a home performs, what it costs to run and how well it ages. Good finishes create an impression; good construction creates lasting value."
            ]
        },
        {
            "heading": "Know what you are buying.",
            "paras": [
                "Before committing, make sure the fundamentals are in order. Confirm clear title, approved plans, condominium registration and a payment structure aligned with the progress of construction. Independent legal advice is worth taking early — and a developer willing to provide clear documentation should have nothing to hide."
            ]
        }
    ]$json$::jsonb
where slug = $mk$buying-an-apartment-in-colombo-guide$mk$;

-- sri-lanka-real-estate-investment-guide
update public.blog_posts set
  display_title = $mk$Investing in Sri Lankan real estate.$mk$,
  excerpt       = $mk$A considered look at the fundamentals that shape property value — and how to distinguish durable opportunities from speculation.$mk$,
  intro         = $mk$Property rewards investors who look beyond the immediate. Understanding the fundamentals — from location and market demand to quality, ownership structure and the developer behind the asset — is essential to identifying opportunities with durable value.$mk$,
  sections      = $json$[
        {
            "heading": "The fundamentals favour a longer view.",
            "paras": [
                "Strong property investments are built on fundamentals, not short-term momentum. In established parts of Colombo, finite land, growing demand and limited supply of well-built property support a longer investment horizon. The focus should be on assets with the quality, location and underlying demand to remain relevant through the cycle."
            ]
        },
        {
            "heading": "Residential or commercial? Different assets, different dynamics.",
            "paras": [
                "Residential and commercial property serve different investment objectives. Residential value is shaped by location, liveability, rental demand and quality, while commercial assets depend more heavily on specification, tenant demand, lease strength and location. The right choice comes down to the asset, the market it serves and the investment horizon behind it."
            ]
        },
        {
            "heading": "Investing across borders.",
            "paras": [
                "Sri Lankan condominium property can provide a practical entry point for international investors, but cross-border ownership requires careful due diligence. Consider the title, approvals, ownership structure and payment arrangements, and seek professional advice on taxation and the repatriation of funds before committing."
            ]
        },
        {
            "heading": "Value that holds over time.",
            "paras": [
                "Durable value comes from fundamentals that remain relevant beyond the purchase. Consider the location’s future, the developer’s track record, the quality and efficiency of the asset, its ongoing costs and the depth of future demand. The strongest investments are those that remain desirable to live in, operate and own — not simply sell."
            ],
            "points": [
                "Buy the location's future, not its present",
                "Underwrite the developer before the deal",
                "Prefer quality that lowers lifetime cost",
                "Model the hold, not the flip"
            ]
        }
    ]$json$::jsonb
where slug = $mk$sri-lanka-real-estate-investment-guide$mk$;

-- grade-a-office-space-colombo
update public.blog_posts set
  display_title = $mk$What Grade-A really means.$mk$,
  excerpt       = $mk$Beyond the label: what specification, performance and resilience really mean in Grade-A office space.$mk$,
  intro         = $mk$Grade-A is more than a polished lobby or a premium address. It is a measurable standard of specification, performance and resilience — one that affects how efficiently a building operates, what it costs to occupy and how well its value holds over time.$mk$,
  sections      = $json$[
        {
            "heading": "The specification matters more than the finish.",
            "paras": [
                "Genuine Grade-A quality is defined by what sits behind the finishes. Floor plates, ceiling heights, lift capacity, power resilience, water reserves, glazing and net-to-gross efficiency all shape how a building performs for its occupiers and remains competitive over time."
            ],
            "points": [
                "Function spaces aligned with everyday living",
                "Finished ceilings of 2.7m or higher",
                "Destination-control lifts sized for peak loads",
                "N+1 backup power and independent water reserves",
                "Efficient net-to-gross ratios — you pay for usable space"
            ]
        },
        {
            "heading": "Performance is felt every day.",
            "paras": [
                "For occupiers, specification translates directly into the working environment and the cost of operating it. Efficient cooling, reliable power and water, flexible floor plates and resilient building systems reduce disruption, support changing business needs and create a workplace people want to be in."
            ]
        },
        {
            "heading": "Specification protects value.",
            "paras": [
                "For investors, quality specification is a commercial advantage. Buildings that perform well attract stronger occupiers, support rental resilience and remain competitive through market cycles. That is why specification should be considered from the earliest feasibility decisions — not added as an upgrade once the building is already designed."
            ]
        }
    ]$json$::jsonb
where slug = $mk$grade-a-office-space-colombo$mk$;

-- how-to-choose-a-property-developer-in-sri-lanka
update public.blog_posts set
  display_title = $mk$Choosing a developer you can trust.$mk$,
  excerpt       = $mk$Five things to look beyond the brochure for when assessing a developer — from track record and financial strength to standards, transparency and what happens after handover.$mk$,
  intro         = $mk$A property purchase is also a decision about who you trust to deliver it. Look beyond the project to the organisation behind it — its track record, financial strength, standards, transparency and commitment beyond handover. These are the things worth examining before you commit.$mk$,
  sections      = $json$[
        {
            "heading": "A track record you can see.",
            "paras": [
                "Past performance is best judged by what has actually been delivered. Look beyond completed projects to how they have performed over time — how they have aged, how they are maintained and how owners experience them. Where a developer is still establishing its own portfolio, examine what can be verified: the people behind it, the professionals appointed and the standards it commits to."
            ]
        },
        {
            "heading": "The strength behind the brand.",
            "paras": [
                "Property development requires substantial capital and the ability to remain committed through changing market conditions. Consider who stands behind the developer, the strength of its financial backing and whether it has the stability to maintain its commitments, standards and delivery throughout the development cycle."
            ]
        },
        {
            "heading": "Standards you can inspect.",
            "paras": [
                "Quality should be more than a promise. Ask what standards the building is designed and constructed to, who is responsible for quality on site and how materials and systems are selected. The more clearly a developer can explain its standards and processes, the more confidently you can assess what is being delivered."
            ]
        },
        {
            "heading": "Transparency before you commit.",
            "paras": [
                "The information behind a property should be clear before you commit. Title documents, approvals, specifications and payment structures should be readily available for review, with the developer prepared to answer questions openly and provide the information needed to make an informed decision."
            ]
        },
        {
            "heading": "Presence after handover.",
            "paras": [
                "The relationship with a developer should not end when the keys are handed over. Understand how defects are addressed, how common property is maintained and who remains responsible after completion. The way a developer stands behind what it delivers is as important as what it promises before purchase."
            ]
        }
    ]$json$::jsonb
where slug = $mk$how-to-choose-a-property-developer-in-sri-lanka$mk$;
