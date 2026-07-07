/**
 * Generates the app icon set, splash mark, adaptive icons, notification icon,
 * and favicon from the Wishing Seed brand spec (see section 14 / branding.ts).
 *
 *   node scripts/generate-brand-assets.mjs
 *
 * Re-run after tweaking the mark. Colors come from the brand palette.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => join(root, 'assets', 'images', p);
mkdirSync(join(root, 'assets', 'images'), { recursive: true });

const COLORS = {
  deepGreen: '#3E7C59',
  sage: '#8FBC94',
  gold: '#E9B44C',
  cream: '#FBF3E7',
  warmBrown: '#B98A5E',
  white: '#FFFFFF',
};

/** Four-point spark path — the one consistent spark shape system-wide. */
function spark(cx, cy, r, fill) {
  const k = r * 0.22;
  return `<path fill="${fill}" d="M ${cx} ${cy - r} Q ${cx + k} ${cy - k} ${cx + r} ${cy} Q ${cx + k} ${cy + k} ${cx} ${cy + r} Q ${cx - k} ${cy + k} ${cx - r} ${cy} Q ${cx - k} ${cy - k} ${cx} ${cy - r} Z"/>`;
}

/**
 * The Wishing Seed mark in a 1024×1024 viewBox: curved stem reaching toward
 * the gold spark, two leaves, seed at the base.
 */
function mark({ stem, leftLeaf, rightLeaf, seed, sparkColor, includeSeed = true, includeSecondary = true }) {
  return `
    ${includeSeed ? `<ellipse cx="500" cy="742" rx="58" ry="44" fill="${seed}" transform="rotate(8 500 742)"/>` : ''}
    <path d="M 500 724 C 492 640 488 560 506 480 C 516 436 532 408 552 386"
          stroke="${stem}" stroke-width="42" stroke-linecap="round" fill="none"/>
    <ellipse cx="415" cy="512" rx="95" ry="42" fill="${leftLeaf}" transform="rotate(32 415 512)"/>
    <ellipse cx="600" cy="446" rx="85" ry="38" fill="${rightLeaf}" transform="rotate(-28 600 446)"/>
    ${spark(672, 282, 92, sparkColor)}
    ${includeSecondary ? spark(756, 178, 40, sparkColor) : ''}
  `;
}

const svg = (inner, bg = null) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ''}${inner}</svg>`;

// Icon: deep green field, sprout in cream + sage, gold spark.
const iconSvg = svg(
  mark({
    stem: COLORS.cream,
    leftLeaf: COLORS.sage,
    rightLeaf: COLORS.cream,
    seed: COLORS.warmBrown,
    sparkColor: COLORS.gold,
  }),
  COLORS.deepGreen
);

// Simplified small-size variant: no seed base, no secondary spark (16px rule).
const iconSmallSvg = svg(
  mark({
    stem: COLORS.cream,
    leftLeaf: COLORS.sage,
    rightLeaf: COLORS.cream,
    seed: COLORS.warmBrown,
    sparkColor: COLORS.gold,
    includeSeed: false,
    includeSecondary: false,
  }),
  COLORS.deepGreen
);

// Full-color mark on transparent — splash (cream page bg) and adaptive foreground.
const colorMarkSvg = svg(
  mark({
    stem: COLORS.deepGreen,
    leftLeaf: COLORS.sage,
    rightLeaf: COLORS.deepGreen,
    seed: COLORS.warmBrown,
    sparkColor: COLORS.gold,
  })
);

// Monochrome white mark — notification icon and Android themed icon.
const monoMarkSvg = svg(
  mark({
    stem: COLORS.white,
    leftLeaf: COLORS.white,
    rightLeaf: COLORS.white,
    seed: COLORS.white,
    sparkColor: COLORS.white,
    includeSeed: false,
  })
);

/** Renders an SVG, optionally padded (fraction per side) for safe zones. */
async function render(svgString, size, path, pad = 0) {
  const inner = Math.round(size * (1 - pad * 2));
  const image = await sharp(Buffer.from(svgString)).resize(inner, inner).png().toBuffer();
  const margin = Math.round((size - inner) / 2);
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: image, left: margin, top: margin }])
    .png()
    .toFile(path);
  console.log('wrote', path);
}

await render(iconSvg, 1024, out('icon.png'));
await render(colorMarkSvg, 1024, out('splash-icon.png'), 0.08);
// Android adaptive: foreground artwork must sit inside the ~66% safe zone.
await render(colorMarkSvg, 1024, out('android-icon-foreground.png'), 0.2);
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: COLORS.deepGreen },
})
  .png()
  .toFile(out('android-icon-background.png'));
console.log('wrote', out('android-icon-background.png'));
await render(monoMarkSvg, 1024, out('android-icon-monochrome.png'), 0.2);
await render(monoMarkSvg, 96, out('notification-icon.png'), 0.1);
await render(iconSmallSvg, 48, out('favicon.png'));
