# Store readiness checklist

Working checklist for App Store and Google Play submission (spec section 16).

## Build & submit

- [ ] `eas init` to create the EAS project (fills `extra.eas.projectId`)
- [ ] Replace `REPLACE_WITH_APPLE_TEAM_ID` in [app.json](../app.json) and [eas.json](../eas.json)
- [ ] Replace `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` in eas.json; add `google-play-service-account.json` (gitignored)
- [ ] `eas build --profile production --platform all`, then `eas submit`
- [ ] Verify the iOS widget target builds (requires the real team id + `group.com.bloomwish.app` app group registered)

## Account & auth compliance

- [x] Sign in with Apple offered (required — third-party login present)
- [x] In-app account deletion that removes all user data (both stores require this)
- [x] Restore purchases on the paywall
- [ ] Verify Apple/Google sign-in on real devices with production credentials

## Copy compliance

- [x] All in-app copy frames the product as visualization / mindfulness / wellbeing
- [x] No medical, neurological, or chemical claims anywhere
- [x] No manifestation guarantees ("never guarantees outcomes" is baked into the AI system prompts)
- [ ] Store listing copy reviewed against the same rules
- [ ] Founding Member end date set in `src/config/branding.ts` (`FOUNDING_OFFER_END_DATE`) and honest

## Legal

- [ ] Publish real privacy policy and terms at the URLs in `src/config/branding.ts` (placeholders today)
- [x] Terms + privacy linked from the paywall and the profile screen

## App Tracking Transparency (iOS)

**Not required.** The app does no cross-app tracking: no ad SDKs, no third-party
analytics, no device fingerprinting. Do not add the ATT prompt; answer "no" to
App Store Connect's tracking question.

## Apple privacy nutrition labels

Declare **Data linked to you**:

| Data | Category | Purpose |
|---|---|---|
| Email address | Contact info | Account management |
| Name (optional, from quiz) | Contact info | Personalization |
| Dreams, scenes, signs, reflections | User content | App functionality |
| Photos (optional, on Signs) | User content | App functionality |
| Audio: none stored — dictation is on-device, transcript only | — | — |
| Purchase history (via RevenueCat) | Purchases | App functionality |
| User ID (Supabase uid) | Identifiers | App functionality |
| Product interaction (screens viewed, core actions) via PostHog | Usage data | Analytics (app functionality improvement — no ads, no tracking) |

Data **not** collected: location, browsing history, search history, contacts,
health data, financial info.

Tracking (ATT sense): **none** — PostHog usage analytics are first-party
product analytics with no cross-app tracking or ad identifiers, so no ATT
prompt is required.

## Google Play Data safety answers

- Collects data: **yes** (email, optional name, user content, purchase history, user id)
- Shared with third parties: **RevenueCat** (purchase processing), **Anthropic / ElevenLabs** (dream text and scenes are sent server-side to generate coaching content and meditation audio — disclose as "app functionality"; no ads, no marketing use), **PostHog** (usage analytics — screens and core actions, tied to the app user id; no ads)
- Data encrypted in transit: **yes** (TLS everywhere)
- Users can request deletion: **yes** (in-app account deletion)
- Audio: microphone used for on-device speech-to-text only; recordings never leave the device

## Backend go-live

- [ ] Apply migrations: `npx supabase db push`
- [ ] Deploy functions: `delete-account`, `dream-coach`, `generate-meditation`, and `revenuecat-webhook` (webhook with `--no-verify-jwt`)
- [ ] Secrets set: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `REVENUECAT_WEBHOOK_SECRET`
- [ ] Auth redirect URLs (`bloomwish://reset-password`, `bloomwish://verify-email`) and Apple/Google providers configured
- [ ] Founder assets uploaded: real guided-track recordings (assets/audio), `ambient-bed.wav` in the meditation-assets bucket
- [ ] RevenueCat products, entitlement, offering, and webhook configured (see README §4)

## Screenshots

Template plan (build from the Wishing Seed identity, cream backgrounds, plum
text, gold spark accents):

1. The garden with plants at several growth stages — "Plant a wish, grow a dream"
2. Dream creation with dictation — "Speak your dream into being"
3. The vividness glow / scene screen — "See it. Feel it. Live it."
4. Timer with breathing circle — "Water it daily"
5. Harvest celebration + greenhouse — "Celebrate when it comes true"
6. Widget on a home screen — "Your garden, always in view"
