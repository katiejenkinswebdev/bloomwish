# Bloomwish — Product Guide

The complete reference for how the product works: every feature, every rule,
every number, and where each lives in code and config. Written for the
founder, future contributors, and store/compliance reviewers.

> Naming note: every user-facing name ("Bloomwish", "Full Bloom", "Let it be!
> And so it is.") is sourced from `src/config/branding.ts` — never hardcoded.
> Trademark pending.

---

## 1. Concept & core loop

Bloomwish is a manifestation/visualization app framed entirely as
**mindfulness and visualization practice** (no medical claims, no outcome
guarantees — see §14). Users plant **wishes (dreams)** as seeds in a garden,
return daily to **feel the dream as already real**, and tend plants that grow
through visible stages. When a wish comes true in real life, it's
**harvested** into a permanent keepsake.

**The core loop** (the app's center of gravity):

```
Open app → garden greets you (re-entry pulse)
  → "Return to the feeling" hero card (the dream that's waited longest)
    → 90-second immersion ritual (feel it in your body)
      → plant visibly drinks (+growth) → done for the day
```

Every session in the app ends with the seal: **"Let it be! And so it is."**
(`Branding.affirmation`).

---

## 2. The dream lifecycle

### 2.1 Planting

Two paths from the garden's **＋ FAB** (bottom-right):

- **Full path**: describe the wish (typed or dictated) → AI deepening
  questions (3–5, sensory/emotional) → AI-written second-person present-tense
  **scene** (120–250 words) with a **vividness score** (0–100; regenerate
  with tweak instructions until it feels right; 70+ = "vivid enough") →
  optional **time capsule** note → planting ceremony (seed drops, bounce,
  affirmation).
- **Fast path** ("Plant it now — deepen later"): wish → capsule → ceremony.
  No scene. The plant card later shows **"Make it vivid ✦"**, which runs
  questions → scene and saves onto the existing dream
  (`updateDreamScene`) — never a re-plant, never a paywall detour.

At planting, the coach writes a **2–5 word title** in the user's own words
(action `title`; fallback: truncation). The full original wish is stored in
`dreams.wish_text` and is what every AI call receives as context. The first
dream ever planted is flagged `is_starter_dream` (used by the free
meditation gift).

Seed packets: six prefill chips on the describe screen for small starter
wishes ("The perfect parking spot").

### 2.2 Growth states

Points from sessions (`sessions.health_boost`) accumulate per dream. State
never regresses. Thresholds (`app_config.growth_thresholds`, defaults):

| State | Points |
|---|---|
| seed | 0 |
| sprout | 30 |
| growing | 80 |
| budding | 160 |
| blooming | 280 |

### 2.3 Health (never death)

Derived **client-side** from `last_interacted_at` vs
`app_config.health_decay` (`wilting_after_days: 3`, `dormant_after_days:
10`): `thriving → healthy → wilting → dormant`. Completing any session steps
health **up one level**. Dormant is always reversible via the **revive**
ritual (a two-minute re-commitment) — dreams never die and the app never
shames a lapse. Wilting copy is "Missing you", not a warning.

### 2.4 Session economy

- Water default boost: **10** · Feed activities: **15** · Sign: **5**
  (`app_config.sign_health_boost`) · Release gift: **5**.
- **Daily gain cap** per user: **40** (`app_config.daily_health_gain_cap`;
  local dev DB uses 500). Past the cap, sessions still complete and step up
  health, but grant 0 growth — messaged as satiety ("fully watered for
  today"), never as failure.
- Growth is deliberately client-authoritative (anti-gaming by design, not
  enforcement — self-only impact; revisit before any social surface).

### 2.5 Endings (three honest ones)

1. **Harvest** (it came true): confirmation → celebration (butterflies,
   engraved plaque, capsule reveal if present, affirmation) → **share card**
   (§10) → trophy row created. The dream leaves the garden; it lives on as a
   greenhouse keepsake, a grove charm + star, and a butterfly.
2. **Dormancy** (resting): automatic via decay; revive anytime.
3. **Release** (it no longer fits): quiet ghost action on every plant card —
   *never suggested by the app*. Ritual: thank it (optional line, kept
   nowhere) → honest "can't be undone" → plant sinks into the soil →
   survivors each receive a one-time `release_gift` boost (+5, fresh
   `last_interacted_at`) → returning to the garden triggers the **nourish
   wave** (staggered plant pulse + rising sparks). Language is
   release/completion, never delete/give-up. Deletes the dream and cascades
   its history.

---

## 3. The immersion ritual (`/immerse`)

The daily heart. Full-screen night world (aurora orbs + breathing glow).
~90 seconds; auto-paced with tap-to-advance:

1. **Arrive** — somatic opener, different per weekday (7 variants).
2. **Scene, line by line** — the user's own scene split into sentences,
   large type. Fallback lines from the wish when no scene exists.
3. **Body** — "Where do you feel it right now?" (chest / stomach / throat /
   hands / everywhere). Saved as the session reflection (`Felt it in: …`)
   — this is the **body memory** other features read.
4. **Warm** — 8-second hold ("Let it warm there").
5. **Seal** — the affirmation + "And so it is" → completes a water session
   (`activityId: 'immersion'`).
6. **Done** — quiet close, no confetti.

Entry points: garden hero card (targets the least-recently-tended dream) and
"Step inside the dream" (primary button on every plant card). Onboarding
includes a 30-second **taste** of this world before signup asks for anything.

---

## 4. Water (light daily tending)

Five mode cards (drawn icons, not emoji):

| Mode | What it is | Logic |
|---|---|---|
| **Breathe** | Timer + breathing circle | Patterns: Calm 4/4 · Box 4×4 · 4·7·8. Durations 15s–15m (>3m gated to Full Bloom via `FreeTierLimits.maxTimerMinutes`). **Breathe the scene**: one line of the user's scene appears per full breath cycle. `activityId: timer:<pattern>` |
| **Listen** | Guided tracks | Track list with Full Bloom locks. `track:<key>` |
| **Speak** | Daily affirmation | Coach-written from the wish (cached ~12h). If body memory exists: "Find it in your chest first — then say it." `affirmation` |
| **Write** | 369 scripting | Write the dream 3× (morning), 6× (midday), 9× (evening) — count follows clock, no setting. Shows lifetime count ("written into being 27 times"); last line ghosts as placeholder and saves as reflection. `369:<period>` |
| **Drift** | Bedtime SATS | Dimmed purple UI, sleep breathing (5 in / 8 out), volume 0.5, scene text beneath, ends silently ("Sleep well") — no haptics/celebration. `sats` |

## 5. Feed (deeper weekly nourishment)

Activity list from the `feed_activities` table (founder-editable copy/order,
+15 boost each). The list opens with **Today's nudge** — one coach-written
noticing-prompt per dream per day (cached by day). Custom experiences:

| Practice | Experience |
|---|---|
| Write it in the past tense | Reflection input, memory framing |
| Tell one person | Input + **witness counter** ("You've told 3 people… dreams with witnesses grow bolder"; pill counter on the card) |
| Record a voice note | Dictation-first reflection (transcript only kept) |
| Gratitude list | Five things |
| Act as if | **Coach-suggested micro-action for this dream today** ("Carry your camera the way a working artist would") + what-I-did input |
| Compost a doubt | Write the worry → it sinks into the soil → **the coach returns the reframe it broke down into** → "Let it take root" (saves doubt + reframe) |
| Rampage of appreciation | 60-second countdown, speak or type without stopping |
| A letter from your future self | Coach writes 120–200 words from the arrived self, signed "— You, a little further down the path" |

All free-text inputs are label-less (placeholder coaches), all support
dictation where meaningful.

## 6. Signs & the sun moment

"Signs it's growing": log synchronicities/small wins (text or dictation,
optional photo → private storage). Each sign: +5 boost, a **firefly** on the
plant (capped at 12 visible, then a ✦ counter), and the **sun moment**
celebration; a state advance shows "✦ A new petal ✦". Newest sign is woven
into the next generated meditation's opening as real-world evidence.

## 7. Greenhouse & the wishing grove

- **Keepsakes**: each harvested dream as a blooming plant in a terracotta
  pot, two per wooden shelf, with an engraved plaque (`date · tended ×N`);
  tap to reveal its scene.
- **The wishing grove** (dusk band): a tree anchoring garland strings — one
  **gold charm per harvest** (tap → name + date), one **star per harvest**,
  fireflies (count scales with harvests, cap 7), and a crescent moon.
- **Random delight per visit** (rolled once per mount): shooting star
  (<0.30), gold butterfly visitor (0.30–0.55), or pink blossoms on the
  canopy (≥0.55).

## 8. Delight system (cosmetic only, never gates progress)

Probabilities in `app_config.reward_probabilities`:

- **Session complete**: butterfly visit 6% · universe card 10% · legendary
  (gold) butterfly 1% (Full Bloom only).
- **App open** (once per launch): surprise bloom 5% · universe card 4%.
- **11:11** (am or pm, once per day, checked at garden open): a guaranteed
  "make a wish" moment — synchronicity outranks the random roll.
- **Universe cards**: founder-editable messages in `universe_cards` table.
- **Seasonal**: subtle seasonal/holiday greetings (module exists; glyph
  currently not displayed pending styled seasonal icons).

## 9. The AI coach (Edge Function `dream-coach`)

Claude (`claude-opus-4-8`, adaptive thinking, structured outputs) behind a
warm gardener persona; profile context (name, category, experience, tone)
accompanies every call. Actions:

| Action | Produces | Used by |
|---|---|---|
| `questions` | 3–5 deepening questions | Dream creation |
| `scene` | 120–250 word second-person scene (supports tweak/regenerate) | Dream creation |
| `score` | Vividness 0–100 + missing senses | Scene screen |
| `title` | 2–5 word wish name | Planting |
| `affirmation` | 8–16 word present-tense affirmation | Water › Speak |
| `letter` | Future-self letter | Feed |
| `act` | Doable-today act-as-if micro-action | Feed |
| `reframe` | The nourishment a doubt composts into | Feed |
| `nudge` | Daily noticing-prompt (<20 words) | Feed list |
| `review` | Depth/authenticity feedback (server-side groundwork; UI gate removed by design) | — |

**Budget**: every paid call increments `ai_usage` (service-role-only,
atomic); ceilings in `app_config.ai_daily_limits` — coach **50/day**,
meditation **10/day** per user; 429 with friendly copy past them. With no
`ANTHROPIC_API_KEY` (local dev), all actions return `[Demo]` fallbacks.

## 10. Personalized meditations (Edge Function `generate-meditation`)

Pipeline: Claude writes a segmented script from the user's scene (45% speech
/ 55% pauses timing budget, tone preference honored, latest sign woven into
the opening) → ElevenLabs TTS per segment (the founder's cloned voice) →
pure-TS PCM mixing over an ambient bed (graceful voice-only fallback) → WAV
→ private storage, signed URLs. Durations 3/5/10/15m.

**Gates** (server-side, from the `entitlements` table maintained by the
RevenueCat webhook — never the client): Full Bloom = unlimited; free tier =
exactly **one gift** on the starter dream. **Cache**: same dream + duration
reuses the audio unless the scene changed (also the main cost lever; audio
cached on-device too). A daily-limit block fails its pending row so the
cache can't jam.

## 11. Sharing & ratings

- **Harvest share card**: fixed-palette night card (IT CAME TRUE · plant ·
  wish name · tended N times over D days · harvest date · wordmark).
  User-triggered native share sheet (view-shot capture); on web, the card
  displays with a screenshot hint. The app never posts anywhere itself.
- **Rating prompt**: exactly once per lifetime, 3.5s into the harvest
  celebration (the joy peak), never after errors
  (`bloomwish:rating-asked` in AsyncStorage; no-op where unsupported).

## 12. Retention surfaces

- **Re-entry pulse**: one line under the garden title from the most recently
  tended dream — "<20h: still glowing from your last visit · <48h: held its
  warmth overnight · else: has been waiting for you".
- **Notifications** (local, re-synced on every garden load): daily reminder
  at the user's chosen time **carries a real micro-practice** naming the
  longest-waiting dream (6 rotating nudge lines); wilting alerts (max 1/day,
  scheduled at the tip-over moment, pushed out by activity); delight
  notifications (max 2/week, pleasant times). All gentle; all individually
  toggleable; push token stored per user.
- **Widgets**: home-screen garden state (needs water / thriving / growing).
- **Weather mirror** (opt-in, Preferences): real local rain/snow
  (Open-Meteo, no key; location only on enable) falls gently over the
  garden. Fails silently to a normal garden.

## 13. Monetization

- **Seedling (free, genuinely useful)**: full core loop — immersion,
  watering, feeding, signs, releases, **1 active dream slot**, timers to
  3m, one gift meditation, common/rare delights.
- **Full Bloom**: unlimited slots, personalized voice meditations, long
  timers, premium tracks, legendary cosmetics. Offerings: monthly, annual
  (anchor, 7-day trial recommended), founding lifetime (limited — end date
  must be real, `Branding` placeholder gates preflight). Prices live in
  RevenueCat only; never hardcoded.
- **Paywall placement**: dismissible after first planting; hard gate only
  when planting dream #2 on free. Easy cancellation copy always visible.
- **Founder access**: emails in `app_config.founder` bypass the slot cap
  (client-side convenience only).
- Entitlement truth: client = RevenueCat SDK; server = `entitlements` table
  via webhook. Neither trusts the other's surface.

## 14. Ethics & compliance (hard rules)

No fake urgency · no shame-based notifications · dormancy always reversible
(nothing dies) · genuinely useful free tier · easy cancellation ·
transparent pricing · variable rewards cosmetic-only · release is
user-initiated only · visualization/mindfulness framing exclusively — no
medical claims, no manifestation guarantees (AI prompts enforce this too) ·
AI keys live only in Edge Functions, never the client.

## 15. Security model (summary — details in README)

RLS on every table (owner-scoped); `anon` role has zero table access
(future tables safe-by-default; **every new table enables RLS in its
creating migration**); Edge Functions verify JWTs; webhooks use shared
secrets; storage is private, user-namespaced, signed-URL access; AI spend
capped per-user daily; export/delete account are self-scoped
(`export-data`, `delete-account`).

## 16. Config reference (`app_config`)

| Key | Shape | Default |
|---|---|---|
| `health_decay` | `{wilting_after_days, dormant_after_days}` | 3 / 10 |
| `growth_thresholds` | per-state points | 30/80/160/280 |
| `daily_health_gain_cap` | `{cap}` | 40 |
| `sign_health_boost` | `{boost}` | 5 |
| `reward_probabilities` | per-trigger odds | see §8 |
| `ai_daily_limits` | `{coach, meditation}` | 50 / 10 |
| `founder` | `{emails: []}` | founder + test accounts |

Founder-editable tables: `feed_activities` (practice copy/order/boosts),
`universe_cards` (messages), `app_config` (all of the above). None require
an app release.

## 17. Analytics & feedback

PostHog (typed events: dream_planted, session_completed, sign_logged,
harvest, paywall_viewed, purchase, onboarding steps…; placeholder-key = full
no-op) · Sentry crashes (DSN-gated) · in-app feedback form (bug/idea/love →
`feedback` table → Slack via `notify-feedback` webhook) · shake-to-report in
dev builds.
