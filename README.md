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

## Getting started

```bash
npm install
cp .env.example .env   # fill in real values (see below)
npx expo start
```

Sign in with Apple, Google Sign-In, and speech recognition require a **development build** (`npx expo run:ios` / `run:android`) — they won't work in Expo Go.

## Backend setup (one-time)

1. **Supabase** — create a project at [supabase.com](https://supabase.com/dashboard), then:
   - Apply the schema: `npx supabase db push` (or paste `supabase/migrations/*.sql` into the SQL editor)
   - Deploy functions: `npx supabase functions deploy delete-account dream-coach`
   - Set the AI secret: `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-…`
   - In Auth → URL Configuration, add redirect URLs: `bloomwish://reset-password` and `bloomwish://verify-email`
   - Enable Apple and Google providers in Auth → Providers
   - Copy the project URL + anon key into `.env`
2. **Google Sign-In** — create iOS + Web OAuth client IDs at [console.cloud.google.com](https://console.cloud.google.com/apis/credentials); put both in `.env`. The Web client ID also goes into the Supabase Google provider config.
3. **Sign in with Apple** — enable the capability for `com.bloomwish.app` in the Apple Developer portal; configure the Apple provider in Supabase.
4. **RevenueCat** (Phase 7) — create the app, products (`monthly`, `annual`, `founding_lifetime`), and the `full_bloom` entitlement; put SDK keys in `.env`.
5. **Edge Function secrets** (Phase 2+): `supabase secrets set ANTHROPIC_API_KEY=… ELEVENLABS_API_KEY=… ELEVENLABS_VOICE_ID=…`

## Project layout

```
src/
  app/            Expo Router routes
    (auth)/       sign-in, sign-up, forgot/reset password, verify email
    (app)/        signed-in tabs: Garden, Greenhouse, Profile
  components/     design system (ui/) + themed primitives
  config/         branding.ts — single source of truth for naming/tiers
  constants/      theme tokens + brand palette
  features/       feature modules (auth/, …)
  lib/            supabase client, query client
  store/          zustand stores
supabase/
  migrations/     SQL schema (all tables RLS-protected)
  functions/      Edge Functions (delete-account, …)
```

## Checks

```bash
npx tsc --noEmit   # typecheck
npx expo lint      # lint
npx expo-doctor    # project health
```

## Ethical design ground rules

No fake urgency or artificial scarcity. No shame-based notifications. Plants never permanently die (dormancy is always reversible). The free tier is genuinely useful. Cancellation is easy and never hidden. Pricing is transparent before any purchase sheet. Variable rewards are cosmetic delight only. All copy frames the app as visualization/mindfulness/wellbeing — no medical claims, no manifestation guarantees.
