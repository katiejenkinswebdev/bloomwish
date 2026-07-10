# Roadmap backlog

Not built yet, by design. Architecture stays open for these.

## Practice depth & authenticity

- **Coach-reviewed reflections** — the coach reads a practice reflection
  (act-as-if, past-tense writing, gratitude) and responds: warm, specific
  affirmation when the answer is genuine and embodied; gentle coaching back
  into the moment and the body when it's hollow. *Groundwork already exists*:
  the `dream-coach` Edge Function's `review` action (pass/feedback via
  structured output) is built and server-side; a first version shipped as a
  hard gate on act-as-if and was pulled — a lock in front of "I did this"
  punishes honest users and picks a fight with gamers. Revisit as
  **feedback-first**: review after completion, never blocking; use depth
  signals to adapt coaching tone over time.
- Depth signals (session pacing, reflection richness, repeat-paste detection)
  collected quietly as coaching inputs — never as locks, never as shame.

## Cost levers (see README for detail)

- ElevenLabs Flash model (~50% voice-render savings; A/B against the clone first)
- Compressed meditation audio: MP3-in-function (lamejs) or an ffmpeg worker service; interim on-device audio caching ✅ shipped
- Coach on Sonnet (keep Opus for meditation scripts) — 3–5× cheaper coaching
- Meditation length-mix nudges (shorter defaults; 15-min as deliberate choice)

## Monetization expansion

- Cosmetic IAP: garden themes (desert bloom, moonlit, cottage), rare seeds, decor, seasonal items
- Printed keepsakes: harvested dream cards and annual "Book of Blooms" (print on demand)
- Gift a seed: buy a friend a dream slot or subscription

## Engagement

- **Dream Board (v1.1 priority — first post-launch feature)**: images and
  word-cards attached to a specific dream, not a freestanding vision board —
  the garden stays the one metaphor. Adding an item feeds the plant (Signs
  mechanic); board images crossfade gently behind the Water timer so the
  board is practiced with, not just looked at; lives in the plant detail
  sheet. Infrastructure exists (sign-photos bucket pattern, image picker,
  RLS): ~3–4 days — board_items table + bucket (~1h), add/remove UI (~½d),
  collage display (~1d), timer slideshow (~½–1d), feed hook + analytics +
  free-tier item limit + QA (~½d). Strong ASO angle ("vision board app") and
  future fuel for shareable harvest cards.

- "Remember when" resurfacing of past Signs and journal entries (the rewards table already records grants)
- Annual Bloom Report (shareable year-in-review)
- Streaks and advanced gamification

## Growth loops

- Shared gardens (tend a garden with a partner or friend)
- Harvest wall (opt-in public feed of real harvested dreams) — **note:** the
  moment progress becomes social/public, authenticity verification stops
  being optional; revisit the review machinery then
- Social sharing cards for harvested dreams

## Daily-delight backlog (post-launch, in rough priority)

- Time-of-day garden atmosphere — dew sparkles at morning, golden-hour tint
  at dusk, fireflies at night; the garden looks different every visit
- Idle plant life — occasional sway, a leaf turning toward the sun; tap a
  plant for a tiny wiggle + spark (haptic)
- Weekly bloom letter — Sunday note from the garden: sessions, where the
  dream lived in the body, signs noticed; warm summary, never a streak
- Capsule anniversaries — one month after planting, the garden re-shows
  what you wrote ("remember why you planted this")
- On-this-day signs — resurface an old sign as quiet evidence
- Sound identity — a soft seal chime + optional garden ambience loop
- Name your butterfly — each harvest's butterfly can be given a name in the
  greenhouse
- Haptic breathing — Breathe mode pulses the haptic engine with the pattern
  (device-only)

## Features

- Greenhouse keepsake decor — earnable benches, fountains, trellises, wind
  chimes placed among the keepsakes. Earned through tending milestones
  (sessions, harvests, streak-free consistency), never bought or randomized:
  cosmetic-only per the ethical-design rules. Gives the greenhouse a
  collection loop and a reason to visit between harvests. Needs: decor
  catalog, earn rules, a placement/arrangement UI, and a `greenhouse_decor`
  table.
- New/full moon rituals
- Scarecrow unblocking coach (AI conversation for stuck dreams)
- Walking meditations (UI choice already present at 10/15m, marked coming soon)
- Real-time AI voice conversation
- Weeds/hoeing bonus tending mechanics
- Coach marketplace (creators sell guided rituals, 20–30% platform cut)
- Per-dream vs per-user daily growth cap decision (currently per-user)
- First-class tablet layouts (content currently capped to a phone column)
