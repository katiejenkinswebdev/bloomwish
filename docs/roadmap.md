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

- "Remember when" resurfacing of past Signs and journal entries (the rewards table already records grants)
- Annual Bloom Report (shareable year-in-review)
- Streaks and advanced gamification

## Growth loops

- Shared gardens (tend a garden with a partner or friend)
- Harvest wall (opt-in public feed of real harvested dreams) — **note:** the
  moment progress becomes social/public, authenticity verification stops
  being optional; revisit the review machinery then
- Social sharing cards for harvested dreams

## Features

- New/full moon rituals
- Scarecrow unblocking coach (AI conversation for stuck dreams)
- Walking meditations (UI choice already present at 10/15m, marked coming soon)
- Real-time AI voice conversation
- Weeds/hoeing bonus tending mechanics
- Coach marketplace (creators sell guided rituals, 20–30% platform cut)
- Per-dream vs per-user daily growth cap decision (currently per-user)
- First-class tablet layouts (content currently capped to a phone column)
