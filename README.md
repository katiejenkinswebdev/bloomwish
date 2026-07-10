# Bloomwish

A manifestation and visualization app: plant a wish, grow a dream. Users capture personal dreams as seeds in an animated garden, nurture them through visualization sessions, log real-world Signs of progress, and harvest dreams that come true.

> **Naming:** the app name is pending final trademark clearance. All naming, tier names, and the tagline live in [src/config/branding.ts](src/config/branding.ts) — a rename is a one-line change. Never hardcode the name in copy.

## Stack

- **App:** React Native + Expo SDK 57, TypeScript, Expo Router (file-based routing under `src/app/`)
- **Backend:** Supabase (Postgres + RLS, Auth, Storage, Edge Functions)
- **State:** Zustand (app state) + TanStack Query (server state)
- **Animations:** Reanimated 4 + Lottie
- **Payments:** RevenueCat
- **AI:** Anthropic API (text) + ElevenLabs (voice) — called **only** from Supabase Edge Functions, never from the client

## To do (path to launch)

- [ ] **Device QA pass** — run the flow checklist below on real iPhone + Android
      dev builds (`npx expo run:ios` / `run:android`). Web has validated logic;
      dictation, haptics, share sheet, rating prompt, widgets, purchases, and
      notifications only verify on devices.
- [ ] **Voice** — record the ElevenLabs voice + the four guided tracks
      (brief in assets/audio/README.md); then add the 15-second paywall
      voice sample (see Launch playbook).
- [ ] **Production prep** — follow "Path to production" below, in order.
- [ ] **Slack feedback notifier** — function is built; wire it:
  1. Slack app → Incoming Webhooks → add one for `#bloomwish-feedback`; copy the URL.
  2. `npx supabase functions deploy notify-feedback --no-verify-jwt`
  3. `npx supabase secrets set SLACK_FEEDBACK_WEBHOOK_URL=… FEEDBACK_WEBHOOK_SECRET=<random>`
  4. Supabase dashboard → Database → Webhooks: table `feedback`, INSERT → function URL, `Authorization` header = that secret.
  5. Submit a test from the in-app form.
- [ ] **Analytics + crashes live** — real PostHog key and Sentry DSN in the
      production env (both are wired and no-op on placeholders).
- [ ] **Founding Member** — set the honest end date in branding.ts and the
      real prices in RevenueCat (strategy: $9.99 monthly / $49.99 annual with
      7-day trial / $79.99 founding lifetime, limited).
- [ ] **Native tab icons** — export the Wishing Seed icon set as image assets
      for NativeTabs (custom icons are web-only today; SF Symbols on native).
- [ ] **Accessibility verification** — real-device VoiceOver walkthrough of
      the immersion ritual + a web keyboard-nav pass (code-level AA work is
      done; see the accessibility commit).

> **Testing reminder:** browser sessions persist — **sign out (Profile →
> Sign out)** before QA'ing auth flows.

### QA flow checklist (run on device)

1. Onboarding: sign up → intro → the taste (aurora, tap-paced, skippable) → quiz → notifications → starter dream
2. Dream creation, both paths: full (dictate + type, edit answers backwards, tweak scene, capsule, ceremony, coach-named title) and fast ("Plant it now" → later "Make it vivid ✦" deepens the same dream)
3. Garden: re-entry pulse line, hero card → immersion ritual end-to-end (arrive/scene/body/warm/seal; body memory saved), plants per state/health with per-dream bloom colors, FAB gates dream #2 to paywall (founder emails bypass)
4. Water, all five modes: Breathe (pattern picker + breathe-the-scene lines), Listen, Speak (affirmation + body-memory line), Write (369 count follows clock, remembers your line), Drift (dimmed, silent ending)
5. Feed: Today's nudge, act-as-if suggested action, compost → reframe reveal → "let it take root", witnesses counter, rampage countdown + dictation, future-self letter
6. Signs: from sheet + post-session nudge; sun moment in the dream's bloom color; fireflies; collapsible sections on the plant card
7. Endings: wilting → revive ritual; release ritual (thank → sink → survivors boosted → nourish wave on return); harvest (capsule reveal, share card tap-to-share, rating prompt fires exactly once)
8. Greenhouse: shelves + pots, wishing grove (charms tappable, stars, moon, one random delight per visit)
9. Gates: >3-minute timers, premium tracks, meditation gift-then-gate → paywall; sandbox purchase + restore
10. Auth: sign out/in, password reset deep link, export data, account deletion
11. Ambient: widgets both platforms, daily reminder carries the nudge + dream name, wilting alert, delight notifications, 11:11 moment, weather mirror opt-in (location prompt, rain overlay)
12. Accessibility: VoiceOver through the garden, plant card, and immersion (no auto-advance with a screen reader)

