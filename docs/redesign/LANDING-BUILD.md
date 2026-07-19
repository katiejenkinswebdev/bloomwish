# Build instructions: Bloomwish marketing landing page

> Source: claude.ai/design project **Bloomwish**, canvas `Bloomwish Landing.dc.html` (sections L1–L7).
> Implemented 2026-07-19 as static HTML in `site/` (index.html + privacy/terms/support + og.png/favicon.svg/apple-touch-icon.png).

## Page structure (top to bottom)
1. **L1 Nav** — spark glyph + "Bloomwish" wordmark left; links Rituals / Day & night / Pricing + primary "Get the app" button right. Sticky, background #FBF3E7 with bottom hairline #E6D8C4.
2. **L2 Hero** — two columns (stack under ~900px). Left: micro-label "A MANIFESTATION GARDEN FOR IPHONE & ANDROID", headline "Plant a wish. Grow a dream." (54/58 600, letter-spacing -0.015em), 17/26 subline, App Store + Google Play badge buttons (plum #46344E pills — replace with official store badges + real links at launch), italic tagline "Let it be! And so it is.". Right: hero dream card (340px, #F3E9DA, radius 24): blooming plant on 150px #EADCC6 circle, "The Seaside Studio", "DAY 34 · BLOOMING" (13/700 upper #83641A), full-width green CTA. Gold pollen motes drift up through the section.
3. **L3 Day & night** — full-bleed #241C29. Moon (cream circle + offset bg circle) top right, 3 fireflies. Gold micro-label "DAY & NIGHT", 38/46 heading, #C7B9CC body. Three #302840 cards: Morning ritual / Firefly hour / Never a guilt trip.
4. **L4 Rituals** — cream. Heading "Small rituals, watered daily." Grid `repeat(auto-fit, minmax(180px, 1fr))` of five mode cards (Breathe/Listen/Speak/Write on #F3E9DA; Drift on plum #46344E — night-only). Below: two wide cards, "Log the signs" (twinkling gold spark) and "Harvest & share" (pink dot).
5. **L5 Pricing** — full-bleed #F3E9DA. Two equal cards: Seedling (Free, #FBF3E7, green bullet dots, italic "Genuinely useful, forever.") and Full Bloom ($6.99/month, plum #46344E, gold spark label, sage #8FBC94 dots, one firefly, "Cancel anytime in two taps. No trial tricks."). Cards equal visual weight — no "most popular" badge, no strikethrough pricing.
6. **L6 Ethics strip** — centered: twinkling spark, "No fake urgency. No shame. Nothing in the grove is for sale." (26/34 600), disclaimer copy ending "That part is yours."
7. **L7 Footer** — hairline top border; spark + wordmark + tagline left; links Get the app / Pricing / Support / Privacy / Terms right.

## Tokens (do not invent)
Colors: text #46344E · bg #FBF3E7 · card #F3E9DA · selected #EADCC6 · secondary #685A6D · primary #3E7C59 · sage #8FBC94 · gold #E9B44C · gold-text-on-light #83641A · pink #E4A7B0 · night bg #241C29 · night card #302840 · night secondary #C7B9CC · hairline #E6D8C4.
Type: Spline Sans (Google Fonts), weights 500/600/700 only. Scale: 54/58, 38/46, 26/34, 20, 17/26, 16, 15, 14, 13, 11/700 uppercase micro-labels (.12em).
Radius 16 (cards/buttons), 24 (hero card). Content max-width 1080px, 32px side padding. Flat surfaces — NO shadows except the gold glow (`0 0 18–26px rgba(233,180,76,.35–.6)`) on bloom sparks/fireflies only.
Links: default #3E7C59, hover #83641A.

## Motion (CSS keyframes; all pause under `prefers-reduced-motion: reduce`)
- `mote`: 4–5px gold dots rise 60px and fade, 9–13s linear (hero).
- `fireflyA/B`: ±8–10px drift with opacity .3–.95, 5–9s, staggered (night + pricing).
- `glowPulse`: gold glow 18px→26px, 2.5–3.5s (bloom center).
- `swayL/swayR`: leaves ±6° from stem joint, 4–5s.
- `twinkle`: opacity .9→.25, 3–4s (sparks).
Budget: ambient motion ≤5% visual weight; nothing faster than 2.5s.

## Content rules
Copy is final as written (ethical-design reviewed): no urgency, no scarcity, no manifestation guarantees. "Bloomwish" naming routes through one constant (the `BRAND` const in index.html, mirroring the app's `branding.ts`).

## Remaining before launch
- Swap placeholder store pills for official Apple/Google badge assets + real store URLs.
- Legal review of privacy.html / terms.html (drafted from docs/store-readiness.md facts).
- Point `bloomwish.app` at the deployed site; confirm /privacy, /terms, /support resolve (App Store support URL = /support).
