# Handoff: Bloomwish full-app redesign — "Day & Night Garden"

> Source: claude.ai/design project **Bloomwish**, canvas `Garden Options.dc.html` (badges 4a–4e, 3a–3n, 2a–2b, 1a–1c). The canvas HTML is a design reference, not production code — recreate in Expo/React Native using the existing patterns.
>
> Decisions approved by Katie on 2026-07-18:
> 1. Theme trigger: **local time** (day ~06:00–19:00) with an Auto/Day/Night override in preferences; system appearance ignored.
> 2. Navigation: **4 tabs Garden · Water · Feed · Signs**; Greenhouse merges into Garden home; Profile moves to a header icon → modal.
> 3. Tokens: **approved** — gold glow is the single sanctioned shadow (motif-only, never elevation); raw-gold sun-moment banner with ≥14px/600 plum text; new type steps 34/28/22/17/13/11.
> 4. Sequencing: **foundation first** (theme system, tokens, ambient layer, animated plant, Garden home, tab bar), remaining screens after review.

## Overview
A full visual + experience redesign of Bloomwish. Direction: **clean, modern, quietly premium, ethical** — delight from restraint, atmosphere, and companionship. Core system idea: **every screen has a Day theme and a Night theme that swap automatically with the user's local time** (day ≈ 06:00–19:00 / local sunset). Day = warm cream, swaying leaves, drifting gold pollen motes. Night = deep plum, moon, extra fireflies, glowing blooms, slower motion.

## Screen map (canvas badges)
| Badge | Screen | Mode shown |
|---|---|---|
| 4a | Share the bloom (story card + share sheet) | Light shell, night card |
| 4b | Wishing grove — day | Day |
| 4c | Watering moment (hold to pour) | Day |
| 4d | Custom meditation builder | Day |
| 4e | Meditation player (plant-as-player) | Night |
| 3a | Welcome | Day |
| 3b | Intro "taste" (aurora, tap-paced) | Night |
| 3c | Quiz | Day |
| 3d | Plant a wish (two paths) | Day |
| 3e | Planting ceremony | Day |
| 3f | Water hub (5 modes) | Day |
| 3g | Breathe session | Day |
| 3h | Drift session | Night |
| 3i | Feed | Day |
| 3j | Signs + sun moment | Day |
| 3k | Revive ritual | Night |
| 3l | Harvest | Day |
| 3m | Wishing grove — night | Night |
| 3n | Full Bloom paywall | Day |
| 2a/2b | Garden home (canonical layout) | Day / Night |
| 1a–1c | Earlier explorations (superseded; keep for rationale) | — |

**Every screen implements BOTH themes.** Night additionally layers ambient fireflies + moon and slows animation periods ~1.5×.

## Fidelity
High-fidelity: colors, type sizes, spacing, radii, and copy in the mocks are intentional. Plant/pot illustrations are placeholder geometry — final art should be Lottie plants with the same silhouettes, colors, and states.

## Key specs
Common shell: content column max 480px; screen padding 28px horizontal; cards `backgroundElement`, radius 16, padding 18–24; primary button full-width, radius 16, 15px/700 label, 15px vertical padding; micro-labels 11px/700, letter-spacing 0.10–0.12em, uppercase, `textSecondary`; page titles 34/40 600; card titles 16–17/600; body 14–15/20–22 500; italic 15px `textSecondary` for affirmation lines. Tab bar: Garden · Water · Feed · Signs (12px/700 active in `primary` with 6px dot, 12px/600 `textSecondary` inactive), top hairline `border`.