## Getting started (local development)

```bash
npm install
cp .env.example .env   # fill in real values (see below)
npx expo start
```

Sign in with Apple, Google Sign-In, and speech recognition require a **development build** (`npx expo run:ios` / `run:android`) — they won't work in Expo Go.

**Local full-stack preview** (no cloud accounts needed): install Docker (or Colima), then `npx supabase start`, `TMPDIR=~/.colima-tmp npx supabase functions serve`, and `npx expo start --web`. Point `.env` at the local stack (`npx supabase status` prints the URL and anon key). Without AI keys the coach and meditations return clearly-labeled demo responses.

## Plugging in the AI powers

The AI lives entirely in Supabase Edge Functions — keys never ship in the app.

### 1. Anthropic (the coach: deepening questions, scenes, vividness scores, meditation scripts)

1. Create an account at [console.anthropic.com](https://console.anthropic.com) and add billing (Settings → Billing).
2. Settings → **API keys** → Create key. Copy the `sk-ant-…` value — it's shown once.
3. Wire it in:
   - **Production:** `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-…`
   - **Local preview:** put `ANTHROPIC_API_KEY=sk-ant-…` in `supabase/functions/.env` (gitignored), restart `functions serve`.
4. Test: create a new dream — the deepening questions should now be specific to *your* dream text (no `[Demo …]` labels anywhere).

The model is set in one place per function (`const MODEL = 'claude-opus-4-8'`) if you ever want to change tiers.

### 2. ElevenLabs (your cloned voice narrating personalized meditations)

1. Create an account at [elevenlabs.io](https://elevenlabs.io) — voice cloning needs the **Creator plan or higher**; a **Professional Voice Clone** (highest quality, ~30 min of clean recorded speech) is recommended for the founder voice.
2. Record and create the clone under **Voices → Add voice**. Read warmly and slowly — meditation pace, not podcast pace; the clone inherits your delivery.
3. Get your credentials:
   - **API key:** profile icon → API Keys → create.
   - **Voice ID:** open your cloned voice → ⋯ → **Copy voice ID** (a short alphanumeric string).
4. Wire them in:
   - **Production:** `npx supabase secrets set ELEVENLABS_API_KEY=… ELEVENLABS_VOICE_ID=…`
   - **Local preview:** add both to `supabase/functions/.env`, restart `functions serve`.
5. Optional but recommended: upload `ambient-bed.wav` (16 kHz, mono, 16-bit PCM WAV, seamless loop) to the **meditation-assets** storage bucket — it's mixed softly under your voice. Without it, meditations render voice-only.

### 3. Testing your voice end-to-end (once the clone is ready)

1. With both keys set, open a dream → **Personalized meditation ✦** → pick 3 minutes (cheapest test) → "Grow my meditation".
2. Watch the growing state (30–90s), then play. You should hear **your voice speaking that dream's own scene**, with real pauses, ending by inviting "Let it be! And so it is."
3. Check the pace and warmth. If it reads too fast/flat, re-record the clone samples slower and softer — the clone mirrors its source material.
4. Regeneration test: the audio is cached per dream + duration; editing the dream's scene invalidates it, and the next request re-renders.
5. Replace the placeholder guided tracks in [assets/audio/](assets/audio/README.md) with your studio recordings (the README there is the recording brief — four tracks + the ambient loop).

### 4. PostHog (product analytics — already integrated, off by default)

1. Create a free account at [posthog.com](https://posthog.com) → new project "Bloomwish" (US or EU cloud).
2. Project Settings → copy the **Project API key** (`phc_…`).
3. Put it in `.env`: `EXPO_PUBLIC_POSTHOG_KEY=phc_…` (and `EXPO_PUBLIC_POSTHOG_HOST` if you chose EU). With the placeholder value, zero events are sent.
4. That's it — autocapture (screens/taps), user identify on sign-in, and the eight core events (`onboarding_completed`, `dream_planted`, `session_completed`, `sign_logged`, `meditation_generated`, `paywall_viewed`, `purchase_completed`, `harvest`) start flowing. Build your first funnel: onboarding_completed → dream_planted → session_completed.
5. Compliance: the privacy-label updates are already written into [docs/store-readiness.md](docs/store-readiness.md).

### 5. Sentry (crash reporting — already integrated, off by default)

1. Create a free account at [sentry.io](https://sentry.io) → create org → create project, platform **React Native**, name `bloomwish`.
2. Copy the **DSN** from the project settings into `.env`: `EXPO_PUBLIC_SENTRY_DSN=https://…ingest.sentry.io/…`. Placeholder = fully disabled.
3. Replace `REPLACE_WITH_SENTRY_ORG` in [app.json](app.json) (the `@sentry/react-native/expo` plugin) with your org slug.
4. For readable stack traces in production builds: Sentry → Settings → Auth Tokens → create one with `project:releases` + `org:read`, then `eas env:create --name SENTRY_AUTH_TOKEN --value <token>` (the Expo plugin uploads source maps during EAS builds automatically).
5. **Slack alerts into your feedback channel**: Sentry → Settings → Integrations → **Slack** → connect your workspace. Then Alerts → Create Alert → "Issues" → condition "a new issue is created" → action "Send a Slack notification" → pick **#bloomwish-feedback**. Every new crash lands next to your user feedback.

## Landing page (site/)

A self-contained static site lives in [site/](site/): `index.html` (hero, features, waitlist form), plus `privacy.html` and `terms.html` placeholders that satisfy the URLs in `branding.ts` once deployed to your domain.

- **Deploy** (pick one, all free): drag the `site` folder into [netlify.com/drop](https://app.netlify.com/drop); or `npx vercel site`; or Cloudflare Pages pointed at this repo with `site` as the output dir. Then attach your domain.
- **Waitlist form**: create a free form at [formspree.io](https://formspree.io) and replace `YOUR_FORM_ID` in index.html (submissions arrive by email).
- **Before launch**: fill the bracketed placeholders in privacy.html/terms.html (they're skeletons, not legal advice) and set the real support email.

## Cost levers (when the AI bill matters)

Ranked by savings-per-effort. Unit economics today: each paying user costs ~$3–4/mo (mostly voice rendering); these cut that to ~$1 or less.

1. **ElevenLabs Flash model** (~50% off every character) — change `model_id` in
   [generate-meditation](supabase/functions/generate-meditation/index.ts) from
   `eleven_multilingual_v2` to `eleven_flash_v2_5`. One line. Trade-off: slightly
   lower voice fidelity — A/B it with the real cloned voice before committing.
2. **Compressed audio instead of WAV** (~10× smaller files → egress and storage drop
   ~10×) — the Edge runtime has no ffmpeg, so either (a) encode MP3 in-function with
   a pure-JS encoder (lamejs), keeping the ambient mix, or (b) move rendering to a
   tiny worker service with real ffmpeg. Interim quick win — **done**: audio is cached on-device
   after first download, so repeat listens cost zero egress and play offline.
3. **Cheaper Claude tier for the coach** — `const MODEL` in
   [dream-coach](supabase/functions/dream-coach/index.ts): Sonnet is ~3–5× cheaper,
   Haiku ~10×. Consider a split: keep Opus for meditation *scripts* (the premium
   product), Sonnet for questions/scenes/scores. Two lines. Re-read a few outputs
   for warmth before shipping.
4. **Meditation length mix** — a 15-minute render costs ~3× a 5-minute one. The UI
   already defaults to 5 minutes and caches per dream+duration; keep nudging toward
   shorter defaults and let 15-minute be a deliberate choice.

## Domain + email (recommendation)

1. **Buy the domain at [Cloudflare Registrar](https://dash.cloudflare.com)** (~$10–12/yr for `bloomwish.app`, at-cost pricing, free WHOIS privacy). Bonus: **Cloudflare Pages** can then host the landing site free, straight from this repo (`site/` as the output directory), all in one dashboard. Note: `.app` domains require HTTPS — Pages/Netlify handle that automatically.
   - *Runner-up:* [Porkbun](https://porkbun.com) — also at-cost domains, free email forwarding, and a $2/mo hosted mailbox if you want a real inbox in one place immediately.
2. **Email, stage 1 (receive, free, 5 minutes):** Cloudflare dashboard → your domain → **Email → Email Routing** → forward `support@bloomwish.app` to your personal Gmail. You can receive support mail from day one.
3. **Email, stage 2 (send, when you start replying):** add [Google Workspace](https://workspace.google.com) ($7/user/mo) for a real `support@bloomwish.app` mailbox — or Zoho Mail's free tier for $0.
4. **After the domain is live:** deploy `site/` (see "Landing page" above), confirm `https://bloomwish.app/privacy` and `/terms` resolve, and update `supportEmail` in [src/config/branding.ts](src/config/branding.ts) if it differs — that clears the last preflight warning.

## Path to production (exact order)

1. **Supabase cloud** — create the project; `npx supabase link --project-ref <ref>` then `npx supabase db push`; deploy functions: `npx supabase functions deploy delete-account dream-coach generate-meditation export-data` and `npx supabase functions deploy revenuecat-webhook notify-feedback --no-verify-jwt`; set all secrets (`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `REVENUECAT_WEBHOOK_SECRET`); add auth redirect URLs `bloomwish://reset-password` + `bloomwish://verify-email`; put the project URL + anon key in `.env`.
2. **Apple Developer** — enroll; register `com.bloomwish.app` with Sign in with Apple + the `group.com.bloomwish.app` app group; replace `REPLACE_WITH_APPLE_TEAM_ID` in [app.json](app.json) and [eas.json](eas.json); configure the Apple provider in Supabase Auth.
3. **Google** — OAuth client IDs (iOS + Web) at [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) into `.env`; Web client ID also into Supabase's Google provider; Play Console account + service-account JSON for submission.
4. **RevenueCat** — app + products per the pricing strategy (`monthly` $9.99, `annual` $49.99 with a 7-day trial — the highlighted anchor, `founding_lifetime` $79.99, genuinely limited), all attached to the `full_bloom` entitlement and a default offering; public SDK keys into `.env`; webhook pointed at the deployed function with the shared secret in the Authorization header.
5. **Content & legal** — record the four guided tracks + ambient loop (brief in [assets/audio/README.md](assets/audio/README.md)); upload `ambient-bed.wav` to meditation-assets; set the honest `FOUNDING_OFFER_END_DATE` in [src/config/branding.ts](src/config/branding.ts); publish real privacy policy + terms at the URLs in branding.ts.
6. **Device QA** — `npx expo run:ios` / `run:android` against the production backend; run the full QA flow checklist above, including sandbox purchases and restore.
7. **Build & submit** — `eas init` (fills the project ID), `eas build --profile production --platform all`, complete the store listings using [docs/store-readiness.md](docs/store-readiness.md) (privacy nutrition labels, Data Safety answers, screenshots), then `eas submit`.

## Project layout

```
src/
  app/            Expo Router routes
    (auth)/       sign-in, sign-up, forgot/reset password, verify email
    (app)/        signed-in tabs: Garden, Greenhouse, Profile
  components/     design system (ui/) + themed primitives
  config/         branding.ts — single source of truth for naming/tiers
  constants/      theme tokens + brand palette
  features/       feature modules (auth, dreams, activities, rewards, …)
  lib/            supabase client, query client, navigation helpers
  store/          zustand stores
supabase/
  migrations/     SQL schema (all tables RLS-protected)
  functions/      Edge Functions (dream-coach, generate-meditation, …)
docs/             store-readiness.md, roadmap.md
targets/widget/   iOS WidgetKit target
```

## Widgets & release

- iOS widget lives in [targets/widget/](targets/widget/) (WidgetKit via `@bacons/apple-targets`); it needs the real Apple Team ID in `app.json` (`ios.appleTeamId`) and the `group.com.bloomwish.app` app group registered in the developer portal.
- The Android widget is defined in JS ([src/features/widget/garden-widget.tsx](src/features/widget/garden-widget.tsx)) via `react-native-android-widget`.
- Brand assets regenerate with `node scripts/generate-brand-assets.mjs`; placeholder audio with `node scripts/generate-placeholder-audio.mjs`.
- Release checklist (EAS, privacy labels, data safety, go-live steps): [docs/store-readiness.md](docs/store-readiness.md). Deferred features: [docs/roadmap.md](docs/roadmap.md).

## Checks

```bash
npm run preflight   # the whole gate: typecheck, lint (zero warnings), expo-doctor,
                    # iOS+web bundle smoke test, secret hygiene, launch-placeholder warnings
```

Run it before every production build. CI runs the same script on every push
and pull request (.github/workflows/ci.yml) — a red ✗ fails the pipeline;
⚠ warnings list what must be resolved before store submission.

## Feedback & learning how users use the app

Every submission from the in-app form (bug / idea / love + message + email-consent flag + user id) lands as a row in the **`feedback` table** in Supabase. You can read it anytime in **Supabase Studio → Table Editor → feedback** (locally that's http://127.0.0.1:54323; in production, your project's dashboard). It's durable and queryable — but nothing tells you it arrived: wire the Slack notifier (see the To-do list above) to get pinged the moment feedback lands.

For behavioral analytics (onboarding funnels, retention, paths), the recommended tool is **PostHog** — generous free tier, Expo SDK, privacy-respectful. Note: adding it requires updating the Apple privacy nutrition labels and Google Data Safety answers to declare usage-data collection (still no ATT prompt — there's no cross-app tracking). Your own database already answers core-loop questions (plants per user, sessions per week, sign rates) with plain SQL, and RevenueCat's dashboards cover revenue metrics once purchases are live.

## Launch playbook

Full product logic reference: [docs/product-guide.md](docs/product-guide.md).

### Your voice, live at launch (highest paywall lever)

1. Finish recording the ElevenLabs voice (see "Plugging in the AI powers").
2. Add a **15-second sample on the paywall** ("hear a moment of yours") —
   an unheard voice is an unfelt promise. Generate one sample meditation
   opening with the real voice, ship it as a bundled asset, wire a play
   button on the paywall. (~half a day once the voice exists.)

### Launch blockers (the preflight warnings ARE this checklist)

- [ ] Privacy + terms pages live at the real domain (site/ is ready to deploy)
- [ ] Apple Team ID in app.json; submit config in eas.json
- [ ] Founding Member end date in branding.ts — it's load-bearing copy now:
      the paywall's limited-time claim must be true
- [ ] Real PostHog key + Sentry DSN in production env
- [ ] Hosted Supabase: `supabase db push` (carries the security migrations)
      and redeploy all Edge Functions (they contain the AI budget checks)
- [ ] RevenueCat products created; webhook deployed with secret
- [ ] TestFlight round: ~20 people from manifestation communities for a
      week — the first App Store reviews will echo whatever they experience

### Launch motion

- **Micro-influencers over big accounts**: seed 10–20 creators in the
  manifestation/scripting niche (10–50k followers — higher trust, cheaper,
  better conversion) with Founding Member codes.
- **ASO**: target what people actually search — "manifestation app",
  "369 method", "scripting journal", "visualization", "vision board". The
  app genuinely contains all of these; say so in the subtitle/keywords.
- **Store creative**: screenshots lead with the garden and the immersion
  screen (feelings, not feature lists); 15–30s preview video of
  plant → immerse → bloom.
- **Product Hunt** mid-week after TestFlight feedback lands.
- **Organic engine**: the harvest share card — every real harvest is a
  testimonial in someone's story feed.

## Security posture

Audited 2026-07-09 (full read of migrations, Edge Functions, auth, storage,
secrets). Two hardening changes shipped in
`supabase/migrations/20260710010000_security_hardening.sql`:

**1. `anon` can no longer touch any table.** An earlier grants migration gave
the anonymous role full DML on all tables — and on all *future* tables — with
RLS as the only gate. All table privileges are now revoked from `anon`
(including the default-privileges rule), because the app never queries public
tables before sign-in. Impact:

- No behavior change for the app: every read/write happens signed in as
  `authenticated`; sign-in/sign-up use the auth endpoints, not public tables.
- The blast radius of a future mistake shrinks: a new table that forgets RLS
  is now exposed only to signed-in users instead of anyone on the internet
  holding the public anon key.
- **Rule for every future table:** `alter table ... enable row level
  security;` in the same migration that creates it. No exceptions. (The
  `authenticated` role still has default table grants, so RLS is still what
  protects users from each other.)

**2. Server-side daily budget on AI spend.** Every paid AI call in
`dream-coach` and `generate-meditation` first bumps a per-user, per-day
counter (`ai_usage`, service-role-only, atomic upsert via
`increment_ai_usage()`), and returns a friendly 429 past the ceiling. Limits
live in `app_config` key `ai_daily_limits` (`{"coach": 50, "meditation": 10}`)
— tune them in the table, no redeploy. Sizing: a heavy legitimate day is ~30
coach calls (dream creation ≈6, plus affirmations/nudges/reframes/letters
across dreams); 50 leaves headroom while stopping loops. Meditations carry
ElevenLabs audio cost, and caching means only true generations count; 10/day
covers every real pattern.

Accepted risks (deliberate, revisit if scope changes): growth mechanics are
client-authoritative (a user can only inflate their *own* garden — becomes
real severity if any public/social surface ships); web sessions persist in
localStorage (standard); webhook secrets use plain string compare (timing
side channel, low practical risk — constant-time compare is a cheap future
fix).

## Ethical design ground rules

No fake urgency or artificial scarcity. No shame-based notifications. Plants never permanently die (dormancy is always reversible). The free tier is genuinely useful. Cancellation is easy and never hidden. Pricing is transparent before any purchase sheet. Variable rewards are cosmetic delight only. All copy frames the app as visualization/mindfulness/wellbeing — no medical claims, no manifestation guarantees.
