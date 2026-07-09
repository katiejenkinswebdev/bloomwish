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

## To do

- [x] **Signs button** — done: a Sign icon (gold spark on plum) joins Water/Feed in the plant sheet's icon row, and the garden has a "✨ Log a sign" button (goes straight to your dream, or offers a picker when you have several). All paths land on the sun-moment celebration.
- [ ] **QA pass on device** — run the full flow checklist below on real iPhone + Android dev builds (`npx expo run:ios` / `run:android`). The web preview has validated logic and flows; dictation (on-device), haptics, widgets, purchases, and notifications can only be truly verified on devices.
- [ ] **Production prep** — follow "Path to production" below in order.

> **Testing reminder:** browser sessions now persist, so you won't see the sign-in screens again until you **sign out (Profile → Sign out)**. Do that before QA'ing the auth flows (sign-in, sign-up, password reset) — item 9 of the checklist.

### QA flow checklist (run on device)

1. Sign up → onboarding intro → quiz → notification pre-prompt → starter dream
2. Dream creation: dictate + type, edit answers backwards, tweak/regenerate scene, plant, paywall appears once and dismisses
3. Garden: plant renders per state/health; tap plant → hero + status chip; water (rain lands on plant), feed (gold motes), each with haptic icon pops
4. Signs: add from sheet and from post-session nudge; sun moment; firefly appears; growth points granted
5. Stale dreams: wilting chip + revive ritual on a dormant dream
6. Harvest → celebration → Greenhouse keepsake + garden-path plaque + butterfly
7. Meditation: gift on starter dream, "being grown…" state, playback, completion
8. Gates: >5-minute timer, premium tracks, second dream slot, second meditation → paywall; purchase + restore on a sandbox account
9. Auth: sign out/in, password reset email deep link, account deletion
10. Widgets on both platforms; daily reminder + wilting alert fire; feedback form + shake-to-report (dev build)

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

## Path to production (exact order)

1. **Supabase cloud** — create the project; `npx supabase link --project-ref <ref>` then `npx supabase db push`; deploy functions: `npx supabase functions deploy delete-account dream-coach generate-meditation` and `npx supabase functions deploy revenuecat-webhook --no-verify-jwt`; set all secrets (`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `REVENUECAT_WEBHOOK_SECRET`); add auth redirect URLs `bloomwish://reset-password` + `bloomwish://verify-email`; put the project URL + anon key in `.env`.
2. **Apple Developer** — enroll; register `com.bloomwish.app` with Sign in with Apple + the `group.com.bloomwish.app` app group; replace `REPLACE_WITH_APPLE_TEAM_ID` in [app.json](app.json) and [eas.json](eas.json); configure the Apple provider in Supabase Auth.
3. **Google** — OAuth client IDs (iOS + Web) at [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) into `.env`; Web client ID also into Supabase's Google provider; Play Console account + service-account JSON for submission.
4. **RevenueCat** — app + products (`monthly` $23.99, `annual` $149.99 w/ 7-day trial, `founding_lifetime` $199), all attached to the `full_bloom` entitlement and a default offering; public SDK keys into `.env`; webhook pointed at the deployed function with the shared secret in the Authorization header.
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
npx tsc --noEmit   # typecheck
npx expo lint      # lint
npx expo-doctor    # project health
```

All three pass clean as of the last commit, and the iOS/web bundles export without errors.

## Ethical design ground rules

No fake urgency or artificial scarcity. No shame-based notifications. Plants never permanently die (dormancy is always reversible). The free tier is genuinely useful. Cancellation is easy and never hidden. Pricing is transparent before any purchase sheet. Variable rewards are cosmetic delight only. All copy frames the app as visualization/mindfulness/wellbeing — no medical claims, no manifestation guarantees.