- **Garden home (2a/2b)** — date micro-label → greeting (34/40) → italic affirmation → hero dream card (plant on 120px tonal circle `backgroundSelected`, dream title 22/600, status chip 13/700 uppercase in `accent` [day] / gold #E9B44C [night], primary CTA "Begin today's/tonight's ritual") → 3 tending tiles (Water / Log a sign / Listen→Drift at night) → "The greenhouse" shelf rows (pots = warmBrown trapezoids, plant glyph per growth state, 12px/700 labels, 10px warmBrown shelf bar, dashed-circle "Plant a wish" slot) → whisper card (spark icon, "Today's/Tonight's whisper") → tab bar. Night: moon top-right (cream circle + offset bg circle), 6 fireflies, sage CTA (#8FBC94 bg, #241C29 text).
- **Watering (4c)** — 120px circular "Hold to water" button (primary bg, breathing scale), watering can pours 3 looping droplets (#8FBC94, staggered), leaves perk per drop, 8px progress bar (track `backgroundSelected`, fill `primary`), release = plant settles one notch taller + haptic per drip. Release before full = progress persists.
- **Meditation player (4e)** — the plant IS the player: stem = progress track (#3B3050 track, #3E7C59 fill, 6px), gold 22px spark = draggable scrub handle, chapters Arrive·Scene·Body·Warm·Seal (12px/700; done sage, current gold, upcoming textSecondary; tap to jump), leaves unfurl at chapter marks, bloom opens at Seal. 76px sage play/pause, ±15s, italic caption line. Night surface.
- **Share the bloom (4a)** — 9:16 card (250×444 preview) on night gradient (#241C29→#302840): gold "N DAYS IN THE MAKING" micro-label, headline, blooming plant, journey stats, Bloomwish spark wordmark. 3 card styles (Night bloom / Cream minimal / Just the plant). Share row: IG Story, TikTok, X, Save, More. Wish text private unless opted in. Card animates when exported as story — video/Live Photo where possible, else PNG.
- **Paywall (3n)** — ethical: benefit list (8px primary dots), founder voice sample row, price in the button, "Cancel anytime in two taps. No trial tricks.", equal-weight "Stay Seedling — it's genuinely free" link. No countdowns, no scarcity.
- All other screens: read layout, copy, exact colors from the mock (they follow the common shell).

## Navigation model (Expo Router)
Four persistent tabs — **Garden · Water · Feed · Signs** — everything else pushed or modal:
- **Garden**: home. Pushes dream detail and the wishing grove (a "back room"); "Plant a wish" → creation flow; hero CTA presents the immersion/session flow full-screen.
- **Water**: mode list (3f). Each mode presents a full-screen modal session (3g Breathe, 3h Drift, 4e player). Listen pushes the builder (4d) then presents the player. Sessions end with the watering moment (4c) as the final step of the same modal stack, then dismiss with the plant visibly grown.
- **Feed**: cards push their own flows (rampage = full-screen modal; future-self letter = push).
- **Signs**: FAB presents log-a-sign as a sheet (radius 24, not full-screen).
- **Creation flow** (3d → ritual or plant-it-now → 3e ceremony): full-screen modal stack; ceremony dismisses to Garden with the new seed planted.
- **Endings**: revive (3k) and harvest (3l) full-screen modals; harvest chains to share (4a), a sheet on top.
- **Onboarding** (3a→3b→3c→starter dream): pre-tab stack, replaced by tabs on completion.
- **Paywall** (3n): sheet/modal from any gated action; ✕ always available.
- Back behavior: sessions confirm-free (✕ pauses and keeps progress); ceremonies one-way forward but always skippable ("Not yet").
Rule of thumb: **tabs = places, modals = rituals, sheets = quick acts.**

## Interactions & behavior
- **Theme swap**: automatic by local time (sunset/sunrise or 06:00/19:00 fallback); crossfade ~1.2s; manual override in settings (Auto / Day / Night).
- **Ambient motion budget**: ≤5% visual weight. Day: leaf sway 4–5s ±6° (transform-origin stem joint), pollen motes rise-and-fade 9–13s, spark glow pulse 2.5–3.5s. Night: sway 6–7s, 4–6 fireflies per screen (translate ±10px, opacity .3–.95, 5–9s, staggered), blooms soft-glow. Respect Reduce Motion: freeze ambient loops, keep functional transitions.
- Aurora (3b): two blurred gradient blobs translating ±24px over 8–12s; advance on tap — user-paced, never timed.
- Quiz options: `backgroundElement` → selected `backgroundSelected` + 10px primary dot, no borders.
- Sun moment banner (3j): gold bg, slow glow pulse; appears only after ≥3 signs in 7 days.
- Revive (3k): wilting = 8° tilt + desaturated leaves at 75% opacity; copy never shames ("resting, not gone"); three exits: revive ritual, release with gratitude, let it rest.

## State
- `themeMode: 'auto' | 'day' | 'night'` + derived `resolvedTheme`.
- Dream: growthState seed|sprout|growing|budding|blooming, health thriving|wilting|dormant, per-dream bloom color, day counter, waterings, signs.
- Sessions: mode, chapter index (arrive/scene/body/warm/seal), progress seconds, composed-meditation params (dream, length, voice, soundscape).
- Streak (grove charms), whisper-of-the-day, grove gift queue (night-only reveal).

## Tokens (existing — unchanged)
Light: text #46344E · background #FBF3E7 · backgroundElement #F3E9DA · backgroundSelected #EADCC6 · textSecondary #685A6D · primary #3E7C59 · primarySoft #8FBC94 · accent #83641A · danger #AC4237 · border #E6D8C4.
Dark: text #FBF3E7 · background #241C29 · backgroundElement #302840 · backgroundSelected #3B3050 · textSecondary #C7B9CC · primary #8FBC94 · primarySoft #3E7C59 · accent #E9B44C · danger #E08B7D · border #463A54.
Brand: deepGreen #3E7C59 · sage #8FBC94 · gold #E9B44C · dustyPink #E4A7B0 · cream #FBF3E7 · plum #46344E · warmBrown #B98A5E.
Spacing 2/4/8/16/24/32/64 · radius 16 / 24 (sheets) · weights 500/600/700 only · content cap 480px.

### Approved token additions
- Type steps: display 34/40 600 (greetings), heading 28/36 600, 22/28 600 (card titles), 17/600, 13/700-upper (status chips), 11/700-upper (micro-labels).
- `glowGold` shadow: `0 0 18–26px rgba(233,180,76,.35–.6)` — the ONLY sanctioned shadow, gold-only, motif-only, never elevation.
- Motion tokens: swayDay 4–5s, swayNight 6–7s, glowPulse 2.5–3.5s, firefly 5–9s, breathe 8s.

## Remaining conflicts resolved in code
- Weight 400 never used; keep 500/600/700 rule.
- All "Bloomwish" strings route through `branding.ts` (name pending trademark).
- Plant glyph: build Reanimated/Lottie plant with named states (growth × health) before polishing plant-centric screens.

## Screens still to design (do NOT improvise — ask the designer)
Sign-in/up · remaining quiz steps + starter dream · full ritual inner steps · Speak/Write/Listen sessions · rampage · future-self letter · release ritual · harvest confirm + post-harvest state · immersion ritual full flow · settings · empty states · loading/compose states · error states · notification content.

## Ethical ground rules (binding)
No fake urgency or artificial scarcity; no shame-based notifications; plants never permanently die; free tier genuinely useful; easy cancellation; transparent pricing; variable rewards cosmetic only ("nothing here is for sale"); copy framed as visualization/mindfulness, never manifestation guarantees.
