/**
 * Generates the placeholder audio assets as soft, audible tones (so playback
 * is verifiable in previews) until the founder records the real tracks —
 * see assets/audio/README.md for the recording brief.
 *
 *   node scripts/generate-placeholder-audio.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 8000;
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio');
mkdirSync(dir, { recursive: true });

function wav(samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(samples[i], 44 + i * 2);
  return buf;
}

/** Soft hum swelling on a breath cycle — pleasant, quiet, loopable. */
function breathingTone(seconds, { hz = 174, cycle = 8, volume = 0.1 } = {}) {
  const out = new Int16Array(seconds * SAMPLE_RATE);
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = 0.5 * (1 - Math.cos((2 * Math.PI * t) / cycle));
    out[i] = Math.round(Math.sin(2 * Math.PI * hz * t) * envelope * volume * 32767);
  }
  return out;
}

const files = {
  // Loops under the unguided timer — full breath cycles so the loop is seamless.
  'ambient-garden.wav': breathingTone(16, { hz: 174, cycle: 8, volume: 0.08 }),
  // Guided-track placeholders: a short distinct chime-ish swell each.
  'track-morning-light.wav': breathingTone(6, { hz: 220, cycle: 6, volume: 0.1 }),
  'track-deep-roots.wav': breathingTone(6, { hz: 146, cycle: 6, volume: 0.1 }),
  'track-golden-hour.wav': breathingTone(6, { hz: 262, cycle: 6, volume: 0.1 }),
  'track-night-garden.wav': breathingTone(6, { hz: 196, cycle: 6, volume: 0.1 }),
};

for (const [name, samples] of Object.entries(files)) {
  writeFileSync(join(dir, name), wav(samples));
  console.log('wrote', name);
}
