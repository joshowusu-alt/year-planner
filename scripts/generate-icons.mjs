/**
 * Generates public/apple-touch-icon.png (180×180)
 * and public/og-image.png (1200×630) from the SVG icon.
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')

// ── Apple Touch Icon 180×180 ──────────────────────────────────────────────────
const iconSvg = readFileSync(join(root, 'public', 'icon.svg'))
await sharp(iconSvg).resize(180, 180).png().toFile(join(root, 'public', 'apple-touch-icon.png'))
console.log('✓  public/apple-touch-icon.png  (180×180)')

// ── OG Image 1200×630 ─────────────────────────────────────────────────────────
// Build a simple SVG card then rasterise it
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0a0e1a"/>
  <!-- Gold bar top -->
  <rect x="0" y="0" width="1200" height="6" fill="#d4af37"/>
  <!-- Icon centred-left cluster -->
  <rect x="120" y="165" width="300" height="300" rx="56" fill="#0d1224"/>
  <text x="270" y="390" text-anchor="middle" font-family="Georgia,serif"
        font-weight="bold" font-size="220" fill="#d4af37">Y</text>
  <rect x="140" y="440" width="260" height="10" rx="5" fill="#d4af37" opacity="0.5"/>
  <!-- Text right -->
  <text x="510" y="275" font-family="Georgia,serif" font-weight="bold"
        font-size="82" fill="#d4af37" letter-spacing="6">YEAR PLANNER</text>
  <text x="514" y="340" font-family="Arial,sans-serif" font-size="32"
        fill="#64748b" letter-spacing="4">EXECUTIVE FORWARD PLANNER</text>
  <rect x="510" y="370" width="130" height="4" rx="2" fill="#d4af37" opacity="0.4"/>
  <text x="514" y="430" font-family="Arial,sans-serif" font-size="28"
        fill="#475569">Plan your year. Own your results.</text>
  <!-- Gold bar bottom -->
  <rect x="0" y="624" width="1200" height="6" fill="#d4af37"/>
</svg>`

const ogBuffer = Buffer.from(ogSvg)
await sharp(ogBuffer).resize(1200, 630).png().toFile(join(root, 'public', 'og-image.png'))
console.log('✓  public/og-image.png          (1200×630)')

// ── PWA 512×512 icon ─────────────────────────────────────────────────────────
await sharp(iconSvg).resize(512, 512).png().toFile(join(root, 'public', 'icon-512.png'))
console.log('✓  public/icon-512.png          (512×512)')

console.log('\nAll icons generated successfully.')
