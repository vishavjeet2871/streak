// Renders the PWA / favicon PNGs from public/icon.svg. Run with `npm run icons`.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const pub = new URL('../public/', import.meta.url);
const svg = await readFile(new URL('icon.svg', pub), 'utf8');

// Full-bleed variant for maskable / Apple icons: the OS applies its own mask,
// so drop the rounded corners and shrink the flame into the safe zone.
const square = svg
  .replace(/rx="120"/g, 'rx="0"')
  .replace(/<rect x="1.5"[^>]*\/>/, '')
  .replace('<g transform="translate(9 0)">', '<g transform="translate(256 262) scale(0.86) translate(-247 -252)">');

const render = (source, size, file) =>
  sharp(Buffer.from(source), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(new URL(file, pub).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

await Promise.all([
  render(svg, 32, 'favicon-32x32.png'),
  render(svg, 64, 'pwa-64x64.png'),
  render(svg, 192, 'pwa-192x192.png'),
  render(svg, 512, 'pwa-512x512.png'),
  render(square, 512, 'maskable-icon-512x512.png'),
  render(square, 180, 'apple-touch-icon-180x180.png'),
]);
await writeFile(new URL('favicon.svg', pub), svg);
console.log('Icons written to public/');
